import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const closedRfi = new Set(['closed', 'answered', 'resolved'])
const priorityRank: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 }
const activeTaskStatuses = ['todo', 'in_progress']

type Evidence = { type: string; id: string; title: string; detail?: string }
type AgentAction = {
  type: string
  priority: string
  title: string
  rationale: string
  source_refs: string[]
  evidence: Evidence[]
  safe_to_execute: boolean
  payload: Record<string, unknown>
}

function norm(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

function tokens(value: unknown) {
  return norm(value).split(/[^a-z0-9\u0600-\u06ff]+/).filter((x) => x.length >= 3)
}

function overlap(a: unknown, b: unknown) {
  const aa = new Set(tokens(a))
  const bb = new Set(tokens(b))
  let hits = 0
  for (const x of aa) if (bb.has(x)) hits++
  return hits
}

async function llmSummary(packet: Record<string, unknown>) {
  const key = process.env.OPENAI_API_KEY
  if (!key) return { enabled: false, note: 'Deterministic engineering reasoning is active. Add OPENAI_API_KEY later to enable LLM narrative synthesis.' }
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.MYOS_ENGINEERING_MODEL || 'gpt-5',
        input: [
          {
            role: 'system',
            content: 'You are an engineering project decision-support layer. Do not invent quantities, prices, revisions, standards, or facts. Use only supplied evidence. Return a concise JSON object with summary, blockers, recommended_next_action, confidence, and assumptions. Flag anything requiring human engineering validation.'
          },
          { role: 'user', content: JSON.stringify(packet) }
        ],
        text: { format: { type: 'json_object' } },
        max_output_tokens: 1200,
      }),
      cache: 'no-store',
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return { enabled: true, error: data?.error?.message || 'LLM request failed' }
    const text = data?.output_text || data?.output?.[0]?.content?.[0]?.text || ''
    try { return { enabled: true, ...JSON.parse(text) } } catch { return { enabled: true, narrative: text } }
  } catch (error: any) {
    return { enabled: true, error: error?.message || 'LLM request failed' }
  }
}

export async function POST(req: Request) {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const projectId = String(body.project_id || '')
  const mode = body.mode === 'execute' ? 'execute' : body.mode === 'repair' ? 'repair' : 'analyze'
  if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const { data: project } = await s.from('projects').select('id,name,project_type,status,start_date,target_end_date').eq('id', projectId).eq('owner_id', user.id).single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { data: sections } = await s.from('boq_sections').select('id,name').eq('project_id', projectId).limit(300)
  const sectionIds = (sections || []).map((x: any) => x.id)
  const { data: sectionItems } = sectionIds.length
    ? await s.from('boq_items').select('id,section_id,item_code,item_name,unit,quantity,unit_rate,material_rate,labor_rate,subtotal,status').in('section_id', sectionIds).limit(1000)
    : { data: [] as any[] }
  const boqItems = sectionItems || []
  const boqIds = boqItems.map((x: any) => x.id)

  const [filesR, drawingsR, jobsR, tasksR, allTasksR, issuesR, rfisR, procurementR, progressR, pricesR, knowledgeR] = await Promise.all([
    s.from('project_file_assets').select('id,name,file_type,discipline,document_type,revision,status,extracted_metadata').eq('project_id', projectId).limit(200),
    s.from('drawing_revisions').select('id,drawing_number,title,discipline,revision,status,revision_date,change_summary,ai_review_status').eq('project_id', projectId).limit(300),
    s.from('file_processing_jobs').select('id,file_name,file_type,status,progress,error_message').eq('project_id', projectId).in('status', ['queued', 'processing']).limit(50),
    s.from('tasks').select('id,title,status,priority,due_date,notes').eq('project_id', projectId).in('status', activeTaskStatuses).limit(200),
    s.from('tasks').select('id,title,status,priority,due_date,notes').eq('project_id', projectId).limit(1000),
    s.from('site_issues').select('id,issue_code,title,issue_type,severity,status,location,drawing_reference,description,proposed_action,rfi_required').eq('project_id', projectId).eq('status', 'open').limit(200),
    s.from('project_rfis').select('id,rfi_no,subject,priority,status,due_date,drawing_refs,response').eq('project_id', projectId).limit(200),
    s.from('project_procurement').select('id,material_id,item_name,quantity,unit,supplier,required_at,ordered_at,delivered_at,status,notes').eq('project_id', projectId).limit(300),
    s.from('project_progress_logs').select('id,log_date,activity,quantity,unit,percent_complete,notes').eq('project_id', projectId).order('log_date', { ascending: false }).limit(100),
    s.from('material_price_snapshots').select('material_id,material_name,unit,price,currency,supplier,source_name,observed_at,confidence').order('observed_at', { ascending: false }).limit(1000),
    s.from('knowledge_nodes').select('id,node_type,title,source_id,confidence').eq('project_id', projectId).eq('user_id', user.id).limit(1000),
  ])

  const files = filesR.data || []
  const drawings = drawingsR.data || []
  const jobs = jobsR.data || []
  const tasks = tasksR.data || []
  const allTasks = allTasksR.data || []
  const issues = issuesR.data || []
  const rfis = rfisR.data || []
  const procurement = procurementR.data || []
  const progress = progressR.data || []
  const prices = pricesR.data || []
  const knowledge = knowledgeR.data || []

  const activeTitles = new Set(tasks.map((x: any) => norm(x.title)))
  const allTitles = new Set(allTasks.map((x: any) => norm(x.title)))
  const actions: AgentAction[] = []
  const add = (action: AgentAction) => actions.push(action)
  const evidence = (type: string, id: string, title: string, detail?: string): Evidence => ({ type, id, title, detail })

  for (const job of jobs) {
    add({ type: 'process_file', priority: 'high', title: `Complete file intelligence: ${job.file_name}`, rationale: `A project file is still ${job.status}. Downstream decisions should use the processed evidence when available.`, source_refs: [job.id], evidence: [evidence('file_processing_job', job.id, job.file_name, `${job.status} · ${job.progress ?? 0}%`)], safe_to_execute: false, payload: { job_id: job.id } })
  }

  const revisedDrawings = drawings.filter((d: any) => norm(d.status) === 'revised' || norm(d.ai_review_status) === 'pending')
  for (const drawing of revisedDrawings) {
    const relatedIssues = issues.filter((x: any) => norm(x.drawing_reference) === norm(drawing.drawing_number))
    const relatedRfis = rfis.filter((x: any) => Array.isArray(x.drawing_refs) && x.drawing_refs.some((r: any) => norm(r) === norm(drawing.drawing_number)))
    const impact = [...relatedIssues.map((x: any) => x.title), ...relatedRfis.map((x: any) => x.subject)].slice(0, 6)
    add({ type: 'review_drawing_impact', priority: relatedIssues.some((x: any) => ['critical', 'high'].includes(norm(x.severity))) ? 'critical' : 'high', title: `Review drawing impact: ${drawing.drawing_number || drawing.title}`, rationale: impact.length ? `Revision may affect linked issues/RFIs: ${impact.join(' · ')}` : 'Revision or pending AI review detected; downstream BOQ, procurement, issue and task impact must be checked.', source_refs: [drawing.id, ...relatedIssues.map((x: any) => x.id), ...relatedRfis.map((x: any) => x.id)], evidence: [evidence('drawing', drawing.id, `${drawing.drawing_number || 'Drawing'} ${drawing.revision || ''}`.trim(), drawing.change_summary || 'Revision/pending review'), ...relatedIssues.slice(0, 3).map((x: any) => evidence('issue', x.id, x.title)), ...relatedRfis.slice(0, 3).map((x: any) => evidence('rfi', x.id, x.subject))], safe_to_execute: false, payload: { drawing_id: drawing.id, drawing_number: drawing.drawing_number, related_issue_ids: relatedIssues.map((x: any) => x.id), related_rfi_ids: relatedRfis.map((x: any) => x.id) } })
  }

  for (const issue of issues.filter((x: any) => ['critical', 'high'].includes(norm(x.severity)))) {
    const title = `Resolve site issue: ${issue.title}`
    if (!activeTitles.has(norm(title)) && !allTitles.has(norm(title))) {
      add({ type: 'create_task', priority: norm(issue.severity), title, rationale: issue.proposed_action || issue.description || 'High-severity site issue requires controlled follow-up.', source_refs: [issue.id], evidence: [evidence('site_issue', issue.id, issue.title, issue.drawing_reference || undefined)], safe_to_execute: true, payload: { title, priority: norm(issue.severity), notes: `Linked issue ${issue.issue_code || issue.id}. ${issue.proposed_action || ''}` } })
    }
  }

  const now = Date.now()
  for (const rfi of rfis.filter((x: any) => !closedRfi.has(norm(x.status)))) {
    const due = rfi.due_date ? new Date(`${rfi.due_date}T23:59:59`).getTime() : null
    const days = due ? Math.ceil((due - now) / 86400000) : null
    if (['critical', 'high'].includes(norm(rfi.priority)) || (days !== null && days <= 3)) {
      const title = `Respond to RFI: ${rfi.subject}`
      if (!activeTitles.has(norm(title)) && !allTitles.has(norm(title))) {
        add({ type: 'create_task', priority: norm(rfi.priority) || 'high', title, rationale: days !== null && days < 0 ? 'RFI is overdue.' : 'RFI requires near-term engineering response.', source_refs: [rfi.id], evidence: [evidence('rfi', rfi.id, rfi.subject, rfi.due_date || undefined)], safe_to_execute: true, payload: { title, priority: norm(rfi.priority) || 'high', due_date: rfi.due_date || null, notes: `Linked RFI ${rfi.rfi_no || rfi.id}.` } })
      }
    }
  }

  const missingRates = boqItems.filter((x: any) => Number(x.quantity || 0) > 0 && (!Number.isFinite(Number(x.unit_rate)) || Number(x.unit_rate) <= 0))
  if (missingRates.length) {
    add({ type: 'review_boq_rates', priority: 'high', title: `Review ${missingRates.length} BOQ items with missing rates`, rationale: 'The agent found quantities without valid unit rates. Prices must be sourced from a real market/source; never fabricate a rate.', source_refs: missingRates.slice(0, 50).map((x: any) => x.id), evidence: missingRates.slice(0, 8).map((x: any) => evidence('boq_item', x.id, x.item_name, `${x.quantity} ${x.unit}`)), safe_to_execute: false, payload: { item_ids: missingRates.map((x: any) => x.id) } })
  }

  const latestPrice = new Map<string, any>()
  for (const p of prices) if (p.material_id && !latestPrice.has(p.material_id)) latestPrice.set(p.material_id, p)
  const priceRisks = procurement.map((p: any) => {
    if (!p.material_id) return null
    const snap = latestPrice.get(p.material_id)
    if (!snap || !Number(snap.price)) return null
    const relatedBoq = boqItems.filter((x: any) => overlap(x.item_name, p.item_name) >= 1 && Number(x.material_rate || x.unit_rate) > 0)
    if (!relatedBoq.length) return null
    const baseline = Number(relatedBoq[0].material_rate || relatedBoq[0].unit_rate)
    const variance = (Number(snap.price) - baseline) / baseline
    if (Math.abs(variance) < 0.1) return null
    return { procurement: p, snap, relatedBoq, variance }
  }).filter(Boolean) as any[]
  for (const r of priceRisks.slice(0, 20)) add({ type: 'review_price_variance', priority: Math.abs(r.variance) >= 0.2 ? 'high' : 'normal', title: `Review price variance: ${r.procurement.item_name}`, rationale: `Observed price differs ${Math.round(r.variance * 100)}% from the matched BOQ baseline. Source/date/currency/unit are preserved for validation.`, source_refs: [r.procurement.id, ...r.relatedBoq.slice(0, 3).map((x: any) => x.id)], evidence: [evidence('procurement', r.procurement.id, r.procurement.item_name), evidence('price_snapshot', r.procurement.material_id, r.snap.material_name, `${r.snap.price} ${r.snap.currency || ''} · ${r.snap.source_name || 'source not set'} · ${r.snap.observed_at || ''}`), ...r.relatedBoq.slice(0, 3).map((x: any) => evidence('boq_item', x.id, x.item_name, `${x.material_rate || x.unit_rate} ${x.currency || ''}`))], safe_to_execute: false, payload: { material_id: r.procurement.material_id, observed_price: r.snap.price, source_name: r.snap.source_name, observed_at: r.snap.observed_at, variance: r.variance } })

  const openProcurement = procurement.filter((x: any) => !['delivered', 'complete', 'closed'].includes(norm(x.status)))
  if (openProcurement.length >= 5) add({ type: 'review_procurement', priority: 'normal', title: `Review ${openProcurement.length} open procurement items`, rationale: 'Multiple procurement items remain open; verify required dates, ordering and delivery risk.', source_refs: openProcurement.slice(0, 20).map((x: any) => x.id), evidence: openProcurement.slice(0, 8).map((x: any) => evidence('procurement', x.id, x.item_name, `${x.status} · required ${x.required_at || 'N/A'}`)), safe_to_execute: false, payload: { procurement_ids: openProcurement.map((x: any) => x.id) } })

  const latestProgress = progress[0]?.percent_complete ?? null
  const packet = {
    project,
    mode,
    counts: { files: files.length, drawings: drawings.length, active_jobs: jobs.length, boq_items: boqItems.length, open_tasks: tasks.length, issues: issues.length, rfis: rfis.length, procurement: procurement.length, knowledge_nodes: knowledge.length },
    latest_progress: latestProgress,
    actions: actions.slice(0, 40).map(({ type, priority, title, rationale, source_refs, safe_to_execute }) => ({ type, priority, title, rationale, source_refs, safe_to_execute })),
    rule: 'Only supplied evidence is used. No engineering quantity, price, revision or standard is invented.'
  }

  actions.sort((a, b) => (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9))

  let execution: any = null
  if (mode === 'repair' || mode === 'execute') {
    const executable = actions.filter((x) => x.type === 'create_task' && x.safe_to_execute)
    if (executable.length) {
      const rows = executable.map((x) => ({ project_id: projectId, title: x.payload.title, status: 'todo', priority: x.payload.priority || 'normal', due_date: x.payload.due_date || null, notes: x.payload.notes || x.rationale }))
      const { data, error } = await s.from('tasks').insert(rows).select('id,title,status,priority,due_date')
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      execution = { count: data?.length || 0, created_tasks: data || [] }
      for (const action of executable) await s.from('myos_engineering_actions').insert({ user_id: user.id, project_id: projectId, action_type: action.type, title: action.title, rationale: action.rationale, mode, status: 'executed', payload: action.payload, result: execution, source_refs: action.source_refs, executed_at: new Date().toISOString() })
    } else execution = { count: 0, created_tasks: [], note: 'No safe task-creation action was required.' }
  } else {
    const rows = actions.slice(0, 50).map((x) => ({ user_id: user.id, project_id: projectId, action_type: x.type, title: x.title, rationale: x.rationale, mode, status: 'proposed', payload: x.payload, source_refs: x.source_refs }))
    if (rows.length) await s.from('myos_engineering_actions').insert(rows)
  }

  const ai = await llmSummary(packet)
  return NextResponse.json({ agent: { mode, project, next_action: actions[0] || { type: 'none', priority: 'normal', title: 'No high-priority engineering action detected', rationale: 'No actionable risk was detected from the current project evidence.', source_refs: [], evidence: [], safe_to_execute: false, payload: {} }, actions, evidence_count: actions.reduce((n, x) => n + x.evidence.length, 0), metrics: { files: files.length, drawings: drawings.length, revised_drawings: revisedDrawings.length, active_jobs: jobs.length, boq_items: boqItems.length, missing_rates: missingRates.length, open_tasks: tasks.length, open_issues: issues.length, open_rfis: rfis.filter((x: any) => !closedRfi.has(norm(x.status))).length, open_procurement: openProcurement.length, price_risks: priceRisks.length, knowledge_nodes: knowledge.length, latest_progress_percent: latestProgress } }, execution, ai_summary: ai, packet })
}

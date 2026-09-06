import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const activeTaskStatuses = ['todo', 'in_progress']
const closedRfiStatuses = ['closed', 'answered', 'resolved']
const priorityRank: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 }

export async function POST(req: Request) {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const project_id = body.project_id
  const mode = body.mode === 'execute' ? 'execute' : body.mode === 'repair' ? 'repair' : 'analyze'
  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const { data: project } = await s.from('projects').select('id,name,project_type,status,start_date,target_end_date').eq('id', project_id).eq('owner_id', user.id).single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { data: sections } = await s.from('boq_sections').select('id').eq('project_id', project_id)
  const sectionIds = (sections || []).map((x: any) => x.id)

  const [boqResult, materialResult, procurementResult, progressResult, issueResult, rfiResult, jobResult, taskResult, allTaskResult, drawingResult, priceResult] = await Promise.all([
    sectionIds.length ? s.from('boq_items').select('id,item_code,item_name,unit,quantity,unit_rate,material_rate,labor_rate,subtotal,material_cost,labor_cost,status').in('section_id', sectionIds).limit(500) : Promise.resolve({ data: [], error: null } as any),
    sectionIds.length ? s.from('boq_materials').select('id,boq_item_id,material_id,material_name,unit,quantity,unit_rate,total_cost,supplier').in('boq_item_id', (await s.from('boq_items').select('id').in('section_id', sectionIds).limit(1000)).data?.map((x: any) => x.id) || []).limit(1000) : Promise.resolve({ data: [], error: null } as any),
    s.from('project_procurement').select('id,material_id,item_name,quantity,unit,supplier,required_at,ordered_at,delivered_at,status,notes').eq('project_id', project_id).limit(300),
    s.from('project_progress_logs').select('id,log_date,activity,quantity,unit,percent_complete,notes').eq('project_id', project_id).order('log_date', { ascending: false }).limit(100),
    s.from('site_issues').select('id,title,severity,status,drawing_reference,description,proposed_action,rfi_required').eq('project_id', project_id).eq('status', 'open').limit(100),
    s.from('project_rfis').select('id,rfi_no,subject,priority,status,due_date,response').eq('project_id', project_id).limit(100),
    s.from('file_processing_jobs').select('id,file_name,file_type,status,progress,error_message').eq('project_id', project_id).in('status', ['queued', 'processing']).limit(30),
    s.from('tasks').select('id,title,status,priority,due_date,notes').eq('project_id', project_id).in('status', activeTaskStatuses).order('due_date', { ascending: true }).limit(100),
    s.from('tasks').select('id,title,status,priority,due_date,notes').eq('project_id', project_id).limit(500),
    s.from('drawing_revisions').select('id,drawing_number,title,discipline,revision,status,revision_date,change_summary,ai_review_status').eq('project_id', project_id).limit(200),
    s.from('material_price_snapshots').select('material_id,material_name,unit,price,currency,supplier,source_name,observed_at,confidence').order('observed_at', { ascending: false }).limit(500),
  ])

  const boq = boqResult.data || []
  const materials = materialResult.data || []
  const procurement = procurementResult.data || []
  const progress = progressResult.data || []
  const issues = issueResult.data || []
  const rfis = rfiResult.data || []
  const jobs = jobResult.data || []
  const tasks = taskResult.data || []
  const allTasks = allTaskResult.data || []
  const drawings = drawingResult.data || []
  const prices = priceResult.data || []

  const actions: any[] = []
  const today = new Date()
  const activeTaskTitles = new Set(tasks.map((t: any) => String(t.title || '').trim().toLowerCase()))
  const allTaskTitles = new Set(allTasks.map((t: any) => String(t.title || '').trim().toLowerCase()))
  const addAction = (a: any) => actions.push({ ...a, id: `${a.type}:${a.ref_id || actions.length + 1}` })

  for (const job of jobs) addAction({ type: 'process_job', ref_id: job.id, priority: 'high', title: `Complete file processing: ${job.file_name}`, rationale: `File intelligence is ${job.status} at ${job.progress ?? 0}%.`, payload: { job_id: job.id } })

  for (const issue of issues) {
    const severity = String(issue.severity || '').toLowerCase()
    if (['critical', 'high'].includes(severity)) {
      const title = `Resolve site issue: ${issue.title}`
      if (!activeTaskTitles.has(title.toLowerCase()) && !allTaskTitles.has(title.toLowerCase())) addAction({ type: 'create_task', ref_id: issue.id, priority: severity, title, rationale: issue.proposed_action || issue.description || 'High-severity open site issue.', payload: { title, priority: severity, notes: `Linked issue ${issue.id}. ${issue.proposed_action || ''}` } })
    }
  }

  for (const rfi of rfis) {
    const status = String(rfi.status || '').toLowerCase()
    if (closedRfiStatuses.includes(status)) continue
    const due = rfi.due_date ? new Date(`${rfi.due_date}T23:59:59`) : null
    const days = due ? Math.ceil((due.getTime() - today.getTime()) / 86400000) : null
    if ((days !== null && days <= 3) || ['critical', 'high'].includes(String(rfi.priority || '').toLowerCase())) {
      const title = `Respond to RFI: ${rfi.subject}`
      if (!activeTaskTitles.has(title.toLowerCase()) && !allTaskTitles.has(title.toLowerCase())) addAction({ type: 'create_task', ref_id: rfi.id, priority: String(rfi.priority || 'high'), title, rationale: days !== null && days < 0 ? 'RFI is overdue.' : 'RFI requires near-term engineering response.', payload: { title, priority: String(rfi.priority || 'high'), due_date: rfi.due_date, notes: `Linked RFI ${rfi.rfi_no || rfi.id}.` } })
    }
  }

  const missingRates = boq.filter((x: any) => Number(x.quantity || 0) > 0 && (!Number.isFinite(Number(x.unit_rate)) || Number(x.unit_rate) <= 0))
  if (missingRates.length) addAction({ type: 'review_boq_rates', priority: 'high', title: `Review ${missingRates.length} BOQ items with missing rates`, rationale: 'Quantities exist but unit rates are missing or zero. Do not invent prices; validate against the selected market/source.', payload: { item_ids: missingRates.map((x: any) => x.id) } })

  const latestByMaterial = new Map<string, any>()
  for (const p of prices) if (p.material_id && !latestByMaterial.has(p.material_id)) latestByMaterial.set(p.material_id, p)
  const priceRisks = materials.map((m: any) => {
    const p = latestByMaterial.get(m.material_id)
    if (!p || !Number(m.unit_rate) || !Number(p.price)) return null
    const variance = (Number(p.price) - Number(m.unit_rate)) / Number(m.unit_rate)
    return Math.abs(variance) >= 0.1 ? { ...m, latest_price: p.price, variance, source_name: p.source_name, observed_at: p.observed_at } : null
  }).filter(Boolean)
  for (const r of priceRisks.slice(0, 20)) addAction({ type: 'review_price_variance', priority: Math.abs(r.variance) >= 0.2 ? 'high' : 'normal', title: `Review price variance: ${r.material_name}`, rationale: `Latest observed price differs ${Math.round(r.variance * 100)}% from the BOQ material rate.`, payload: r })

  const staleDrawings = drawings.filter((d: any) => String(d.ai_review_status || '').toLowerCase() === 'pending' || String(d.status || '').toLowerCase() === 'revised')
  if (staleDrawings.length) addAction({ type: 'review_drawings', priority: 'high', title: `Review ${staleDrawings.length} revised/pending drawings`, rationale: 'Drawing revisions should be checked for downstream BOQ, issue, RFI and task impact.', payload: { drawing_ids: staleDrawings.map((x: any) => x.id) } })

  const latestProgress = progress[0]?.percent_complete ?? null
  const openProcurement = procurement.filter((x: any) => !['delivered', 'complete', 'closed'].includes(String(x.status || '').toLowerCase()))
  if (openProcurement.length >= 5) addAction({ type: 'review_procurement', priority: 'normal', title: `Review ${openProcurement.length} pending procurement items`, rationale: 'Multiple procurement items remain open; verify required dates and delivery risk.', payload: { count: openProcurement.length } })

  actions.sort((a, b) => (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9))

  let execution: any = null
  if (mode === 'execute' || mode === 'repair') {
    const executable = actions.filter((a) => a.type === 'create_task')
    if (executable.length) {
      const rows = executable.map((a) => ({ project_id, title: a.payload.title, status: 'todo', priority: a.payload.priority || 'normal', due_date: a.payload.due_date || null, notes: a.payload.notes || a.rationale || 'Generated by MYOS Engineering Decision Engine' }))
      const { data, error } = await s.from('tasks').insert(rows).select('id,title,status,priority,due_date')
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      execution = { created_tasks: data || [], count: data?.length || 0 }
      for (const a of executable) await s.from('myos_engineering_actions').insert({ user_id: user.id, project_id, action_type: a.type, title: a.title, rationale: a.rationale, mode, status: 'executed', payload: a.payload, result: execution, source_refs: [a.ref_id], executed_at: new Date().toISOString() })
    } else execution = { created_tasks: [], count: 0, note: 'No safe create-task action required.' }
  }

  if (mode === 'analyze') {
    const rows = actions.slice(0, 50).map((a) => ({ user_id: user.id, project_id, action_type: a.type, title: a.title, rationale: a.rationale, mode, status: 'proposed', payload: a.payload, source_refs: a.ref_id ? [a.ref_id] : [] }))
    if (rows.length) await s.from('myos_engineering_actions').insert(rows)
  }

  return NextResponse.json({ mode, project, decision: { next_action: actions[0] || { type: 'none', priority: 'normal', title: 'No high-priority engineering action detected', rationale: 'Current project data is clear enough for the decision engine.' }, actions, metrics: { boq_items: boq.length, missing_rates: missingRates.length, pending_procurement: openProcurement.length, open_issues: issues.length, open_rfis: rfis.filter((x: any) => !closedRfiStatuses.includes(String(x.status || '').toLowerCase())).length, active_jobs: jobs.length, revised_drawings: staleDrawings.length, latest_progress_percent: latestProgress, price_risks: priceRisks.length, open_tasks: tasks.length } }, execution })
}

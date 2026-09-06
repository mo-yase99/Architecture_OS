import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { project_id } = await req.json()
  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const { data: project } = await s
    .from('projects')
    .select('id,name,project_code,project_type,status,location,start_date,target_end_date')
    .eq('id', project_id)
    .eq('owner_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { data: sections, error: sectionsError } = await s
    .from('boq_sections')
    .select('id,code,name,sort_order')
    .eq('project_id', project_id)
    .order('sort_order', { ascending: true })

  if (sectionsError) return NextResponse.json({ error: sectionsError.message }, { status: 400 })

  const sectionIds = (sections || []).map((x: any) => x.id)
  const { data: boq, error: boqError } = sectionIds.length
    ? await s.from('boq_items').select('id,section_id,item_code,item_name,description,work_type,location,floor,room,unit,quantity,unit_rate,labor_rate,material_rate,waste_percent,subtotal,material_cost,labor_cost,status,currency').in('section_id', sectionIds).limit(500)
    : { data: [], error: null }
  if (boqError) return NextResponse.json({ error: boqError.message }, { status: 400 })

  const boqIds = (boq || []).map((x: any) => x.id)
  const [{ data: boqMaterials }, { data: procurement }, { data: progress }, { data: issues }, { data: rfis }, { data: prices }, { data: jobs }] = await Promise.all([
    boqIds.length ? s.from('boq_materials').select('id,boq_item_id,material_id,material_name,unit,quantity,waste_percent,unit_rate,total_cost,supplier').in('boq_item_id', boqIds).limit(1000) : Promise.resolve({ data: [], error: null } as any),
    s.from('project_procurement').select('id,material_id,item_name,quantity,unit,supplier,requested_at,required_at,ordered_at,delivered_at,status,notes').eq('project_id', project_id).limit(300),
    s.from('project_progress_logs').select('id,log_date,activity,quantity,unit,percent_complete,notes').eq('project_id', project_id).order('log_date', { ascending: false }).limit(100),
    s.from('site_issues').select('id,title,severity,status,drawing_reference,description,proposed_action').eq('project_id', project_id).eq('status', 'open').limit(100),
    s.from('project_rfis').select('id,rfi_no,subject,priority,status,due_date,drawing_refs,response').eq('project_id', project_id).limit(100),
    s.from('material_price_snapshots').select('material_id,material_name,category,unit,price,currency,supplier,source_name,source_url,observed_at,confidence').order('observed_at', { ascending: false }).limit(200),
    s.from('file_processing_jobs').select('id,file_name,file_type,status,progress,error_message').eq('project_id', project_id).in('status', ['queued', 'processing']).limit(30),
  ])

  const budget = (boq || []).reduce((sum: number, x: any) => sum + Number(x.subtotal || (Number(x.quantity || 0) * Number(x.unit_rate || 0))), 0)
  const materialBudget = (boq || []).reduce((sum: number, x: any) => sum + Number(x.material_cost || 0), 0)
  const laborBudget = (boq || []).reduce((sum: number, x: any) => sum + Number(x.labor_cost || 0), 0)
  const procurementPending = (procurement || []).filter((x: any) => !['delivered', 'complete', 'closed'].includes(String(x.status || '').toLowerCase())).length
  const latestProgress = progress?.[0] || null

  return NextResponse.json({
    project,
    boq: { sections: sections || [], items: boq || [], materials: boqMaterials || [], summary: { items: boq?.length || 0, budget, material_budget: materialBudget, labor_budget: laborBudget } },
    procurement: { items: procurement || [], pending: procurementPending },
    progress: { latest: latestProgress, logs: progress || [] },
    issues: issues || [],
    rfis: rfis || [],
    prices: prices || [],
    active_jobs: jobs || [],
    decision_summary: {
      budget,
      material_budget: materialBudget,
      labor_budget: laborBudget,
      procurement_pending: procurementPending,
      open_issues: issues?.length || 0,
      open_rfis: rfis?.filter((x: any) => !['closed', 'answered', 'resolved'].includes(String(x.status || '').toLowerCase())).length || 0,
      latest_progress_percent: latestProgress?.percent_complete ?? null,
      active_file_jobs: jobs?.length || 0,
    },
  })
}

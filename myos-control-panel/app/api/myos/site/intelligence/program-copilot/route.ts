import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const programs: Record<string, string[]> = {
  excel: ['Review BOQ quantities', 'Validate units and rates', 'Update procurement quantities', 'Review cost variance'],
  autocad: ['Check drawing revision', 'Verify dimensions and annotations', 'Coordinate architectural/structural references', 'Prepare issue set'],
  revit: ['Check model coordination', 'Review views/sheets', 'Validate quantities', 'Record clashes'],
  max: ['Organize scene/assets', 'Check model scale', 'Prepare camera/material pass', 'Render review'],
  photoshop: ['Prepare presentation assets', 'Update material/color boards', 'Export approved sheets'],
}

export async function POST(req: Request) {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const b = await req.json()
  if (!b.project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })
  const project = String(b.project_id)
  const program = String(b.program || 'excel').toLowerCase()
  const actions = programs[program] || programs.excel

  const [{ data: tasks }, { data: drawings }, { data: boq }, { data: issues }, { data: materials }, { data: jobs }] = await Promise.all([
    s.from('tasks').select('id,title,status,priority,due_date').eq('project_id', project).in('status', ['todo', 'in_progress']).limit(30),
    s.from('drawing_revisions').select('id,drawing_number,title,discipline,revision,status').eq('project_id', project).limit(30),
    s.from('boq_items').select('id,item_code,item_name,description,unit,quantity,unit_rate,labor_rate,material_rate,subtotal,material_cost,labor_cost,status').eq('project_id', project).limit(50),
    s.from('site_issues').select('id,title,severity,status,drawing_reference').eq('project_id', project).eq('status', 'open').limit(30),
    s.from('site_materials').select('*').eq('project_id', project).limit(30),
    s.from('file_processing_jobs').select('id,file_name,status,progress').eq('project_id', project).in('status', ['queued', 'processing']).limit(10),
  ])

  let next = actions[0]
  let reason = 'Recommended workflow step'
  if (program === 'excel' && boq?.length) {
    const missingRates = boq.some((x: any) => x.unit_rate == null)
    const missingQty = boq.some((x: any) => x.quantity == null)
    next = missingRates ? 'Validate missing BOQ unit rates' : missingQty ? 'Complete missing BOQ quantities' : 'Review BOQ quantities and cost variance'
    reason = `Project has ${boq.length} BOQ items.`
  }
  if (program === 'autocad' && drawings?.length) {
    next = drawings.some((x: any) => x.status !== 'current') ? 'Resolve drawing revision status' : 'Verify dimensions and coordination references'
    reason = `Project has ${drawings.length} drawing records.`
  }
  if ((program === 'revit' || program === 'max') && issues?.length) {
    next = 'Review open coordination/site issues before continuing'
    reason = `There are ${issues.length} open project issues.`
  }
  if (jobs?.length) {
    next = `Finish processing ${jobs[0].file_name}`
    reason = 'File intelligence is still processing.'
  }

  return NextResponse.json({
    project_id: project,
    program,
    actions,
    next_action: next,
    note: reason,
    context: {
      open_tasks: tasks?.length || 0,
      drawings: drawings?.length || 0,
      boq_items: boq?.length || 0,
      open_issues: issues?.length || 0,
      materials: materials?.length || 0,
      active_jobs: jobs?.length || 0,
    },
  })
}

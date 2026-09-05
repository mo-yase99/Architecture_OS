import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const defaults: Record<string, string[]> = {
  residential: ['Project Setup','Drawing Register','BOQ','Quantity Takeoff','Material Schedule','Procurement','Daily Site Report','Inspection & QAQC','Progress','Cost Control','Snag List','Handover'],
  commercial: ['Project Setup','Drawing Register','BOQ','Quantity Takeoff','Material Schedule','Procurement','Subcontractors','Daily Site Report','QAQC','Progress','Cost Control','Snag List','Handover'],
  finishing: ['Project Setup','Existing Conditions','Finishes Schedule','BOQ','Quantity Takeoff','Material Approvals','Procurement','Daily Site Report','Trade Progress','Inspection','Snag List','Cost Control','Handover'],
}

export async function POST(req: Request) {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json()
  if (!b.project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })
  const type = String(b.project_type || 'residential').toLowerCase()
  const sheets = defaults[type] || defaults.residential

  const { data: existing } = await s.from('project_workspace_templates').select('tab_key,tab_name,description,sort_order,config').eq('project_type', type).order('sort_order')
  const template = existing?.length ? existing : sheets.map((name, i) => ({ tab_key: name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), tab_name: name, description: `Standard ${name} workspace`, sort_order: i, config: { project_type: type } }))

  const { data, error } = await s.from('ai_recommendations').insert({
    user_id: user.id,
    project_id: b.project_id,
    recommendation_type: 'workspace_setup',
    title: 'Project workspace generated',
    recommendation: 'Standardized project workspace structure is ready for execution.',
    priority: 'high',
    confidence: .95,
    action: 'Create and use the project tabs in the generated order.',
    source_refs: { project_type: type, tabs: template },
    status: 'new',
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ recommendation_id: data.id, project_type: type, tabs: template, generated: true })
}

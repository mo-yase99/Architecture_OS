import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json()
  if (!b.project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })
  const projectId = String(b.project_id)
  const { data: project } = await s.from('projects').select('id,owner_id,project_type,name').eq('id', projectId).eq('owner_id', user.id).single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  const type = String(b.project_type || project.project_type || 'residential').toLowerCase()
  const { data: templates, error: templateError } = await s.from('project_workspace_templates').select('tab_key,tab_name,description,sort_order,config').eq('project_type', type).order('sort_order')
  if (templateError) return NextResponse.json({ error: templateError.message }, { status: 400 })
  if (!templates?.length) return NextResponse.json({ error: `No workspace template for ${type}` }, { status: 404 })

  const rows = templates.map((t: any) => ({ user_id: user.id, project_id: projectId, project_type: type, tab_key: t.tab_key, tab_name: t.tab_name, description: t.description, sort_order: t.sort_order, config: t.config, status: 'active' }))
  const { data, error } = await s.from('project_workspace_instances').upsert(rows, { onConflict: 'project_id,tab_key' }).select('id,tab_key,tab_name,description,sort_order,status,config').order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await s.from('ai_recommendations').insert({ user_id: user.id, project_id: projectId, recommendation_type: 'workspace_setup', title: 'Project workspace generated', recommendation: `Workspace for ${project.name} is initialized from the ${type} template.`, priority: 'high', confidence: .98, action: 'Start from the first incomplete workspace tab.', source_refs: { project_type: type, tab_count: data?.length || 0 }, status: 'new' })
  return NextResponse.json({ project_id: projectId, project_type: type, generated: true, tabs: data || [] })
}

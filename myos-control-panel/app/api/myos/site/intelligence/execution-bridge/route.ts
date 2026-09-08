import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const projectId = String(body.project_id || '')
  const mode = body.mode === 'execute' ? 'execute' : body.mode === 'repair' ? 'repair' : 'analyze'
  if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const { data: project } = await supabase.from('projects').select('id,name,project_type,status').eq('id', projectId).eq('owner_id', user.id).single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const decision = body.decision || {}
  const next = decision.next_action || {}
  const title = String(next.title || 'Continue highest-priority project action')
  const rationale = String(next.rationale || 'Generated from the current MYOS decision context.')

  if (mode === 'analyze') {
    return NextResponse.json({ mode, created: { tasks: 0, learning: 0, portfolio: 0, content: 0 }, note: 'Analyze mode does not create execution artifacts.' })
  }

  const generated = [
    { item_type: 'learning', title: `Learn from execution: ${title}`, description: `Convert the current project bottleneck into a focused learning exercise. ${rationale}`, metadata: { source: 'decision_engine', action_title: title, recommended_minutes: 30 } },
    { item_type: 'portfolio', title: `Capture proof: ${title}`, description: `Prepare a portfolio-ready evidence package from this project action: drawings, before/after, decision and result.`, metadata: { source: 'decision_engine', action_title: title, proof_type: 'case_study_evidence' } },
    { item_type: 'content', title: `Create content from: ${title}`, description: `Turn the project decision into one educational content asset without exposing confidential client information.`, metadata: { source: 'decision_engine', action_title: title, suggested_platforms: ['instagram', 'linkedin'] } },
  ]

  const { data: existing } = await supabase.from('myos_project_generated_items').select('id,item_type,title,status').eq('user_id', user.id).eq('project_id', projectId).in('status', ['suggested', 'queued', 'approved'])
  const existingKeys = new Set((existing || []).map((x: any) => `${x.item_type}:${String(x.title || '').trim().toLowerCase()}`))
  const rows = generated.filter((x) => !existingKeys.has(`${x.item_type}:${x.title.toLowerCase()}`)).map((x) => ({ user_id: user.id, project_id: projectId, item_type: x.item_type, title: x.title, description: x.description, status: 'queued', metadata: x.metadata }))

  const { data: created, error } = rows.length ? await supabase.from('myos_project_generated_items').insert(rows).select('id,item_type,title,status') : { data: [], error: null as any }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ mode, project, created: { tasks: 0, learning: created?.filter((x: any) => x.item_type === 'learning').length || 0, portfolio: created?.filter((x: any) => x.item_type === 'portfolio').length || 0, content: created?.filter((x: any) => x.item_type === 'content').length || 0 }, generated_items: created || [], note: 'Execution bridge created safe downstream artifacts. It does not publish content, change portfolio records, alter engineering values, or modify source evidence.' })
}

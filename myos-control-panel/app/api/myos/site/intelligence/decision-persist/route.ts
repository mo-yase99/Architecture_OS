import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const projectId = String(body.project_id || '')
  const decision = body.decision || {}
  if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const { data: project } = await supabase.from('projects').select('id,name').eq('id', projectId).eq('owner_id', user.id).single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const d = decision.decision || decision
  const row = {
    user_id: user.id,
    decision_date: new Date().toISOString().slice(0, 10),
    title: String(d.next_action?.title || 'MYOS Engineering Decision'),
    summary: String(d.next_action?.rationale || 'Decision generated from current MYOS project context.'),
    bottleneck: d.next_action?.type || null,
    focus: d.next_action?.title || null,
    actions: d.actions || [],
    learning_action: body.learning_action || {},
    portfolio_action: body.portfolio_action || {},
    content_action: body.content_action || {},
    risks: body.risks || [],
    context_snapshot: body.context_snapshot || { project, metrics: d.metrics || {} },
    model: body.model || 'deterministic-myOS-decision-engine',
  }

  const { data, error } = await supabase.from('myos_ai_decisions').insert(row).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ decision: data })
}

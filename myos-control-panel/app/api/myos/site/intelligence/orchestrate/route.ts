import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const baseSteps = ['decision-engine', 'daily-assistant', 'knowledge/sync', 'operating-loop']

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const project_id = body.project_id
  const mode = body.mode === 'execute' ? 'execute' : body.mode === 'repair' ? 'repair' : 'analyze'
  const program = body.program || 'excel'
  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const { data: project } = await supabase.from('projects').select('id,name,project_type,status').eq('id', project_id).eq('owner_id', user.id).single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { data: run, error: runError } = await supabase.from('myos_engineering_runs').insert({ user_id: user.id, project_id, run_type: 'orchestrated', mode, status: 'started' }).select('id').single()
  if (runError) return NextResponse.json({ error: runError.message }, { status: 400 })

  const origin = new URL(req.url).origin
  const cookie = req.headers.get('cookie') || ''
  const call = async (path: string, payload: Record<string, unknown>) => {
    const response = await fetch(`${origin}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })
    const data = await response.json().catch(() => ({}))
    return { ok: response.ok, status: response.status, data }
  }

  const results: Record<string, unknown> = {}
  try {
    results.decision = await call('/api/myos/site/intelligence/decision-engine', { project_id, mode })
    results.daily = await call('/api/myos/site/intelligence/daily-assistant', { project_id })
    results.knowledge = await call('/api/myos/site/intelligence/knowledge/sync', { project_id })
    results.loop = await call('/api/myos/site/intelligence/operating-loop', { project_id, program })

    const decisionData: any = (results.decision as any)?.data || {}
    const dailyData: any = (results.daily as any)?.data || {}
    const loopData: any = (results.loop as any)?.data || {}
    const summary = {
      steps: baseSteps,
      mode,
      decision_next_action: decisionData.decision?.next_action?.title || null,
      decision_actions: decisionData.decision?.actions?.length || 0,
      executed_tasks: decisionData.execution?.count || 0,
      daily_next_action: dailyData.next_action?.title || null,
      loop_next_action: loopData.next_action?.title || null,
      completed_at: new Date().toISOString(),
    }
    await supabase.from('myos_engineering_runs').update({ status: 'completed', completed_at: new Date().toISOString(), summary }).eq('id', run.id).eq('user_id', user.id)
    return NextResponse.json({ run_id: run.id, project, mode, summary, results })
  } catch (error: any) {
    const summary = { steps: baseSteps, mode, error: error?.message || 'Orchestration failed' }
    await supabase.from('myos_engineering_runs').update({ status: 'failed', completed_at: new Date().toISOString(), summary }).eq('id', run.id).eq('user_id', user.id)
    return NextResponse.json({ error: summary.error, run_id: run.id, results }, { status: 500 })
  }
}

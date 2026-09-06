import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const stages: Record<string, string[]> = {
  residential: ['Project Setup', 'Site Survey', 'Concept Design', 'Detailed Design', 'BOQ & Cost Plan', 'Procurement', 'Execution', 'Inspection & Snagging', 'Handover'],
  commercial: ['Project Setup', 'Site Survey', 'Concept & Coordination', 'Detailed Design', 'Authority Coordination', 'BOQ & Procurement', 'Execution', 'QA/QC', 'Handover'],
  finishing: ['Site Survey & Measurement', 'Finishes Schedule', 'Shop Drawings', 'BOQ & Takeoff', 'Material Approvals', 'Procurement', 'Execution by Trade', 'Inspection & Snagging', 'Handover'],
}

export async function POST(req: Request) {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const b = await req.json()
  if (!b.project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const type = String(b.project_type || 'residential').toLowerCase()
  const names = stages[type] || stages.residential
  const durations = [1, 3, 7, 14, 3, 7, 30, 7, 3]

  const { data: project, error: projectError } = await s
    .from('projects')
    .select('id,owner_id,project_type')
    .eq('id', b.project_id)
    .eq('owner_id', user.id)
    .single()

  if (projectError || !project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { data: existing } = await s.from('tasks').select('title').eq('project_id', b.project_id)
  const have = new Set((existing || []).map((x: any) => x.title))
  const rows = names
    .filter((n) => !have.has(n))
    .map((n, i) => ({
      user_id: user.id,
      project_id: b.project_id,
      title: n,
      status: 'todo',
      priority: i < 2 ? 'high' : 'medium',
      due_date: new Date(Date.now() + durations.slice(0, i + 1).reduce((a, x) => a + x, 0) * 86400000).toISOString().slice(0, 10),
      notes: `Standard MYOS project stage: ${n}`,
    }))

  if (rows.length) {
    const { error } = await s.from('tasks').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    created: rows.length,
    stages: names,
    total_estimated_days: durations.reduce((a, x) => a + x, 0),
  })
}

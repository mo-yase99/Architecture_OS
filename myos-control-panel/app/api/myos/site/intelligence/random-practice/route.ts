import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const programBySkill: Record<string, string> = {
  '3d visualization': 'max', '3ds max': 'max', 'autocad': 'autocad', 'revit': 'revit', 'bim': 'revit',
  'photoshop': 'photoshop', 'illustrator': 'illustrator', 'excel': 'excel', 'boq': 'excel',
}

export async function POST(req: Request) {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const projectId = b.project_id ? String(b.project_id) : null

  const [{ data: skills }, { data: tasks }, { data: recent }] = await Promise.all([
    s.from('myos_skill_progress').select('skill,level,xp,activities_completed,portfolio_outputs,last_activity_at').eq('user_id', user.id).order('level', { ascending: true }).limit(50),
    projectId ? s.from('tasks').select('title,status,priority,project_id').eq('project_id', projectId).in('status', ['todo', 'in_progress']).limit(30) : Promise.resolve({ data: [] as any[] }),
    s.from('myos_practice_sessions').select('skill,program,task,completed_at,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
  ])

  const candidates = (skills || []).map((x: any) => {
    const key = String(x.skill || '').toLowerCase()
    const last = x.last_activity_at ? new Date(x.last_activity_at).getTime() : 0
    const days = last ? (Date.now() - last) / 86400000 : 999
    const recentCount = (recent || []).filter((r: any) => r.skill === x.skill).length
    const projectBoost = (tasks || []).some((t: any) => String(t.title).toLowerCase().includes(key.split(' ')[0])) ? 25 : 0
    const weakness = Math.max(0, 100 - Number(x.level || 0) * 20)
    const score = weakness + Math.min(days, 30) + projectBoost - recentCount * 8
    return { skill: x.skill, program: programBySkill[key] || 'general', score, level: x.level, reason: projectBoost ? 'Relevant to an open project task' : days > 14 ? 'Due for review based on recency' : 'Strengthen a lower-confidence skill' }
  }).sort((a: any, z: any) => z.score - a.score)

  const chosen = candidates[0] || { skill: 'Architecture fundamentals', program: 'general', score: 50, reason: 'No skill history exists yet' }
  const task = chosen.program === 'excel' ? 'Build one BOQ item from description → unit → quantity → rate → cost' : chosen.program === 'autocad' ? 'Recreate one small shop-drawing detail and verify dimensions/annotations' : chosen.program === 'revit' ? 'Model one small architectural detail and create a coordinated view' : chosen.program === 'max' ? 'Create one small architectural scene with correct scale, camera and material' : `Complete a 30–45 minute focused practice exercise in ${chosen.skill}`
  const difficulty = Number(chosen.level || 0) < 2 ? 'easy' : Number(chosen.level || 0) < 4 ? 'medium' : 'hard'

  const { data, error } = await s.from('myos_practice_sessions').insert({ user_id: user.id, project_id: projectId, skill: chosen.skill, program: chosen.program, task, difficulty, reason: chosen.reason, status: 'pending' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ id: data.id, skill: chosen.skill, program: chosen.program, task, difficulty, reason: chosen.reason, scoring: { weakness: 'low-confidence skills first', recency: 'spaced review', relevance: 'open project work', repetition: 'avoid recently practiced skills' } })
}

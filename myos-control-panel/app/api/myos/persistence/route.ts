import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    const b = await req.json()
    const date = b.date ?? new Date().toISOString().slice(0, 10)
    if (b.type === 'habit') {
      const { error } = await supabase.from('myos_habit_logs').upsert({ user_id: user.id, habit_key: b.habitKey, habit: b.habitKey, log_date: date, completed: Boolean(b.completed) }, { onConflict: 'user_id,habit_key,log_date' })
      if (error) throw error
    } else if (b.type === 'daily') {
      const { error } = await supabase.from('myos_daily_logs').upsert({ user_id: user.id, log_date: date, execution_score: b.executionScore ?? 0, completed_tasks: b.completedTasks ?? 0, total_tasks: b.totalTasks ?? 0, completed_habits: b.completedHabits ?? 0, total_habits: b.totalHabits ?? 0, available_minutes: b.availableMinutes ?? null, energy: b.energy ?? null, next_action: b.nextAction ?? null }, { onConflict: 'user_id,log_date' })
      if (error) throw error
    } else if (b.type === 'learning') {
      const { error } = await supabase.from('myos_learning_activities').insert({ user_id: user.id, activity_date: date, skill: b.skill, activity_type: b.activityType ?? 'practice', title: b.title, rating: b.rating ?? null, estimated_minutes: b.estimatedMinutes ?? null, actual_minutes: b.actualMinutes ?? null, xp_earned: b.xp ?? 0, xp: b.xp ?? 0, deliverable: b.deliverable ?? null, project_name: b.projectName ?? null, status: b.status ?? 'completed', metadata: b.metadata ?? {} })
      if (error) throw error
    }
    return NextResponse.json({ ok: true, userId: user.id })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Persistence failed' }, { status: 400 })
  }
}

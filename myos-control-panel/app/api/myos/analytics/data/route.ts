import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, mode: 'unauthorized' }, { status: 401 })
    const days = Math.min(30, Math.max(1, Number(new URL(req.url).searchParams.get('days') ?? 7)))
    const from = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10)
    const [daily, habits, activities] = await Promise.all([
      supabase.from('myos_daily_logs').select('*').eq('user_id', user.id).gte('log_date', from).order('log_date', { ascending: true }),
      supabase.from('myos_habit_logs').select('*').eq('user_id', user.id).gte('log_date', from).order('log_date', { ascending: true }),
      supabase.from('myos_learning_activities').select('*').eq('user_id', user.id).gte('activity_date', from).order('activity_date', { ascending: true }),
    ])
    const error = daily.error || habits.error || activities.error
    if (error) throw error
    return NextResponse.json({ ok: true, days, userId: user.id, data: { daily: daily.data ?? [], habits: habits.data ?? [], activities: activities.data ?? [] } })
  } catch (e) {
    return NextResponse.json({ ok: false, mode: 'error', detail: e instanceof Error ? e.message : 'Analytics data unavailable' }, { status: 500 })
  }
}

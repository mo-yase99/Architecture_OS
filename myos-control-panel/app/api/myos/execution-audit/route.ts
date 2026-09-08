import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const [actions, runs, generated] = await Promise.all([
    supabase.from('myos_engineering_actions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
    supabase.from('myos_engineering_runs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
    supabase.from('myos_project_generated_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
  ])
  return NextResponse.json({ ok: true, actions: actions.data ?? [], runs: runs.data ?? [], generated: generated.data ?? [], errors: [actions.error, runs.error, generated.error].filter(Boolean).map((e:any)=>e.message) })
}

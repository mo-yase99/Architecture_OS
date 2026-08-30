import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const type = new URL(req.url).searchParams.get('type')
  let q = supabase.from('myos_project_generated_items').select('*, myos_projects(name,type)').eq('user_id', user.id).order('created_at', { ascending: false })
  if (type) q = q.eq('item_type', type)
  const { data, error } = await q
  return NextResponse.json({ items: data ?? [], error: error?.message })
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { id, status } = body
  if (!id || !status) return NextResponse.json({ error: 'id and status are required' }, { status: 400 })
  const { data, error } = await supabase.from('myos_project_generated_items').update({ status, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id).select().single()
  return NextResponse.json({ item: data, error: error?.message }, { status: error ? 400 : 200 })
}

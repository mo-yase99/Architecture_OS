import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const [myos, engineering] = await Promise.all([
    supabase.from('myos_projects').select('id,name,type,status,stage,description,updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }),
    supabase.from('projects').select('id,name,project_code,client_name,project_type,status,location,description,start_date,target_end_date,created_at,updated_at').eq('owner_id', user.id).order('updated_at', { ascending: false }),
  ])
  const engineeringRows = engineering.data ?? []
  const mapped = (myos.data ?? []).map((p:any) => {
    const candidates = engineeringRows.filter((e:any) => e.name?.trim().toLowerCase() === p.name?.trim().toLowerCase())
    return { myos: p, engineering: candidates[0] ?? null, ambiguous: candidates.length > 1 }
  })
  return NextResponse.json({ ok: true, myos_projects: myos.data ?? [], engineering_projects: engineeringRows, mapped, unmatched_myos: (myos.data ?? []).filter((p:any) => !mapped.find((m:any) => m.myos.id === p.id && m.engineering)), unmatched_engineering: engineeringRows.filter((e:any) => !(myos.data ?? []).some((p:any) => p.name?.trim().toLowerCase() === e.name?.trim().toLowerCase())) })
}

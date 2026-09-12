import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listCanonicalMyosProjects } from '@/lib/control-plane/projects'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const projects = await listCanonicalMyosProjects(supabase, user.id)
    return NextResponse.json({ ok: true, projects })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to load project registry' },
      { status: 500 },
    )
  }
}

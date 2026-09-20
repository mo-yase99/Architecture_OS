import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ControlStateValidationError,
  getCrossProjectControlSnapshot,
} from '@/lib/control-plane/control-state'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    const snapshot = await getCrossProjectControlSnapshot(supabase, user.id)
    return NextResponse.json({ ok: true, snapshot })
  } catch (error) {
    if (error instanceof ControlStateValidationError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to load cross-project control context' },
      { status: 500 },
    )
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ControlStateValidationError,
  createControlState,
  listControlStates,
} from '@/lib/control-plane/control-state'

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof ControlStateValidationError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.statusCode })
  }
  return NextResponse.json(
    { ok: false, error: error instanceof Error ? error.message : fallback },
    { status: 500 },
  )
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    const projectId = new URL(request.url).searchParams.get('projectId') ?? undefined
    const states = await listControlStates(supabase, user.id, projectId)
    return NextResponse.json({ ok: true, controlStates: states })
  } catch (error) {
    return errorResponse(error, 'Failed to load Control State')
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    let body: unknown
    try { body = await request.json() } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const controlState = await createControlState(supabase, user.id, body as Parameters<typeof createControlState>[2])
    return NextResponse.json({ ok: true, controlState }, { status: 201 })
  } catch (error) {
    return errorResponse(error, 'Failed to create Control State')
  }
}

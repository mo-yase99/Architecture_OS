import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ControlStateValidationError,
  getProjectControlContext,
  updateControlState,
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    const { projectId } = await params
    const scope = new URL(request.url).searchParams.get('scope') ?? 'active'
    const context = await getProjectControlContext(supabase, user.id, projectId, { scope: scope as 'active' | 'all' })
    return NextResponse.json({ ok: true, context })
  } catch (error) {
    return errorResponse(error, 'Failed to load project Control State')
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    const { projectId } = await params
    let body: unknown
    try { body = await request.json() } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const controlState = await updateControlState(supabase, user.id, projectId, body as Parameters<typeof updateControlState>[3])
    return NextResponse.json({ ok: true, controlState })
  } catch (error) {
    return errorResponse(error, 'Failed to update Control State')
  }
}

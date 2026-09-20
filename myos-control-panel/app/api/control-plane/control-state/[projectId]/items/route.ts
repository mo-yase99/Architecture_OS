import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ControlStateValidationError,
  createControlItem,
  getControlItems,
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
    const items = await getControlItems(supabase, user.id, projectId)
    return NextResponse.json({ ok: true, items })
  } catch (error) {
    return errorResponse(error, 'Failed to load control items')
  }
}

export async function POST(
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

    const item = await createControlItem(supabase, user.id, {
      ...(body as Omit<Parameters<typeof createControlItem>[2], 'projectId'>),
      projectId,
    })
    return NextResponse.json({ ok: true, item }, { status: 201 })
  } catch (error) {
    return errorResponse(error, 'Failed to create control item')
  }
}

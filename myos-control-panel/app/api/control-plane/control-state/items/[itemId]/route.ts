import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ControlStateValidationError,
  updateControlItem,
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    const { itemId } = await params
    let body: unknown
    try { body = await request.json() } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const item = await updateControlItem(supabase, user.id, itemId, body as Parameters<typeof updateControlItem>[3])
    return NextResponse.json({ ok: true, item })
  } catch (error) {
    return errorResponse(error, 'Failed to update control item')
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  RelationshipValidationError,
  updateCanonicalRelationship,
} from '@/lib/control-plane/relationships'

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof RelationshipValidationError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.statusCode })
  }

  return NextResponse.json(
    { ok: false, error: error instanceof Error ? error.message : fallback },
    { status: 500 },
  )
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const relationship = await updateCanonicalRelationship(supabase, user.id, id, body)

    return NextResponse.json({ ok: true, relationship })
  } catch (error) {
    return errorResponse(error, 'Failed to update relationship')
  }
}

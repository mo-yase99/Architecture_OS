import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createCanonicalRelationship,
  listCanonicalRelationships,
  RelationshipValidationError,
} from '@/lib/control-plane/relationships'
import {
  MYOS_RELATIONSHIP_LIFECYCLE_STATES,
  MYOS_RELATIONSHIP_PARTICIPANT_TYPES,
  MYOS_RELATIONSHIP_TYPES,
  type MyosRelationshipLifecycleState,
  type MyosRelationshipParticipantType,
  type MyosRelationshipType,
} from '@/lib/control-plane/registry-contract'

function isParticipantType(value: string): value is MyosRelationshipParticipantType {
  return (MYOS_RELATIONSHIP_PARTICIPANT_TYPES as readonly string[]).includes(value)
}

function isRelationshipType(value: string): value is MyosRelationshipType {
  return (MYOS_RELATIONSHIP_TYPES as readonly string[]).includes(value)
}

function isLifecycleState(value: string): value is MyosRelationshipLifecycleState {
  return (MYOS_RELATIONSHIP_LIFECYCLE_STATES as readonly string[]).includes(value)
}

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof RelationshipValidationError) {
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

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const entityType = url.searchParams.get('entityType') ?? undefined
    const entityId = url.searchParams.get('entityId') ?? undefined
    const relationshipType = url.searchParams.get('relationshipType') ?? undefined
    const status = url.searchParams.get('status') ?? undefined

    if (entityType && !isParticipantType(entityType)) {
      return NextResponse.json({ ok: false, error: 'Invalid entityType' }, { status: 400 })
    }
    if (relationshipType && !isRelationshipType(relationshipType)) {
      return NextResponse.json({ ok: false, error: 'Invalid relationshipType' }, { status: 400 })
    }
    if (status && !isLifecycleState(status)) {
      return NextResponse.json({ ok: false, error: 'Invalid status' }, { status: 400 })
    }

    const relationships = await listCanonicalRelationships(supabase, user.id, {
      entityType: entityType as MyosRelationshipParticipantType | undefined,
      entityId,
      relationshipType: relationshipType as MyosRelationshipType | undefined,
      status: status as MyosRelationshipLifecycleState | undefined,
    })

    return NextResponse.json({ ok: true, relationships })
  } catch (error) {
    return errorResponse(error, 'Failed to load relationship registry')
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const relationship = await createCanonicalRelationship(supabase, user.id, body)

    return NextResponse.json({ ok: true, relationship }, { status: 201 })
  } catch (error) {
    return errorResponse(error, 'Failed to create relationship')
  }
}

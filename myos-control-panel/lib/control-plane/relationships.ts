import type {
  CanonicalRelationship,
  MyosRelationshipLifecycleState,
  MyosRelationshipParticipantType,
  MyosRelationshipType,
} from './registry-contract'
import {
  MYOS_DIRECTIONAL_RELATIONSHIP_TYPES,
  MYOS_RELATIONSHIP_LIFECYCLE_STATES,
  MYOS_RELATIONSHIP_PARTICIPANT_PAIRS,
  MYOS_RELATIONSHIP_PARTICIPANT_TYPES,
  MYOS_RELATIONSHIP_TYPES,
  MYOS_SYMMETRIC_RELATIONSHIP_TYPES,
} from './registry-contract'
import type { SupabaseClient } from '@supabase/supabase-js'

type RelationshipRow = {
  id: string
  source_entity_type: MyosRelationshipParticipantType
  source_entity_id: string
  relationship_type: MyosRelationshipType
  target_entity_type: MyosRelationshipParticipantType
  target_entity_id: string
  owner: 'MYOS'
  status: MyosRelationshipLifecycleState
  description: string | null
  created_at: string
  updated_at: string
}

export type RelationshipFilters = {
  entityType?: MyosRelationshipParticipantType
  entityId?: string
  relationshipType?: MyosRelationshipType
  status?: MyosRelationshipLifecycleState
}

export type CreateRelationshipInput = {
  sourceEntityType: MyosRelationshipParticipantType
  sourceEntityId: string
  relationshipType: MyosRelationshipType
  targetEntityType: MyosRelationshipParticipantType
  targetEntityId: string
  status?: MyosRelationshipLifecycleState
  description?: string | null
}

export type UpdateRelationshipInput = {
  status?: MyosRelationshipLifecycleState
  description?: string | null
}

export class RelationshipValidationError extends Error {
  statusCode = 400

  constructor(message: string) {
    super(message)
    this.name = 'RelationshipValidationError'
  }
}

const participantRank: Record<MyosRelationshipParticipantType, number> = {
  PRODUCT: 0,
  PROJECT: 1,
  DOMAIN_PROJECT: 2,
}

function isUuid(value: string) {\n  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)\n}\n\nfunction isParticipantType(value: string): value is MyosRelationshipParticipantType {
  return (MYOS_RELATIONSHIP_PARTICIPANT_TYPES as readonly string[]).includes(value)
}

function isRelationshipType(value: string): value is MyosRelationshipType {
  return (MYOS_RELATIONSHIP_TYPES as readonly string[]).includes(value)
}

function isLifecycleState(value: string): value is MyosRelationshipLifecycleState {
  return (MYOS_RELATIONSHIP_LIFECYCLE_STATES as readonly string[]).includes(value)
}

function isSymmetricType(type: MyosRelationshipType) {
  return (MYOS_SYMMETRIC_RELATIONSHIP_TYPES as readonly string[]).includes(type)
}

function isDirectionalType(type: MyosRelationshipType) {
  return (MYOS_DIRECTIONAL_RELATIONSHIP_TYPES as readonly string[]).includes(type)
}

function participantKey(type: MyosRelationshipParticipantType, id: string) {
  return `${participantRank[type]}:${type}:${id}`
}

function normalizeParticipants(input: CreateRelationshipInput): CreateRelationshipInput {
  if (!isSymmetricType(input.relationshipType)) return input

  const sourceKey = participantKey(input.sourceEntityType, input.sourceEntityId)
  const targetKey = participantKey(input.targetEntityType, input.targetEntityId)

  if (sourceKey <= targetKey) return input

  return {
    ...input,
    sourceEntityType: input.targetEntityType,
    sourceEntityId: input.targetEntityId,
    targetEntityType: input.sourceEntityType,
    targetEntityId: input.sourceEntityId,
  }
}

function validateStaticSemantics(input: CreateRelationshipInput) {
  if (!isParticipantType(input.sourceEntityType) || !isParticipantType(input.targetEntityType)) {
    throw new RelationshipValidationError('Invalid relationship participant type')
  }

  if (!isRelationshipType(input.relationshipType)) {
    throw new RelationshipValidationError('Invalid relationship type')
  }

  const status = input.status ?? 'planned'
  if (!isLifecycleState(status)) {
    throw new RelationshipValidationError('Invalid relationship lifecycle state')
  }

  if (
    input.sourceEntityType === input.targetEntityType
    && input.sourceEntityId === input.targetEntityId
  ) {
    throw new RelationshipValidationError('Self-referential relationships are not allowed')
  }

  const validPair = MYOS_RELATIONSHIP_PARTICIPANT_PAIRS.some(
    ([source, target]) =>
      source === input.sourceEntityType && target === input.targetEntityType,
  )

  if (!validPair) {
    throw new RelationshipValidationError(
      'Invalid relationship participant combination',
    )
  }

  if (!isDirectionalType(input.relationshipType) && !isSymmetricType(input.relationshipType)) {
    throw new RelationshipValidationError('Unsupported relationship direction semantics')
  }

  return status
}

async function assertParticipantEligible(
  supabase: SupabaseClient,
  userId: string,
  type: MyosRelationshipParticipantType,
  id: string,
) {
  if (type === 'PRODUCT') {
    const { data, error } = await supabase
      .from('myos_products')
      .select('id,status')
      .eq('id', id)
      .eq('status', 'active')
      .maybeSingle()

    if (error) throw error
    if (!data) throw new RelationshipValidationError('Participant is not an active MYOS product')
    return
  }

  if (type === 'PROJECT') {
    const { data, error } = await supabase
      .from('myos_projects')
      .select('id,status,product_id,project_code')
      .eq('id', id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .not('product_id', 'is', null)
      .not('project_code', 'is', null)
      .maybeSingle()

    if (error) throw error
    if (!data) throw new RelationshipValidationError('Participant is not an active MYOS project')
    return
  }

  const { data: link, error: linkError } = await supabase
    .from('myos_project_links')
    .select('engineering_project_id')
    .eq('user_id', userId)
    .eq('engineering_project_id', id)
    .maybeSingle()

  if (linkError) throw linkError
  if (!link) {
    throw new RelationshipValidationError(
      'Domain project is not linked to the authenticated MYOS user',
    )
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id,status,owner_id')
    .eq('id', id)
    .eq('owner_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (projectError) throw projectError
  if (!project) {
    throw new RelationshipValidationError('Participant is not an active domain project')
  }
}

function toCanonical(row: RelationshipRow): CanonicalRelationship {
  return {
    id: row.id,
    sourceEntityType: row.source_entity_type,
    sourceEntityId: row.source_entity_id,
    relationshipType: row.relationship_type,
    targetEntityType: row.target_entity_type,
    targetEntityId: row.target_entity_id,
    owner: 'MYOS',
    status: row.status,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listCanonicalRelationships(
  supabase: SupabaseClient,
  userId: string,
  filters: RelationshipFilters = {},
): Promise<CanonicalRelationship[]> {
  let query = supabase
    .from('myos_relationships')
    .select('id,source_entity_type,source_entity_id,relationship_type,target_entity_type,target_entity_id,owner,status,description,created_at,updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (filters.relationshipType) query = query.eq('relationship_type', filters.relationshipType)
  if (filters.status) query = query.eq('status', filters.status)

  if (filters.entityType && filters.entityId) {
    query = query.or(
      `and(source_entity_type.eq.${filters.entityType},source_entity_id.eq.${filters.entityId}),and(target_entity_type.eq.${filters.entityType},target_entity_id.eq.${filters.entityId})`,
    )
  } else if (filters.entityType) {
    query = query.or(
      `source_entity_type.eq.${filters.entityType},target_entity_type.eq.${filters.entityType}`,
    )
  } else if (filters.entityId) {
    query = query.or(
      `source_entity_id.eq.${filters.entityId},target_entity_id.eq.${filters.entityId}`,
    )
  }

  const { data, error } = await query
  if (error) throw error

  return ((data ?? []) as RelationshipRow[]).map(toCanonical)
}

export async function createCanonicalRelationship(
  supabase: SupabaseClient,
  userId: string,
  input: CreateRelationshipInput,
): Promise<CanonicalRelationship> {
  const status = validateStaticSemantics(input)
  const normalized = normalizeParticipants({ ...input, status })

  if (status === 'active') {
    await assertParticipantEligible(
      supabase,
      userId,
      normalized.sourceEntityType,
      normalized.sourceEntityId,
    )
    await assertParticipantEligible(
      supabase,
      userId,
      normalized.targetEntityType,
      normalized.targetEntityId,
    )
  }

  const { data, error } = await supabase
    .from('myos_relationships')
    .insert({
      user_id: userId,
      owner: 'MYOS',
      source_entity_type: normalized.sourceEntityType,
      source_entity_id: normalized.sourceEntityId,
      relationship_type: normalized.relationshipType,
      target_entity_type: normalized.targetEntityType,
      target_entity_id: normalized.targetEntityId,
      status,
      description: normalized.description ?? null,
    })
    .select('id,source_entity_type,source_entity_id,relationship_type,target_entity_type,target_entity_id,owner,status,description,created_at,updated_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new RelationshipValidationError(
        'Relationship already exists for these participants and relationship type',
      )
    }
    throw error
  }

  return toCanonical(data as RelationshipRow)
}

export async function updateCanonicalRelationship(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: UpdateRelationshipInput,
): Promise<CanonicalRelationship> {
  if (input.status !== undefined && !isLifecycleState(input.status)) {
    throw new RelationshipValidationError('Invalid relationship lifecycle state')
  }

  const { data: current, error: currentError } = await supabase
    .from('myos_relationships')
    .select('id,source_entity_type,source_entity_id,relationship_type,target_entity_type,target_entity_id,owner,status,description,created_at,updated_at')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (currentError) throw currentError
  if (!current) throw new RelationshipValidationError('Relationship not found')

  if (input.status === 'active' && current.status !== 'active') {
    await assertParticipantEligible(
      supabase,
      userId,
      current.source_entity_type,
      current.source_entity_id,
    )
    await assertParticipantEligible(
      supabase,
      userId,
      current.target_entity_type,
      current.target_entity_id,
    )
  }

  const patch: { status?: MyosRelationshipLifecycleState; description?: string | null } = {}
  if (input.status !== undefined) patch.status = input.status
  if (input.description !== undefined) patch.description = input.description

  if (Object.keys(patch).length === 0) {
    return toCanonical(current as RelationshipRow)
  }

  const { data, error } = await supabase
    .from('myos_relationships')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select('id,source_entity_type,source_entity_id,relationship_type,target_entity_type,target_entity_id,owner,status,description,created_at,updated_at')
    .single()

  if (error) throw error
  return toCanonical(data as RelationshipRow)
}

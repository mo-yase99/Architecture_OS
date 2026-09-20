import type { SupabaseClient } from '@supabase/supabase-js'
import type { CanonicalRelationship } from './registry-contract'
import { listCanonicalRelationships } from './relationships'
import {
  MYOS_CONTROL_ITEM_STATUSES,
  MYOS_CONTROL_ITEM_TYPES,
  MYOS_CONTROL_STATE_HEALTHS,
  MYOS_CONTROL_STATE_PRIORITIES,
  MYOS_CONTROL_STATE_STATUSES,
  MYOS_CONTROL_REFERENCE_SOURCES,
  type MyosControlItem,
  type MyosControlItemStatus,
  type MyosControlItemType,
  type MyosControlReferenceSource,
  type MyosControlState,
  type MyosControlStateHealth,
  type MyosControlStatePriority,
  type MyosControlStateReference,
  type MyosControlStateStatus,
  type MyosProjectControlSnapshot,
  type MyosCrossProjectControlSnapshot,
} from './control-state-contract'

type ControlStateRow = {
  id: string
  project_id: string
  owner: 'MYOS'
  status: MyosControlStateStatus
  priority: MyosControlStatePriority
  health: MyosControlStateHealth
  current_sprint_id: string | null
  current_sprint_source: MyosControlReferenceSource | null
  current_sprint_reference: string | null
  current_sprint_title: string | null
  last_checkpoint_id: string | null
  last_checkpoint_source: MyosControlReferenceSource | null
  last_checkpoint_reference: string | null
  last_checkpoint_title: string | null
  created_at: string
  updated_at: string
}

type ControlItemRow = {
  id: string
  project_id: string
  control_state_id: string
  owner: 'MYOS'
  item_type: MyosControlItemType
  status: MyosControlItemStatus
  title: string
  description: string | null
  resolution: string | null
  relationship_id: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

type ReferenceInput = {
  id?: string | null
  source: MyosControlReferenceSource
  reference: string
  title?: string | null
}

export type CreateControlStateInput = {
  projectId: string
  status?: MyosControlStateStatus
  priority?: MyosControlStatePriority
  health?: MyosControlStateHealth
  currentSprint?: ReferenceInput | null
  lastCheckpoint?: ReferenceInput | null
}

export type UpdateControlStateInput = {
  status?: MyosControlStateStatus
  priority?: MyosControlStatePriority
  health?: MyosControlStateHealth
  currentSprint?: ReferenceInput | null
  lastCheckpoint?: ReferenceInput | null
}

export type CreateControlItemInput = {
  projectId: string
  type: MyosControlItemType
  title: string
  description?: string | null
  relationshipId?: string | null
}

export type UpdateControlItemInput = {
  status?: MyosControlItemStatus
  title?: string
  description?: string | null
  resolution?: string | null
}

export class ControlStateValidationError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'ControlStateValidationError'
    this.statusCode = statusCode
  }
}

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

const isOneOf = <T extends string>(values: readonly T[], value: string): value is T =>
  (values as readonly string[]).includes(value)

function validateReference(reference: ReferenceInput | null | undefined, label: string) {
  if (reference === null || reference === undefined) return
  if (!isOneOf(MYOS_CONTROL_REFERENCE_SOURCES, reference.source)) {
    throw new ControlStateValidationError(
      `Invalid ${label} source`,
    )
  }
  if (!reference.reference?.trim()) {
    throw new ControlStateValidationError(
      `${label} reference is required`,
    )
  }
  if (reference.id !== undefined && reference.id !== null && !reference.id.trim()) {
    throw new ControlStateValidationError(
      `${label} id cannot be empty`,
    )
  }
}

function toReference(
  id: string | null,
  source: MyosControlReferenceSource | null,
  reference: string | null,
  title: string | null,
): MyosControlStateReference | null {
  if (!id || !source || !reference) return null
  return { id, source, reference, title }
}

function toReferenceFromInput(input: ReferenceInput | null | undefined) {
  if (input === null || input === undefined) return null
  return {
    id: input.id ?? input.reference,
    source: input.source,
    reference: input.reference,
    title: input.title ?? null,
  }
}

function toControlState(row: ControlStateRow): MyosControlState {
  return {
    id: row.id,
    projectId: row.project_id,
    owner: 'MYOS',
    status: row.status,
    priority: row.priority,
    health: row.health,
    currentSprint: toReference(row.current_sprint_id, row.current_sprint_source, row.current_sprint_reference, row.current_sprint_title),
    lastCheckpoint: toReference(row.last_checkpoint_id, row.last_checkpoint_source, row.last_checkpoint_reference, row.last_checkpoint_title),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toControlItem(row: ControlItemRow): MyosControlItem {
  return {
    id: row.id,
    projectId: row.project_id,
    controlStateId: row.control_state_id,
    type: row.item_type,
    status: row.status,
    owner: 'MYOS',
    title: row.title,
    description: row.description,
    resolution: row.resolution,
    relationshipId: row.relationship_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
  }
}

async function assertProjectOwnedByUser(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
) {
  if (!isUuid(projectId)) {
    throw new ControlStateValidationError('Project ID must be a valid UUID')
  }

  const { data, error } = await supabase
    .from('myos_projects')
    .select('id,product_id,project_code,name,owner')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new ControlStateValidationError('MYOS project not found', 404)
  if (!data.product_id || !data.project_code) {
    throw new ControlStateValidationError('MYOS project is missing canonical registry fields')
  }
  return data
}

async function assertControlStateOwnedByUser(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
) {
  const { data, error } = await supabase
    .from('myos_project_control_states')
    .select('id,project_id,owner,status,priority,health,current_sprint_id,current_sprint_source,current_sprint_reference,current_sprint_title,last_checkpoint_id,last_checkpoint_source,last_checkpoint_reference,last_checkpoint_title,created_at,updated_at')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new ControlStateValidationError('Control State not found', 404)
  return data as ControlStateRow
}

async function assertRelationshipRelevant(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  relationshipId: string,
) {
  if (!isUuid(relationshipId)) {
    throw new ControlStateValidationError('Relationship ID must be a valid UUID')
  }

  const { data: relationship, error } = await supabase
    .from('myos_relationships')
    .select('id,source_entity_type,source_entity_id,relationship_type,target_entity_type,target_entity_id,owner,status,description,created_at,updated_at')
    .eq('id', relationshipId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!relationship) {
    throw new ControlStateValidationError('Referenced relationship not found', 404)
  }

  if (
    (relationship.source_entity_type === 'PROJECT' && relationship.source_entity_id === projectId)
    || (relationship.target_entity_type === 'PROJECT' && relationship.target_entity_id === projectId)
  ) return

  const { data: link, error: linkError } = await supabase
    .from('myos_project_links')
    .select('engineering_project_id')
    .eq('user_id', userId)
    .eq('myos_project_id', projectId)
    .maybeSingle()

  if (linkError) throw linkError
  const domainProjectId = link?.engineering_project_id

  if (
    domainProjectId
    && (
      (relationship.source_entity_type === 'DOMAIN_PROJECT' && relationship.source_entity_id === domainProjectId)
      || (relationship.target_entity_type === 'DOMAIN_PROJECT' && relationship.target_entity_id === domainProjectId)
    )
  ) return

  throw new ControlStateValidationError(
    'Referenced relationship is not relevant to this MYOS project',
  )
}

async function listItems(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
) {
  const { data, error } = await supabase
    .from('myos_control_items')
    .select('id,project_id,control_state_id,owner,item_type,status,title,description,resolution,relationship_id,created_at,updated_at,resolved_at')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as ControlItemRow[]).map(toControlItem)
}

export async function getControlState(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
) {
  await assertProjectOwnedByUser(supabase, userId, projectId)
  const state = await assertControlStateOwnedByUser(supabase, userId, projectId)
  return toControlState(state)
}

export async function listControlStates(
  supabase: SupabaseClient,
  userId: string,
  projectId?: string,
) {
  let query = supabase
    .from('myos_project_control_states')
    .select('id,project_id,owner,status,priority,health,current_sprint_id,current_sprint_source,current_sprint_reference,current_sprint_title,last_checkpoint_id,last_checkpoint_source,last_checkpoint_reference,last_checkpoint_title,created_at,updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (projectId) {
    if (!isUuid(projectId)) throw new ControlStateValidationError('Project ID must be a valid UUID')
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query
  if (error) throw error
  return ((data ?? []) as ControlStateRow[]).map(toControlState)
}

export async function createControlState(
  supabase: SupabaseClient,
  userId: string,
  input: CreateControlStateInput,
) {
  const project = await assertProjectOwnedByUser(supabase, userId, input.projectId)
  const status = input.status ?? 'PLANNED'
  const priority = input.priority ?? 'MEDIUM'
  const health = input.health ?? 'HEALTHY'

  if (!isOneOf(MYOS_CONTROL_STATE_STATUSES, status)) throw new ControlStateValidationError('Invalid control-state status')
  if (!isOneOf(MYOS_CONTROL_STATE_PRIORITIES, priority)) throw new ControlStateValidationError('Invalid control-state priority')
  if (!isOneOf(MYOS_CONTROL_STATE_HEALTHS, health)) throw new ControlStateValidationError('Invalid control-state health')
  validateReference(input.currentSprint, 'Current sprint')
  validateReference(input.lastCheckpoint, 'Last checkpoint')

  const { data, error } = await supabase
    .from('myos_project_control_states')
    .insert({
      user_id: userId,
      project_id: project.id,
      owner: 'MYOS',
      status,
      priority,
      health,
      current_sprint_id: input.currentSprint?.id ?? input.currentSprint?.reference ?? null,
      current_sprint_source: input.currentSprint?.source ?? null,
      current_sprint_reference: input.currentSprint?.reference ?? null,
      current_sprint_title: input.currentSprint?.title ?? null,
      last_checkpoint_id: input.lastCheckpoint?.id ?? input.lastCheckpoint?.reference ?? null,
      last_checkpoint_source: input.lastCheckpoint?.source ?? null,
      last_checkpoint_reference: input.lastCheckpoint?.reference ?? null,
      last_checkpoint_title: input.lastCheckpoint?.title ?? null,
    })
    .select('id,project_id,owner,status,priority,health,current_sprint_id,current_sprint_source,current_sprint_reference,current_sprint_title,last_checkpoint_id,last_checkpoint_source,last_checkpoint_reference,last_checkpoint_title,created_at,updated_at')
    .single()

  if (error) {
    if (error.code === '23505') throw new ControlStateValidationError('A current Control State already exists for this project', 409)
    throw error
  }

  return toControlState(data as ControlStateRow)
}

export async function updateControlState(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  input: UpdateControlStateInput,
) {
  await assertProjectOwnedByUser(supabase, userId, projectId)
  await assertControlStateOwnedByUser(supabase, userId, projectId)

  if (input.status !== undefined && !isOneOf(MYOS_CONTROL_STATE_STATUSES, input.status)) throw new ControlStateValidationError('Invalid control-state status')
  if (input.priority !== undefined && !isOneOf(MYOS_CONTROL_STATE_PRIORITIES, input.priority)) throw new ControlStateValidationError('Invalid control-state priority')
  if (input.health !== undefined && !isOneOf(MYOS_CONTROL_STATE_HEALTHS, input.health)) throw new ControlStateValidationError('Invalid control-state health')
  validateReference(input.currentSprint, 'Current sprint')
  validateReference(input.lastCheckpoint, 'Last checkpoint')

  const patch: Record<string, string | null> = {}
  if (input.status !== undefined) patch.status = input.status
  if (input.priority !== undefined) patch.priority = input.priority
  if (input.health !== undefined) patch.health = input.health
  if (input.currentSprint !== undefined) {
    const ref = toReferenceFromInput(input.currentSprint)
    patch.current_sprint_id = ref?.id ?? null
    patch.current_sprint_source = ref?.source ?? null
    patch.current_sprint_reference = ref?.reference ?? null
    patch.current_sprint_title = ref?.title ?? null
  }
  if (input.lastCheckpoint !== undefined) {
    const ref = toReferenceFromInput(input.lastCheckpoint)
    patch.last_checkpoint_id = ref?.id ?? null
    patch.last_checkpoint_source = ref?.source ?? null
    patch.last_checkpoint_reference = ref?.reference ?? null
    patch.last_checkpoint_title = ref?.title ?? null
  }

  if (Object.keys(patch).length === 0) return getControlState(supabase, userId, projectId)
  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('myos_project_control_states')
    .update(patch)
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .select('id,project_id,owner,status,priority,health,current_sprint_id,current_sprint_source,current_sprint_reference,current_sprint_title,last_checkpoint_id,last_checkpoint_source,last_checkpoint_reference,last_checkpoint_title,created_at,updated_at')
    .single()

  if (error) throw error
  return toControlState(data as ControlStateRow)
}

export async function getControlItems(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
) {
  await assertProjectOwnedByUser(supabase, userId, projectId)
  await assertControlStateOwnedByUser(supabase, userId, projectId)
  return listItems(supabase, userId, projectId)
}

export async function createControlItem(
  supabase: SupabaseClient,
  userId: string,
  input: CreateControlItemInput,
) {
  await assertProjectOwnedByUser(supabase, userId, input.projectId)
  const state = await assertControlStateOwnedByUser(supabase, userId, input.projectId)

  if (!isOneOf(MYOS_CONTROL_ITEM_TYPES, input.type)) throw new ControlStateValidationError('Invalid control-item type')
  if (!input.title?.trim()) throw new ControlStateValidationError('Control-item title is required')
  if (input.relationshipId) await assertRelationshipRelevant(supabase, userId, input.projectId, input.relationshipId)

  const { data, error } = await supabase
    .from('myos_control_items')
    .insert({
      user_id: userId,
      project_id: input.projectId,
      control_state_id: state.id,
      owner: 'MYOS',
      item_type: input.type,
      status: 'ACTIVE',
      title: input.title.trim(),
      description: input.description ?? null,
      relationship_id: input.relationshipId ?? null,
    })
    .select('id,project_id,control_state_id,owner,item_type,status,title,description,resolution,relationship_id,created_at,updated_at,resolved_at')
    .single()

  if (error) {
    if (error.code === '23505' && input.type === 'NEXT_ACTION') {
      throw new ControlStateValidationError('An active Next Action already exists for this project', 409)
    }
    throw error
  }

  return toControlItem(data as ControlItemRow)
}

export async function updateControlItem(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
  input: UpdateControlItemInput,
) {
  if (!isUuid(itemId)) throw new ControlStateValidationError('Control-item ID must be a valid UUID')
  if (input.status !== undefined && !isOneOf(MYOS_CONTROL_ITEM_STATUSES, input.status)) throw new ControlStateValidationError('Invalid control-item status')
  if (input.title !== undefined && !input.title.trim()) throw new ControlStateValidationError('Control-item title cannot be empty')

  const { data: current, error: currentError } = await supabase
    .from('myos_control_items')
    .select('id,project_id,control_state_id,owner,item_type,status,title,description,resolution,relationship_id,created_at,updated_at,resolved_at')
    .eq('id', itemId)
    .eq('user_id', userId)
    .maybeSingle()

  if (currentError) throw currentError
  if (!current) throw new ControlStateValidationError('Control item not found', 404)

  const patch: Record<string, string | null> = {}
  if (input.status !== undefined) {
    patch.status = input.status
    patch.resolved_at = input.status === 'ACTIVE' ? null : new Date().toISOString()
  }
  if (input.title !== undefined) patch.title = input.title.trim()
  if (input.description !== undefined) patch.description = input.description
  if (input.resolution !== undefined) patch.resolution = input.resolution
  if (Object.keys(patch).length === 0) return toControlItem(current as ControlItemRow)
  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('myos_control_items')
    .update(patch)
    .eq('id', itemId)
    .eq('user_id', userId)
    .select('id,project_id,control_state_id,owner,item_type,status,title,description,resolution,relationship_id,created_at,updated_at,resolved_at')
    .single()

  if (error) {
    if (error.code === '23505' && current.item_type === 'NEXT_ACTION' && input.status === 'ACTIVE') {
      throw new ControlStateValidationError('An active Next Action already exists for this project', 409)
    }
    throw error
  }
  return toControlItem(data as ControlItemRow)
}

async function getProjectSnapshot(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<MyosProjectControlSnapshot> {
  const project = await assertProjectOwnedByUser(supabase, userId, projectId)
  const state = await listControlStates(supabase, userId, projectId)
  const controlState = state[0] ?? null
  const items = controlState ? await listItems(supabase, userId, projectId) : []

  const { data: product, error: productError } = await supabase
    .from('myos_products')
    .select('id,code,name')
    .eq('id', project.product_id)
    .maybeSingle()
  if (productError) throw productError

  const directRelationships = await listCanonicalRelationships(supabase, userId, {
    entityType: 'PROJECT',
    entityId: projectId,
  })

  const { data: link, error: linkError } = await supabase
    .from('myos_project_links')
    .select('engineering_project_id')
    .eq('user_id', userId)
    .eq('myos_project_id', projectId)
    .maybeSingle()
  if (linkError) throw linkError

  let domainRelationships: CanonicalRelationship[] = []
  if (link?.engineering_project_id) {
    domainRelationships = await listCanonicalRelationships(supabase, userId, {
      entityType: 'DOMAIN_PROJECT',
      entityId: link.engineering_project_id,
    })
  }

  const relationshipMap = new Map<string, CanonicalRelationship>()
  for (const relationship of [...directRelationships, ...domainRelationships]) {
    relationshipMap.set(relationship.id, relationship)
  }

  return {
    project: {
      id: project.id,
      productId: project.product_id,
      projectCode: project.project_code,
      name: project.name,
      owner: project.owner,
    },
    product: product ?? null,
    controlState,
    activeBlockers: items.filter((item) => item.type === 'BLOCKER' && item.status === 'ACTIVE'),
    activeRisks: items.filter((item) => item.type === 'RISK' && item.status === 'ACTIVE'),
    nextAction: items.find((item) => item.type === 'NEXT_ACTION' && item.status === 'ACTIVE') ?? null,
    relevantRelationships: [...relationshipMap.values()],
  }
}

export async function getProjectControlSnapshot(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
) {
  return getProjectSnapshot(supabase, userId, projectId)
}

export async function getCrossProjectControlSnapshot(
  supabase: SupabaseClient,
  userId: string,
): Promise<MyosCrossProjectControlSnapshot> {
  const { data: projects, error } = await supabase
    .from('myos_projects')
    .select('id')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error

  const snapshots: MyosProjectControlSnapshot[] = []
  for (const project of projects ?? []) {
    snapshots.push(await getProjectSnapshot(supabase, userId, project.id))
  }

  return { projects: snapshots }
}

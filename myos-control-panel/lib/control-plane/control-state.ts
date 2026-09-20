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


type AggregationProjectRow = {
  id: string
  product_id: string | null
  project_code: string | null
  name: string
  owner: string
  status: string
}
type AggregationProductRow = { id: string; code: string; name: string; status: string }
type AggregationLinkRow = { myos_project_id: string; engineering_project_id: string }
type AggregationControlStateRow = ControlStateRow
type AggregationControlItemRow = ControlItemRow

function compareStrings(a: string, b: string) { return a < b ? -1 : a > b ? 1 : 0 }
function compareRelationships(a: CanonicalRelationship, b: CanonicalRelationship) {
  return compareStrings(a.relationshipType, b.relationshipType)
    || compareStrings(a.sourceEntityType, b.sourceEntityType)
    || compareStrings(a.sourceEntityId, b.sourceEntityId)
    || compareStrings(a.targetEntityType, b.targetEntityType)
    || compareStrings(a.targetEntityId, b.targetEntityId)
    || compareStrings(a.id, b.id)
}
function compareItems(a: MyosControlItem, b: MyosControlItem) {
  return compareStrings(a.createdAt, b.createdAt) || compareStrings(a.id, b.id)
}
function isHistoricalStatus(status: string | null) {
  return status === 'COMPLETED' || status === 'ARCHIVED'
}
function normalizeRegistryStatus(status: string | null) {
  return status?.trim().toLowerCase() ?? ''
}
function shouldIncludeProject(scope: MyosControlContextScope, registryStatus: string, state: MyosControlState | null) {
  if (scope === 'all') return true
  if (state) return !isHistoricalStatus(state.status)
  const normalized = normalizeRegistryStatus(registryStatus)
  return normalized !== 'completed' && normalized !== 'archived'
}
function lifecycleFor(scope: MyosControlContextScope, registryStatus: string, state: MyosControlState | null) {
  if (!state) return {
    source: 'PROJECT_REGISTRY' as const,
    state: registryStatus || null,
    included: shouldIncludeProject(scope, registryStatus, state),
    reason: 'MISSING_STATE' as const,
  }
  return {
    source: 'CONTROL_STATE' as const,
    state: state.status,
    included: shouldIncludeProject(scope, registryStatus, state),
    reason: scope === 'all' ? 'HISTORICAL_SCOPE' as const : 'ACTIVE_SCOPE' as const,
  }
}
function emptyStatusCounts(): Record<MyosControlStateStatus, number> {
  return { PLANNED: 0, ACTIVE: 0, PAUSED: 0, COMPLETED: 0, ARCHIVED: 0 }
}
function emptyPriorityCounts(): Record<MyosControlStatePriority, number> {
  return { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
}
function emptyHealthCounts(): Record<MyosControlStateHealth, number> {
  return { HEALTHY: 0, ATTENTION: 0, AT_RISK: 0, CRITICAL: 0 }
}
function buildProductIndicators(projects: MyosProjectControlContext[]) {
  const statusCounts = emptyStatusCounts()
  const priorityCounts = emptyPriorityCounts()
  const healthCounts = emptyHealthCounts()
  let activeBlockerCount = 0
  let activeRiskCount = 0
  let nextActionCount = 0
  for (const project of projects) {
    if (project.controlState) {
      statusCounts[project.controlState.status] += 1
      priorityCounts[project.controlState.priority] += 1
      healthCounts[project.controlState.health] += 1
    }
    activeBlockerCount += project.activeBlockers.length
    activeRiskCount += project.activeRisks.length
    if (project.nextAction) nextActionCount += 1
  }
  return { projectCount: projects.length, statusCounts, priorityCounts, healthCounts, activeBlockerCount, activeRiskCount, nextActionCount }
}

export type ControlContextOptions = {
  scope?: MyosControlContextScope
  projectId?: string
  productId?: string
}

async function loadAggregationInputs(supabase: SupabaseClient, userId: string) {
  const [projectResult, productResult, stateResult, itemResult, linkResult, relationshipResult] = await Promise.all([
    supabase.from('myos_projects').select('id,product_id,project_code,name,owner,status').eq('user_id', userId).not('product_id', 'is', null).not('project_code', 'is', null),
    supabase.from('myos_products').select('id,code,name,status'),
    supabase.from('myos_project_control_states').select('id,project_id,owner,status,priority,health,current_sprint_id,current_sprint_source,current_sprint_reference,current_sprint_title,last_checkpoint_id,last_checkpoint_source,last_checkpoint_reference,last_checkpoint_title,created_at,updated_at').eq('user_id', userId),
    supabase.from('myos_control_items').select('id,project_id,control_state_id,owner,item_type,status,title,description,resolution,relationship_id,created_at,updated_at,resolved_at').eq('user_id', userId),
    supabase.from('myos_project_links').select('myos_project_id,engineering_project_id').eq('user_id', userId),
    listCanonicalRelationships(supabase, userId),
  ])
  for (const result of [projectResult, productResult, stateResult, itemResult, linkResult]) {
    if (result.error) throw result.error
  }
  return {
    projects: (projectResult.data ?? []) as AggregationProjectRow[],
    products: (productResult.data ?? []) as AggregationProductRow[],
    states: (stateResult.data ?? []) as AggregationControlStateRow[],
    items: (itemResult.data ?? []) as AggregationControlItemRow[],
    links: (linkResult.data ?? []) as AggregationLinkRow[],
    relationships: relationshipResult,
  }
}

function relationshipTouchesEntities(relationship: CanonicalRelationship, entities: Set<string>) {
  const source = \${relationship.sourceEntityType}:\${relationship.sourceEntityId}
  const target = \${relationship.targetEntityType}:\${relationship.targetEntityId}
  return entities.has(source) || entities.has(target)
}

function buildProjectContext(
  project: AggregationProjectRow,
  product: AggregationProductRow | null,
  state: MyosControlState | null,
  items: MyosControlItem[],
  link: AggregationLinkRow | null,
  relationships: CanonicalRelationship[],
  scope: MyosControlContextScope,
): MyosProjectControlContext {
  const entities = new Set<string>([
    \`PROJECT:\${project.id}\`,
    ...(product ? [\`PRODUCT:\${product.id}\`] : []),
    ...(link ? [\`DOMAIN_PROJECT:\${link.engineering_project_id}\`] : []),
  ])
  const relevantRelationships = relationships.filter((relationship) => relationshipTouchesEntities(relationship, entities)).sort(compareRelationships)
  return {
    project: {
      id: project.id,
      productId: project.product_id as string,
      projectCode: project.project_code as string,
      name: project.name,
      owner: project.owner,
      registryStatus: project.status,
    },
    product: product ? { id: product.id, code: product.code, name: product.name } : null,
    controlState: state,
    lifecycle: lifecycleFor(scope, project.status, state),
    activeBlockers: items.filter((item) => item.type === 'BLOCKER' && item.status === 'ACTIVE').sort(compareItems),
    activeRisks: items.filter((item) => item.type === 'RISK' && item.status === 'ACTIVE').sort(compareItems),
    nextAction: items.filter((item) => item.type === 'NEXT_ACTION' && item.status === 'ACTIVE').sort(compareItems)[0] ?? null,
    currentSprint: state?.currentSprint ?? null,
    lastCheckpoint: state?.lastCheckpoint ?? null,
    relevantRelationships,
    relevantIntegrationRelationships: relevantRelationships.filter((relationship) => relationship.relationshipType === 'INTEGRATION').sort(compareRelationships),
  }
}

function buildProductContext(product: AggregationProductRow, projects: MyosProjectControlContext[]): MyosProductControlContext {
  const associatedProjects = projects.filter((project) => project.project.productId === product.id).sort((a, b) =>
    compareStrings(a.project.projectCode, b.project.projectCode) || compareStrings(a.project.id, b.project.id)
  )
  return {
    product: { id: product.id, code: product.code, name: product.name, status: product.status },
    projects: associatedProjects,
    indicators: buildProductIndicators(associatedProjects),
  }
}

export async function getProjectControlContext(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  options: Omit<ControlContextOptions, 'projectId' | 'productId'> = {},
): Promise<MyosProjectControlContext> {
  if (!isUuid(projectId)) throw new ControlStateValidationError('Project ID must be a valid UUID')
  const scope = options.scope ?? 'active'
  if (!isOneOf(MYOS_CONTROL_CONTEXT_SCOPES, scope)) throw new ControlStateValidationError('Invalid control-context scope')
  const inputs = await loadAggregationInputs(supabase, userId)
  const project = inputs.projects.find((candidate) => candidate.id === projectId)
  if (!project) throw new ControlStateValidationError('MYOS project not found', 404)
  const product = inputs.products.find((candidate) => candidate.id === project.product_id) ?? null
  const stateRow = inputs.states.find((candidate) => candidate.project_id === projectId) ?? null
  const state = stateRow ? toControlState(stateRow) : null
  const items = inputs.items.filter((item) => item.project_id === projectId).map(toControlItem)
  const context = buildProjectContext(project, product, state, items, inputs.links.find((link) => link.myos_project_id === projectId) ?? null, inputs.relationships, scope)
  if (!context.lifecycle.included && scope === 'active') throw new ControlStateValidationError('Project is outside the active control-context scope', 404)
  return context
}

export async function getCrossProjectControlContext(
  supabase: SupabaseClient,
  userId: string,
  options: ControlContextOptions = {},
): Promise<MyosCrossProjectControlContext> {
  const scope = options.scope ?? 'active'
  if (!isOneOf(MYOS_CONTROL_CONTEXT_SCOPES, scope)) throw new ControlStateValidationError('Invalid control-context scope')
  const inputs = await loadAggregationInputs(supabase, userId)
  let projects = inputs.projects
  if (options.projectId) {
    if (!isUuid(options.projectId)) throw new ControlStateValidationError('Project ID must be a valid UUID')
    projects = projects.filter((project) => project.id === options.projectId)
  }
  if (options.productId) {
    if (!isUuid(options.productId)) throw new ControlStateValidationError('Product ID must be a valid UUID')
    projects = projects.filter((project) => project.product_id === options.productId)
  }
  const projectContexts = projects.map((project) => {
    const product = inputs.products.find((candidate) => candidate.id === project.product_id) ?? null
    const stateRow = inputs.states.find((candidate) => candidate.project_id === project.id) ?? null
    const state = stateRow ? toControlState(stateRow) : null
    const items = inputs.items.filter((item) => item.project_id === project.id).map(toControlItem)
    return buildProjectContext(project, product, state, items, inputs.links.find((link) => link.myos_project_id === project.id) ?? null, inputs.relationships, scope)
  }).filter((context) => context.lifecycle.included).sort((a, b) =>
    compareStrings(a.product?.code ?? '', b.product?.code ?? '') || compareStrings(a.project.projectCode, b.project.projectCode) || compareStrings(a.project.id, b.project.id)
  )
  const projectEntityIds = new Set<string>()
  for (const context of projectContexts) {
    projectEntityIds.add(\`PROJECT:\${context.project.id}\`)
    projectEntityIds.add(\`PRODUCT:\${context.project.productId}\`)
    const link = inputs.links.find((candidate) => candidate.myos_project_id === context.project.id)
    if (link) projectEntityIds.add(\`DOMAIN_PROJECT:\${link.engineering_project_id}\`)
  }
  const relevantRelationships = inputs.relationships.filter((relationship) => relationshipTouchesEntities(relationship, projectEntityIds)).sort(compareRelationships)
  const productContexts = inputs.products.filter((product) => projectContexts.some((project) => project.project.productId === product.id)).map((product) => buildProductContext(product, projectContexts)).sort((a, b) =>
    compareStrings(a.product.code, b.product.code) || compareStrings(a.product.id, b.product.id)
  )
  return {
    scope,
    projects: projectContexts,
    products: productContexts,
    relevantRelationships,
    relevantIntegrationRelationships: relevantRelationships.filter((relationship) => relationship.relationshipType === 'INTEGRATION').sort(compareRelationships),
  }
}

export async function getProjectControlSnapshot(supabase: SupabaseClient, userId: string, projectId: string) {
  return getProjectControlContext(supabase, userId, projectId)
}
export async function getCrossProjectControlSnapshot(supabase: SupabaseClient, userId: string) {
  return getCrossProjectControlContext(supabase, userId)
}

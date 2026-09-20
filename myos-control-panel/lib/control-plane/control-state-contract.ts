/**
 * MYOS Control Plane — R3 canonical Control State + R4 derived aggregation contracts.
 *
 * R3 owns canonical project control state.
 * R4 derives read-time Project, Cross-Project, and Product Control Context.
 *
 * Derived R4 context is never a source of truth and is never persisted.
 */

export const MYOS_CONTROL_STATE_STATUSES = [
  'PLANNED',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'ARCHIVED',
] as const
export type MyosControlStateStatus = (typeof MYOS_CONTROL_STATE_STATUSES)[number]

export const MYOS_CONTROL_STATE_PRIORITIES = [
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
] as const
export type MyosControlStatePriority = (typeof MYOS_CONTROL_STATE_PRIORITIES)[number]

export const MYOS_CONTROL_STATE_HEALTHS = [
  'HEALTHY',
  'ATTENTION',
  'AT_RISK',
  'CRITICAL',
] as const
export type MyosControlStateHealth = (typeof MYOS_CONTROL_STATE_HEALTHS)[number]

export const MYOS_CONTROL_ITEM_TYPES = [
  'BLOCKER',
  'RISK',
  'NEXT_ACTION',
] as const
export type MyosControlItemType = (typeof MYOS_CONTROL_ITEM_TYPES)[number]

export const MYOS_CONTROL_ITEM_STATUSES = [
  'ACTIVE',
  'RESOLVED',
  'DISMISSED',
] as const
export type MyosControlItemStatus = (typeof MYOS_CONTROL_ITEM_STATUSES)[number]

export const MYOS_CONTROL_REFERENCE_SOURCES = [
  'NOTION',
  'PROJECT',
  'EXTERNAL',
] as const
export type MyosControlReferenceSource = (typeof MYOS_CONTROL_REFERENCE_SOURCES)[number]

export type MyosControlStateReference = {
  id?: string | null
  source: MyosControlReferenceSource
  reference: string
  title?: string | null
}

export type MyosControlState = {
  id: string
  projectId: string
  owner: 'MYOS'
  status: MyosControlStateStatus
  priority: MyosControlStatePriority
  health: MyosControlStateHealth
  currentSprint?: MyosControlStateReference | null
  lastCheckpoint?: MyosControlStateReference | null
  createdAt: string
  updatedAt: string
}

export type MyosControlItem = {
  id: string
  projectId: string
  controlStateId: string
  type: MyosControlItemType
  status: MyosControlItemStatus
  owner: 'MYOS'
  title: string
  description?: string | null
  resolution?: string | null
  relationshipId?: string | null
  createdAt: string
  updatedAt: string
  resolvedAt?: string | null
}

import type { CanonicalRelationship } from './registry-contract'

export const MYOS_CONTROL_CONTEXT_SCOPES = ['active', 'all'] as const
export type MyosControlContextScope = (typeof MYOS_CONTROL_CONTEXT_SCOPES)[number]

export type MyosControlContextLifecycle = {
  source: 'CONTROL_STATE' | 'PROJECT_REGISTRY'
  state: MyosControlStateStatus | string | null
  included: boolean
  reason: 'ACTIVE_SCOPE' | 'HISTORICAL_SCOPE' | 'MISSING_STATE'
}

export type MyosProjectControlContext = {
  project: {
    id: string
    productId: string
    projectCode: string
    name: string
    owner: string
    registryStatus: string
  }
  product: {
    id: string
    code: string
    name: string
  } | null
  controlState: MyosControlState | null
  lifecycle: MyosControlContextLifecycle
  activeBlockers: MyosControlItem[]
  activeRisks: MyosControlItem[]
  nextAction: MyosControlItem | null
  currentSprint: MyosControlStateReference | null
  lastCheckpoint: MyosControlStateReference | null
  relevantRelationships: CanonicalRelationship[]
  relevantIntegrationRelationships: CanonicalRelationship[]
}

export type MyosProductControlContext = {
  product: {
    id: string
    code: string
    name: string
    status: string
  }
  projects: MyosProjectControlContext[]
  indicators: {
    projectCount: number
    statusCounts: Record<MyosControlStateStatus, number>
    priorityCounts: Record<MyosControlStatePriority, number>
    healthCounts: Record<MyosControlStateHealth, number>
    activeBlockerCount: number
    activeRiskCount: number
    nextActionCount: number
  }
}

export type MyosCrossProjectControlContext = {
  scope: MyosControlContextScope
  projects: MyosProjectControlContext[]
  products: MyosProductControlContext[]
  relevantRelationships: CanonicalRelationship[]
  relevantIntegrationRelationships: CanonicalRelationship[]
}

export const MYOS_CONTROL_STATE_SEMANTICS = {
  ownership: 'MYOS',
  authoritative: [
    'status',
    'priority',
    'health',
    'blockers',
    'risks',
    'nextAction',
  ],
  referenced: [
    'currentSprint',
    'lastCheckpoint',
  ],
  derived: [
    'projectControlContext',
    'crossProjectControlContext',
    'productControlContext',
  ],
  rules: {
    blockedIsNotAStatus: true,
    healthIsQualitative: true,
    healthHasNoNumericScore: true,
    controlItemsAreNotTasks: true,
    sprintAndCheckpointAreReferencesOnly: true,
    productControlStateIsOutOfScope: true,
    relationshipRegistryIsR2Canonical: true,
    aggregationIsReadTime: true,
    aggregationIsDeterministic: true,
    aggregationUsesNoAiInference: true,
    aggregationUsesNoPersistence: true,
    missingStateRemainsVisible: true,
    operationalDataIsOutOfScope: true,
  },
} as const

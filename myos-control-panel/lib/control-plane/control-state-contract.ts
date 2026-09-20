/**
 * MYOS Control Plane — R3 canonical Control State semantics.
 *
 * Control State is MYOS-owned project coordination state. It is not the
 * operational state owned by an individual project.
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

export type MyosProjectControlSnapshot = {
  project: {
    id: string
    productId: string
    projectCode: string
    name: string
    owner: string
  }
  product: {
    id: string
    code: string
    name: string
  } | null
  controlState: MyosControlState | null
  activeBlockers: MyosControlItem[]
  activeRisks: MyosControlItem[]
  nextAction: MyosControlItem | null
  relevantRelationships: CanonicalRelationship[]
}

export type MyosCrossProjectControlSnapshot = {
  projects: MyosProjectControlSnapshot[]
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
    'projectControlSnapshot',
    'crossProjectControlSnapshot',
  ],
  rules: {
    blockedIsNotAStatus: true,
    healthIsQualitative: true,
    healthHasNoNumericScore: true,
    controlItemsAreNotTasks: true,
    sprintAndCheckpointAreReferencesOnly: true,
    productControlStateIsOutOfScope: true,
    relationshipRegistryIsR2Canonical: true,
  },
} as const

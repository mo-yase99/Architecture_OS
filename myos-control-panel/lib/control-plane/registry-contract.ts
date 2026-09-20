/**
 * MYOS Control Plane — R1/R2 Canonical Registry Contracts
 *
 * R1 established Product and Project persistence.
 * R2 establishes typed cross-project relationship semantics and persistence.
 */

export const MYOS_PRODUCT_CODES = [
  'P01',
  'P02',
  'P03',
  'P04',
  'P05',
  'P06',
] as const

export type MyosProductCode = (typeof MYOS_PRODUCT_CODES)[number]

export const MYOS_RELATIONSHIP_TYPES = [
  'DEPENDENCY',
  'INTEGRATION',
  'SHARED_SERVICE',
  'SHARED_KNOWLEDGE',
  'SHARED_DATA',
  'SHARED_BRAND',
] as const

export type MyosRelationshipType = (typeof MYOS_RELATIONSHIP_TYPES)[number]

export const MYOS_RELATIONSHIP_LIFECYCLE_STATES = [
  'planned',
  'active',
  'blocked',
  'inactive',
  'deprecated',
] as const

export type MyosRelationshipLifecycleState =
  (typeof MYOS_RELATIONSHIP_LIFECYCLE_STATES)[number]

export const MYOS_RELATIONSHIP_PARTICIPANT_TYPES = [
  'PRODUCT',
  'PROJECT',
  'DOMAIN_PROJECT',
] as const

export type MyosRelationshipParticipantType =
  (typeof MYOS_RELATIONSHIP_PARTICIPANT_TYPES)[number]

export const MYOS_SYMMETRIC_RELATIONSHIP_TYPES = [
  'SHARED_SERVICE',
  'SHARED_KNOWLEDGE',
  'SHARED_DATA',
  'SHARED_BRAND',
] as const

export const MYOS_DIRECTIONAL_RELATIONSHIP_TYPES = [
  'DEPENDENCY',
  'INTEGRATION',
] as const

export const MYOS_RELATIONSHIP_PARTICIPANT_PAIRS = [
  ['PRODUCT', 'PRODUCT'],
  ['PRODUCT', 'PROJECT'],
  ['PRODUCT', 'DOMAIN_PROJECT'],
  ['PROJECT', 'PROJECT'],
  ['PROJECT', 'DOMAIN_PROJECT'],
  ['DOMAIN_PROJECT', 'DOMAIN_PROJECT'],
] as const

export type RegistryEntityType =
  | 'PRODUCT'
  | 'PROJECT'
  | 'DOMAIN_PROJECT'
  | 'RELATIONSHIP'
  | 'INTEGRATION'

export type RegistryOwnership =
  | 'MYOS'
  | 'ARCHITECTURE_OS'
  | 'FIELDOS'
  | 'CONTENT_OS'
  | 'PROFESSIONAL_WEBSITE'
  | 'BUSINESS_LAB'
  | 'SHARED'

export interface CanonicalProduct {
  id: string
  code: MyosProductCode
  name: string
  type: string
  status: string
  description?: string | null
  owner: RegistryOwnership
  primaryDomain?: string | null
  repositoryReference?: string | null
  databaseReference?: string | null
  deploymentReference?: string | null
  createdAt: string
  updatedAt: string
}

export interface CanonicalMyosProject {
  id: string
  productId: string
  projectCode: string
  name: string
  status: string
  projectType?: string | null
  owner: RegistryOwnership
  description?: string | null
  domainReference?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CanonicalRelationship {
  id: string
  sourceEntityType: MyosRelationshipParticipantType
  sourceEntityId: string
  relationshipType: MyosRelationshipType
  targetEntityType: MyosRelationshipParticipantType
  targetEntityId: string
  owner: 'MYOS'
  status: MyosRelationshipLifecycleState
  description?: string | null
  createdAt: string
  updatedAt: string
}

export interface CanonicalIntegration {
  id: string
  sourceProductId: string
  targetProductId: string
  integrationType: string
  status: string
  direction?: string | null
  capability?: string | null
  endpointReference?: string | null
  provider?: string | null
  lastVerifiedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface MyosProjectDomainBridge {
  myosProjectId: string
  domainProjectId: string
  domainOwner: RegistryOwnership
  confidence: number
  matchMethod: string
}

export const REGISTRY_OWNERSHIP = {
  PRODUCT: 'MYOS',
  MYOS_PROJECT: 'MYOS',
  RELATIONSHIP: 'MYOS',
  INTEGRATION: 'MYOS',
  ARCHITECTURE_DOMAIN_PROJECT: 'ARCHITECTURE_OS',
  ARCHITECTURE_BOQ: 'ARCHITECTURE_OS',
  ARCHITECTURE_DRAWINGS: 'ARCHITECTURE_OS',
  ARCHITECTURE_SITE_OPERATIONS: 'ARCHITECTURE_OS',
  ARCHITECTURE_DOMAIN_ENGINES: 'ARCHITECTURE_OS',
  CROSS_PROJECT_COORDINATION: 'MYOS',
} as const

export const MYOS_PROJECT_IS_NOT_DOMAIN_PROJECT = true as const

export const MYOS_PRODUCTS = [
  { code: 'P01', name: 'MYOS', owner: 'MYOS' },
  { code: 'P02', name: 'Architecture OS', owner: 'ARCHITECTURE_OS' },
  { code: 'P03', name: 'FIELDOS', owner: 'FIELDOS' },
  { code: 'P04', name: 'Content OS', owner: 'CONTENT_OS' },
  { code: 'P05', name: 'Professional Website', owner: 'PROFESSIONAL_WEBSITE' },
  { code: 'P06', name: 'Business Lab', owner: 'BUSINESS_LAB' },
] as const

export const CONTROL_PLANE_REGISTRY_API = {
  products: '/api/control-plane/products',
  projects: '/api/control-plane/projects',
  relationships: '/api/control-plane/relationships',
  integrations: '/api/control-plane/integrations',
} as const

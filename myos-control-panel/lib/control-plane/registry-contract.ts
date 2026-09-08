/**
 * MYOS Control Plane — R1 Canonical Registry Contract
 *
 * R1-T01 establishes the semantic contract only.
 * It intentionally does not prescribe a new database table for Products,
 * Relationships, or Integrations. Physical persistence is decided by the
 * following implementation tasks after existing structures are reconciled.
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

/**
 * Canonical product identity. Persistence is intentionally abstract here.
 * R1-T02 decides whether the existing portfolio representation can safely
 * back this contract or whether a dedicated product entity is required.
 */
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

/**
 * Canonical MYOS project identity. This is NOT the Architecture OS domain
 * project entity. A domain project is referenced through myos_project_links.
 */
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
  sourceEntityType: RegistryEntityType
  sourceEntityId: string
  relationshipType: MyosRelationshipType
  targetEntityType: RegistryEntityType
  targetEntityId: string
  status: string
  description?: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Integration records describe a system-to-system contract/state only.
 * Secrets, tokens, passwords, service-role keys, and credentials are never
 * part of this contract.
 */
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

/**
 * Canonical ownership rules for R1.
 * Domain operational data remains owned by the domain product.
 */
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

/**
 * Explicit boundary invariant used by subsequent R1 tasks.
 */
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

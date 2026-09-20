# R2 — Relationship & Cross-Project Semantics

## Inspection result

No existing MYOS-owned relationship registry was found.

Existing relationship-like structures were inspected:
- myos_project_links is the existing MYOS ↔ Architecture OS bridge and remains unchanged.
- project_knowledge_links is domain/project knowledge infrastructure and is not a MYOS cross-project relationship registry.
- CanonicalRelationship already existed in the R1 contract, but had no persistence, service, API, or RLS implementation.
- /api/control-plane/relationships was declared in the canonical API map but did not exist as an implementation.

Conclusion: R2 requires a new minimum MYOS-owned relationship persistence entity.

## Canonical semantics

Participants are exactly:
- PRODUCT
- PROJECT
- DOMAIN_PROJECT

Allowed participant combinations:
- PRODUCT → PRODUCT
- PRODUCT → PROJECT
- PRODUCT → DOMAIN_PROJECT
- PROJECT → PROJECT
- PROJECT → DOMAIN_PROJECT
- DOMAIN_PROJECT → DOMAIN_PROJECT

Self-reference is rejected.

Relationship types:
- DEPENDENCY
- INTEGRATION
- SHARED_SERVICE
- SHARED_KNOWLEDGE
- SHARED_DATA
- SHARED_BRAND

DEPENDENCY and INTEGRATION preserve source → target direction.

SHARED_SERVICE, SHARED_KNOWLEDGE, SHARED_DATA, and SHARED_BRAND are symmetric. Their stored participant order is canonicalized using the participant rank PRODUCT → PROJECT → DOMAIN_PROJECT, then participant ID.

Multiple relationship types between the same participants are valid.

The same relationship type cannot be duplicated. Directional relationships use source + target identity. Symmetric relationships use canonical participant identity so A ↔ B and B ↔ A cannot coexist.

Reciprocal DEPENDENCY is not rejected or normalized by R2. It remains technically representable because the approved contract does not require graph-level reciprocal-dependency enforcement.

## Ownership and authorization

Canonical relationship ownership is MYOS.

user_id is retained only as the authenticated access boundary. It is not the semantic owner.

The relationship table:
- enables RLS;
- denies anon;
- grants CRUD to authenticated;
- restricts every row to the authenticated user's user_id;
- uses no service-role bypass.

## Lifecycle

Supported states:
- planned
- active
- blocked
- inactive
- deprecated

Lifecycle is metadata only.

A newly created active relationship requires both participants to be active and eligible for the authenticated MYOS user.

Changing a relationship to active performs the same participant eligibility validation.

Historical inactive and deprecated relationships remain representable.

## Persistence

Table:
public.myos_relationships

Core fields:
- id
- user_id
- owner fixed to MYOS
- source_entity_type
- source_entity_id
- relationship_type
- target_entity_type
- target_entity_id
- status
- description
- created_at
- updated_at

Database constraints enforce:
- participant type vocabulary;
- relationship type vocabulary;
- lifecycle vocabulary;
- approved participant-pair combinations;
- self-reference rejection;
- MYOS ownership value;
- directional uniqueness;
- symmetric logical uniqueness.

## Service

myos-control-panel/lib/control-plane/relationships.ts

Responsibilities:
- semantic validation;
- participant normalization for symmetric relationships;
- active-participant eligibility;
- canonical mapping;
- filtered relationship queries;
- relationship creation;
- lifecycle/description update.

No integration execution or cross-project domain logic is implemented.

## API

GET /api/control-plane/relationships

Supports filters:
- entityType
- entityId
- relationshipType
- status

POST /api/control-plane/relationships

Creates a canonical relationship.

PATCH /api/control-plane/relationships/:id

Updates lifecycle state and/or description.

All routes require an authenticated Supabase session.

## Boundary preservation

R2 does not modify:
- public.myos_products
- public.myos_projects
- public.myos_project_links
- public.projects

No Architecture OS migration or domain-project business logic was introduced.

No Integration Registry or integration infrastructure was introduced.

## Verification handoff matrix

04 — TEST & DEBUG should verify:

### Semantic
- all six participant combinations;
- all six relationship types;
- invalid participant combinations;
- invalid relationship types;
- invalid lifecycle states;
- self-reference rejection;
- directional source/target preservation;
- symmetric canonicalization;
- symmetric reverse duplicate rejection;
- directional duplicate rejection;
- multiple relationship types for one participant pair;
- reciprocal DEPENDENCY behavior;
- active relationship participant eligibility;
- inactive/deprecated historical representation.

### Security
- unauthenticated GET/POST/PATCH rejection;
- authenticated user isolation;
- INSERT ownership enforcement;
- UPDATE ownership enforcement;
- SELECT ownership enforcement;
- no service-role path;
- no cross-user relationship leakage.

### Regression
- Product Registry unchanged;
- Project Registry unchanged;
- existing project API unchanged;
- myos_project_links unchanged;
- public.projects unchanged;
- P02–P06 untouched.

## Implementation boundary

R2 stops at semantic control-plane relationship capability.

Out of scope:
- integration infrastructure;
- webhooks;
- queues;
- event buses;
- automation;
- notifications;
- analytics;
- graph engines;
- dashboard/UI redesign;
- R3 work.

# R4 — Control Plane Aggregation

## Scope

R4 is a read-time, derived, deterministic aggregation boundary inside P01 — MYOS.

It consumes canonical R1/R2/R3 state and bounded references. It does not persist snapshots and does not own operational project data.

## Canonical inputs

Authoritative MYOS sources:
- `myos_products`
- `myos_projects`
- `myos_relationships`
- `myos_project_control_states`
- `myos_control_items`

Bounded reference source:
- `myos_project_links`

Architecture OS identity/reference:
- `public.projects` remains domain-owned and is not queried by R4 for operational data.

## Derived outputs

R4 produces:
- Project Control Context
- Cross-Project Control Context
- Derived Product Context

No output is persisted.

### Project Control Context

Contains only:
- project identity
- product identity
- R3 status/priority/health when present
- active blockers
- active risks
- current Next Action
- current sprint reference
- last checkpoint reference
- relevant R2 relationships
- relevant R2 INTEGRATION relationships
- explicit lifecycle/missing-state metadata

It does not include tasks, drawings, BOQ, site records, workflows, domain database content, or implementation data.

### Cross-Project Control Context

Contains:
- selected/included MYOS project contexts
- derived product contexts
- relationships relevant to the authorized aggregation entity set
- integration relationships as a filtered R2 view

### Derived Product Context

Product state is never independently stored.

A Product Context is derived from `myos_products` plus associated Project Control Contexts. Its indicators are deterministic counts only:
- project count
- status counts
- priority counts
- health counts
- active blocker count
- active risk count
- next-action count

No health score or priority score is calculated.

## Lifecycle

The API supports explicit `scope`:
- `active` — default operational view
- `all` — includes historical completed/archived projects

For `active`:
- PLANNED, ACTIVE, PAUSED are included.
- COMPLETED and ARCHIVED are excluded.
- Missing R3 Control State remains visible when the canonical MYOS Project itself is not marked completed/archived; the context explicitly reports `MISSING_STATE`.

No missing state is converted to HEALTHY, BLOCKED, or another invented value.

## Relationship semantics

R2 `myos_relationships` remains the only relationship registry.

R4 consumes all six canonical types without redefining them:
- DEPENDENCY
- INTEGRATION
- SHARED_SERVICE
- SHARED_KNOWLEDGE
- SHARED_DATA
- SHARED_BRAND

Relevant relationships are selected only when at least one endpoint belongs to the authorized project's aggregation entity set:
- MYOS PROJECT
- associated PRODUCT
- explicitly linked DOMAIN_PROJECT

The relationship object itself remains the R2 canonical record.

No relationship grants operational-data access.

## Determinism

The aggregation has no AI inference, randomness, predictive scoring, current-time heuristic, or hidden ranking.

Stable ordering:
1. products by code, then id
2. projects by product code, project code, then id
3. control items by createdAt, then id
4. relationships by relationship type, source type/id, target type/id, then id

Identical canonical inputs therefore produce the same derived output.

## Authorization

The existing Supabase authenticated session is required at the API boundary.

All MYOS project/control-state/control-item/relationship reads remain scoped to the authenticated user through the existing RLS and service filters.

Product registry reads remain subject to the existing authenticated product-registry policy.

A project/product/relationship ID supplied by a caller is never treated as authorization. It must resolve through the authenticated user's MYOS-visible canonical context.

No service-role bypass is introduced.

## API

### Cross-project control context

`GET /api/control-plane/control-context`

Optional query parameters:
- `scope=active|all`
- `projectId=<MYOS project UUID>`
- `productId=<MYOS product UUID>`

Default scope is `active`.

### Project control context

`GET /api/control-plane/control-state/:projectId?scope=active|all`

The existing project-level route is reused and now returns the R4 Project Control Context.

No new persistence API is introduced.

## Persistence

Database changes: **NONE**.

No:
- aggregation registry
- project snapshot table
- ecosystem snapshot table
- product control-state table
- aggregated blocker/risk/health/next-action table
- cache

R1/R2/R3 persistence remains authoritative.

## Architecture boundaries

R4 does not implement:
- orchestration
- task engine
- sprint engine
- workflow engine
- automation
- integration registry
- integration infrastructure
- event bus
- queues/workers
- analytics warehouse
- event sourcing
- real-time synchronization
- AI aggregation
- dashboard/UI redesign
- P02–P06 changes

## Verification handoff

Formal verification remains in `04 — TEST & DEBUG`.

Required checks include:
- deterministic repeatability
- all six R2 relationship types
- relationship direction/symmetry preservation
- active/historical lifecycle filtering
- missing Control State visibility
- multiple blockers/risks
- Next Action semantics
- qualitative health only
- product derivation without product persistence
- no operational data leakage
- authenticated cross-user isolation
- R1/R2/R3 regression
- P02–P06 boundary
- API validation for scope/project/product filters

## Implementation limitation

Repository-level TypeScript/lint/build verification is not claimed by this implementation room unless actually executed. Formal verification is intentionally deferred to `04 — TEST & DEBUG`.

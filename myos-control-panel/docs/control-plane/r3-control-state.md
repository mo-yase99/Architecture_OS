# R3 — Control State & Integration Foundation

## Implementation status

R3 implementation establishes the minimum MYOS-owned project Control State required for later orchestration consumption. Formal verification remains in 04 — TEST & DEBUG.

## R3 semantic contract

### Ownership boundary

MYOS owns the canonical Control State for a MYOS Project.

Individual projects remain owners of operational tasks, sprints, workflows, domain data, implementation data, and internal architecture.

Control State != Project Operational State.

user_id is the authenticated access boundary. Canonical semantic ownership is MYOS.

### Project Control State

Cardinality: at most one current Control State per MYOS Project.

Authoritative MYOS state:
- status
- priority
- health
- active blockers
- active risks
- active next action

Referenced state:
- current sprint
- last checkpoint

Derived state:
- Project Control Snapshot
- Cross-Project Control Snapshot

No Product Control State is created.

### Status

Canonical values:
- PLANNED
- ACTIVE
- PAUSED
- COMPLETED
- ARCHIVED

BLOCKED is not a status.

### Priority

Canonical values:
- CRITICAL
- HIGH
- MEDIUM
- LOW

Priority represents control-plane attention/importance and is independent from health.

### Health

Canonical values:
- HEALTHY
- ATTENTION
- AT_RISK
- CRITICAL

Health is qualitative. No numeric score exists.

Health is MYOS-governed canonical state. No AI path silently writes authoritative health.

### Control Items

Canonical item types:
- BLOCKER
- RISK
- NEXT_ACTION

Canonical item lifecycle:
- ACTIVE
- RESOLVED
- DISMISSED

Blockers and risks may have multiple active records.

There is at most one active Next Action per project. It remains a lightweight control-plane instruction and is not a Task Engine.

Control items support:
- identity
- project
- control-state attachment
- ownership
- title/description
- lifecycle
- resolution
- created/updated timestamps
- optional R2 relationship reference

A control item does not support task assignment, workflow, dependency management, estimation, scheduling, queues, or comments.

### R2 relationship references

myos_relationships remains the canonical relationship registry.

A control item may reference one relevant R2 relationship. The reference is not a duplicate relationship record and does not grant access to project operational data.

Relevance is validated against the MYOS project itself or its explicit myos_project_links domain-project bridge.

No myos_integrations table is introduced.

### Sprint and checkpoint references

R3 stores only stable reference metadata:
- source
- reference/id
- display title

Allowed reference sources:
- NOTION
- PROJECT
- EXTERNAL

The referenced sprint/checkpoint remains authoritative in its owning project or knowledge system. R3 does not create Sprint or Checkpoint engines.

## Persistence

### public.myos_project_control_states

One current row per MYOS project.

Fields:
- id
- user_id
- project_id
- owner fixed to MYOS
- status
- priority
- health
- current sprint reference metadata
- last checkpoint reference metadata
- timestamps

Database invariants:
- valid status/priority/health vocabularies
- owner fixed to MYOS
- one row per project
- reference metadata consistency
- authenticated ownership boundary
- project/user ownership trigger

### public.myos_control_items

Lightweight child records for blockers, risks, and next action.

Database invariants:
- valid type/status vocabularies
- owner fixed to MYOS
- control state/project attachment
- one active Next Action per project
- authenticated ownership boundary
- project/control-state ownership trigger
- referenced relationship ownership trigger

RLS is enabled on both tables. anon has no table access. authenticated has CRUD access constrained by auth.uid() = user_id.

No service-role bypass is introduced.

## Migrations

- 20260920171500_create_myos_control_state.sql
- 20260920172000_add_control_state_reference_values.sql
- 20260920172500_harden_control_state_ownership.sql

## Service

myos-control-panel/lib/control-plane/control-state.ts

Provides:
- semantic validation
- project ownership validation
- Control State create/list/get/update
- control item create/list/update
- relationship relevance validation
- project Control Snapshot
- Cross-Project Control Snapshot

Snapshots are derived views of canonical MYOS state plus referenced/relationship data. They are not additional persistence registries.

## API

### Control State

GET /api/control-plane/control-state

Lists authenticated user's Control States. Optional projectId filter.

POST /api/control-plane/control-state

Creates the single current Control State for a MYOS Project.

GET /api/control-plane/control-state/:projectId

Returns a project-level Control Snapshot.

PATCH /api/control-plane/control-state/:projectId

Updates status, priority, health, sprint reference, and/or checkpoint reference.

### Control Items

GET /api/control-plane/control-state/:projectId/items

Lists the project's control items.

POST /api/control-plane/control-state/:projectId/items

Creates a lightweight blocker, risk, or next action.

PATCH /api/control-plane/control-state/items/:itemId

Updates lifecycle, title, description, or resolution.

### Cross-Project Control Context

GET /api/control-plane/control-context

Returns the derived Cross-Project Control Snapshot for the authenticated user's MYOS projects.

This is bounded aggregation only. It is not orchestration, analytics, synchronization, or replication.

## Authorization behavior

Every API authenticates through the existing Supabase server client before service access.

Service operations additionally scope all reads/writes to the authenticated user_id.

Database RLS independently enforces the same user boundary.

New database triggers prevent a caller from attaching a Control State to another user's MYOS Project or a Control Item to another user's Control State/project/relationship.

Cross-project relationships do not grant access to internal operational data.

## T01–T08 implementation mapping

| Task | Status | Evidence |
|---|---|---|
| R3-T01 Control-State Semantic Contract | IMPLEMENTED | control-state-contract.ts + this document |
| R3-T02 Project Control-State Model | IMPLEMENTED | one-row-per-project persistence + service |
| R3-T03 Status / Priority / Health | IMPLEMENTED | canonical vocabularies + DB checks + service validation |
| R3-T04 Blocker / Risk / Next Action | IMPLEMENTED | myos_control_items + item service/API |
| R3-T05 Sprint / Checkpoint References | IMPLEMENTED | reference fields + validation; no engine |
| R3-T06 Cross-Project Control Context | IMPLEMENTED | snapshot service + /api/control-plane/control-context |
| R3-T07 Persistence / Service / API / Authorization | IMPLEMENTED | migrations, service, API, RLS, ownership guards |
| R3-T08 Verification / Regression / Documentation Contract | IMPLEMENTED | this verification handoff matrix; formal verification remains 04 |

## Verification handoff — 04 TEST & DEBUG

### Semantic
- canonical status vocabulary; confirm BLOCKED is rejected as status
- canonical priority vocabulary
- canonical health vocabulary and absence of numeric scoring
- one current Control State per project
- multiple active blockers
- multiple active risks
- one active Next Action; duplicate rejected
- resolved/dismissed control items retain history
- control item is not a Task
- sprint/checkpoint are references only
- Product Control State does not exist
- relationship reference does not create a duplicate relationship
- relationship relevance is enforced

### Persistence
- valid/invalid vocabularies at DB boundary
- duplicate Control State rejection
- one active Next Action uniqueness
- reference metadata consistency
- MYOS owner constraint
- timestamps

### Security
- unauthenticated API rejection
- authenticated user isolation
- INSERT/UPDATE ownership enforcement
- direct database ownership mismatch rejection
- control item cannot attach to another user's Control State
- control item cannot reference another user's relationship
- RLS remains enabled
- no service-role bypass

### Snapshot/context
- project identity and product are represented
- scalar Control State is represented
- active blockers/risks and next action are filtered correctly
- sprint/checkpoint references are surfaced
- relevant R2 relationships are surfaced
- cross-project aggregation contains only authenticated user's projects
- snapshots are derived and not independently persisted

### Regression
- myos_products unchanged semantically
- myos_projects unchanged semantically
- myos_project_links unchanged
- public.projects unchanged
- myos_relationships unchanged semantically
- R2 six participant combinations preserved
- R2 six relationship types preserved
- R2 directionality/symmetric canonicalization/uniqueness/lifecycle/RLS preserved
- no P02–P06 repository/database changes

## Known implementation limitations

Formal repository lint/build and authenticated HTTP verification are intentionally deferred to 04 — TEST & DEBUG. The current implementation session has performed database-level migration/constraint work and repository implementation only; it does not constitute formal R3 verification.

No integration infrastructure, synchronization, webhook, worker, queue, notification, analytics, orchestration, or UI redesign is implemented.

## Boundary statement

R3 establishes the smallest canonical MYOS Control State foundation for future R4 consumption.

R4 orchestration is not implemented.

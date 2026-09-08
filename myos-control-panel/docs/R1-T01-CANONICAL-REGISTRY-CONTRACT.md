# R1-T01 — Canonical Registry Contract

Status: IMPLEMENTED
Sprint: R1 — Control Plane Registry
Project: P01 — MYOS

## Purpose

Establish the semantic contract that all later R1 implementation tasks must follow. This task does not create or migrate database tables.

## Canonical entities

- PRODUCT — portfolio/product identity controlled by MYOS.
- PROJECT — canonical MYOS control-plane project identity.
- DOMAIN_PROJECT — operational project owned by its domain product.
- RELATIONSHIP — typed cross-entity relationship owned by MYOS.
- INTEGRATION — system-to-system integration contract/state owned by MYOS.

## Product identity

The canonical product vocabulary is:

- P01 — MYOS
- P02 — Architecture OS
- P03 — FIELDOS
- P04 — Content OS
- P05 — Professional Website
- P06 — Business Lab

`Mohamed Yasser Design Studio` is a company/brand layer, not a product.

## Project boundary

`myos_projects` is the MYOS control-plane project layer.

`public.projects` is the Architecture OS operational project layer.

They are not the same entity and must not be merged.

`myos_project_links` is the explicit bridge between the two layers.

## Relationship vocabulary

Only the following canonical relationship types are defined in R1:

- DEPENDENCY
- INTEGRATION
- SHARED_SERVICE
- SHARED_KNOWLEDGE
- SHARED_DATA
- SHARED_BRAND

## Ownership

| Entity | Canonical owner |
| --- | --- |
| Product Registry | MYOS |
| MYOS Project Registry | MYOS |
| Relationship Registry | MYOS |
| Integration Registry | MYOS |
| Architecture OS domain project | Architecture OS |
| Architecture OS BOQ | Architecture OS |
| Architecture OS drawings | Architecture OS |
| Architecture OS site operations | Architecture OS |
| Architecture OS domain engines | Architecture OS |
| Cross-project coordination state | MYOS |

## Existing storage decisions

- `myos_projects` remains the starting point for canonical MYOS projects.
- `myos_project_links` remains the bridge to domain projects.
- `myos_portfolio_items` is an existing portfolio/project-content representation; R1-T02 must determine whether it can safely back Product Registry semantics. It is not assumed to be a Product Registry merely because its name contains portfolio.
- Relationship and Integration persistence must be added only after checking for an existing equivalent.

## Identity rules

1. Registry IDs are stable identifiers and must not be regenerated during normal updates.
2. Product codes P01–P06 are canonical portfolio identities.
3. A domain project reference must never be treated as a MYOS project ID.
4. Cross-system relationships use explicit entity type + entity ID pairs.
5. Integration records contain state/contract metadata only; never credentials or secrets.

## API contract

The planned semantic API grouping is:

- `/api/control-plane/products`
- `/api/control-plane/projects`
- `/api/control-plane/relationships`
- `/api/control-plane/integrations`

These are semantic targets for later R1 tasks. Existing APIs remain compatible unless explicitly superseded by an implemented consolidation.

## Implementation guardrails

- Reuse before modify; modify before add.
- No table deletion.
- No repository split.
- No Supabase project split.
- No Vercel split.
- No Architecture OS domain migration into MYOS.
- No AI Core rewrite.
- No secret storage in registry entities.
- No production migration is part of R1-T01.

## T01 completion gate

R1-T01 is complete when this contract is committed and the later tasks can implement Product, Project, Relationship, and Integration Registry behavior without redefining ownership or entity boundaries.

# R1-T03 — MYOS Project Registry Reconciliation

## Decision

`public.myos_projects` remains the canonical MYOS Project persistence entity. No second Project Registry table is introduced.

`public.myos_project_links` remains the explicit bridge from MYOS Projects to Architecture OS `public.projects`.

## Field mapping

| Canonical field | Persistence / derivation | Notes |
| --- | --- | --- |
| `id` | `myos_projects.id` | Existing primary key |
| `productId` | `myos_projects.product_id` | Explicit nullable FK to `myos_products.id`; canonical service exposes only product-linked rows |
| `projectCode` | `myos_projects.project_code` | Explicit caller-owned identifier; no uniqueness constraint added because existing consumers provide no evidence for global or product-scoped uniqueness |
| `name` | `myos_projects.name` | Direct |
| `status` | `myos_projects.status` | Direct |
| `projectType` | `myos_projects.type` | Direct semantic mapping |
| `owner` | Constant `MYOS` | Registry ownership is MYOS; existing `user_id` is preserved as the user/authorization boundary |
| `description` | `myos_projects.description` | Direct |
| `domainReference` | `myos_project_links.engineering_project_id` | Optional bridge-derived reference to Architecture OS `public.projects.id` |
| `isActive` | `status === 'active'` | Matches existing MYOS operational filtering semantics |
| `createdAt` | `myos_projects.created_at` | Direct |
| `updatedAt` | `myos_projects.updated_at` | Direct |

## Product relationship

`product_id` is an explicit foreign key to `public.myos_products(id)`. It is nullable for backward compatibility because existing project creation consumers do not yet require product assignment and the current table contains zero rows. No historical backfill is fabricated.

Canonical registry reads include only rows with both `product_id` and `project_code` populated, so the returned representation always satisfies `CanonicalMyosProject`.

## Project identity

`project_code` is an explicit stable business identifier. No uniqueness constraint is imposed in R1-T03 because repository consumers do not establish whether uniqueness is global or scoped to a product/user.

## Owner semantics

`user_id` is preserved unchanged. Existing APIs use it for authenticated ownership and row filtering. It is not replaced by canonical `owner`. Canonical `owner` expresses registry ownership (`MYOS`).

## Domain bridge

No changes were made to `myos_project_links` or `public.projects`. If a link exists for the authenticated user, `engineering_project_id` is exposed as `domainReference`. Architecture OS remains the owner of the domain project and its operational data.

## Migration

`supabase/migrations/20260912212301_reconcile_myos_projects_canonical_fields.sql`

The migration is additive: it adds `product_id` and `project_code` and adds the explicit product foreign key with `ON DELETE RESTRICT`. Existing rows are preserved; current row count is zero.

## Service and API

- `lib/control-plane/projects.ts` provides canonical project mapping.
- `GET /api/control-plane/projects` requires an authenticated Supabase session and returns `{ ok: true, projects }`.
- Existing `/api/myos/projects` remains unchanged for backward compatibility.

## Security

Existing RLS and `user_id` ownership boundaries are preserved. No anonymous access, service-role credential, or secret is introduced.

## Scope boundary

R1-T03 does not create a second registry, relationship registry, integration registry, Architecture OS migration, or domain-project service.

# R1-T02 — Product Registry Reconciliation

## Decision

`myos_portfolio_items` is **not** the canonical Product entity.

It is a portfolio/showcase entity because it contains `title`, `category`, `platform`, `published_url`, `description`, `status`, and an optional `project_id` reference to `myos_projects`. It has no canonical product code, ownership contract, repository/database/deployment references, or product identity semantics.

A dedicated `myos_products` entity is therefore required. The portfolio table remains unchanged.

## Evidence

- Supabase `myos_portfolio_items`: 0 rows; user-scoped; FK `project_id -> myos_projects.id`; portfolio-oriented columns.
- Supabase `myos_projects`: 0 rows; user-scoped operational MYOS project layer.
- Supabase `myos_project_links`: 0 rows; bridges MYOS projects to the Architecture OS `public.projects` entity.
- Supabase `myos_system_settings`: only `system` and `roadmap` settings; not an entity registry.
- GitHub MYOS context reads `myos_portfolio_items` as `portfolio`, confirming semantic separation.
- Existing T01 contract defines Products independently from Portfolio Items.
- Vercel is connected to `mo-yase99/Architecture_OS`; the latest T01 preview was READY and the T02 branch triggered a preview build.

## Canonical persistence

Table: `public.myos_products`

Identity: unique `code` (`P01` ... `P06`)

Ownership: MYOS owns the Product Registry; product `owner` identifies the product/domain owner.

Access: RLS enabled; authenticated users may read. No client write policy is added. Registry mutation remains a controlled server/database operation.

## Recovery

The migration is additive and non-destructive. No existing table, column, row, FK, index, or policy was deleted. Re-running the seed is idempotent through `ON CONFLICT (code) DO UPDATE`.

## Product records

| Code | Product | Owner |
| --- | --- | --- |
| P01 | MYOS | MYOS |
| P02 | Architecture OS | ARCHITECTURE_OS |
| P03 | FIELDOS | FIELDOS |
| P04 | Content OS | CONTENT_OS |
| P05 | Professional Website | PROFESSIONAL_WEBSITE |
| P06 | Business Lab | BUSINESS_LAB |

## Scope control

Not changed:

- `myos_portfolio_items`
- `myos_projects`
- `myos_project_links`
- `myos_system_settings`
- Architecture OS domain tables
- repository structure
- Vercel production deployment
- AI Core architecture
- registry UI
- relationship/integration/project registry work

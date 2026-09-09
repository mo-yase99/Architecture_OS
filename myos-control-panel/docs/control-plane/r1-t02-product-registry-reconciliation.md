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
- Vercel preview for the T02 branch is READY.

## Canonical persistence

Table: `public.myos_products`

Identity: unique `code` (`P01` ... `P06`)

Ownership: MYOS owns the Product Registry; product `owner` identifies the product/domain owner.

Access: RLS enabled; authenticated users may read. No client write policy is added. Registry mutation remains a controlled server/database operation.

## Migration / seed artifact

Reviewable source artifact:

`supabase/migrations/20260909120933_add_myos_product_registry.sql`

The artifact is additive and contains the table definition, RLS read policy, and canonical P01–P06 seed. The seed uses `ON CONFLICT (code) DO UPDATE`, making repeated execution deterministic by canonical product code.

The same seed statement was safely executed twice inside a transaction against the connected Supabase project and rolled back. The transaction returned exactly six canonical codes (`P01`–`P06`), demonstrating conflict-safe repeatability without persisting test mutations.

## Product records

| Code | Product | Owner |
| --- | --- | --- |
| P01 | MYOS | MYOS |
| P02 | Architecture OS | ARCHITECTURE_OS |
| P03 | FIELDOS | FIELDOS |
| P04 | Content OS | CONTENT_OS |
| P05 | Professional Website | PROFESSIONAL_WEBSITE |
| P06 | Business Lab | BUSINESS_LAB |

## Verification closure status

### B1 — Authenticated API Runtime

The deployed preview is protected by Vercel SSO. No authentication bypass, anonymous access, test credentials, or secret exposure was introduced. The route itself requires the existing Supabase authenticated session before reading `myos_products`. A live authenticated request could not be executed from the current verification environment because no user Supabase session/credentials are available to the tooling.

### B3 — Lint

The configured command is `npm run lint`, which resolves to `next lint`. The repository cannot be cloned into the current execution container because outbound DNS/network access is unavailable, so the command could not be executed locally. The Vercel build completed successfully, but Next.js 16.3.3's `next build` output does not constitute execution of the separate `next lint` script. No lint-related code change was made.

## Recovery

The migration is additive and non-destructive. No existing table, column, row, FK, index, or policy was deleted. Re-running the seed is idempotent through `ON CONFLICT (code) DO UPDATE`.

## Scope control

Not changed:

- `myos_portfolio_items`
- `myos_projects`
- `myos_project_links`
- `myos_system_settings`
- `public.projects`
- Architecture OS domain tables
- Vercel production deployment
- AI Core architecture
- unrelated APIs
- registry UI
- relationship/integration/project registry work

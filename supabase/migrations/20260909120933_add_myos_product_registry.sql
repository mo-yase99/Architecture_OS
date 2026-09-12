-- R1-T02 — Canonical Product Registry
-- Additive, non-destructive migration. Product identity is unique by code.

create table if not exists public.myos_products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  type text not null default 'product',
  status text not null default 'active',
  description text,
  owner text not null,
  primary_domain text,
  repository_reference text,
  database_reference text,
  deployment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint myos_products_code_format check (code ~ '^P[0-9]{2}$')
);

create index if not exists myos_products_status_idx
  on public.myos_products (status);

alter table public.myos_products enable row level security;

drop policy if exists myos_products_authenticated_read on public.myos_products;
create policy myos_products_authenticated_read
  on public.myos_products
  for select
  to authenticated
  using (true);

insert into public.myos_products (
  code, name, type, status, description, owner, primary_domain,
  repository_reference, database_reference, deployment_reference
)
values
  ('P01', 'MYOS', 'control_plane', 'active',
   'Master Control / orchestration layer', 'MYOS', 'Control Plane',
   'mo-yase99/Architecture_OS:myos-control-panel', 'buodguxksklyngipmgec',
   'https://architecture-os-neon.vercel.app'),
  ('P02', 'Architecture OS', 'domain_engine', 'active',
   'Operational architecture and engineering domain engine', 'ARCHITECTURE_OS', 'Architecture / Engineering',
   'mo-yase99/Architecture_OS', 'buodguxksklyngipmgec',
   'https://architecture-os-neon.vercel.app'),
  ('P03', 'FIELDOS', 'domain_engine', 'active',
   'Site engineering and field operations product', 'FIELDOS', 'Site Engineering',
   'mo-yase99/fieldos', null, null),
  ('P04', 'Content OS', 'domain_engine', 'active',
   'Content and marketing operations product', 'CONTENT_OS', 'Content / Marketing',
   null, null, null),
  ('P05', 'Professional Website', 'product', 'active',
   'Professional digital platform for Mohamed Yasser Design Studio', 'PROFESSIONAL_WEBSITE', 'Professional Web Presence',
   'mo-yase99/my-digital-ecosystem', null, null),
  ('P06', 'Business Lab', 'product', 'active',
   'Business and venture experimentation layer', 'BUSINESS_LAB', 'Business / Ventures',
   null, null, null)
on conflict (code) do update set
  name = excluded.name,
  type = excluded.type,
  status = excluded.status,
  description = excluded.description,
  owner = excluded.owner,
  primary_domain = excluded.primary_domain,
  repository_reference = excluded.repository_reference,
  database_reference = excluded.database_reference,
  deployment_reference = excluded.deployment_reference,
  updated_at = now();

create table public.myos_relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  owner text not null default 'MYOS',
  source_entity_type text not null,
  source_entity_id uuid not null,
  relationship_type text not null,
  target_entity_type text not null,
  target_entity_id uuid not null,
  status text not null default 'planned',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint myos_relationships_owner_check
    check (owner = 'MYOS'),

  constraint myos_relationships_source_type_check
    check (source_entity_type in ('PRODUCT', 'PROJECT', 'DOMAIN_PROJECT')),

  constraint myos_relationships_target_type_check
    check (target_entity_type in ('PRODUCT', 'PROJECT', 'DOMAIN_PROJECT')),

  constraint myos_relationships_type_check
    check (relationship_type in (
      'DEPENDENCY',
      'INTEGRATION',
      'SHARED_SERVICE',
      'SHARED_KNOWLEDGE',
      'SHARED_DATA',
      'SHARED_BRAND'
    )),

  constraint myos_relationships_status_check
    check (status in ('planned', 'active', 'blocked', 'inactive', 'deprecated')),

  constraint myos_relationships_participant_pair_check
    check (
      (source_entity_type = 'PRODUCT' and target_entity_type in ('PRODUCT', 'PROJECT', 'DOMAIN_PROJECT'))
      or
      (source_entity_type = 'PROJECT' and target_entity_type in ('PROJECT', 'DOMAIN_PROJECT'))
      or
      (source_entity_type = 'DOMAIN_PROJECT' and target_entity_type = 'DOMAIN_PROJECT')
    ),

  constraint myos_relationships_no_self_reference_check
    check (
      not (
        source_entity_type = target_entity_type
        and source_entity_id = target_entity_id
      )
    )
);

create index myos_relationships_user_id_idx
  on public.myos_relationships using btree (user_id);

create index myos_relationships_source_idx
  on public.myos_relationships using btree (source_entity_type, source_entity_id);

create index myos_relationships_target_idx
  on public.myos_relationships using btree (target_entity_type, target_entity_id);

create index myos_relationships_type_status_idx
  on public.myos_relationships using btree (relationship_type, status);

create unique index myos_relationships_directional_identity_key
  on public.myos_relationships (
    user_id,
    source_entity_type,
    source_entity_id,
    relationship_type,
    target_entity_type,
    target_entity_id
  )
  where relationship_type in ('DEPENDENCY', 'INTEGRATION');

create unique index myos_relationships_symmetric_identity_key
  on public.myos_relationships (
    user_id,
    relationship_type,
    least(source_entity_type || ':' || source_entity_id::text, target_entity_type || ':' || target_entity_id::text),
    greatest(source_entity_type || ':' || source_entity_id::text, target_entity_type || ':' || target_entity_id::text)
  )
  where relationship_type in ('SHARED_SERVICE', 'SHARED_KNOWLEDGE', 'SHARED_DATA', 'SHARED_BRAND');

alter table public.myos_relationships enable row level security;

revoke all on table public.myos_relationships from anon;
grant select, insert, update, delete on table public.myos_relationships to authenticated;

create policy "myos_relationships_authenticated_owner"
  on public.myos_relationships
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

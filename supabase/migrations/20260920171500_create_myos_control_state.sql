create table public.myos_project_control_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.myos_projects(id) on delete cascade,
  owner text not null default 'MYOS',
  status text not null default 'PLANNED',
  priority text not null default 'MEDIUM',
  health text not null default 'HEALTHY',
  current_sprint_id text,
  current_sprint_source text,
  current_sprint_title text,
  last_checkpoint_id text,
  last_checkpoint_source text,
  last_checkpoint_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint myos_project_control_states_owner_check
    check (owner = 'MYOS'),
  constraint myos_project_control_states_status_check
    check (status in ('PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED')),
  constraint myos_project_control_states_priority_check
    check (priority in ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  constraint myos_project_control_states_health_check
    check (health in ('HEALTHY', 'ATTENTION', 'AT_RISK', 'CRITICAL')),
  constraint myos_project_control_states_sprint_reference_check
    check ((current_sprint_id is null and current_sprint_source is null) or (current_sprint_id is not null and current_sprint_source is not null)),
  constraint myos_project_control_states_checkpoint_reference_check
    check ((last_checkpoint_id is null and last_checkpoint_source is null) or (last_checkpoint_id is not null and last_checkpoint_source is not null)),
  constraint myos_project_control_states_project_user_unique
    unique (project_id)
);

create index myos_project_control_states_user_id_idx
  on public.myos_project_control_states using btree (user_id);
create index myos_project_control_states_project_id_idx
  on public.myos_project_control_states using btree (project_id);
create index myos_project_control_states_status_priority_idx
  on public.myos_project_control_states using btree (status, priority);

create table public.myos_control_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.myos_projects(id) on delete cascade,
  control_state_id uuid not null references public.myos_project_control_states(id) on delete cascade,
  owner text not null default 'MYOS',
  item_type text not null,
  status text not null default 'ACTIVE',
  title text not null,
  description text,
  resolution text,
  relationship_id uuid references public.myos_relationships(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,

  constraint myos_control_items_owner_check
    check (owner = 'MYOS'),
  constraint myos_control_items_type_check
    check (item_type in ('BLOCKER', 'RISK', 'NEXT_ACTION')),
  constraint myos_control_items_status_check
    check (status in ('ACTIVE', 'RESOLVED', 'DISMISSED')),
  constraint myos_control_items_resolution_state_check
    check ((status = 'ACTIVE' and resolved_at is null) or (status in ('RESOLVED', 'DISMISSED')))
);

create index myos_control_items_user_id_idx
  on public.myos_control_items using btree (user_id);
create index myos_control_items_project_status_type_idx
  on public.myos_control_items using btree (project_id, status, item_type);
create index myos_control_items_control_state_idx
  on public.myos_control_items using btree (control_state_id);
create index myos_control_items_relationship_idx
  on public.myos_control_items using btree (relationship_id);

create unique index myos_control_items_one_active_next_action
  on public.myos_control_items (project_id)
  where item_type = 'NEXT_ACTION' and status = 'ACTIVE';

alter table public.myos_project_control_states enable row level security;
alter table public.myos_control_items enable row level security;

revoke all on table public.myos_project_control_states from anon;
revoke all on table public.myos_control_items from anon;
grant select, insert, update, delete on table public.myos_project_control_states to authenticated;
grant select, insert, update, delete on table public.myos_control_items to authenticated;

create policy "myos_project_control_states_authenticated_owner"
  on public.myos_project_control_states
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "myos_control_items_authenticated_owner"
  on public.myos_control_items
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

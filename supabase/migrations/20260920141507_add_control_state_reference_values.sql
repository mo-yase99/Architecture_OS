alter table public.myos_project_control_states
  add column current_sprint_reference text,
  add column last_checkpoint_reference text;

alter table public.myos_project_control_states
  drop constraint if exists myos_project_control_states_sprint_reference_check;

alter table public.myos_project_control_states
  add constraint myos_project_control_states_sprint_reference_check
  check (
    (current_sprint_id is null and current_sprint_source is null and current_sprint_reference is null)
    or
    (current_sprint_id is not null and current_sprint_source is not null and current_sprint_reference is not null)
  );

alter table public.myos_project_control_states
  drop constraint if exists myos_project_control_states_checkpoint_reference_check;

alter table public.myos_project_control_states
  add constraint myos_project_control_states_checkpoint_reference_check
  check (
    (last_checkpoint_id is null and last_checkpoint_source is null and last_checkpoint_reference is null)
    or
    (last_checkpoint_id is not null and last_checkpoint_source is not null and last_checkpoint_reference is not null)
  );

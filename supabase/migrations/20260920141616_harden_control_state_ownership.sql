create or replace function public.myos_validate_control_state_ownership()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.myos_projects p
    where p.id = new.project_id and p.user_id = new.user_id
  ) then
    raise exception 'Control State project ownership mismatch';
  end if;
  return new;
end;
$$;

create trigger myos_project_control_states_ownership_guard
before insert or update of project_id, user_id
on public.myos_project_control_states
for each row execute function public.myos_validate_control_state_ownership();

create or replace function public.myos_validate_control_item_ownership()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.myos_project_control_states s
    where s.id = new.control_state_id
      and s.project_id = new.project_id
      and s.user_id = new.user_id
  ) then
    raise exception 'Control Item ownership or project mismatch';
  end if;

  if new.relationship_id is not null and not exists (
    select 1 from public.myos_relationships r
    where r.id = new.relationship_id and r.user_id = new.user_id
  ) then
    raise exception 'Control Item relationship ownership mismatch';
  end if;

  return new;
end;
$$;

create trigger myos_control_items_ownership_guard
before insert or update of project_id, control_state_id, user_id, relationship_id
on public.myos_control_items
for each row execute function public.myos_validate_control_item_ownership();

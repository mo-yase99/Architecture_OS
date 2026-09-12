alter table public.myos_projects
  add column if not exists product_id uuid,
  add column if not exists project_code text;

alter table public.myos_projects
  drop constraint if exists myos_projects_product_id_fkey;

alter table public.myos_projects
  add constraint myos_projects_product_id_fkey
  foreign key (product_id)
  references public.myos_products(id)
  on delete restrict;

alter table public.jobs
  add column if not exists equipment_id uuid references public.equipment(id) on delete set null;

create index if not exists jobs_equipment_id_idx on public.jobs (equipment_id);

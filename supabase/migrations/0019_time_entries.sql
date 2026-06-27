-- T-44: Időkövetés — time_entries (rendszerterv 8.9)

create table public.time_entries (
  id            uuid        primary key default gen_random_uuid(),
  company_id    uuid        not null references public.companies(id) on delete cascade,
  job_id        uuid        not null references public.jobs(id) on delete cascade,
  technician_id uuid        not null references auth.users(id),
  started_at    timestamptz not null default now(),
  stopped_at    timestamptz,                        -- null = futó óra
  duration_min  numeric(8,2)                        -- kitöltődik stop-kor
    generated always as (
      extract(epoch from (stopped_at - started_at)) / 60.0
    ) stored,
  note          text,
  created_at    timestamptz not null default now()
);

create index on public.time_entries (job_id);
create index on public.time_entries (technician_id) where stopped_at is null;
create index on public.time_entries (company_id);

alter table public.time_entries enable row level security;

-- Saját cég összes tagja láthatja (owner/dispatcher: monitoring; technician: saját)
create policy time_entries_select on public.time_entries
  for select using (public.has_role(company_id, array['owner','dispatcher','technician','accountant']::public.company_role[]));

-- Technikus csak a saját bejegyzéseit indíthatja/zárhatja
create policy time_entries_insert on public.time_entries
  for insert with check (
    public.has_role(company_id, array['owner','dispatcher','technician']::public.company_role[])
    and technician_id = auth.uid()
  );

create policy time_entries_update on public.time_entries
  for update
  using (technician_id = auth.uid() or public.has_role(company_id, array['owner','dispatcher']::public.company_role[]))
  with check (technician_id = auth.uid() or public.has_role(company_id, array['owner','dispatcher']::public.company_role[]));

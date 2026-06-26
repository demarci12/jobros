-- T-30: worksheets + worksheet_lines + RLS

create table worksheets (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  job_id        uuid not null references jobs(id) on delete cascade,
  work_done     text,
  labor_hours   numeric(5,2),
  technician_id uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on worksheets (job_id);
create trigger trg_worksheets_updated_at before update on worksheets
  for each row execute function set_updated_at();

create table worksheet_lines (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  worksheet_id uuid not null references worksheets(id) on delete cascade,
  material_id  uuid,
  description  text not null,
  quantity     numeric(10,2) not null default 1,
  unit         text default 'db',
  unit_price   numeric(12,2) not null default 0,
  vat_rate     numeric(4,2) not null default 27,
  line_total   numeric(12,2) generated always as (quantity * unit_price) stored,
  is_labor     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index on worksheet_lines (worksheet_id);

-- RLS: worksheets
alter table worksheets enable row level security;

create policy worksheets_select on worksheets for select
  using (company_id in (select auth_company_ids()));

-- owner/dispatcher + assigned technician can insert
create policy worksheets_insert on worksheets for insert
  with check (
    has_role(company_id, array['owner','dispatcher']::company_role[])
    or (
      company_id in (select auth_company_ids())
      and exists (
        select 1 from jobs j where j.id = job_id and j.assigned_to = auth.uid()
      )
    )
  );

create policy worksheets_update on worksheets for update
  using (
    has_role(company_id, array['owner','dispatcher']::company_role[])
    or (
      company_id in (select auth_company_ids())
      and exists (
        select 1 from jobs j where j.id = job_id and j.assigned_to = auth.uid()
      )
    )
  );

create policy worksheets_delete on worksheets for delete
  using (has_role(company_id, array['owner','dispatcher']::company_role[]));

-- RLS: worksheet_lines
alter table worksheet_lines enable row level security;

create policy wl_select on worksheet_lines for select
  using (company_id in (select auth_company_ids()));

create policy wl_insert on worksheet_lines for insert
  with check (
    has_role(company_id, array['owner','dispatcher']::company_role[])
    or (
      company_id in (select auth_company_ids())
      and exists (
        select 1 from worksheets w
        join jobs j on j.id = w.job_id
        where w.id = worksheet_id and j.assigned_to = auth.uid()
      )
    )
  );

create policy wl_update on worksheet_lines for update
  using (
    has_role(company_id, array['owner','dispatcher']::company_role[])
    or (
      company_id in (select auth_company_ids())
      and exists (
        select 1 from worksheets w
        join jobs j on j.id = w.job_id
        where w.id = worksheet_id and j.assigned_to = auth.uid()
      )
    )
  );

create policy wl_delete on worksheet_lines for delete
  using (has_role(company_id, array['owner','dispatcher']::company_role[]));

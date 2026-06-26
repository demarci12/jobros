-- T-22: jobs + job_status_history + T-23: appointments

create table jobs (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  job_number    text not null,
  customer_id   uuid not null references customers(id) on delete restrict,
  site_id       uuid not null references sites(id) on delete restrict,
  service_id    uuid references services(id) on delete set null,
  status        job_status not null default 'uj',
  title         text,
  description   text,
  assigned_to   uuid references profiles(id) on delete set null,
  parent_job_id uuid references jobs(id) on delete set null,
  template_id   uuid,
  created_by    uuid references profiles(id) on delete set null,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (company_id, job_number)
);
create index on jobs (company_id, status);
create index on jobs (assigned_to);
create index on jobs (customer_id);

create table job_status_history (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  job_id      uuid not null references jobs(id) on delete cascade,
  from_status job_status,
  to_status   job_status not null,
  changed_by  uuid references profiles(id) on delete set null,
  changed_at  timestamptz not null default now()
);
create index on job_status_history (job_id);

create table appointments (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references companies(id) on delete cascade,
  job_id            uuid not null references jobs(id) on delete cascade,
  kind              appointment_kind not null default 'munka',
  technician_id     uuid references profiles(id) on delete set null,
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  travel_buffer_min int not null default 0,
  status            appointment_status not null default 'tervezett',
  gcal_event_id     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on appointments (company_id, technician_id, starts_at);
create index on appointments (job_id);
create index on appointments (technician_id, starts_at, ends_at) where status <> 'lemondva';

-- updated_at triggers
create trigger trg_jobs_updated_at before update on jobs
  for each row execute function set_updated_at();
create trigger trg_appointments_updated_at before update on appointments
  for each row execute function set_updated_at();

-- generate_job_number
create or replace function generate_job_number(p_company uuid) returns text as $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_seq  int;
begin
  select count(*) + 1 into v_seq from jobs
    where company_id = p_company and job_number like v_year || '-%';
  return v_year || '-' || lpad(v_seq::text, 4, '0');
end;
$$ language plpgsql;

-- log_job_status_change trigger
create or replace function log_job_status_change() returns trigger as $$
begin
  if (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into job_status_history (company_id, job_id, from_status, to_status, changed_by)
    values (new.company_id, new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$ language plpgsql;
create trigger trg_job_status_log after update on jobs
  for each row execute function log_job_status_change();

-- bump_next_service trigger
create or replace function bump_next_service() returns trigger as $$
begin
  if (new.status = 'kesz' and old.status is distinct from 'kesz') then
    update equipment e
      set next_service_due = (current_date + interval '1 year')::date
    from sites s
    where e.site_id = s.id
      and s.id = new.site_id
      and e.kind in ('klima', 'hoszivattyu');
  end if;
  return new;
end;
$$ language plpgsql;
create trigger trg_bump_service after update on jobs
  for each row execute function bump_next_service();

-- RLS: jobs
alter table jobs enable row level security;
create policy jobs_select on jobs for select
  using (company_id in (select auth_company_ids()));
create policy jobs_insert on jobs for insert
  with check (has_role(company_id, array['owner','dispatcher']::company_role[]));
create policy jobs_update on jobs for update
  using (
    company_id in (select auth_company_ids())
    and (
      has_role(company_id, array['owner','dispatcher']::company_role[])
      or assigned_to = auth.uid()
    )
  );
create policy jobs_delete on jobs for delete
  using (has_role(company_id, array['owner','dispatcher']::company_role[]));

-- RLS: job_status_history (read-only for members)
alter table job_status_history enable row level security;
create policy jsh_select on job_status_history for select
  using (company_id in (select auth_company_ids()));

-- RLS: appointments
alter table appointments enable row level security;
create policy appointments_select on appointments for select
  using (company_id in (select auth_company_ids()));
create policy appointments_insert on appointments for insert
  with check (has_role(company_id, array['owner','dispatcher']::company_role[]));
create policy appointments_update on appointments for update
  using (company_id in (select auth_company_ids()))
  with check (has_role(company_id, array['owner','dispatcher']::company_role[]));
create policy appointments_delete on appointments for delete
  using (has_role(company_id, array['owner','dispatcher']::company_role[]));

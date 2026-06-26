-- T-20: services konfiguráció

create table services (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references companies(id) on delete cascade,
  name                 text not null,
  activity             job_activity not null default 'szerviz',
  default_duration_min int not null default 60,
  requires_survey      boolean not null default false,
  default_price        numeric(12,2),
  vat_rate             numeric(4,2) not null default 27,
  color                text,
  is_active            boolean not null default true,
  sort_order           int not null default 0,
  created_at           timestamptz not null default now()
);
create index on services (company_id, is_active);

alter table services enable row level security;
create policy services_select on services for select
  using (company_id in (select auth_company_ids()));
create policy services_insert on services for insert
  with check (has_role(company_id, array['owner','dispatcher']::company_role[]));
create policy services_update on services for update
  using (company_id in (select auth_company_ids()))
  with check (has_role(company_id, array['owner','dispatcher']::company_role[]));
create policy services_delete on services for delete
  using (has_role(company_id, array['owner']::company_role[]));

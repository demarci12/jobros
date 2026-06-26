-- T-21: service_zones (8.6) + RLS

create table service_zones (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  technician_id uuid references profiles(id) on delete cascade,
  name          text,
  home_lat      numeric(9,6),
  home_lng      numeric(9,6),
  home_h3       text,
  radius_km     numeric(5,1) default 25,
  covered_h3    text[],
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index on service_zones (company_id);

alter table service_zones enable row level security;

create policy zones_select on service_zones for select
  using (company_id in (select auth_company_ids()));

create policy zones_insert on service_zones for insert
  with check (has_role(company_id, array['owner','dispatcher']::company_role[]));

create policy zones_update on service_zones for update
  using (has_role(company_id, array['owner','dispatcher']::company_role[]));

create policy zones_delete on service_zones for delete
  using (has_role(company_id, array['owner']::company_role[]));

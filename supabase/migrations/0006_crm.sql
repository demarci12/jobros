-- T-10: customers + sites (geo/H3) + T-11: equipment + next_service trigger

create table customers (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name       text not null,
  is_company boolean not null default false,
  tax_number text,
  phone      text,
  email      text,
  notes      text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on customers (company_id);
create index on customers (company_id, name);
create index on customers (company_id, phone);

create table sites (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  customer_id  uuid not null references customers(id) on delete cascade,
  label        text,
  address      text not null,
  city         text,
  zip          text,
  lat          numeric(9,6),
  lng          numeric(9,6),
  h3_index     text,
  access_notes text,
  created_at   timestamptz not null default now()
);
create index on sites (company_id);
create index on sites (customer_id);
create index on sites (company_id, h3_index);

create table equipment (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references companies(id) on delete cascade,
  site_id          uuid not null references sites(id) on delete cascade,
  kind             equipment_kind not null,
  manufacturer     text,
  model            text,
  serial_number    text,
  installed_at     date,
  warranty_until   date,
  next_service_due date,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on equipment (company_id);
create index on equipment (site_id);
create index on equipment (company_id, next_service_due);

-- updated_at triggers
create trigger trg_customers_updated_at before update on customers
  for each row execute function set_updated_at();
create trigger trg_equipment_updated_at before update on equipment
  for each row execute function set_updated_at();

-- bump_next_service: klíma/hőszivattyú szerviz lezárásakor +1 év
-- (jobs tábla még nem létezik, trigger a jobs migrációban lesz)

-- RLS
alter table customers enable row level security;
create policy customers_select on customers for select
  using (company_id in (select auth_company_ids()));
create policy customers_insert on customers for insert
  with check (has_role(company_id, array['owner','dispatcher']::company_role[]));
create policy customers_update on customers for update
  using (company_id in (select auth_company_ids()))
  with check (has_role(company_id, array['owner','dispatcher']::company_role[]));
create policy customers_delete on customers for delete
  using (has_role(company_id, array['owner','dispatcher']::company_role[]));

alter table sites enable row level security;
create policy sites_select on sites for select
  using (company_id in (select auth_company_ids()));
create policy sites_insert on sites for insert
  with check (has_role(company_id, array['owner','dispatcher']::company_role[]));
create policy sites_update on sites for update
  using (company_id in (select auth_company_ids()))
  with check (has_role(company_id, array['owner','dispatcher']::company_role[]));
create policy sites_delete on sites for delete
  using (has_role(company_id, array['owner','dispatcher']::company_role[]));

alter table equipment enable row level security;
create policy equipment_select on equipment for select
  using (company_id in (select auth_company_ids()));
create policy equipment_insert on equipment for insert
  with check (has_role(company_id, array['owner','dispatcher']::company_role[]));
create policy equipment_update on equipment for update
  using (company_id in (select auth_company_ids()))
  with check (has_role(company_id, array['owner','dispatcher']::company_role[]));
create policy equipment_delete on equipment for delete
  using (has_role(company_id, array['owner','dispatcher']::company_role[]));

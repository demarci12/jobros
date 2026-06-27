-- T-36: Anyag katalógus + készlet
-- Rendszerterv 8.11

-- ---------------------------------------------------------------------------
-- materials (katalógus, per-tenant)
-- ---------------------------------------------------------------------------
create table public.materials (
  id            uuid          primary key default gen_random_uuid(),
  company_id    uuid          not null references public.companies(id) on delete cascade,
  name          text          not null,
  unit          text          not null default 'db',
  unit_price    numeric(12,2) not null default 0,
  vat_rate      int           not null default 27,
  sku           text,
  stock_qty     numeric(12,3) not null default 0,
  min_stock_qty numeric(12,3) not null default 0,
  is_active     boolean       not null default true,
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now(),
  unique (company_id, sku) deferrable initially deferred
);

create index on public.materials (company_id);
create index on public.materials (company_id) where is_active = true;

create trigger trg_materials_updated_at
  before update on public.materials
  for each row execute function public.set_updated_at();

alter table public.materials enable row level security;

create policy materials_select on public.materials
  for select using (public.has_role(company_id, array['owner','dispatcher','technician','accountant']::public.company_role[]));

create policy materials_insert on public.materials
  for insert with check (public.has_role(company_id, array['owner','dispatcher']::public.company_role[]));

create policy materials_update on public.materials
  for update using (public.has_role(company_id, array['owner','dispatcher']::public.company_role[]));

create policy materials_delete on public.materials
  for delete using (public.has_role(company_id, array['owner']::public.company_role[]));

-- ---------------------------------------------------------------------------
-- stock_movements (készlet-mozgás napló)
-- ---------------------------------------------------------------------------
create table public.stock_movements (
  id            uuid          primary key default gen_random_uuid(),
  company_id    uuid          not null references public.companies(id) on delete cascade,
  material_id   uuid          not null references public.materials(id) on delete restrict,
  worksheet_id  uuid          references public.worksheets(id) on delete set null,
  job_id        uuid          references public.jobs(id) on delete set null,
  quantity      numeric(12,3) not null,   -- negatív = felhasználás, pozitív = bevételezés
  reason        text,                     -- pl. "munkalap lezárás", "bevételezés"
  created_by    uuid          not null references auth.users(id),
  created_at    timestamptz   not null default now()
);

create index on public.stock_movements (company_id);
create index on public.stock_movements (material_id);
create index on public.stock_movements (worksheet_id);

alter table public.stock_movements enable row level security;

create policy stock_movements_select on public.stock_movements
  for select using (public.has_role(company_id, array['owner','dispatcher','technician','accountant']::public.company_role[]));

create policy stock_movements_insert on public.stock_movements
  for insert with check (public.has_role(company_id, array['owner','dispatcher','technician']::public.company_role[]));

-- stock_movements nem módosítható/törölhető (audit trail)

-- ---------------------------------------------------------------------------
-- worksheet_lines.material_id (opcionális katalógus-hivatkozás)
-- ---------------------------------------------------------------------------
alter table public.worksheet_lines
  add column if not exists material_id uuid references public.materials(id) on delete set null;

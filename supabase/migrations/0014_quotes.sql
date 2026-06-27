-- T-34: quotes + quote_lines (8.8) + RLS

create table quotes (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  job_id       uuid not null references jobs(id) on delete cascade,
  quote_number text not null,
  valid_until  date,
  status       text not null default 'draft', -- draft|sent|accepted|rejected
  notes        text,
  financing_offered boolean default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (company_id, quote_number)
);
create index on quotes (job_id);
create trigger trg_quotes_updated_at before update on quotes
  for each row execute function set_updated_at();

create table quote_lines (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  quote_id     uuid not null references quotes(id) on delete cascade,
  description  text not null,
  quantity     numeric(10,2) not null default 1,
  unit         text default 'db',
  unit_price   numeric(12,2) not null default 0,
  vat_rate     numeric(4,2) not null default 27,
  line_total   numeric(12,2) generated always as (quantity * unit_price) stored,
  is_optional  boolean not null default false,
  option_group text,                       -- good|better|best
  is_selected  boolean not null default true,
  created_at   timestamptz not null default now()
);
create index on quote_lines (quote_id);

-- RLS: quotes
alter table quotes enable row level security;
create policy quotes_select on quotes for select
  using (company_id in (select auth_company_ids()));
create policy quotes_insert on quotes for insert
  with check (has_role(company_id, array['owner','dispatcher']::company_role[]));
create policy quotes_update on quotes for update
  using (has_role(company_id, array['owner','dispatcher']::company_role[]));
create policy quotes_delete on quotes for delete
  using (has_role(company_id, array['owner','dispatcher']::company_role[]));

-- RLS: quote_lines
alter table quote_lines enable row level security;
create policy ql_select on quote_lines for select
  using (company_id in (select auth_company_ids()));
create policy ql_insert on quote_lines for insert
  with check (has_role(company_id, array['owner','dispatcher']::company_role[]));
create policy ql_update on quote_lines for update
  using (has_role(company_id, array['owner','dispatcher']::company_role[]));
create policy ql_delete on quote_lines for delete
  using (has_role(company_id, array['owner','dispatcher']::company_role[]));

-- T-32: invoices (8.10) + RLS

create table invoices (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  job_id          uuid references jobs(id) on delete restrict,
  external_id     text,
  invoice_number  text,
  nav_status      text default 'pending',   -- pending|done|error
  nav_error       text,
  gross_total     numeric(12,2),
  pdf_url         text,
  idempotency_key text not null,
  issued_at       timestamptz,
  created_at      timestamptz not null default now(),
  unique (company_id, idempotency_key)
);
create index on invoices (job_id);

alter table invoices enable row level security;

create policy invoices_select on invoices for select
  using (company_id in (select auth_company_ids()));

-- Only owner/dispatcher can create invoices; only service_role updates nav_status via webhook
create policy invoices_insert on invoices for insert
  with check (has_role(company_id, array['owner','dispatcher']::company_role[]));

create policy invoices_update on invoices for update
  using (company_id in (select auth_company_ids()))
  with check (has_role(company_id, array['owner','dispatcher']::company_role[]));

-- Performance: add missing composite indexes for common query patterns

-- Dashboard: invoice revenue queries filter by company_id + created_at
create index if not exists invoices_company_created_idx
  on public.invoices (company_id, created_at);

-- Dashboard: upcoming services filter by company_id + next_service_due
create index if not exists equipment_company_service_due_idx
  on public.equipment (company_id, next_service_due)
  where next_service_due is not null;

-- Dashboard: today's appointments filter by company_id + starts_at
create index if not exists appointments_company_starts_idx
  on public.appointments (company_id, starts_at);

-- Quote number generation: count by company_id + quote_number prefix
create index if not exists quotes_company_number_idx
  on public.quotes (company_id, quote_number);

-- Job number generation: count by company_id + job_number prefix
create index if not exists jobs_company_number_idx
  on public.jobs (company_id, job_number);

-- Customer list: filter deleted + order by name (partial: only active rows)
create index if not exists customers_company_active_name_idx
  on public.customers (company_id, name)
  where deleted_at is null;

-- Jobs list: filter by deleted_at (partial: only active jobs)
create index if not exists jobs_company_active_idx
  on public.jobs (company_id, status, created_at desc)
  where deleted_at is null;

-- Sites by customer (used in booking actions)
create index if not exists sites_company_customer_idx
  on public.sites (company_id, customer_id);

-- Equipment by site (join path for customer equipment lookup)
create index if not exists equipment_site_idx
  on public.equipment (site_id);

-- T-60: Online ajánlatkérő (rendszerterv 8.11)

create table booking_requests (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  name         text not null,
  phone        text,
  email        text,
  address      text,
  service_id   uuid references services(id) on delete set null,
  message      text,
  status       text not null default 'new',   -- new|contacted|converted|spam
  job_id       uuid references jobs(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index on booking_requests (company_id, status);

alter table booking_requests enable row level security;

-- Csak az adott tenant olvashat/írhat (no anon read — a beküldés service_role API route-on át megy)
create policy "tenant read booking_requests"
  on booking_requests for select
  using (company_id in (select public.auth_company_ids()));

create policy "tenant update booking_requests"
  on booking_requests for update
  using (company_id in (select public.auth_company_ids())
    and public.has_role(company_id, array['owner','dispatcher']::public.company_role[]));

create policy "tenant delete booking_requests"
  on booking_requests for delete
  using (public.has_role(company_id, array['owner','dispatcher']::public.company_role[]));

-- Insert policy is intentionally omitted — inserts go through service_role in the API route

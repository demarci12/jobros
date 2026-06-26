-- T-43: signatures + attachments + Storage buckets + RLS

create table signatures (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  job_id      uuid not null references jobs(id) on delete cascade,
  signer_role text not null,   -- 'customer' | 'technician'
  signer_name text,
  image_url   text not null,
  signed_at   timestamptz not null default now()
);
create index on signatures (job_id);

create table attachments (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  job_id       uuid references jobs(id) on delete cascade,
  kind         document_kind not null default 'photo',
  storage_path text not null,
  caption      text,
  annotations  jsonb,
  uploaded_by  uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index on attachments (job_id);

-- RLS: signatures
alter table signatures enable row level security;

create policy sig_select on signatures for select
  using (company_id in (select auth_company_ids()));

create policy sig_insert on signatures for insert
  with check (
    company_id in (select auth_company_ids())
    and (
      has_role(company_id, array['owner','dispatcher']::company_role[])
      or exists (
        select 1 from jobs j where j.id = job_id and j.assigned_to = auth.uid()
      )
    )
  );

create policy sig_delete on signatures for delete
  using (has_role(company_id, array['owner','dispatcher']::company_role[]));

-- RLS: attachments
alter table attachments enable row level security;

create policy att_select on attachments for select
  using (company_id in (select auth_company_ids()));

create policy att_insert on attachments for insert
  with check (
    company_id in (select auth_company_ids())
    and (
      has_role(company_id, array['owner','dispatcher']::company_role[])
      or exists (
        select 1 from jobs j where j.id = job_id and j.assigned_to = auth.uid()
      )
    )
  );

create policy att_delete on attachments for delete
  using (has_role(company_id, array['owner','dispatcher']::company_role[]));

-- Storage buckets (via API, can't do in SQL migrations, but document the intent)
-- Bucket: 'signatures' (private, 2MB limit, image/png)
-- Bucket: 'attachments' (private, 20MB limit, image/*)
-- These are created via Supabase dashboard or management API.

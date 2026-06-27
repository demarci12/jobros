-- T-45: Job sablon + ellenőrzőlista (rendszerterv 8.10)

create table job_templates (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  name          text not null,
  activity      job_activity not null,
  default_lines jsonb,
  created_at    timestamptz not null default now()
);
create index on job_templates (company_id);

create table checklist_items (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  template_id uuid not null references job_templates(id) on delete cascade,
  label       text not null,
  sort_order  int not null default 0,
  is_required boolean not null default false
);
create index on checklist_items (template_id);

create table job_checklist_state (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  job_id     uuid not null references jobs(id) on delete cascade,
  label      text not null,
  is_done    boolean not null default false,
  done_at    timestamptz,
  done_by    uuid references profiles(id) on delete set null
);
create index on job_checklist_state (job_id);

-- Add FK from jobs to job_templates
alter table jobs
  add constraint jobs_template_id_fkey
  foreign key (template_id) references job_templates(id) on delete set null;

-- RLS
alter table job_templates enable row level security;
alter table checklist_items enable row level security;
alter table job_checklist_state enable row level security;

-- job_templates
create policy "tenant read job_templates"
  on job_templates for select
  using (company_id in (select public.auth_company_ids()));

create policy "dispatcher insert job_templates"
  on job_templates for insert
  with check (
    company_id in (select public.auth_company_ids())
    and public.has_role(company_id, array['owner','dispatcher']::public.company_role[])
  );

create policy "dispatcher update job_templates"
  on job_templates for update
  using (public.has_role(company_id, array['owner','dispatcher']::public.company_role[]));

create policy "dispatcher delete job_templates"
  on job_templates for delete
  using (public.has_role(company_id, array['owner','dispatcher']::public.company_role[]));

-- checklist_items
create policy "tenant read checklist_items"
  on checklist_items for select
  using (company_id in (select public.auth_company_ids()));

create policy "dispatcher insert checklist_items"
  on checklist_items for insert
  with check (
    company_id in (select public.auth_company_ids())
    and public.has_role(company_id, array['owner','dispatcher']::public.company_role[])
  );

create policy "dispatcher update checklist_items"
  on checklist_items for update
  using (public.has_role(company_id, array['owner','dispatcher']::public.company_role[]));

create policy "dispatcher delete checklist_items"
  on checklist_items for delete
  using (public.has_role(company_id, array['owner','dispatcher']::public.company_role[]));

-- job_checklist_state: minden company_user írhat (technikus is kipipálhat)
create policy "tenant read checklist_state"
  on job_checklist_state for select
  using (company_id in (select public.auth_company_ids()));

create policy "tenant insert checklist_state"
  on job_checklist_state for insert
  with check (company_id in (select public.auth_company_ids()));

create policy "tenant update checklist_state"
  on job_checklist_state for update
  using (company_id in (select public.auth_company_ids()));

create policy "dispatcher delete checklist_state"
  on job_checklist_state for delete
  using (public.has_role(company_id, array['owner','dispatcher']::public.company_role[]));

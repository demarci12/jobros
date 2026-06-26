-- T-08 audit patch: installed_apps + app_definitions RLS
-- A táblákat T-50 hozza létre teljesen (seed-del együtt).
-- Ez a migráció csak az RLS-t kapcsolja be és a minimális policy-ket adja,
-- hogy a registry.ts service-role lekérdezése ne kerüljön RLS-mentes táblára.

-- app_definitions: publikus katalógus (mint plan_definitions)
alter table public.app_definitions enable row level security;

create policy app_definitions_select on public.app_definitions
  for select
  using (true);

-- installed_apps: csak a saját tenant látja és kezeli
alter table public.installed_apps enable row level security;

create policy installed_apps_select on public.installed_apps
  for select
  using (company_id in (select public.auth_company_ids()));

create policy installed_apps_insert on public.installed_apps
  for insert
  with check (public.has_role(company_id, array['owner']::public.company_role[]));

create policy installed_apps_update on public.installed_apps
  for update
  using  (public.has_role(company_id, array['owner']::public.company_role[]))
  with check (public.has_role(company_id, array['owner']::public.company_role[]));

create policy installed_apps_delete on public.installed_apps
  for delete
  using (public.has_role(company_id, array['owner']::public.company_role[]));

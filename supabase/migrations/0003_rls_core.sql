-- T-04: RLS helperek + core policy
-- Rendszerterv 9. szakasz
-- Az rls-auditor T-03 figyelmeztetései alapján:
--   • set_updated_at() kap SET search_path = ''
--   • auth_company_ids() + has_role() kap SECURITY DEFINER + STABLE + SET search_path = ''
--   • companies speciális policy (nincs company_id, join company_users-en át)

-- ---------------------------------------------------------------------------
-- set_updated_at újra — SET search_path = '' hozzáadva (T-03 figyelmeztetés)
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
  returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS helper függvények (rendszerterv 9)
-- SECURITY DEFINER: a függvény a definiáló (postgres) jogain fut, nem a hívóén
-- STABLE: egy query-n belül cache-elhető, több RLS policy-hívás esetén is 1x fut
-- SET search_path = '': schema injection védelem
-- ---------------------------------------------------------------------------
create or replace function auth_company_ids()
  returns setof uuid
  language sql
  security definer
  stable
  set search_path = ''
as $$
  select company_id
  from   public.company_users
  where  user_id  = auth.uid()
  and    is_active = true;
$$;

create or replace function has_role(p_company uuid, p_roles public.company_role[])
  returns boolean
  language sql
  security definer
  stable
  set search_path = ''
as $$
  select exists (
    select 1
    from   public.company_users
    where  user_id    = auth.uid()
    and    company_id = p_company
    and    role       = any(p_roles)
    and    is_active  = true
  );
$$;

-- ---------------------------------------------------------------------------
-- companies
-- Speciális: nincs company_id oszlop — a policy az id-t veti össze
--   auth_company_ids() visszaad értékekkel (company_users.company_id = companies.id)
-- INSERT: onboarding Server Action service role-lal fut → nincs kliens INSERT policy
-- DELETE: tenant nem törölheti saját cégét az appon át
-- ---------------------------------------------------------------------------
alter table public.companies enable row level security;

create policy companies_select on public.companies
  for select
  using (id in (select public.auth_company_ids()));

create policy companies_update on public.companies
  for update
  using  (public.has_role(id, array['owner']::public.company_role[]))
  with check (public.has_role(id, array['owner']::public.company_role[]));

-- ---------------------------------------------------------------------------
-- profiles
-- User a saját profilját mindig olvassa/írja.
-- Csapattagok profiljait (ugyanazon cégben) szintén olvashatja.
-- INSERT: auth.uid() = id (signup után a saját profil létrehozása)
-- DELETE: auth.users cascade kezeli, nem kell policy
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
  for select
  using (
    id = auth.uid()
    or id in (
      select cu.user_id
      from   public.company_users cu
      where  cu.company_id in (select public.auth_company_ids())
      and    cu.is_active = true
    )
  );

create policy profiles_insert on public.profiles
  for insert
  with check (id = auth.uid());

create policy profiles_update on public.profiles
  for update
  using     (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- company_users
-- Tagok látják saját cégük tagjait.
-- Owner/dispatcher hívhat meg új tagot (INSERT) és módosíthat szerepkört (UPDATE).
-- Csak owner távolíthat el tagot (DELETE).
-- ---------------------------------------------------------------------------
alter table public.company_users enable row level security;

create policy company_users_select on public.company_users
  for select
  using (company_id in (select public.auth_company_ids()));

create policy company_users_insert on public.company_users
  for insert
  with check (
    public.has_role(company_id, array['owner','dispatcher']::public.company_role[])
  );

create policy company_users_update on public.company_users
  for update
  using  (public.has_role(company_id, array['owner']::public.company_role[]))
  with check (public.has_role(company_id, array['owner']::public.company_role[]));

create policy company_users_delete on public.company_users
  for delete
  using (public.has_role(company_id, array['owner']::public.company_role[]));

-- ---------------------------------------------------------------------------
-- invitations
-- Owner/dispatcher látja és kezeli a cég meghívásait.
-- Meghívás elfogadása (token alapján) service role-on fut Server Action-ből —
--   nem kell kliens oldali UPDATE policy az accept flow-hoz.
-- ---------------------------------------------------------------------------
alter table public.invitations enable row level security;

create policy invitations_select on public.invitations
  for select
  using (company_id in (select public.auth_company_ids()));

create policy invitations_insert on public.invitations
  for insert
  with check (
    public.has_role(company_id, array['owner','dispatcher']::public.company_role[])
  );

create policy invitations_update on public.invitations
  for update
  using  (public.has_role(company_id, array['owner']::public.company_role[]))
  with check (public.has_role(company_id, array['owner']::public.company_role[]));

create policy invitations_delete on public.invitations
  for delete
  using (public.has_role(company_id, array['owner']::public.company_role[]));

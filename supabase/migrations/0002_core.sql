-- T-03: alaptáblák — companies, profiles, company_users, invitations + set_updated_at trigger
-- Rendszerterv 8.3 + 8.13

-- ---------------------------------------------------------------------------
-- set_updated_at trigger függvény (8.13)
-- Alkalmazandó: companies, profiles, customers, equipment, jobs, appointments,
--   worksheets, quotes, materials, invoices, subscriptions, installed_apps
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
  returns trigger
  language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- companies (tenant root — nincs company_id)
-- ---------------------------------------------------------------------------
create table companies (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  tax_number   text,
  address      text,
  phone        text,
  email        text,
  logo_url     text,
  public_slug  text        unique,                    -- publikus ajánlatkérőhöz
  booking_mode text        not null default 'smart',  -- 'smart' | 'manual'
  plan         text        not null default 'trial',  -- cache a subscriptions-ből
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint companies_booking_mode_check check (booking_mode in ('smart', 'manual'))
);

create trigger trg_companies_updated_at
  before update on companies
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- profiles (auth.users 1:1 leképezése)
-- ---------------------------------------------------------------------------
create table profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  full_name  text,
  phone      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- company_users (RBAC — ki melyik cégnél milyen szerepkörben van)
-- ---------------------------------------------------------------------------
create table company_users (
  company_id uuid         not null references companies(id) on delete cascade,
  user_id    uuid         not null references profiles(id)  on delete cascade,
  role       company_role not null default 'technician',
  is_active  boolean      not null default true,
  created_at timestamptz  not null default now(),
  primary key (company_id, user_id)
);

create index on company_users (user_id);

-- ---------------------------------------------------------------------------
-- invitations (email-alapú csapat-meghívás, signed token)
-- ---------------------------------------------------------------------------
create table invitations (
  id          uuid         primary key default gen_random_uuid(),
  company_id  uuid         not null references companies(id) on delete cascade,
  email       text         not null,
  role        company_role not null default 'technician',
  token       text         not null unique,
  accepted_at timestamptz,
  invited_by  uuid         references profiles(id) on delete set null,
  expires_at  timestamptz  not null,
  created_at  timestamptz  not null default now()
);

create index on invitations (company_id);

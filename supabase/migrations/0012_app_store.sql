-- T-50: app_definitions + installed_apps (8.12) + RLS + seed

create table app_definitions (
  slug          text primary key,
  name          text not null,
  category      app_category not null,
  description   text,
  icon_url      text,
  auth_type     text not null,   -- oauth|api_key|none
  config_schema jsonb,
  is_active     boolean not null default true,
  sort_order    int not null default 0
);

create table installed_apps (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  app_slug     text not null references app_definitions(slug),
  config       jsonb,
  secret_ref   text,             -- titok a Vault-ban, sosem plain kulcs
  is_enabled   boolean not null default true,
  installed_by uuid references profiles(id) on delete set null,
  installed_at timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (company_id, app_slug)
);
create index on installed_apps (company_id, is_enabled);
create trigger trg_installed_apps_updated_at before update on installed_apps
  for each row execute function set_updated_at();

-- RLS: app_definitions (nyilvános, tenant-független)
alter table app_definitions enable row level security;
create policy app_def_select on app_definitions for select using (true);

-- RLS: installed_apps
alter table installed_apps enable row level security;

create policy ia_select on installed_apps for select
  using (company_id in (select auth_company_ids()));

create policy ia_insert on installed_apps for insert
  with check (has_role(company_id, array['owner']::company_role[]));

create policy ia_update on installed_apps for update
  using (has_role(company_id, array['owner']::company_role[]));

create policy ia_delete on installed_apps for delete
  using (has_role(company_id, array['owner']::company_role[]));

-- Seed: app katalógus (rendszerterv 11)
insert into app_definitions (slug, name, category, description, auth_type, sort_order) values
  ('billingo',         'Billingo',          'invoicing',       'Magyar online számlázó – NAV-kompatibilis e-számla kiállítás', 'api_key', 10),
  ('szamlazz',         'Számlázz.hu',       'invoicing',       'Magyar számlázó, NAV Online Számla integráció',               'api_key', 20),
  ('google_calendar',  'Google Calendar',   'calendar',        'Foglalások szinkronizálása Google Naptárral',                  'oauth',   10),
  ('apple_calendar',   'Apple Calendar',    'calendar',        'Foglalások szinkronizálása Apple Naptárral (CalDAV)',          'oauth',   20),
  ('stripe',           'Stripe',            'payment',         'Online fizetés bankkártyával (EU, SCA-kompatibilis)',          'api_key', 10),
  ('simplepay',        'SimplePay',         'payment',         'Magyar online fizetési kapu (OTP SimplePay)',                  'api_key', 20),
  ('barion',           'Barion',            'payment',         'Magyar e-pénztárca és kártyás fizetés',                       'api_key', 30),
  ('infobip',          'Infobip',           'messaging',       'SMS + WhatsApp üzenetküldés ügyfeleknek',                     'api_key', 10),
  ('resend',           'Resend',            'messaging',       'Tranzakciós e-mail küldés (foglalás-visszaigazolás, számla)', 'api_key', 20);

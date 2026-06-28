-- trade (szakma) enum
create type public.trade as enum (
  'klima',
  'gaz',
  'hoszivattyu',
  'futes',
  'villany',
  'viz',
  'egyeb'
);

-- services: trade mező
alter table public.services
  add column if not exists trade public.trade not null default 'klima';

-- company_users: technikus szakmái (tömb, egy szerelő több szakmában is dolgozhat)
alter table public.company_users
  add column if not exists trades public.trade[] not null default '{}';

-- profiles: phone már megvan, adjunk hozzá color-t (naptárban a technikus színe)
alter table public.profiles
  add column if not exists color text;

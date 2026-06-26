-- T-05: SaaS billing séma + RLS
-- Rendszerterv 8.4 + 9. szakasz
--
-- Tartalmaz T-04 audit kritikus patch-et:
--   company_users_insert policy-t szigorítja — dispatcher nem tud owner szerepkört adni

-- ---------------------------------------------------------------------------
-- T-04 audit kritikus patch: company_users_insert role-cap
-- Dispatcher csak technician/dispatcher szerepkörű tagot adhat hozzá,
-- owner szerepkört kizárólag owner adhat hozzá.
-- ---------------------------------------------------------------------------
drop policy if exists company_users_insert on public.company_users;

create policy company_users_insert on public.company_users
  for insert
  with check (
    -- owner bármilyen szerepkört adhat
    public.has_role(company_id, array['owner']::public.company_role[])
    or (
      -- dispatcher csak technician vagy dispatcher szerepkört adhat
      public.has_role(company_id, array['dispatcher']::public.company_role[])
      and role <> 'owner'
    )
  );

-- ---------------------------------------------------------------------------
-- plan_definitions (globális katalógus — nincs company_id)
-- Rendszerterv 8.4
-- ---------------------------------------------------------------------------
create table public.plan_definitions (
  slug            text        primary key,
  name            text        not null,
  price_monthly   numeric(12,2) not null default 0,
  price_yearly    numeric(12,2),
  max_technicians int,                          -- null = korlátlan
  max_jobs_month  int,
  features        jsonb,                        -- {app_store, gps, memberships, ...}
  stripe_price_id text,
  is_active       boolean     not null default true,
  sort_order      int         not null default 0
);

-- plan_definitions nyilvános katalógus: mindenki olvashatja (árazási oldal, onboarding)
alter table public.plan_definitions enable row level security;

create policy plan_definitions_select on public.plan_definitions
  for select
  using (true);

-- INSERT/UPDATE/DELETE: service role-on át (admin kezeli, nincs kliens policy)

-- ---------------------------------------------------------------------------
-- subscriptions (tenant előfizetés — 1 céghez 1 sor, UNIQUE company_id)
-- Rendszerterv 8.4
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id                     uuid               primary key default gen_random_uuid(),
  company_id             uuid               not null references public.companies(id) on delete cascade,
  plan_slug              text               not null references public.plan_definitions(slug),
  status                 subscription_status not null default 'trialing',
  trial_ends_at          timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean            not null default false,
  stripe_customer_id     text,
  stripe_subscription_id text,
  last_invoice_id        uuid,              -- a magunkról kiállított NAV-számla
  created_at             timestamptz        not null default now(),
  updated_at             timestamptz        not null default now(),
  unique (company_id)
);

create index on public.subscriptions (status);
create index on public.subscriptions (trial_ends_at) where status = 'trialing';

create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- subscriptions: csak owner látja és kezeli a saját cég előfizetését
-- INSERT/UPDATE: service role (onboarding + Stripe webhook) — nincs kliens policy
alter table public.subscriptions enable row level security;

create policy subscriptions_select on public.subscriptions
  for select
  using (public.has_role(company_id, array['owner']::public.company_role[]));

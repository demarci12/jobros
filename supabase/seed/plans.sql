-- Plan seed — rendszerterv 12. szakasz
-- Árak placeholder (üzleti döntés szerint módosítandó)

insert into public.plan_definitions
  (slug, name, price_monthly, price_yearly, max_technicians, max_jobs_month, features, is_active, sort_order)
values
  (
    'trial',
    'Próbaidőszak',
    0,
    0,
    null,       -- korlátlan
    null,       -- korlátlan
    '{"app_store": true, "gps": true, "memberships": true, "dispatch_smart": true, "priority_support": false}'::jsonb,
    true,
    0
  ),
  (
    'alap',
    'Alap',
    4900,
    49000,      -- ~2 hónap ingyen éves számlázással
    2,
    null,
    '{"app_store": false, "gps": false, "memberships": false, "dispatch_smart": true, "priority_support": false}'::jsonb,
    true,
    1
  ),
  (
    'pro',
    'Pro',
    12900,
    129000,
    8,
    null,
    '{"app_store": true, "gps": true, "memberships": true, "dispatch_smart": true, "priority_support": false}'::jsonb,
    true,
    2
  ),
  (
    'business',
    'Business',
    24900,
    249000,
    null,       -- korlátlan
    null,
    '{"app_store": true, "gps": true, "memberships": true, "dispatch_smart": true, "priority_support": true}'::jsonb,
    true,
    3
  )
on conflict (slug) do update set
  name            = excluded.name,
  price_monthly   = excluded.price_monthly,
  price_yearly    = excluded.price_yearly,
  max_technicians = excluded.max_technicians,
  max_jobs_month  = excluded.max_jobs_month,
  features        = excluded.features,
  is_active       = excluded.is_active,
  sort_order      = excluded.sort_order;

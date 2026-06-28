-- Alap plan_definitions sorok (onboarding-hoz szükséges FK)
insert into public.plan_definitions (slug, name, price_monthly, price_yearly, max_technicians, features, sort_order)
values
  ('trial',    'Próbaidőszak', 0,      null,  2,    '{"app_store":false,"gps":false,"memberships":false}'::jsonb, 0),
  ('basic',    'Alap',         4900,   49000, 2,    '{"app_store":false,"gps":false,"memberships":false}'::jsonb, 1),
  ('pro',      'Pro',          9900,   99000, 8,    '{"app_store":true,"gps":true,"memberships":true}'::jsonb,  2),
  ('business', 'Business',     19900,  199000, null,'{"app_store":true,"gps":true,"memberships":true}'::jsonb,  3)
on conflict (slug) do nothing;

-- ============================================================
-- PILOT SEED — 3 demo HVAC cég + reális adatok
-- CSAK fejlesztői / demo környezetbe! Éles DB-re NE push-old.
-- Futtatás: psql -f pilot.sql (vagy Supabase SQL editor)
-- ============================================================

-- A seed idempotens: on conflict do nothing / update

-- ── 1. Cégek ────────────────────────────────────────────────

insert into public.companies (id, name, tax_number, address, city, booking_mode, public_slug, plan, created_at)
values
  (
    '11111111-0000-0000-0000-000000000001',
    'Hűtéstechnika Kft.',
    '12345678-2-41',
    'Váci út 1.',
    'Budapest',
    'manual',
    'hutestechnika',
    'trial',
    now() - interval '5 days'
  ),
  (
    '22222222-0000-0000-0000-000000000002',
    'KlímaCenter Zrt.',
    '87654321-2-13',
    'Kossuth Lajos utca 12.',
    'Győr',
    'smart',
    'klimacenter',
    'trial',
    now() - interval '3 days'
  ),
  (
    '33333333-0000-0000-0000-000000000003',
    'Hőpumpa Szakszerviz Bt.',
    '11223344-1-02',
    'Petőfi út 8.',
    'Pécs',
    'manual',
    'hopumpa-pecs',
    'trial',
    now() - interval '1 day'
  )
on conflict (id) do nothing;

-- ── 2. Trial subscriptions ───────────────────────────────────

insert into public.subscriptions (company_id, plan_slug, status, trial_ends_at, created_at)
values
  ('11111111-0000-0000-0000-000000000001', 'trial', 'trialing', now() + interval '9 days',  now() - interval '5 days'),
  ('22222222-0000-0000-0000-000000000002', 'trial', 'trialing', now() + interval '11 days', now() - interval '3 days'),
  ('33333333-0000-0000-0000-000000000003', 'trial', 'trialing', now() + interval '13 days', now() - interval '1 day')
on conflict (company_id) do nothing;

-- ── 3. Szolgáltatások ────────────────────────────────────────

insert into public.services (id, company_id, name, default_duration_min, default_price, vat_rate, requires_survey, is_active)
values
  -- Hűtéstechnika Kft.
  ('aaaa0001-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Klíma éves karbantartás',   90,  25000, 27, false, true),
  ('aaaa0001-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Klíma telepítés',          240, 80000, 27, true,  true),
  ('aaaa0001-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'Hűtőközeg töltés',          60, 18000, 27, false, true),
  ('aaaa0001-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 'Klíma javítás felmérés',    45,  8000, 27, true,  true),
  -- KlímaCenter Zrt.
  ('bbbb0002-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'Split klíma karbantartás',  60,  22000, 27, false, true),
  ('bbbb0002-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'Multi-split telepítés',    300, 120000, 27, true,  true),
  ('bbbb0002-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002', 'Szűrőcsere',                30,   5000, 27, false, true),
  -- Hőpumpa Szakszerviz Bt.
  ('cccc0003-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000003', 'Hőszivattyú szerviz',      120, 45000, 27, false, true),
  ('cccc0003-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000003', 'Hőszivattyú telepítés',    480, 250000, 27, true,  true),
  ('cccc0003-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000003', 'Fűtési rendszer felmérés',   90, 15000, 27, true,  true)
on conflict (id) do nothing;

-- ── 4. Ügyfelek (Hűtéstechnika Kft.) ───────────────────────

insert into public.customers (id, company_id, name, phone, email, created_at)
values
  ('cust0001-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Nagy János',       '+36201234567', 'nagy.janos@email.hu',    now() - interval '4 days'),
  ('cust0001-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Kovács Mária',     '+36301234568', 'kovacs.maria@email.hu',  now() - interval '3 days'),
  ('cust0001-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'Szabó Péter Kft.', '+36201234569', 'info@szabokft.hu',        now() - interval '2 days'),
  ('cust0001-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 'Tóth Gábor',       '+36701234560', 'toth.gabor@gmail.com',   now() - interval '1 day'),
  -- KlímaCenter Zrt.
  ('cust0002-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'Horváth László',   '+36201111111', 'horvath@email.hu',       now() - interval '2 days'),
  ('cust0002-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'Varga Éva',        '+36301111112', 'varga.eva@email.hu',     now() - interval '1 day'),
  -- Hőpumpa Bt.
  ('cust0003-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000003', 'Kiss Zoltán',      '+36201222222', 'kiss.zoltan@email.hu',   now() - interval '1 day')
on conflict (id) do nothing;

-- ── 5. Telephelyek (sites) ───────────────────────────────────

insert into public.sites (id, company_id, customer_id, address, city, created_at)
values
  ('site0001-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'cust0001-0000-0000-0000-000000000001', 'Rózsa utca 5.', 'Budapest', now() - interval '4 days'),
  ('site0001-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'cust0001-0000-0000-0000-000000000002', 'Tulipán u 12.', 'Budapest', now() - interval '3 days'),
  ('site0001-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'cust0001-0000-0000-0000-000000000003', 'Ipari park 3.', 'Budaörs',  now() - interval '2 days'),
  ('site0001-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 'cust0001-0000-0000-0000-000000000004', 'Fő utca 21.',   'Érd',      now() - interval '1 day'),
  ('site0002-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'cust0002-0000-0000-0000-000000000001', 'Árpád út 7.',   'Győr',     now() - interval '2 days'),
  ('site0002-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'cust0002-0000-0000-0000-000000000002', 'Kert utca 3.',  'Győr',     now() - interval '1 day'),
  ('site0003-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000003', 'cust0003-0000-0000-0000-000000000001', 'Mecsek u 14.',  'Pécs',     now() - interval '1 day')
on conflict (id) do nothing;

-- ── 6. Berendezések (equipment) ─────────────────────────────

insert into public.equipment (id, company_id, site_id, kind, manufacturer, model, serial_number, installed_at, next_service_due, created_at)
values
  ('equip001-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'site0001-0000-0000-0000-000000000001', 'klima',      'Daikin',   'FTXB35C',   'DK-2022-001', '2022-05-10', (now() + interval '6 days')::date,  now() - interval '4 days'),
  ('equip001-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'site0001-0000-0000-0000-000000000002', 'klima',      'Mitsubishi','MSZ-HR25VF','MSZ-2021-002','2021-08-15', (now() + interval '12 days')::date, now() - interval '3 days'),
  ('equip001-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'site0001-0000-0000-0000-000000000003', 'klima',      'LG',        'S12ET.NSJ', 'LG-2020-003', '2020-06-20', (now() - interval '5 days')::date,  now() - interval '2 days'),
  ('equip001-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 'site0001-0000-0000-0000-000000000004', 'klima',      'Samsung',   'AR12TXHQASINEU','SAM-2023-004','2023-03-01',(now() + interval '280 days')::date, now() - interval '1 day'),
  ('equip002-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'site0002-0000-0000-0000-000000000001', 'klima',      'Daikin',   'FTXC35D',   'DK-2021-A01', '2021-09-01', (now() + interval '8 days')::date,  now() - interval '2 days'),
  ('equip003-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000003', 'site0003-0000-0000-0000-000000000001', 'hoszivattyú','Viessmann', 'Vitocal 111-S','VS-2022-B01','2022-11-15',(now() + interval '3 days')::date, now() - interval '1 day')
on conflict (id) do nothing;

-- ── 7. Munkák (jobs) ────────────────────────────────────────

insert into public.jobs (id, company_id, job_number, customer_id, site_id, service_id, title, status, created_at, updated_at)
values
  -- Hűtéstechnika Kft. — vegyes státuszú munkák
  ('job00001-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '2026-0001', 'cust0001-0000-0000-0000-000000000001', 'site0001-0000-0000-0000-000000000001', 'aaaa0001-0000-0000-0000-000000000001', 'Klíma éves karbantartás', 'kesz',        now() - interval '3 days', now() - interval '1 day'),
  ('job00001-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', '2026-0002', 'cust0001-0000-0000-0000-000000000002', 'site0001-0000-0000-0000-000000000002', 'aaaa0001-0000-0000-0000-000000000002', 'Új klíma telepítése',    'folyamatban', now() - interval '2 days', now() - interval '2 days'),
  ('job00001-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', '2026-0003', 'cust0001-0000-0000-0000-000000000003', 'site0001-0000-0000-0000-000000000003', 'aaaa0001-0000-0000-0000-000000000003', 'Hűtőközeg pótlás',       'utemezve',    now() - interval '1 day',  now() - interval '1 day'),
  ('job00001-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', '2026-0004', 'cust0001-0000-0000-0000-000000000004', 'site0001-0000-0000-0000-000000000004', 'aaaa0001-0000-0000-0000-000000000004', 'Felmérés — szobaklíma',  'felmeres',    now(),                     now()),
  -- KlímaCenter Zrt.
  ('job00002-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', '2026-0001', 'cust0002-0000-0000-0000-000000000001', 'site0002-0000-0000-0000-000000000001', 'bbbb0002-0000-0000-0000-000000000001', 'Szerviz',                'uj',          now(),                     now()),
  -- Hőpumpa Bt.
  ('job00003-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000003', '2026-0001', 'cust0003-0000-0000-0000-000000000001', 'site0003-0000-0000-0000-000000000001', 'cccc0003-0000-0000-0000-000000000001', 'Éves szerviz',           'utemezve',    now(),                     now())
on conflict (id) do nothing;

-- ── 8. Job sablon (ellenőrzőlista) ──────────────────────────

insert into public.job_templates (id, company_id, name, activity, created_at)
values
  ('tmpl0001-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Klíma éves karbantartás', 'szerviz', now()),
  ('tmpl0001-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Klíma telepítés',         'telepites', now()),
  ('tmpl0003-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000003', 'Hőszivattyú szerviz',     'szerviz', now())
on conflict (id) do nothing;

insert into public.checklist_items (company_id, template_id, label, sort_order, is_required)
values
  -- Klíma karbantartás checklist
  ('11111111-0000-0000-0000-000000000001', 'tmpl0001-0000-0000-0000-000000000001', 'Szűrő tisztítás / csere', 0, true),
  ('11111111-0000-0000-0000-000000000001', 'tmpl0001-0000-0000-0000-000000000001', 'Hőcserélő tisztítás', 1, true),
  ('11111111-0000-0000-0000-000000000001', 'tmpl0001-0000-0000-0000-000000000001', 'Hűtőközeg nyomás ellenőrzés', 2, true),
  ('11111111-0000-0000-0000-000000000001', 'tmpl0001-0000-0000-0000-000000000001', 'Elektromos kötések ellenőrzése', 3, false),
  ('11111111-0000-0000-0000-000000000001', 'tmpl0001-0000-0000-0000-000000000001', 'Próbaüzem', 4, true),
  -- Klíma telepítés checklist
  ('11111111-0000-0000-0000-000000000001', 'tmpl0001-0000-0000-0000-000000000002', 'Helyszín felmérés', 0, true),
  ('11111111-0000-0000-0000-000000000001', 'tmpl0001-0000-0000-0000-000000000002', 'Beltéri egység elhelyezése', 1, true),
  ('11111111-0000-0000-0000-000000000001', 'tmpl0001-0000-0000-0000-000000000002', 'Kültéri egység rögzítése', 2, true),
  ('11111111-0000-0000-0000-000000000001', 'tmpl0001-0000-0000-0000-000000000002', 'Hűtővezeték bekötés', 3, true),
  ('11111111-0000-0000-0000-000000000001', 'tmpl0001-0000-0000-0000-000000000002', 'Vákuumozás', 4, true),
  ('11111111-0000-0000-0000-000000000001', 'tmpl0001-0000-0000-0000-000000000002', 'Hűtőközeg töltés', 5, true),
  ('11111111-0000-0000-0000-000000000001', 'tmpl0001-0000-0000-0000-000000000002', 'Próbaüzem + átadás', 6, true),
  -- Hőszivattyú szerviz
  ('33333333-0000-0000-0000-000000000003', 'tmpl0003-0000-0000-0000-000000000001', 'Kompresszor nyomás ellenőrzés', 0, true),
  ('33333333-0000-0000-0000-000000000003', 'tmpl0003-0000-0000-0000-000000000001', 'Hőcserélő felülvizsgálat', 1, true),
  ('33333333-0000-0000-0000-000000000003', 'tmpl0003-0000-0000-0000-000000000001', 'Szivárgásvizsgálat', 2, true),
  ('33333333-0000-0000-0000-000000000003', 'tmpl0003-0000-0000-0000-000000000001', 'Próbaüzem fűtési / hűtési módban', 3, true)
on conflict do nothing;

-- ── 9. App definitions seed (ha még nem fut-e) ──────────────

insert into public.app_definitions (slug, name, category, auth_type, description, is_active, config_schema)
values
  ('billingo',         'Billingo',          'invoicing',  'api_key', 'NAV-kompatibilis számlázó',      true, '{"api_key": "string"}'::jsonb),
  ('szamlazz',         'Számlázz.hu',       'invoicing',  'api_key', 'NAV-kompatibilis számlázó',      true, '{"agent_key": "string"}'::jsonb),
  ('google_calendar',  'Google Naptár',     'calendar',   'oauth2',  'Kétirányú naptár szinkronizáció',true, '{"scopes": ["calendar"]}'::jsonb),
  ('apple_calendar',   'Apple Naptár',      'calendar',   'api_key', 'CalDAV szinkron',                true, '{"caldav_url": "string", "username": "string", "password": "string"}'::jsonb),
  ('stripe',           'Stripe',            'payment',    'api_key', 'Bankkártyás fizetés',            true, '{"publishable_key": "string", "secret_key": "string"}'::jsonb),
  ('simplepay',        'SimplePay',         'payment',    'api_key', 'OTP SimplePay fizetés',          true, '{"merchant_id": "string", "secret_key": "string"}'::jsonb),
  ('barion',           'Barion',            'payment',    'api_key', 'Barion fizetési kapu',           true, '{"pos_key": "string"}'::jsonb),
  ('infobip',          'Infobip SMS',       'messaging',  'api_key', 'SMS értesítések',                true, '{"api_key": "string", "base_url": "string", "sender": "string"}'::jsonb),
  ('resend',           'Resend Email',      'messaging',  'api_key', 'Tranzakciós email',              true, '{"api_key": "string", "from_email": "string"}'::jsonb)
on conflict (slug) do update set
  name        = excluded.name,
  description = excluded.description,
  is_active   = excluded.is_active,
  config_schema = excluded.config_schema;

-- ── Kész ─────────────────────────────────────────────────────
-- A 3 pilot cég owner user-jeit a /register → onboarding flow-n át kell létrehozni.
-- Az owner user regisztráció után automatikusan a company_users táblába kerül.
-- A seed csak a cégadatokat, ügyfeleket és berendezéseket hozza létre előre.

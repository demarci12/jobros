-- T-02: extensions + enumok (rendszerterv 8.3)

create extension if not exists "pgcrypto";
create extension if not exists "postgis";

-- Szerepkörök (RBAC)
create type company_role as enum (
  'owner',
  'dispatcher',
  'technician',
  'accountant'
);

-- Munka státuszok (FSM)
create type job_status as enum (
  'uj',
  'felmeres',
  'arajanlat',
  'utemezve',
  'folyamatban',
  'kesz',
  'szamlazva',
  'fizetve',
  'elutasitva',
  'lemondva'
);

-- Munka tevékenység típusa (NEM jogosultság)
create type job_activity as enum (
  'telepites',
  'szerviz',
  'javitas',
  'felmeres',
  'altalanos'
);

-- Berendezés típusa
create type equipment_kind as enum (
  'klima',
  'kazan',
  'hoszivattyu',
  'legkezelo',
  'egyeb'
);

-- Időpont típusa
create type appointment_kind as enum (
  'felmeres',
  'munka'
);

-- Időpont státusza
create type appointment_status as enum (
  'tervezett',
  'megerosítve',
  'folyamatban',
  'kesz',
  'lemondva'
);

-- SaaS előfizetés státusza
create type subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'suspended'
);

-- App Store kategóriák
create type app_category as enum (
  'invoicing',
  'calendar',
  'payment',
  'messaging',
  'accounting'
);

-- Dokumentum típus
create type document_kind as enum (
  'worksheet',
  'quote',
  'invoice',
  'photo'
);

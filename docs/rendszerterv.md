# Jobro — Rendszerterv (tiszta, v2.0)

**Dátum:** 2026-06-25 · **Termék:** CRM + FSM + foglalás magyar HVAC/klíma/gáz vállalkozásoknak
**Stack:** Next.js 14 (App Router) · Supabase (Postgres + Auth + Realtime + Storage, EU) · TypeScript · shadcn/ui · Tailwind · zod

> Ez az **egyetlen forrás** (single source of truth). Egységes dokumentum, nincsenek egymást felülíró függelékek. A korábbi MMK / F-gáz / gázbiztonsági jegyzőkönyv koncepció **teljesen kikerült**.

## Tartalom
1. [Termékvízió](#1-termékvízió)
2. [Filozófia: compose-OSS](#2-filozófia-compose-oss)
3. [Szerepkörök és personák](#3-szerepkörök-és-personák)
4. [Use case-ek](#4-use-case-ek)
5. [Funkció terv](#5-funkció-terv)
6. [Követelmények](#6-követelmények)
7. [Architektúra](#7-architektúra)
8. [Adatmodell és DB séma](#8-adatmodell-és-db-séma)
9. [Row Level Security](#9-row-level-security)
10. [API](#10-api)
11. [Integrációk és App Store](#11-integrációk-és-app-store)
12. [SaaS-előfizetés és regisztráció](#12-saas-előfizetés-és-regisztráció)
13. [Frontend és UX](#13-frontend-és-ux)
14. [Biztonság és GDPR](#14-biztonság-és-gdpr)
15. [OSS-komponensek és licenc](#15-oss-komponensek-és-licenc)

---

## 1. Termékvízió

**Cél:** generikus, stabil, könnyen használható **CRM + FSM + foglalás** magyar HVAC/klíma/gáz vállalkozásoknak. A jelenlegi gyakorlat (füzet/Google Naptár, semmilyen ügyféltárhely) leváltása; a fejlettebb cégeknél van CRM, de nincs dispatch / munkalap / árajánlat egy helyen.

**A központi egység a CRM.** A folyamat telefon-vezérelt: hívás → CRM-azonosítás → foglalás az ügyfélprofilból. Minden ide fut be.

**Differenciátor (moat):**
- **Smart dispatch** — okos foglalás: a címhez legközelebbi/illetékes szerelő, utazási bufferrel, valódi route-optimalizálással (VROOM/OSRM). A versenytársak (OkosMunkalap, onlinemunkalap) ezt nem tudják.
- **NAV-álló számlázás** natívan (Billingo/Számlázz.hu connector) — a nyugati FSM-eknek nincs.
- **App store** kiterjeszthetőség (fizetés, naptár, számlázás) + **Apple/Google login**.
- **Beépített fizetés + recurring tagság** (Phase 2) — a vállalkozó saját ismétlődő bevétele a platformon.

**Nem-cél:** gázszerelői jogosultság-kezelés, hatósági jegyzőkönyvek, marketing suite, VoIP/AI-receptionist, bérszámfejtés. (Nem a célpiacunk, 1–8 fős HU HVAC.)

---

## 2. Filozófia: compose-OSS

Bevált open-source elemekre és mintákra építünk a commodity rétegeknél, natívan csak a moat-ot építjük.
- **Natív (moat):** CRM, smart dispatch, FSM workflow, NAV-számlázás, app store.
- **OSS-ből/mintából:** route-optimalizálás (VROOM/OSRM), auth (Supabase), booking-logika kód-forrás (Cal.diy MIT), opcionálisan e-signature (Documenso) és notification (Novu).
- **Licenc-vasszabály:** a core termékbe csak **MIT/BSD** kód olvasztható. **AGPL** (Documenso, Twenty) csak különálló, hálózaton hívott service-ként. Részletek: 15. szakasz.

---

## 3. Szerepkörök és personák

### Szerepkörök (RBAC)
| Szerep | Leírás | Fő jogosultságok |
|--------|--------|------------------|
| `owner` | Cégtulajdonos / előfizető | Minden + billing, csapat, beállítások |
| `dispatcher` | Diszpécser / iroda | Ügyfél, foglalás, munka, riport |
| `technician` | Szerelő | Saját munkái, helyszíni rögzítés, mobil |
| `accountant` | Könyvelő | Számlák, pénzügyi export (read-mostly) |

### Personák
- **P1 — Gábor (38), egyszemélyes klíma KFT.** Maga szerel + 1 alvállalkozó, havi 80–120 munka. Most: Excel + telefon. Akkor vált, ha CRM + foglalás + számlázás egy helyen van, mobilról.
- **P2 — Anita (45), 5 szerelős gáz cég irodása.** Ő koordinál Excelben. Fájdalom: ki hol van, mi kész, ki számlázott. A diszpécser-nézet + technikus mobil szinkron a kulcs.
- **P3 — Tamás (41), klíma + hőszivattyú beépítés.** Nagy tételek (300–800 eFt). Számára a részletfizetés (Phase 2) a fő close-rate eszköz.

---

## 4. Use case-ek

### UC-01 — Telefon-intake és CRM-azonosítás
```
Aktor: dispatcher
1. Betelefonálnak → a felvevő a CRM gyors-keresőbe írja a nevet/telefont
2. Létező ügyfél → megnyílik a profilja (címek + foglalások)
   Új ügyfél → ELSŐ LÉPÉS: felvitel a CRM-be (név + cím), majd profil
3. Egy ügyfélhez több cím tartozhat (több lakás/ház)
```

### UC-02 — Foglalás az ügyfélprofilból (két mód, beállítható)
A cég a beállításokban választ **foglalási módot** (`companies.booking_mode`): **smart** (felajánlós) vagy **manual** (Google Calendar-szerű). Mindkét mód az ügyfélprofil "Új időpont" gombjából indul, és job + appointment-et hoz létre, naptárba szinkronizálva.

```
Aktor: dispatcher
1. Az ügyfélprofilon "Új időpont" → foglaló (drop-up)
2. Szolgáltatás választása (services) → ebből jön az időtartam és kell-e felmérés

  [SMART mód — felajánlós]
  3a. Nap kiválasztása
  4a. A rendszer (VROOM/OSRM) javasol 3–5 idősávot: idő + legközelebbi szerelő + becsült odajutás
  5a. Egy kattintás a javaslatra = foglalás

  [MANUAL mód — Google Calendar-szerű]
  3b. Naptár-rács: a felhasználó maga választ szabad sávot és szerelőt (a foglaltság látszik)
  4b. (a rendszer csak ütközést ellenőriz, nem optimalizál)
  5b. Mentés = foglalás

6. Job + appointment létrejön, naptárba szinkronizál
```

### UC-03 — Felmérés → ajánlat → munka (kétlépcsős)
```
1. Ha a szolgáltatás felmérést igényel → előbb CSAK a felmérésre foglal (rövid sáv)
2. Felmérés után → árajánlat (tételek, opciók) → ügyfél elfogadja
3. Az elfogadott ajánlat idején foglalunk a TELJES munkára (teljes időtartam)
```

### UC-04 — Munka elvégzése (reszponzív web; offline/GPS later)
```
Aktor: technician
1. Reggel: napi beosztás a böngészőben (reszponzív web, telefonon is)
2. Helyszínen: munkalap (elvégzett munka, tételek, fotó), időmérés
4. Munka végén: vevő aláírja (elfogadja) → kesz státusz
```

### UC-05 — Számlázás NAV-állóan
```
Aktor: owner, dispatcher
1. kesz jobból egy kattintással számla; tételek a munkalapról
2. A telepített számlázó connector (Billingo/Számlázz.hu) kiállítja → NAV automatikus
3. NAV státusz + PDF visszaíródik; idempotens (kétszeri kattintás 1 számla)
```

### UC-06 — Regisztráció és előfizetés
```
1. Sign up (Google/Apple/email) → email verifikáció
2. Onboarding: cégadatok → company + owner + trial előfizetés (14 nap)
3. (opc.) szolgáltatások + szervizzóna + csapat-meghívás
4. Trial alatt minden funkció él; lejáratkor előfizetés-választó (paywall)
5. Beállításokban bármikor: saját adat módosítás, cégadat, csapat (tag hozzáad/töröl/szerep),
   szolgáltatás, zóna, értesítés, foglalási mód, integráció, ELŐFIZETÉS LEMONDÁSA
```

### UC-07 — Beállítások és rugalmas adatkezelés
```
Aktor: owner (teljes), dispatcher (korlátozott)
1. Beállítások: minden konfigurálható (saját adat, cég, csapat, szolgáltatás, zóna,
   értesítés, foglalási mód, integráció, előfizetés — lemondással együtt)
2. CRM és minden lista: bármely elem HOZZÁADHATÓ / SZERKESZTHETŐ / TÖRÖLHETŐ
   (ügyfél, cím, berendezés, munka, foglalás, tétel, szolgáltatás, csapattag…)
3. Törlés = soft delete megerősítéssel + undo (ahol értelmes); a számlák jogi okból maradnak
```

---

## 5. Funkció terv

### Phase 1 — Core (CRM + FSM + booking)
| ID | Funkció | Use case |
|----|---------|----------|
| F-01 | Auth (Google/Apple/email) + multi-tenant | UC-06 |
| F-02 | Regisztráció + onboarding + trial | UC-06 |
| F-03 | Telefon-intake + CRM gyors-keresés | UC-01 |
| F-04 | Ügyfél (customer) + címek (sites) | UC-01 |
| F-05 | Berendezés (equipment) nyilvántartás | UC-04 |
| F-06 | Szolgáltatások (services) konfiguráció | UC-02 |
| F-07 | Szervizzónák (service_zones) + geokód/H3 | UC-02 |
| F-08 | Foglalás (appointments) + smart dispatch (VROOM/OSRM) | UC-02/03 |
| F-09 | Munka (jobs) + magyar státusz pipeline | UC-03 |
| F-10 | Munkalap (worksheets) + tételek | UC-04 |
| F-11 | Árajánlat (quotes) + opciók (good/better/best) | UC-03 |
| F-12 | Diszpécser naptár (nap/hét/hó/térkép) | UC-02 |
| F-14 | Digitális aláírás + fotó (reszponzív web) | UC-04 |
| F-15 | Időkövetés (timesheet) | UC-04 |
| F-16 | Ellenőrzőlista / job sablon | UC-04 |
| F-18 | Google + Apple naptár sync | UC-02 |
| F-19 | NAV számlázás (Billingo/Számlázz connector) | UC-05 |
| F-20 | App Store (connector telepítés) | — |
| F-21 | Értesítés (SMS/email) | UC-02 |
| F-22 | Anyag/alkatrész katalógus + készlet | UC-04 |
| F-23 | Online ajánlatkérő (publikus) | — |
| F-24 | Dashboard (bevétel, nyitott, kintlévő) | — |
| F-25 | Csapat-meghívás + tag törlés/szerep | UC-06 |
| F-28 | Teljes beállítás-hub (account, cég, értesítés, foglalás, stb.) | UC-06 |
| F-29 | Teljes CRUD minden entitáson (hozzáad/szerkeszt/töröl) + soft delete/undo | minden |
| F-26 | PDF (munkalap, ajánlat, számla) | UC-04/05 |
| F-27 | Könyvelő export (CSV/XML) | UC-05 |

### Phase 2 — Moat
| ID | Funkció |
|----|---------|
| F-30 | Beépített fizetés (Stripe/SimplePay/Barion connector) |
| F-31 | Részletfizetési kalkulátor árajánlatban |
| F-32 | Karbantartási tagság engine + autopay (kártya tárolás) |
| F-33 | Automatikus review kérés |
| F-34 | Kötelező szerviz emlékeztető automatizálás |
| F-35 | Ügyfélportál (ajánlat-elfogadás + fizetés + előzmény) |
| F-36 | Technikus mobil PWA + offline (web-first MVP után) |
| F-37 | GPS live tracking (mobil appra épül) |

### Phase 3 — Scale
| ID | Funkció |
|----|---------|
| F-40 | Full-stack marketplace / kazán-előfizetés |
| F-41 | AI dispatch + kereslet-előrejelzés |
| F-42 | CEE lokalizáció (RO/SK/CZ) |

---

## 6. Követelmények

### Funkcionális (FR) — atomi
- **FR-1** Multi-tenant: minden adat egy `company_id`-hez kötött; a tenant-ek nem látják egymás adatát.
- **FR-2** A CRM a központ: a foglalás az ügyfélprofilból indul; egy ügyfélhez több cím.
- **FR-3a** A core státusz-átmenetek fixek és validáltak (8.7 mátrix); tiltott átmenet hibát ad.
- **FR-3b** A pipeline vizuális megjelenítése tenant-szinten testreszabható, a validációt nem írja felül.
- **FR-4** Egy job egy `service`-hez kötött, amely az időtartamot és a felmérés-igényt adja.
- **FR-5** Egy jobhoz több `appointment` tartozhat (felmérés + munka).
- **FR-6** A foglalás módja tenant-szintű (`companies.booking_mode`): **smart** = a VROOM/OSRM motor ad 3–5 slot-javaslatot (H3/zóna előszűrés, fallback H3-becslés); **manual** = a felhasználó Google Calendar-szerű rácson maga választ sávot és szerelőt. Mindkét mód ütközést ellenőriz és appointment-et hoz létre.
- **FR-7** A számla kiállítás idempotens (idempotency_key); kétszeri hívás 1 számla.
- **FR-8 (web-first MVP)** A munkalap, aláírás, időmérés a reszponzív webes job-fülön rögzül (telefon-böngészőből is). Offline-first PWA + GPS = Phase 2.
- **FR-9** PDF-ben generálható: munkalap, árajánlat, számla.
- **FR-10** Minden külső integráció connector az app store-on át (per-tenant telepítés).
- **FR-11** SaaS-előfizetés: trial → plan; a limitek entitlement-ként érvényesülnek; az előfizetés a beállításokban LEMONDHATÓ.
- **FR-12** Minden entitás teljes CRUD: hozzáadás/szerkesztés/törlés minden listán és oldalon (ügyfél, cím, berendezés, munka, foglalás, tétel, szolgáltatás, zóna, csapattag, sablon). A törlés soft delete + megerősítés + undo (ahol értelmes); számla jogi okból nem törölhető.
- **FR-13** Minden funkcióhoz tartozik beállítás: a Beállítások hub lefedi a saját adatot, cégadatot, csapatot, szolgáltatást, zónát, értesítést, foglalási módot, integrációt és az előfizetést.
- **FR-14** A foglalás Google Calendar-szerű és maximálisan segít: minél több automatikus előtöltés (ügyfél, cím, szolgáltatás-időtartam, javasolt szerelő/sáv) és a lehető legkevesebb kézi mező.

### Nem-funkcionális (NFR)
- **NFR-1** Teljesítmény: API p95 < 400 ms; munkalap mentés < 1 s online; dispatch-javaslat < 2 s.
- **NFR-2** Rendelkezésre állás: 99.5% (Supabase + Vercel).
- **NFR-3** Adatlokalizáció: Supabase EU; minden személyes adat az EU-n belül.
- **NFR-4** Skálázhatóság: 100–500 tenant, 50k job/hó egyetlen Postgres-en.
- **NFR-5** Biztonság: RLS minden táblán; service kulcs csak szerveren; titkok a Vaultban.
- **NFR-6 — Szuper reszponzív:** a TELJES app minden képernyője first-class mobil/tablet/desktop böngészőben (nem csak a szerelő-nézet). Mobil-first komponensek, tapintható célméretek, összecsukható nav, táblázatok kártyás nézetre váltanak kis kijelzőn. (A dedikált offline PWA külön dolog — Phase 2.)
- **NFR-7** Megfelelőség: NAV Online Számla (connectoron át), GDPR.

---

## 7. Architektúra

```
KLIENSEK
  Web app (diszpécser + szerelő, reszponzív, Next.js RSC)        Publikus (ajánlatkérő, aláírás)
        │                                    │                          │
        ▼                                    ▼                          ▼
NEXT.JS 14 (Vercel, EU)
  Server Components + Server Actions  │  Route Handlers /api/*  │  Cron (Vercel → Supabase Edge)
        │                                    │                          │
        ▼                                    ▼                          ▼
SUPABASE (EU):  Postgres (RLS) · Auth (Google/Apple/email) · Realtime · Storage (fotó, PDF)
        │                                    │                          │
        ▼                                    ▼                          ▼
DISPATCH: VROOM + OSRM      APP STORE CONNECTOROK              SaaS BILLING
(self-host, EU OSM)          invoicing: Billingo/Számlázz       Stripe Billing
H3/zóna előszűrés            calendar: Google/Apple/Outlook     + NAV-számla magunkról
                             payment: Stripe/SimplePay/Barion   (Billingo, dogfooding)
                             messaging: Infobip/Resend
```

**Döntések:**
- **RSC + Server Actions** a mutációkhoz; **Route Handlers** a webhookokhoz, publikus oldalakhoz, PDF-hez, dispatch-hez.
- **Supabase RLS** a tenant-izolációhoz (a jog a DB-ben él).
- **Offline:** Phase 2 (IndexedDB/Dexie). A web-first MVP online működik, telefon-böngészőből is.
- **Deploy (Vercel):** a Next.js app Vercelen fut (EU régió); a Supabase külön (EU). **Fontos:** a VROOM/OSRM NEM fut Vercelen (hosszú életű konténer-szolgáltatás) — külön konténer-host kell (pl. Fly.io / Railway / VPS, EU). Ezért a web-first MVP-ben a **manuális foglalás megy elsőként** (nulla geo-infra), a smart dispatch motor pedig fast-follow, amint a dispatch-host áll.
- **Dispatch:** VROOM (VRP-solver) + OSRM (utazási mátrix), self-host EU OSM-mel, KÜLÖN konténer-hoston; H3/zóna csak előszűrés. MVP-ben opcionális (manual mód infra nélkül megy).
- **Minden külső rendszer connector** az app store-on át, per-tenant.

---

## 8. Adatmodell és DB séma

### 8.1 Áttekintés
```
companies (tenant)
  ├── profiles / company_users (RBAC) / invitations
  ├── subscriptions / plan_definitions          (SaaS billing)
  ├── customers ── sites (cím, H3) ── equipment
  ├── services / service_zones                  (foglalás vezérlés)
  ├── jobs ── appointments (felmérés/munka)      (a dispatch ide foglal)
  │     ├── job_status_history
  │     ├── worksheets ── worksheet_lines
  │     ├── quotes ── quote_lines (opciók)
  │     ├── signatures / attachments / time_entries / job_checklist_state
  │     └── invoices
  ├── materials ── stock_movements
  ├── memberships / payments                     (Phase 2)
  ├── technician_locations                       (GPS)
  ├── calendar_connections                       (naptár sync)
  ├── app_definitions / installed_apps           (App Store)
  └── notifications / booking_requests
```

### 8.2 Konvenciók
- Minden tábla: `id uuid pk default gen_random_uuid()`, `company_id uuid not null` (kivéve companies/plan_definitions/app_definitions), `created_at`, `updated_at timestamptz`.
- Soft delete `deleted_at` ahol releváns. Pénz: `numeric(12,2)` HUF. Enumok Postgres `enum`.

### 8.3 Enumok és alaptáblák
```sql
create extension if not exists "pgcrypto";
create extension if not exists "postgis";

create type company_role        as enum ('owner','dispatcher','technician','accountant');
create type job_status          as enum ('uj','felmeres','arajanlat','utemezve','folyamatban','kesz','szamlazva','fizetve','elutasitva','lemondva');
create type job_activity        as enum ('telepites','szerviz','javitas','felmeres','altalanos');  -- tevékenység, NEM jogosultság
create type equipment_kind      as enum ('klima','kazan','hoszivattyu','legkezelo','egyeb');
create type appointment_kind    as enum ('felmeres','munka');
create type appointment_status  as enum ('tervezett','megerosítve','folyamatban','kesz','lemondva');
create type subscription_status as enum ('trialing','active','past_due','canceled','suspended');
create type app_category        as enum ('invoicing','calendar','payment','messaging','accounting');
create type document_kind       as enum ('worksheet','quote','invoice','photo');

create table companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  tax_number  text,
  address     text,
  phone       text,
  email       text,
  logo_url    text,
  public_slug text unique,                       -- publikus ajánlatkérőhöz
  booking_mode text not null default 'smart',    -- 'smart' (felajánlós) | 'manual' (Google Calendar-szerű)
  plan        text not null default 'trial',     -- cache a subscriptions-ből
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  phone      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table company_users (
  company_id uuid not null references companies(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  role       company_role not null default 'technician',
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);
create index on company_users (user_id);

create table invitations (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  email      text not null,
  role       company_role not null default 'technician',
  token      text not null unique,
  accepted_at timestamptz,
  invited_by uuid references profiles(id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index on invitations (company_id);
```

### 8.4 SaaS billing
```sql
create table plan_definitions (
  slug            text primary key,              -- 'trial','alap','pro','business'
  name            text not null,
  price_monthly   numeric(12,2) not null default 0,
  price_yearly    numeric(12,2),
  max_technicians int,                            -- null = korlátlan
  max_jobs_month  int,
  features        jsonb,                          -- {app_store, gps, memberships}
  stripe_price_id text,
  is_active       boolean not null default true,
  sort_order      int not null default 0
);

create table subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references companies(id) on delete cascade,
  plan_slug            text not null references plan_definitions(slug),
  status               subscription_status not null default 'trialing',
  trial_ends_at        timestamptz,
  current_period_end   timestamptz,
  cancel_at_period_end boolean not null default false,
  stripe_customer_id     text,
  stripe_subscription_id text,
  last_invoice_id      uuid,                       -- a magunkról kiállított NAV-számla
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (company_id)
);
create index on subscriptions (status);
create index on subscriptions (trial_ends_at) where status = 'trialing';
```

### 8.5 CRM
```sql
create table customers (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name       text not null,
  is_company boolean not null default false,
  tax_number text,
  phone      text,
  email      text,
  notes      text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on customers (company_id);
create index on customers (company_id, name);
create index on customers (company_id, phone);   -- telefon-intake gyors-kereséshez

create table sites (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  customer_id  uuid not null references customers(id) on delete cascade,
  label        text,                              -- "Iroda", "Lakás"
  address      text not null,
  city         text,
  zip          text,
  lat          numeric(9,6),
  lng          numeric(9,6),
  h3_index     text,                              -- H3 res 8, geokódoláskor
  access_notes text,                              -- "kapukód, 3. emelet"
  created_at   timestamptz not null default now()
);
create index on sites (company_id);
create index on sites (customer_id);
create index on sites (company_id, h3_index);

create table equipment (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies(id) on delete cascade,
  site_id        uuid not null references sites(id) on delete cascade,
  kind           equipment_kind not null,
  manufacturer   text,
  model          text,
  serial_number  text,
  installed_at   date,
  warranty_until date,
  next_service_due date,                          -- köv. szerviz (számolt)
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on equipment (company_id);
create index on equipment (site_id);
create index on equipment (company_id, next_service_due);
```

### 8.6 Szolgáltatás-konfiguráció és zónák
```sql
create table services (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references companies(id) on delete cascade,
  name             text not null,                 -- "Klíma karbantartás"
  activity         job_activity not null default 'szerviz',
  default_duration_min int not null default 60,   -- a foglalási sáv hossza
  requires_survey  boolean not null default false,
  default_price    numeric(12,2),
  vat_rate         numeric(4,2) not null default 27,
  color            text,
  is_active        boolean not null default true,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now()
);
create index on services (company_id, is_active);

create table service_zones (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  technician_id uuid references profiles(id) on delete cascade,  -- null = egész cég
  name          text,
  home_lat      numeric(9,6),
  home_lng      numeric(9,6),
  home_h3       text,
  radius_km     numeric(5,1) default 25,
  covered_h3    text[],
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index on service_zones (company_id);
```

### 8.7 Jobs + appointments
```sql
create table jobs (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  job_number    text not null,                    -- "2026-0042" per tenant
  customer_id   uuid not null references customers(id) on delete restrict,
  site_id       uuid not null references sites(id) on delete restrict,
  service_id    uuid references services(id) on delete set null,
  status        job_status not null default 'uj',
  title         text,
  description   text,
  assigned_to   uuid references profiles(id) on delete set null,
  parent_job_id uuid references jobs(id) on delete set null,  -- garanciális visszahívás
  template_id   uuid,                             -- job_templates (8.10)
  created_by    uuid references profiles(id) on delete set null,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (company_id, job_number)
);
create index on jobs (company_id, status);
create index on jobs (assigned_to);
create index on jobs (customer_id);

create table job_status_history (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  job_id      uuid not null references jobs(id) on delete cascade,
  from_status job_status,
  to_status   job_status not null,
  changed_by  uuid references profiles(id) on delete set null,
  changed_at  timestamptz not null default now()
);
create index on job_status_history (job_id);

-- a foglalás: a dispatch ide ír, egy jobhoz több (felmérés + munka)
create table appointments (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references companies(id) on delete cascade,
  job_id            uuid not null references jobs(id) on delete cascade,
  kind              appointment_kind not null default 'munka',
  technician_id     uuid references profiles(id) on delete set null,
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  travel_buffer_min int not null default 0,        -- előtte tartott idő (odajutás)
  status            appointment_status not null default 'tervezett',
  gcal_event_id     text,                          -- naptár leképezés
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on appointments (company_id, technician_id, starts_at);
create index on appointments (job_id);
create index on appointments (technician_id, starts_at, ends_at) where status <> 'lemondva';
```

**Státusz-átmenet mátrix (FR-3a, validált):**
| -ból \ -ba | felmeres | arajanlat | utemezve | folyamatban | kesz | szamlazva | fizetve | elutasitva | lemondva |
|---|---|---|---|---|---|---|---|---|---|
| uj | ✔ | ✔ | ✔ | – | – | – | – | – | ✔ |
| felmeres | – | ✔ | ✔ | – | – | – | – | ✔ | ✔ |
| arajanlat | – | – | ✔ | – | – | – | – | ✔ | ✔ |
| utemezve | – | – | – | ✔ | – | – | – | – | ✔ |
| folyamatban | – | – | – | – | ✔ | – | – | – | ✔ |
| kesz | – | – | – | ✔ | – | ✔ | – | – | – |
| szamlazva | – | – | – | – | – | – | ✔ | – | – |

### 8.8 Munkalap és árajánlat
```sql
create table worksheets (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  job_id        uuid not null references jobs(id) on delete cascade,
  work_done     text,
  labor_hours   numeric(5,2),
  technician_id uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on worksheets (job_id);

create table worksheet_lines (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  worksheet_id uuid not null references worksheets(id) on delete cascade,
  material_id  uuid,                               -- ha katalógusból
  description  text not null,
  quantity     numeric(10,2) not null default 1,
  unit         text default 'db',
  unit_price   numeric(12,2) not null default 0,
  vat_rate     numeric(4,2) not null default 27,
  line_total   numeric(12,2) generated always as (quantity * unit_price) stored,
  is_labor     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index on worksheet_lines (worksheet_id);

create table quotes (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  job_id       uuid not null references jobs(id) on delete cascade,
  quote_number text not null,
  valid_until  date,
  status       text not null default 'draft',      -- draft|sent|accepted|rejected
  notes        text,
  financing_offered boolean default false,         -- Phase 2 részletfizetés
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (company_id, quote_number)
);
create index on quotes (job_id);

create table quote_lines (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  quote_id     uuid not null references quotes(id) on delete cascade,
  description  text not null,
  quantity     numeric(10,2) not null default 1,
  unit         text default 'db',
  unit_price   numeric(12,2) not null default 0,
  vat_rate     numeric(4,2) not null default 27,
  line_total   numeric(12,2) generated always as (quantity * unit_price) stored,
  is_optional  boolean not null default false,     -- ügyfél választhatja
  option_group text,                               -- good|better|best
  is_selected  boolean not null default true,
  created_at   timestamptz not null default now()
);
create index on quote_lines (quote_id);
```

### 8.9 Aláírás, fotó, időkövetés
```sql
create table signatures (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  job_id      uuid not null references jobs(id) on delete cascade,
  signer_role text not null,                       -- 'customer' | 'technician'
  signer_name text,
  image_url   text not null,
  signed_at   timestamptz not null default now()
);
create index on signatures (job_id);

create table attachments (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  job_id       uuid references jobs(id) on delete cascade,
  kind         document_kind not null,
  storage_path text not null,
  caption      text,
  annotations  jsonb,
  uploaded_by  uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index on attachments (job_id);

create table time_entries (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  job_id        uuid not null references jobs(id) on delete cascade,
  technician_id uuid not null references profiles(id) on delete cascade,
  started_at    timestamptz not null,
  stopped_at    timestamptz,
  duration_min  int generated always as (
    case when stopped_at is null then null
    else extract(epoch from (stopped_at - started_at))::int / 60 end) stored,
  note          text,
  created_at    timestamptz not null default now()
);
create index on time_entries (job_id);
create index on time_entries (technician_id, started_at);
```

### 8.10 Job sablon + ellenőrzőlista
```sql
create table job_templates (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  name          text not null,
  activity      job_activity not null,
  default_lines jsonb,
  created_at    timestamptz not null default now()
);
create index on job_templates (company_id);

create table checklist_items (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  template_id uuid not null references job_templates(id) on delete cascade,
  label       text not null,
  sort_order  int not null default 0,
  is_required boolean not null default false
);
create index on checklist_items (template_id);

create table job_checklist_state (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  job_id     uuid not null references jobs(id) on delete cascade,
  label      text not null,
  is_done    boolean not null default false,
  done_at    timestamptz,
  done_by    uuid references profiles(id) on delete set null
);
create index on job_checklist_state (job_id);
```

### 8.11 Anyag, számla, értesítés, ajánlatkérő
```sql
create table materials (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies(id) on delete cascade,
  sku            text,
  name           text not null,
  unit           text default 'db',
  purchase_price numeric(12,2),
  sale_price     numeric(12,2),
  vat_rate       numeric(4,2) not null default 27,
  stock_qty      numeric(10,2) not null default 0,
  deleted_at     timestamptz,
  created_at     timestamptz not null default now()
);
create index on materials (company_id);

create table stock_movements (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  material_id uuid not null references materials(id) on delete cascade,
  job_id      uuid references jobs(id) on delete set null,
  delta       numeric(10,2) not null,
  reason      text,
  created_at  timestamptz not null default now()
);
create index on stock_movements (material_id);

create table invoices (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  job_id          uuid references jobs(id) on delete restrict,  -- null = SaaS-előfizetési számla
  external_id     text,                            -- a számlázó (Billingo) oldali ID
  invoice_number  text,
  nav_status      text,                            -- pending|done|error
  nav_error       text,
  gross_total     numeric(12,2),
  pdf_url         text,
  idempotency_key text not null,
  issued_at       timestamptz,
  created_at      timestamptz not null default now(),
  unique (company_id, idempotency_key)
);
create index on invoices (job_id);

create table notifications (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  job_id      uuid references jobs(id) on delete set null,
  channel     text not null,                       -- sms|email
  recipient   text not null,
  template    text not null,
  status      text not null default 'queued',
  provider_ref text,
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index on notifications (company_id, status);

create table booking_requests (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  name         text not null,
  phone        text,
  email        text,
  address      text,
  service_id   uuid references services(id) on delete set null,
  message      text,
  status       text not null default 'new',        -- new|contacted|converted|spam
  job_id       uuid references jobs(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index on booking_requests (company_id, status);
```

### 8.12 GPS, naptár, App Store
```sql
create table technician_locations (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  technician_id uuid not null references profiles(id) on delete cascade,
  lat           numeric(9,6) not null,
  lng           numeric(9,6) not null,
  accuracy_m    numeric(6,1),
  recorded_at   timestamptz not null default now()
);
create index on technician_locations (technician_id, recorded_at desc);

create table calendar_connections (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  provider     text not null default 'google',     -- google|apple|outlook
  oauth_ref    text not null,                       -- token a Vaultban
  calendar_id  text,
  sync_enabled boolean not null default true,
  last_sync_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id, provider)
);

-- App Store: katalógus (seed) + per-tenant telepítés
create table app_definitions (
  slug          text primary key,                  -- 'billingo','google_calendar','stripe',...
  name          text not null,
  category      app_category not null,
  description   text,
  icon_url      text,
  auth_type     text not null,                      -- oauth|api_key|none
  config_schema jsonb,
  is_active     boolean not null default true,
  sort_order    int not null default 0
);

create table installed_apps (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  app_slug     text not null references app_definitions(slug),
  config       jsonb,                               -- nem-titkos
  secret_ref   text,                                -- titok a Vaultban
  is_enabled   boolean not null default true,
  installed_by uuid references profiles(id) on delete set null,
  installed_at timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (company_id, app_slug)
);
create index on installed_apps (company_id, is_enabled);
```

### 8.13 Triggerek
```sql
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
-- alkalmazandó: companies, profiles, customers, equipment, jobs, appointments,
--   worksheets, quotes, materials, invoices, subscriptions, installed_apps

create or replace function generate_job_number(p_company uuid) returns text as $$
declare v_year text := to_char(now(),'YYYY'); v_seq int;
begin
  select count(*)+1 into v_seq from jobs
    where company_id = p_company and job_number like v_year||'-%';
  return v_year||'-'||lpad(v_seq::text,4,'0');
end; $$ language plpgsql;

create or replace function log_job_status_change() returns trigger as $$
begin
  if (tg_op='UPDATE' and new.status is distinct from old.status) then
    insert into job_status_history (company_id, job_id, from_status, to_status, changed_by)
    values (new.company_id, new.id, old.status, new.status, auth.uid());
  end if; return new;
end; $$ language plpgsql;
create trigger trg_job_status_log after update on jobs
  for each row execute function log_job_status_change();

-- klíma/hőszivattyú szerviz lezárásakor köv. szerviz +1 év
create or replace function bump_next_service() returns trigger as $$
begin
  if (new.status='kesz' and old.status is distinct from 'kesz') then
    update equipment e set next_service_due = (current_date + interval '1 year')::date
    from sites s where e.site_id = s.id and s.id = new.site_id
      and e.kind in ('klima','hoszivattyu');
  end if; return new;
end; $$ language plpgsql;
create trigger trg_bump_service after update on jobs
  for each row execute function bump_next_service();
```

---

## 9. Row Level Security

Minden tábla RLS-sel védett. Helper függvények:
```sql
create or replace function auth_company_ids() returns setof uuid as $$
  select company_id from company_users where user_id = auth.uid() and is_active = true;
$$ language sql security definer stable;

create or replace function has_role(p_company uuid, p_roles company_role[]) returns boolean as $$
  select exists (select 1 from company_users
    where user_id = auth.uid() and company_id = p_company and role = any(p_roles) and is_active = true);
$$ language sql security definer stable;
```

Minta (jobs):
```sql
alter table jobs enable row level security;
create policy jobs_select on jobs for select using (company_id in (select auth_company_ids()));
create policy jobs_insert on jobs for insert with check (has_role(company_id, array['owner','dispatcher']::company_role[]));
create policy jobs_update on jobs for update using (
  company_id in (select auth_company_ids())
  and (has_role(company_id, array['owner','dispatcher']::company_role[]) or assigned_to = auth.uid()));
create policy jobs_delete on jobs for delete using (has_role(company_id, array['owner']::company_role[]));
```

**Minden `company_id`-s tábla** kap legalább egy select policy-t (`company_id in (select auth_company_ids())`), az írási policy-k a szerephez igazodnak. **Billing táblák** (subscriptions): csak `owner`. **profiles:** a user a saját sorát írhatja. A `service_role` kulcs CSAK szerver oldalon.

---

## 10. API

- **Web admin:** RSC (olvasás, RLS-sel) + Server Actions (mutáció). Nincs külön REST a CRUD-ra.
- **Route Handlerek `/api/*`:** webhookok, publikus oldalak, PDF, dispatch. (Mobil sync = Phase 2.)

| Method | Útvonal | Leírás |
|--------|---------|--------|
| POST | `/api/mobile/sync` | Offline batch szinkron — **Phase 2** (web-first MVP-ben nincs) |
| POST | `/api/dispatch/suggest` | Smart dispatch slot-javaslat (VROOM/OSRM) |
| POST | `/api/jobs/[id]/invoice` | Számla (idempotens, connector) |
| POST | `/api/jobs/[id]/notify` | SMS/email értesítés |
| POST | `/api/public/request` | Publikus ajánlatkérő beküldés |
| GET/POST | `/api/public/sign/[token]` | Ügyfél aláírás |
| POST | `/api/webhooks/invoicing` | Számlázó/NAV státusz |
| POST | `/api/webhooks/stripe-billing` | SaaS-előfizetés események |
| POST | `/api/webhooks/payment` | In-app fizetés (Phase 2) |
| POST | `/api/pdf/[kind]/[id]` | PDF (munkalap/ajánlat/számla) |

**Idempotens számlázás (FR-7):** a `kesz` job → `idempotency_key = job:{id}:invoice`; ha már van invoice, visszaadja; különben a tenant telepített `invoicing` connectora kiállítja, job → `szamlazva`.

---

## 11. Integrációk és App Store

**Minden külső rendszer connector** az app store-on át, per-tenant telepítve (mint a Cal.com app store). A titkok a Supabase Vaultban; az `installed_apps` csak `secret_ref`-et tárol.

| Kategória | Appok | Fázis |
|-----------|-------|-------|
| `invoicing` | Billingo, Számlázz.hu | P1 |
| `calendar` | Google, Apple (CalDAV), Outlook | P1 |
| `payment` | Stripe, SimplePay, Barion | P2 |
| `messaging` | Infobip (SMS), Resend (email) | P1 |
| `accounting` | CSV/XML export | P1 |

**Connector interfész:**
```typescript
type AppCategory = 'invoicing'|'calendar'|'payment'|'messaging'|'accounting';
interface Connector { slug: string; category: AppCategory; }
interface InvoicingProvider extends Connector { issueInvoice(i): Promise<InvoiceResult>; getStatus(id): Promise<NavStatus>; }
interface CalendarProvider  extends Connector { pushEvent(a): Promise<{externalId:string}>; updateEvent(id,a): Promise<void>; deleteEvent(id): Promise<void>; listBusy(uid,from,to): Promise<BusySlot[]>; }
interface PaymentProvider   extends Connector { createCharge(i): Promise<ChargeResult>; refund(id): Promise<void>; createRecurring?(i): Promise<RecurringResult>; handleWebhook(req): Promise<PaymentEvent>; }
function resolveConnector<T extends Connector>(companyId: string, category: AppCategory): Promise<T|null>;
```

**Auth (F-01):** Supabase Auth — Google OAuth + Apple Sign in + email/magic link. Első social belépésnél is lefut az onboarding.

**Dispatch (F-08, csak `smart` módban):** VROOM (VRP-solver) + OSRM (utazási mátrix), self-host EU OSM-mel. A `/api/dispatch/suggest`: H3/zóna előszűrés → OSRM Table mátrix → VROOM optimalizálás (időablak, szerelő-hozzárendelés) → 3–5 javasolt sáv. Fallback H3-becslés. `manual` módban a foglaló nem hívja a motort, csak a szabad sávokat és az ütközést mutatja.

**Naptár (F-18):** `CalendarProvider` Google-re (OAuth) és Apple-re (CalDAV). Appointment szinkron + `listBusy` a slot-motorba (ütközés-mentes).

---

## 12. SaaS-előfizetés és regisztráció

**Két fizetési sík — NE keverd:**
| Sík | Ki fizet | Kinek | Eszköz |
|-----|----------|-------|--------|
| SaaS-előfizetés | a tenant | nekünk | Stripe Billing + NAV-számla magunkról (Billingo, dogfooding) |
| In-app fizetés | a tenant ügyfele | a tenantnak | app store payment connector (Phase 2) |

**Plan-modell:** flat tier szerelő-limittel (nem pure per-seat), HUF-ban. *Az árak placeholder — üzleti döntés.*
| Plan | Szerelő | Kb. ár | Korlátok |
|------|---------|--------|----------|
| trial | korlátlan 14 napig | 0 | minden, 14 nap |
| alap | 1–2 | ~4 900 Ft/hó | core FSM + booking + NAV |
| pro | max 8 | ~12 900 Ft/hó | + app store, GPS, tagság |
| business | korlátlan | ~24 900 Ft/hó | + minden, prioritás |

**Regisztráció:** sign up (Google/Apple/email) → email verifikáció → onboarding (cégadatok) → `companies` + `company_users(owner)` + `subscriptions(trialing, +14 nap)` → (opc.) szolgáltatás/zóna/csapat.

**Plan-gating:** `checkEntitlement(companyId, feature|limit)` — szerelő-limit a meghívásnál; funkció-gate (app store/GPS/tagság pro+); `past_due`/`suspended` → read-only mód.

**Billing (Stripe):** Checkout → subscription; webhook frissíti a státuszt + `companies.plan`; minden sikeres terhelés után **NAV-os számla a saját Billingo-fiókunkból** az előfizetőnek (`subscriptions.last_invoice_id`). Dunning: `past_due` → türelmi idő → `suspended`.

**Billing portal (Beállítások → Előfizetés):** plan, fizetőeszköz, számlák (NAV PDF), upgrade/lemondás, trial-visszaszámláló.

---

## 13. Frontend és UX

### Mappa-struktúra
```
app/(auth)/login, register, accept-invite/[token]
app/(app)/
  intake/                 # telefon-intake (CRM gyors-keresés) — leggyakoribb belépő
  dashboard/
  customers/[id]          # ⭐ KÖZPONTI: ügyfélprofil = foglalás kiindulópont
  jobs/[id]               # ⭐ job életciklus — Excel-fül-szerű lapok:
    (overview)            #   Áttekintés (alapadat, státusz, foglalások)
    worksheet/            #   Munkalap fül        ─┐
    quote/                #   Árajánlat fül        ├─ CSAK a jobon belül, lapozós fülek
    invoice/             #   Számla fül          ─┘
  calendar/               # diszpécser naptár (appointments)
  requests/               # beérkező ajánlatkérők
  settings/                # ⭐ MINDEN beállítható — teljes settings hub:
    account/               #   saját felhasználói adatok (név, telefon, jelszó, nyelv)
    company/               #   cégadatok (név, adószám, cím, logó, számlázási alap, ÁFA)
    team/                  #   csapat: tagok hozzáadása/törlése, szerepkör, meghívás
    services/              #   szolgáltatások CRUD (időtartam, felmérés-e, ár, ÁFA, szín)
    zones/                 #   szervizzónák CRUD (bázis + radius / H3)
    booking/               #   foglalási mód (smart/manual) + munkaidő-sávok + auto-fill
    notifications/         #   értesítés-sablonok + ki/be kapcsolók csatornánként
    integrations/          #   App Store (connector telepítés)
    subscription/          #   előfizetés: plan, fizetőeszköz, lemondás, számlák
    billing-list/          #   könyvelői számla-lista (read-only + export)
                          #   billing-list = könyvelői SZÁMLA-LISTA (read-only/export); a
                          #   számla LÉTREHOZÁSA/szerkesztése csak a jobon belüli fülön
# app/m/ (technikus mobil PWA + offline) — Phase 2, web-first MVP-ben NINCS.
#   A szerelő a reszponzív web job-fülein dolgozik (Munkalap fül), telefon-böngészőből is.
app/public/{[slug]/request, sign/[token]}
app/api/                  # route handlerek
lib/{supabase,apps,dispatch,billing,offline,validators,pdf}
```

### Kulcs-képernyők (mit jelenítünk meg)
- **Telefon-intake** ⭐ — egy nagy név/telefon kereső, élő találat; nincs találat → "Új ügyfél" (név+cím) → profil.
- **Ügyfélprofil** ⭐ — fej (telefon 1-katt hívás), **címek**, **foglalások** (módosítható), berendezések, előzmény. Fő gomb: **"Új időpont"** → foglaló.
- **Foglaló (drop-up)** ⭐ — beállítástól függ (`booking_mode`): **smart** = 1) szolgáltatás, 2) nap, 3) javasolt sávok (idő + szerelő + odajutás) → 1 kattintás (a H3/zóna/buffer rejtve); **manual** = Google Calendar-szerű rács, a felhasználó maga választ sávot + szerelőt (foglaltság látszik, ütközés tiltva).
  - **Auto-fill / maximális segítség (FR-14):** mivel a foglalás az ügyfélprofilból indul, az **ügyfél és a cím előre kitöltött**; a szolgáltatás-választásból jön a **sáv-hossz** automatikusan; a rendszer **felajánlja a következő szabad napot/sávot** és a **zóna szerinti szerelőt**; emlékszik az ügyfél **utoljára használt szolgáltatására**; a felmérés-igényt a szolgáltatás dönti el (nem kézi). Cél: a felhasználó ideális esetben csak egy sávot választ, minden más elő van töltve.
- **Beállítások → Foglalás** — a `booking_mode` kapcsoló (smart/manual) + alapértelmezett munkaidő-sávok + auto-fill viselkedés.
- **Job detail** ⭐ — a munka a konténer; alul/oldalt **Excel-fül-szerű lapozó** (sheet tabs): **Áttekintés · Munkalap · Árajánlat · Számla** (+ szükség szerint Fotók, Idő). A munkalap, árajánlat és számla **kizárólag itt, a jobon belül** érhető el — nincs külön felső menüpontjuk. A fülek a job állapotához igazodnak (pl. a Számla fül a `kesz` státusztól aktív); a következő logikus művelet a kiemelt gomb az aktív fülön.
- **Számla-lista (Beállítások → Számlák)** — csak könyvelői/owner **olvasó + export** nézet az összes számláról; létrehozás itt NINCS, az a jobon belüli Számla fülön történik.
- **Diszpécser naptár** — szerelő-oszlopok, drag-drop, nap/hét/hó/térkép. (Élő GPS = Phase 2.)
- **Szerelő nézet (reszponzív web)** ⭐ — a szerelő a saját napi munkáit a weben látja (telefon-böngészőből is); a munkát a job-detail **Munkalap fülén** rögzíti: időmérés, ellenőrzőlista, tételek, fotó, aláírás → kesz. Dedikált offline PWA = Phase 2.
- **Dashboard** — bevétel, kész-de-nem-számlázott, kintlévő, közelgő szervizek.
- **App Store (Beállítások → Integrációk)** — kategóriánként kártyák, 1-kattintásos telepítés.
- **Beállítások hub** ⭐ — bal oldali al-menü minden szekcióra (saját adat, cég, csapat, szolgáltatások, zónák, foglalás, értesítések, integrációk, előfizetés, számlák). **Minden funkcióhoz van itt beállítás** (FR-13). Az előfizetés itt lemondható.

**UX-elvek:**
- **Egyszerű, lineáris flow** — a munkafolyamat végigvihető bonyolódás nélkül; minden képernyőn egy kiemelt "következő művelet"; nincs néma adat (minden sor állapotot + műveletet sugall).
- **Teljes CRUD mindenhol (FR-12)** — minden listán és oldalon konzisztens **hozzáad / szerkeszt / töröl** (ügyfél, cím, berendezés, munka, foglalás, tétel, szolgáltatás, zóna, csapattag). A törlés megerősítéssel + soft delete + **undo** (toast); számla nem törölhető (jogi).
- **Szuper reszponzív (NFR-6)** — minden képernyő mobil/tablet/desktop böngészőben first-class; kis kijelzőn a táblázatok kártyás nézetre váltanak, a nav összecsukódik, a célméretek tapinthatók.
- **Magyar szakzsargon** — munkalap, árajánlat, felmérés, kiszállás.

---

## 14. Biztonság és GDPR

- **Lokalizáció:** Supabase EU; minden személyes adat az EU-n belül. OSRM EU OSM-mel (saját infra).
- **Titkok:** integrációs kulcsok a Supabase Vaultban; `installed_apps` csak `secret_ref`.
- **RLS:** minden táblán, tenant-izoláció a DB-ben. `service_role` csak szerveren.
- **GDPR:** soft delete + 30 nap utáni purge; számlák a jogi megőrzési idő alatt (8 év) megmaradnak. Ügyfél-kérésre export + törlés.
- **GPS (Phase 2):** a mobil appra épül; csak műszak alatt + hozzájárulással, nyers pozíció rövid megőrzéssel. A web-first MVP-ben nincs.
- **Aláírás-linkek:** rövid életű signed token. **Webhookok:** HMAC ellenőrzés. **Input:** zod minden határon.

---

## 15. OSS-komponensek és licenc

| Réteg | OSS | Licenc | Hogyan |
|-------|-----|--------|--------|
| Route optimization (dispatch) | VROOM + OSRM | BSD-2 | self-host, EU OSM, a dispatch motorja |
| Booking-logika | Cal.diy | MIT | kód-forrás a slot-logikához |
| Auth | Supabase Auth | — | Google + Apple + email |
| E-signature (opció) | Documenso | AGPL* | különálló service, ha jogi erősség kell |
| Notifications (opció) | Novu | MIT core | self-host, ha a saját réteg szűk |
| CRM | (Twenty) | AGPL | csak referencia, nem bolt-on |
| App store minta | Cal.com | — | architektúra-minta |

**Licenc-vasszabály:** a core termékbe **csak MIT/BSD** kód olvasztható. **AGPL** (Documenso, Twenty) csak különálló, hálózaton hívott service-ként — sosem a kódba olvasztva. (*Cal.com 2026.04-ben kettévált: a nyilvános Cal.diy MIT, de multi-tenancy nélkül; a teljes Cal.com closed-source. Ezért a booking natív, a Cal.diy csak kód-forrás.)

---

## Glosszárium
- **NAV Online Számla:** kötelező valós idejű számla-adatszolgáltatás a magyar adóhatóságnak.
- **H3:** Uber hexagonális geoindex (a szervizzóna előszűréshez).
- **VROOM / OSRM:** open-source route-optimalizáló (VRP) és routing motor.
- **RLS:** Row Level Security (sor-szintű hozzáférés a Postgresben).
- **Connector / App Store:** per-tenant telepíthető külső integráció (számlázás, naptár, fizetés, üzenet).
- **Két fizetési sík:** SaaS-előfizetés (tenant → mi) vs. in-app fizetés (ügyfél → tenant).

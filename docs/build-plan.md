# Jobro — Build plan (tiszta, v2.0)

A rendszerterv (v2.0) lebontva **Claude Code-méretű, sorba rendezett ticketekre**. Egy ticket ≈ egy ülés (1–5 fájl). Minden ticket: scope, érintett fájlok, függőség (`→ T-xx`), elfogadási kritérium, bemásolható Claude Code prompt, felelős (Te / B1 full-stack / B2 integráció+mobil).

**Forrás:** mindig a `docs/rendszerterv.md` megfelelő számozott szakasza (8 = DB séma, 9 = RLS, 10 = API, 11 = App Store, 12 = billing). Nincsenek függelékek.

**Definition of Done (minden ticket):** kód + típusok zöld + elfogadási kritérium teljesül + nincs RLS-lyuk (tenant-izoláció áll) + teszt zöld.

**Jelölés:** `[P0]` blokkoló · `[P1]` fontos · `[P2]` Phase 2.

---

# EPIC 0 — Alap + Auth + Billing

### T-01 [P0] Projekt + Supabase + 3 kliens 👤 B1
**Fájlok:** `package.json`, `lib/supabase/{client,server,service}.ts`, `.env.example`, `app/layout.tsx`
**Elfogadás:** `npm run dev` fut; anon/server/service kliens; service kulcs csak szerver oldali fájlban.
**Prompt:** > Next.js 14 App Router + TS init, Vercel-deploy-ra készen (EU régió, Supabase EU külön). `lib/supabase/`: client (anon), server (RSC/Action, cookie), service (service_role, CSAK szerver) factory-k `@supabase/ssr`-rel. A service kulcs sosem importálható kliens komponensből.

### T-02 [P0] Migráció-keret + enumok → T-01 👤 B1
**Fájlok:** `supabase/migrations/0001_extensions_enums.sql`
**Elfogadás:** `supabase db push` fut; a rendszerterv 8.3 enumjai léteznek; pgcrypto + postgis aktív.
**Prompt:** > Migráció: pgcrypto + postgis, és a rendszerterv 8.3 enumjai (company_role, job_status, job_activity, equipment_kind, appointment_kind, appointment_status, subscription_status, app_category, document_kind). Pontosan a megadott értékekkel.

### T-03 [P0] Alaptáblák: companies, profiles, company_users, invitations → T-02 👤 B1
**Fájlok:** `supabase/migrations/0002_core.sql`
**Elfogadás:** táblák FK-kkal; `set_updated_at()` trigger; auth.users-hez kötött profiles.
**Prompt:** > Migráció: companies (benne booking_mode default 'smart'), profiles, company_users, invitations a rendszerterv 8.3 szerint + `set_updated_at()` és trigger a companies/profiles-ra.

### T-04 [P0] RLS helperek + core policy → T-03 👤 B1
**Fájlok:** `supabase/migrations/0003_rls_core.sql`
**Elfogadás:** `auth_company_ids()`, `has_role()`; idegen tenant nem látja a sorokat; user csak a saját profilját írja.
**Prompt:** > Migráció: `auth_company_ids()` + `has_role()` security definer stable (rendszerterv 9). RLS a companies/profiles/company_users-en. Teszteld két tenant userrel az izolációt.

### T-05 [P0] SaaS billing séma + plan seed → T-03 👤 B1
**Fájlok:** `supabase/migrations/0004_billing.sql`, `supabase/seed/plans.sql`
**Elfogadás:** plan_definitions + subscriptions (rendszerterv 8.4) + RLS (csak owner); planek seed-elve (trial/alap/pro/business).
**Prompt:** > Migráció: plan_definitions + subscriptions (8.4) + RLS (owner-only). Seed: trial/alap/pro/business plan a limitekkel és features jsonb-vel (8.4 + 12. szakasz tábla).

### T-06 [P0] Auth (Google/Apple/email) + onboarding + trial → T-05 👤 B1
**Fájlok:** `app/(auth)/{login,register}`, `app/onboarding`, `lib/auth.ts`
**Elfogadás:** belépés mindhárom úton; első belépésnél company + owner company_user + subscriptions(trialing, +14 nap); social belépésnél is fut az onboarding.
**Prompt:** > Supabase Auth Google + Apple + email/magic link. Onboarding: cégadatok → companies + company_users(owner) + subscriptions(trialing, trial_ends_at=+14 nap). A `(app)` route group védett (belépés + aktív tagság). Apple Service ID, Google OAuth client.

### T-07 [P0] Plan-gating (entitlement) → T-05 👤 B1
**Fájlok:** `lib/billing/entitlements.ts`
**Elfogadás:** `checkEntitlement(companyId, key)`; szerelő-limit, funkció-gate (app store/GPS/tagság pro+), past_due/suspended → read-only.
**Prompt:** > `checkEntitlement(companyId, feature|limit)` a subscriptions.plan_slug + plan_definitions alapján (rendszerterv 12). Érvényesítés: szerelő-limit meghíváskor, funkció-gate a features jsonb szerint, past_due/suspended → read-only.

### T-08 [P0] Stripe Billing + webhook + NAV-számla magunkról → T-06, T-31 👤 B2
**Fájlok:** `lib/billing/stripe.ts`, `app/api/webhooks/stripe-billing/route.ts`, `app/(app)/settings/subscription/checkout`
**Elfogadás:** Checkout → subscription; webhook frissíti subscriptions.status + companies.plan; sikeres terhelés után NAV-számla a saját Billingo-fiókunkból (last_invoice_id).
**Prompt:** > Stripe Billing: customer + subscription a plan stripe_price_id-ből, Checkout. `/api/webhooks/stripe-billing`: státusz (trialing/active/past_due/canceled) → subscriptions + companies.plan. Sikeres terhelés után NAV-számla a SAJÁT Billingo-fiókból az előfizetőnek (InvoicingProvider), last_invoice_id-vel.

### T-09 [P1] Settings hub shell + account + company + billing + csapat → T-07 👤 Te+B1
**Scope:** A Beállítások bal-menüs konténer (minden szekció) + a saját felhasználói adatok, a cégadatok, az előfizetés (lemondással) és a csapat (tag hozzáad/töröl/szerep + meghívás).
**Fájlok:** `app/(app)/settings/layout.tsx`, `settings/{account,company,subscription,team}/page.tsx`, `app/(auth)/accept-invite/[token]/page.tsx`
**Elfogadás:** (account) név/telefon/jelszó/nyelv mentés; (company) cégadat+logó+ÁFA-alap; (subscription) plan/fizetőeszköz/számlák/upgrade/**lemondás**/trial-countdown; (team) tag lista + szerep váltás + **eltávolítás** + email-meghívás (signed token → profiles+company_users, checkEntitlement limit).
**Prompt:** > Beállítások hub (rendszerterv 13): bal al-menüs layout minden szekcióra. Account oldal (saját profil: név, telefon, jelszó, nyelv). Company oldal (cégadat, logó upload, ÁFA-alap). Subscription (Stripe: plan, fizetőeszköz, NAV-számlák, upgrade, CANCEL→cancel_at_period_end, trial countdown). Team (tagok listája, szerep váltás, eltávolítás/deaktiválás, email-meghívás invitations signed tokennel → accept-invite oldal → profiles+company_users, checkEntitlement).

---

### T-01b [P0] Design rendszer + szuper-reszponzív shell + közös CRUD UI → T-01 👤 Te+B1
**Scope:** shadcn/ui + Tailwind alap, app-shell (összecsukható nav, mobil/tablet/desktop), és a közös interakciós komponensek, amiket minden oldal használ.
**Fájlok:** `app/(app)/layout.tsx`, `components/ui/*` (shadcn), `components/common/{DataView,ConfirmDelete,UndoToast,EntityRowActions,EmptyState}.tsx`, `tailwind.config.ts`
**Elfogadás:** a shell first-class mobil/tablet/desktopon (nav összecsukódik, táblázat → kártya kis kijelzőn); közös ConfirmDelete + UndoToast + sor-műveletek (a CRUD-minta FR-12-höz); a frontend-design skill irányelvei szerint.
**Prompt:** > Építsd fel a design-alapot (shadcn/ui + Tailwind, a frontend-design skill szerint) és a szuper-reszponzív app-shellt (összecsukható oldalsáv, mobil-first, a táblázatok kis kijelzőn kártyás DataView-ra váltanak). Készítsd el a közös komponenseket: DataView (lista/kártya reszponzív), ConfirmDelete, UndoToast, EntityRowActions, EmptyState — ezeket használja MINDEN entitás CRUD-ja (FR-12).

---

# EPIC 1 — CRM (a központ)

### T-10 [P0] customers + sites (geo/H3) + RLS → T-06 👤 B1
**Fájlok:** `supabase/migrations/0005_crm.sql`, `lib/geo/{geocode,h3}.ts`
**Elfogadás:** customers + sites (8.5); cím mentésekor lat/lng + h3_index (res 8); RLS; telefon-index.
**Prompt:** > Migráció: customers + sites (8.5) + RLS. Cím mentésekor geokódolj (Mapbox/Google) → lat/lng + h3_index (h3-js, res 8). Index a (company_id, phone)-ra a telefon-intake-hez.

### T-11 [P0] equipment + next_service trigger → T-10 👤 B1
**Fájlok:** `supabase/migrations/0006_equipment.sql`
**Elfogadás:** equipment (8.5) site-hoz kötve; `bump_next_service` trigger; index next_service_due-ra.
**Prompt:** > Migráció: equipment (8.5) + RLS + a `bump_next_service()` trigger (8.13): klíma/hőszivattyú szerviz lezárásakor next_service_due +1 év.

### T-12 [P0] Telefon-intake + CRM gyors-kereső 👤 Te+B1 → T-10
**Fájlok:** `app/(app)/intake/page.tsx`, `components/crm/QuickCustomerSearch.tsx`
**Elfogadás:** név/telefon élő keresés; nincs találat → "Új ügyfél" (név+cím) → profil. Ez a leggyakoribb belépő.
**Prompt:** > Telefon-intake (rendszerterv 13.A): nagy kereső (név/telefon), élő találatok. Nincs találat → "Új ügyfél" gyorsfelvitel (név + első cím → customer + site) → profil megnyílik.

### T-13 [P0] Ügyfélprofil (központi képernyő) → T-11, T-12 👤 Te+B1
**Fájlok:** `app/(app)/customers/[id]/page.tsx`, `components/crm/*`, `lib/validators/crm.ts`
**Elfogadás:** fej (1-katt hívás), címek (több), foglalások, berendezések, előzmény; "Új időpont" gomb. Server Actions + zod.
**Prompt:** > Ügyfélprofil (rendszerterv 13.B): fej + címek (sites) + foglalások (appointments) + berendezések + job-előzmény. Kiemelt "Új időpont" gomb → foglaló (T-25). Mutációk Server Actionnel, zod sémákkal.

### T-14 [P0] CRM teljes CRUD + törlés/undo → T-13 👤 B1
**Scope:** Ügyfél, cím (site), berendezés **hozzáadás/szerkesztés/törlés** az ügyfélprofilon, konzisztens mintával (megerősítés + soft delete + undo toast).
**Fájlok:** `lib/crm/actions.ts`, `components/common/{ConfirmDelete,UndoToast,EntityRowActions}.tsx`
**Elfogadás:** customer/site/equipment add/edit/delete; törlés megerősítéssel + deleted_at + undo; a listák azonnal frissülnek (optimistic).
**Prompt:** > Teljes CRUD a CRM entitásokra (customer, site, equipment): Server Actionök add/edit/softDelete-re, közös ConfirmDelete + UndoToast + EntityRowActions komponensekkel (a többi entitás is ezt használja majd — FR-12). Optimistic UI, RLS (owner/dispatcher írhat, owner törölhet).

---

# EPIC 2 — Szolgáltatás + zóna + jobs + appointments

### T-20 [P0] services konfiguráció + UI → T-06 👤 B1
**Fájlok:** `supabase/migrations/0007_services.sql`, `app/(app)/settings/services/page.tsx`
**Elfogadás:** services (8.6) CRUD (időtartam, requires_survey, ár, ÁFA, szín); a foglalás ezt használja.
**Prompt:** > Migráció: services (8.6) + RLS. Beállítások UI: szolgáltatás lista + szerkesztő (default_duration_min, requires_survey, default_price, vat_rate, szín).

### T-21 [P0] service_zones + UI → T-10 👤 B2
**Fájlok:** `supabase/migrations/0008_zones.sql`, `app/(app)/settings/zones/page.tsx`
**Elfogadás:** service_zones (8.6) CRUD; szerelőnként bázispont (térképen) + radius_km.
**Prompt:** > Migráció: service_zones (8.6) + RLS. UI: szerelőnként bázispont térképes kijelöléssel + kiszállási radius (km), opcionálisan lefedett H3 cellák.

### T-22 [P0] jobs + status_history + state machine → T-11, T-20 👤 B1
**Fájlok:** `supabase/migrations/0009_jobs.sql`, `lib/jobs/status-machine.ts`, `lib/jobs/actions.ts`
**Elfogadás:** jobs + job_status_history (8.7); `generate_job_number` + `log_job_status_change` trigger; `transitionJob` a 8.7 mátrix szerint (tiltott átmenet hibát ad); job **hozzáadás/szerkesztés/törlés** (soft delete + undo, a T-14 közös komponenseivel).
**Prompt:** > Migráció: jobs + job_status_history (8.7) + generate_job_number + log_job_status_change trigger (8.13). `lib/jobs/status-machine.ts`: `canTransition(from,to)` a 8.7 mátrix szerint; `transitionJob` Server Action tiltott átmenetnél strukturált hibával. Unit teszt a mátrixra. Job CRUD (add/edit/softDelete) a T-14 közös ConfirmDelete/Undo mintával. RLS: technikus a saját (assigned_to) jobját, owner/dispatcher mindet, törlés owner/dispatcher.

### T-23 [P0] appointments séma + ütközés → T-22 👤 B1
**Fájlok:** `supabase/migrations/0010_appointments.sql`
**Elfogadás:** appointments (8.7), kind felmeres/munka, status, travel_buffer; egy jobhoz több; ütközés-index.
**Prompt:** > Migráció: appointments (8.7) + RLS. Egy jobhoz több appointment (felmérés + munka). Ütközés-ellenőrzés: egy technikusnak ne legyen átfedő, nem-lemondott appointmentje.

### T-24 [P1] Smart dispatch slot-motor (VROOM/OSRM) ⭐ → T-21, T-23, T-26 👤 B1+B2
> **MVP-opcionális, manual-first.** A VROOM/OSRM NEM fut Vercelen → külön konténer-host kell (Fly.io/Railway/VPS, EU). A web-first MVP a **manuális foglalással (T-26) indul**; ez a ticket fast-follow, amint a dispatch-host áll.
**Fájlok:** `infra/osrm/`, `infra/vroom/`, `lib/dispatch/{vroom-client,slot-engine}.ts`, `app/api/dispatch/suggest/route.ts`
**Elfogadás:** site + service + nap → 3–5 javasolt sáv (idő + szerelő + odajutás); H3/zóna előszűrés; OSRM Table mátrix; VROOM optimalizálás; fallback H3-becslés.
**Prompt:** > OSRM (BSD) EU OSM-mel + VROOM (vroom-docker). `lib/dispatch/slot-engine.ts` (rendszerterv 11 Dispatch): H3/zóna előszűrés → szabad rések a napon → OSRM Table utazási mátrix → VROOM input (jobs, vehicles, time windows) → 3–5 javasolt sáv, legjobb felül. Fallback: H3-becslés, ha a motor nem elérhető. Unit teszt fix adatra.

### T-25 [P0] Foglaló UI (drop-up) — smart mód ⭐ → T-24 👤 Te+B1
**Fájlok:** `components/booking/BookingDropup.tsx`, `components/booking/SmartSlotPicker.tsx`
**Elfogadás:** 3 lépés (szolgáltatás → nap → javasolt sáv); 1 kattintás = job+appointment; requires_survey → előbb csak felmérés. **Auto-fill (FR-14):** ügyfél+cím előtöltve (profilból), sáv-hossz a szolgáltatásból, javasolt szabad sáv + zóna-szerelő felajánlva, utoljára használt szolgáltatás emlékezve. A módot a `companies.booking_mode` dönti.
**Prompt:** > Foglaló drop-up az ügyfélprofilon (rendszerterv 13, UC-02 smart ág + FR-14 auto-fill): az ügyfél és cím a profilból ELŐTÖLTVE; 1) szolgáltatás (services, az utoljára használt elöl), a sáv-hossz onnan jön; 2) nap (alapból a legközelebbi szabad felajánlva); 3) a slot-motor (T-24) javaslatai (idő + szerelő + odajutás) → kattintásra job + appointment. requires_survey esetén előbb csak felmérés. A H3/zóna/buffer rejtve. A foglaló a `booking_mode`-ot olvassa.

### T-27 [P0] Job-detail Excel-fül shell ⭐ → T-22 👤 Te+B1
**Scope:** A job-detail konténer sticky fejléccel (job szám, ügyfél, StatusPipeline) és **Excel-fül-szerű lapozóval**: Áttekintés · Munkalap · Árajánlat · Számla (+ opc. Fotók/Idő). A munkalap/árajánlat/számla UI ezeken a füleken jelenik meg — NINCS külön felső menüpontjuk.
**Fájlok:** `app/(app)/jobs/[id]/layout.tsx`, `app/(app)/jobs/[id]/{page,worksheet,quote,invoice}/page.tsx`, `components/jobs/SheetTabs.tsx`, `components/jobs/StatusPipeline.tsx`
**Elfogadás:** a fülek a job állapotához igazodnak (inaktív/halvány, amíg nem releváns, tooltippel); a Számla fül a `kesz` státustól aktív; az aktív fül a job aktuális fázisához ugrik; a worksheet (T-30) / quote (T-34) / invoice (T-32) komponensek ezekbe a fülekbe renderelnek; a felső menüben NINCS önálló munkalap/árajánlat/számla pont.
**Prompt:** > Építsd meg a job-detail shellt (rendszerterv 13, ux-spec 3): sticky fejléc (job szám + ügyfél + StatusPipeline) + Excel-fül-szerű SheetTabs (Áttekintés/Munkalap/Árajánlat/Számla, opc. Fotók/Idő) Next.js nested layouttal és párhuzamos szegmensekkel. A fülek a job_status szerint aktívak/halványak (a Számla a kesz státustól); alapból az aktuális fázis füle nyílik. A T-30/T-34/T-32 UI-k ezekbe a fülekbe renderelnek. Ne legyen önálló /invoices felső menüpont.

### T-26 [P0] Foglaló — manual mód (Google Calendar-szerű) + beállítás ⭐ → T-23, T-20 👤 Te+B1
**Fájlok:** `components/booking/ManualSlotPicker.tsx`, `app/(app)/settings/booking/page.tsx`, `lib/booking/mode.ts`
**Elfogadás:** Beállítás-kapcsoló a `companies.booking_mode`-ra (smart/manual) + alap munkaidő-sávok; manual módban a foglaló naptár-rácsot mutat (szabad sávok + szerelő-választás), maga választ a felhasználó; ütközés tiltva; job+appointment ugyanúgy létrejön. requires_survey ugyanúgy kétlépcsős.
**Prompt:** > (1) Beállítások → Foglalás oldal: `booking_mode` kapcsoló (smart/manual) + munkaidő-sávok + auto-fill viselkedés (rendszerterv 13, FR-6/FR-14). (2) ManualSlotPicker: Google Calendar-szerű napi/heti rács a kiválasztott szolgáltatás időtartamával; ügyfél+cím előtöltve a profilból; meglévő appointmentek foglaltként; szabad sáv + szerelő választható; ütközésnél tiltás; minél több auto-fill (alap szerelő a zónából, alap időtartam a szolgáltatásból). Mentés = job + appointment, naptár-sync. A BookingDropup a booking_mode szerint a SmartSlotPicker (T-25) vagy a ManualSlotPicker komponenst rendereli.

---

# EPIC 3 — Munkalap + árajánlat + PDF

### T-30 [P0] worksheets + lines + UI → T-22 👤 B1
**Fájlok:** `supabase/migrations/0011_worksheets.sql`, `components/worksheet/{WorksheetForm,LineEditor}.tsx`
**Elfogadás:** worksheets + worksheet_lines (8.8, generated line_total); tételszerkesztő élő összeggel.
**Prompt:** > Migráció: worksheets + worksheet_lines (8.8) + RLS (hozzárendelt technikus is ír). UI: a job-detail **Munkalap fülén** (nem külön oldal) — elvégzett munka + tételszerkesztő (mennyiség × egységár × ÁFA), élő összeg, Server Action mentés.

### T-31 [P0] InvoicingProvider interfész + Billingo → T-30, T-50 👤 B2
**Fájlok:** `lib/apps/types.ts`, `lib/apps/registry.ts`, `lib/apps/invoicing/billingo.ts`, `lib/secrets/vault.ts`
**Elfogadás:** Connector interfész (rendszerterv 11) + `resolveConnector`; BillingoProvider a Vault-kulccsal; ÁFA tételenként.
**Prompt:** > `lib/apps/types.ts`: Connector + InvoicingProvider/CalendarProvider/PaymentProvider (rendszerterv 11). `resolveConnector(companyId, category)` az installed_apps-ból. BillingoProvider (InvoicingProvider) a Vaultból töltött kulccsal, ÁFA tételenként (5/18/27).

### T-32 [P0] Idempotens számlázás → T-31 👤 B2
**Fájlok:** `app/api/jobs/[id]/invoice/route.ts`
**Elfogadás:** csak `kesz` jobból; idempotency_key=`job:{id}:invoice`; kétszeri hívás 1 számla; siker → `szamlazva`.
**Prompt:** > `/api/jobs/[id]/invoice` POST (rendszerterv 10): owner/dispatcher, csak kesz, idempotency_key ellenőrzés, a tenant invoicing connectora kiállít, invoice rögzítés, job → szamlazva. Kétszeri kattintás 1 számla. A kiállító UI a job-detail **Számla fülén** él (nem külön oldal); a fül a kesz státustól aktív.

### T-33 [P0] NAV webhook + státusz → T-32 👤 B2
**Fájlok:** `app/api/webhooks/invoicing/route.ts`
**Elfogadás:** HMAC; nav_status (done/error); hibánál olvasható üzenet.
**Prompt:** > `/api/webhooks/invoicing`: HMAC ellenőrzés, invoices.nav_status frissítés (pending→done/error), nav_error mező hibánál.

### T-34 [P1] quotes + lines + opciók + UI → T-22 👤 Te+B1
**Fájlok:** `supabase/migrations/0012_quotes.sql`, `components/quotes/QuoteEditor.tsx`
**Elfogadás:** quotes + quote_lines (8.8) opciókkal (is_optional/option_group/good-better-best); végösszeg a kiválasztottakból.
**Prompt:** > Migráció: quotes + quote_lines (8.8, opciók) + RLS. Árajánlat szerkesztő a job-detail **Árajánlat fülén** (nem külön oldal): opcionális tételek + csomag-csoportok (good/better/best); végösszeg a is_selected tételekből.

### T-35 [P0] PDF (munkalap, ajánlat, számla) → T-30, T-34 👤 B2
**Fájlok:** `lib/pdf/{worksheet,quote,invoice}.ts`, `app/api/pdf/[kind]/[id]/route.ts`
**Elfogadás:** mindhárom PDF céges logóval → Storage; letöltő URL; csak saját tenant.
**Prompt:** > Szerver oldali PDF (React-PDF/Puppeteer) munkalapra, ajánlatra, számlára céges logóval. `/api/pdf/[kind]/[id]` → Storage → letöltő URL.

### T-36 [P1] Anyag katalógus + készlet → T-30 👤 B1
**Fájlok:** `supabase/migrations/0013_materials.sql`, `app/(app)/settings/materials`
**Elfogadás:** materials + stock_movements (8.11); munkalap-tételnél katalógusból + készletlevonás.
**Prompt:** > Migráció: materials + stock_movements (8.11) + RLS. A worksheet_line katalógusból választható; lezáráskor készletlevonás (stock_movements).

---

# EPIC 4 — Naptár + szerelő-web + munkalap-rögzítés
> Web-first: a szerelő a reszponzív weben dolgozik (telefon-böngészőből is). A dedikált mobil PWA, offline és GPS = **Phase 2**.

### T-40 [P0] Diszpécser naptár (appointments) → T-23 👤 B1
**Fájlok:** `app/(app)/calendar/page.tsx`, `components/calendar/DispatchCalendar.tsx`
**Elfogadás:** nap/hét nézet, szerelő-oszlopok, drag-drop → appointment idő/technikus; Supabase realtime.
**Prompt:** > Diszpécser naptár (rendszerterv 13): nap/hét, szerelő-oszlopok, az appointmentek drag-drop-pal (@dnd-kit) áthelyezhetők (starts_at/technician_id). Realtime sync.

### T-41 [P1] Hó + térkép nézet → T-40 👤 B1
**Fájlok:** `components/calendar/{MonthView,MapView}.tsx`
**Elfogadás:** hó nézet; Mapbox térkép az aznapi appointment-pinekkel. (Élő szerelő-GPS = Phase 2.)
**Prompt:** > Hó nézet + Mapbox térkép: aznapi appointmentek pinjei a címek (sites.lat/lng) alapján. Élő GPS nélkül (az Phase 2).

### T-42 [P0] Szerelő napi nézet (reszponzív web) → T-23 👤 B1
**Fájlok:** `app/(app)/my-day/page.tsx`, `components/jobs/TechDayList.tsx`
**Elfogadás:** a bejelentkezett technikus aznapi appointmentjei reszponzív listában (telefon-böngészőből is), cím (navigáció+hívás) + ugrás a job-fülre. Nincs külön PWA/offline.
**Prompt:** > "Mai napom" oldal (reszponzív web): a bejelentkezett technikus aznapi appointmentjei (RLS), kártyánként idő + cím (térkép/hívás link) + ugrás a job-detail Munkalap fülére. Telefon-böngészőre optimalizált, de NEM külön PWA.

### T-43 [P0] Aláírás + fotó (webes Munkalap fülön) → T-30 👤 B2
**Fájlok:** `components/worksheet/SignaturePad.tsx`, `components/worksheet/PhotoUpload.tsx`
**Elfogadás:** aláírás canvas → PNG → Storage + signatures sor; fotó presigned upload → attachments. Telefon-böngészőben is működik (touch). Offline NEM kell (online MVP).
**Prompt:** > SignaturePad (canvas, touch-kompatibilis) a job-detail Munkalap fülén → PNG Storage + signatures sor. Fotó presigned upload → attachments. Online működés (offline = Phase 2). (Az offline Dexie réteg és a /api/mobile/sync Phase 2.)

### T-44 [P1] Időkövetés (webes Munkalap fülön) → T-42 👤 B2
**Fájlok:** `supabase/migrations/0014_time.sql`, `components/worksheet/TimeTracker.tsx`
**Elfogadás:** time_entries (8.9) start/stop, egyszerre 1 futó technikusonként; a Munkalap fülön. (GPS live = Phase 2, T-70 körül.)
**Prompt:** > Migráció: time_entries (8.9) + RLS. A job-detail Munkalap fülén clock-in/out (1 futó/technikus). A technician_locations/GPS Phase 2.

### T-45 [P1] Ellenőrzőlista / job sablon → T-22 👤 B1
**Fájlok:** `supabase/migrations/0015_templates.sql`, `components/jobs/ChecklistPanel.tsx`
**Elfogadás:** job_templates + checklist_items + job_checklist_state (8.10); sablon választható, a checklist a jobra másolódik, a webes Munkalap fülön kipipálható.
**Prompt:** > Migráció: job_templates + checklist_items + job_checklist_state (8.10) + RLS. Job létrehozáskor sablon → checklist átmásolódik; a webes Munkalap fülön kipipálható (done_by/done_at).

---

# EPIC 5 — App Store + naptár sync + értesítés

### T-50 [P0] App Store séma + katalógus seed → T-06 👤 B2
**Fájlok:** `supabase/migrations/0016_app_store.sql`, `supabase/seed/app_definitions.sql`
**Elfogadás:** app_definitions + installed_apps (8.12) + RLS; katalógus seed (billingo, szamlazz, google_calendar, apple_calendar, stripe, simplepay, barion, infobip, resend).
**Prompt:** > Migráció: app_definitions + installed_apps (8.12) + RLS. Seed: a rendszerterv 11 tábla appjai (slug, kategória, auth_type, config_schema). Titok a Vaultba, installed_apps csak secret_ref.

### T-51 [P1] App Store UI → T-50, T-31 👤 Te+B1
**Fájlok:** `app/(app)/settings/integrations/page.tsx`, `components/apps/{AppCard,InstallDialog}.tsx`
**Elfogadás:** kategóriánként kártyák (telepítve/elérhető); telepítés (OAuth vagy API-kulcs) → installed_apps + Vault; ki/be kapcsolás.
**Prompt:** > App Store UI (rendszerterv 11, 13): app_definitions kategóriánként; "Telepítés" → API-kulcs mező vagy OAuth → installed_apps + Vault. Ki/be kapcsolható. Cal.com app store mintára, magyarul.

### T-52 [P1] Google + Apple naptár connector → T-31, T-23 👤 B2
**Fájlok:** `lib/apps/calendar/{google,apple_caldav}.ts`, `app/api/calendar/*`
**Elfogadás:** CalendarProvider Google (OAuth) + Apple (CalDAV); appointment push/update/delete (gcal_event_id); listBusy a slot-motorba.
**Prompt:** > CalendarProvider: Google (OAuth, push/update/delete + listBusy) és Apple (CalDAV). Appointment szinkron (gcal_event_id). A listBusy adja a foglalt sávokat a slot-motornak (T-24), hogy ne ajánljon ütközést.

### T-53 [P1] Értesítés (SMS/email) → T-22 👤 B2
**Fájlok:** `lib/notifications/{send,templates}.ts`, `app/api/jobs/[id]/notify/route.ts`, `supabase/migrations/0017_notifications.sql`
**Elfogadás:** notifications (8.11); "on-my-way" SMS; minden üzenet naplózva.
**Prompt:** > Migráció: notifications (8.11) + RLS. Értesítés réteg: sablonok (technician_on_the_way, quote_ready, invoice_sent), SMS Infobip, email Resend. `/api/jobs/[id]/notify` küld + naplóz.

---

### T-54 [P1] Értesítés-beállítások (settings/notifications) → T-53 👤 B1
**Scope:** A cég beállítja, mely értesítések menjenek (on-my-way, ajánlat kész, számla, emlékeztető), csatornánként (SMS/email), és a sablonszöveget.
**Fájlok:** `app/(app)/settings/notifications/page.tsx`, `supabase/migrations/0017b_notification_settings.sql`
**Elfogadás:** eseményenként ki/be + csatorna + szerkeszthető sablon; a küldő réteg (T-53) ezt olvassa.
**Prompt:** > settings/notifications: eseményenkénti (on-my-way, quote_ready, invoice_sent, service_reminder) ki/be kapcsoló + csatorna (SMS/email) + sablon-szerkesztő (változókkal). Tárolás company-szintű notification_settings táblában; a T-53 küldő ezt veszi figyelembe.

---

# EPIC 6 — Ajánlatkérő + dashboard + export + hardening

### T-60 [P1] Online ajánlatkérő (publikus) → T-10 👤 B1
**Fájlok:** `supabase/migrations/0018_booking_requests.sql`, `app/public/[slug]/request/page.tsx`, `app/api/public/request/route.ts`
**Elfogadás:** booking_requests (8.11) + companies.public_slug; publikus oldal auth nélkül, rate limit, spam-jelölés.
**Prompt:** > Migráció: booking_requests (8.11) + public_slug. Publikus `/public/[slug]/request` (auth nélkül) → `/api/public/request` POST (rate limit, zod) → new státusz a slug tenantjához.

### T-61 [P1] Kérés → job konverzió → T-60, T-13 👤 B1
**Fájlok:** `app/(app)/requests/page.tsx`
**Elfogadás:** owner/dispatcher lista; "Job létrehozása" → customer+site+job; request → converted.
**Prompt:** > Beérkező kérések lista (RLS) + "Job létrehozása" akció: a request adatából customer+site+job (vagy összepárosítás), request → converted (job_id).

### T-62 [P1] Dashboard → T-32 👤 Te+B1
**Fájlok:** `app/(app)/dashboard/page.tsx`
**Elfogadás:** bevétel (heti/havi), kész-de-nem-számlázott, kintlévő (szamlazva, nem fizetve), közelgő szervizek.
**Prompt:** > Dashboard (rendszerterv 13): bevétel a számlákból, kész-de-nem-számlázott jobok, kintlévőség, közelgő szervizek (equipment.next_service_due). RSC aggregált query-k RLS-sel.

### T-63 [P1] Könyvelői számla-lista + export → T-32 👤 B2
**Fájlok:** `app/(app)/settings/billing-list/page.tsx`, `app/api/export/accounting/route.ts`
**Elfogadás:** csak-olvasó számla-lista (NAV státusz, fizetve, PDF, ugrás a jobra) a könyvelőnek/ownernek + dátumtartomány CSV export. Számla kiállítás itt NINCS (az a job Számla fülén).
**Prompt:** > (1) Beállítások → Számlák: csak-olvasó számla-lista (NAV státusz, fizetve, PDF, link a jobra), NAV-hibásak felül; nincs kiállító gomb (az a job Számla fülén). (2) `/api/export/accounting` GET: dátumtartomány CSV az invoices + job/customer adatból, accountant/owner.

### T-64 [P1] Cron: szerviz emlékeztető + trial/dunning → T-53, T-08 👤 B2
**Fájlok:** `supabase/functions/{service-reminders,billing-lifecycle}/index.ts`, `vercel.json`
**Elfogadás:** napi: szerviz ≤14 nap → ügyfél SMS; trial vége előtt emlékeztető; past_due → türelmi idő → suspended.
**Prompt:** > Edge Function + Vercel Cron (napi): (1) service-reminders — equipment.next_service_due ≤14 nap → ügyfél SMS; (2) billing-lifecycle — trial vége előtt 3/1 nap emlékeztető, lejárt trial → paywall, past_due → 7 nap türelmi idő → suspended.

### T-65 [P0] RLS audit + e2e + pilot → minden epic 👤 Te
**Fájlok:** `tests/rls.spec.ts`, `tests/e2e/lifecycle.spec.ts`
**Elfogadás:** két-tenant izoláció minden táblán; service kulcs nincs a kliens bundle-ben; minden fő entitáson CRUD (add/edit/delete+undo) működik; minden képernyő reszponzív (mobil/tablet/desktop); UC-01…07 teljes lefutás; 3 pilot cég.
**Prompt:** > (1) RLS integrációs teszt két tenant userrel minden fő táblára (nincs cross-tenant olvasás/írás); ellenőrizd, hogy service_role nincs a kliens bundle-ben. (2) Playwright e2e: intake → ügyfél → foglalás → munkalap → aláírás → számla (mock connector) → fizetve.

---

# Phase 2 ticketek (moat) — vázlat
- **T-70** Payment connectorok (Stripe + SimplePay + Barion) — `PaymentProvider` (rendszerterv 11). In-app fizetés a munkalapon.
- **T-71** Kártya tárolása (card on file) → tagság autopay (recurring token).
- **T-72** Karbantartási tagság engine + autopay (memberships, payments).
- **T-73** Részletfizetési kalkulátor az árajánlatban.
- **T-74** Automatikus review kérés.
- **T-75** Ügyfélportál (ajánlat-elfogadás + online fizetés + előzmény).
- **T-76** Batch invoicing.
- **T-77** Technikus mobil PWA + offline (Dexie + /api/mobile/sync) — a web-first MVP után.
- **T-78** GPS live tracking (technician_locations + diszpécser élő térkép) — a mobil appra épül.

---

## Függőségi térkép (kritikus út)
```
T-01→02→03→04→05→06   (alap + auth + billing)
   ├ 07 entitlement · 08 stripe · 09 portal+csapat
   └ T-10 CRM → 11 equipment → 12 intake → 13 profil ⭐
        ├ 20 services · 21 zones
        ├ 22 jobs → 23 appointments → 24 dispatch ⭐ → 25 foglaló-smart ⭐ · 26 foglaló-manual ⭐
        │      └ 27 job-detail Excel-fül shell ⭐ (ide renderel 30/34/32)
        ├ 30 munkalap → 31 connector/Billingo → 32 számla → 33 NAV webhook
        │            34 ajánlat · 35 PDF · 36 anyag
        ├ 40 naptár → 41 hó/térkép/GPS
        ├ 42 szerelő-web → 43 aláírás+fotó → 44 idő · 45 ellenőrzőlista  (PWA/offline/GPS = Phase 2)
        ├ 50 app store → 51 UI · 52 naptár-sync · 53 értesítés
        └ 60 ajánlatkérő → 61 konverzió · 62 dashboard · 63 export · 64 cron → 65 audit+e2e
```

## Csapat-sávok (3 fő)
- **B1:** alap/auth/billing → CRM → services → jobs/appointments → naptár → ajánlatkérő/dashboard
- **B2:** (T-23 után) connector/Billingo/NAV → aláírás/fotó/idő (webes Munkalap fül) → app store/naptár-sync/értesítés → cron. (Mobil PWA/offline/GPS = Phase 2.)
- **Te:** PM/review (T-12,13,25,51,62) + Stripe/NAV-számla (T-08) + RLS audit + e2e (T-65) + pilot

## Mérföldkövek (~16 hét)
| Hét | Kész | Demo |
|-----|------|------|
| 1–2 | T-01…06 | belépés (Google/Apple) + trial onboarding |
| 3–4 | T-07…13 | CRM központ + telefon-intake |
| 5–6 | T-20…26 | szolgáltatás + dispatch + foglaló (smart + manual) ⭐ |
| 7–8 | T-27, T-30…36 | job-detail fülek + munkalap + NAV-számla + ajánlat + PDF |
| 9–10 | T-40…45 | naptár + szerelő-web nézet + aláírás/idő/ellenőrzőlista |
| 11–12 | T-50…53 | app store + naptár-sync + értesítés |
| 13–14 | T-60…63 | ajánlatkérő + dashboard + export |
| 15 | T-64 | emlékeztető + dunning cron |
| 16 | T-65 | RLS audit + e2e + 3 pilot |

## Nyitott döntések
1. **Árazás** (tier + HUF + éves kedvezmény) — üzleti döntés; a séma flat-tier + szerelő-limit.
2. **Trial:** 14 nap, kártya nélkül (alacsonyabb súrlódás) — felülvizsgálható.
3. **Billingo vs Számlázz.hu** elsőként a connectorban — Billingo (tisztább API) javasolt.
4. **Utazási idő:** OSRM Table (pontos) vs. H3-becslés (fallback) — OSRM az alap, H3 a tartalék.
5. **Dispatch-host (Vercel mellett):** a VROOM/OSRM külön konténer-hoston (Fly.io/Railway/VPS, EU). MVP-ben elhalasztható — manual-first.

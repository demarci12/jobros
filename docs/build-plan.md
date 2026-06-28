# Jobro — Build plan (v3.0 — AI-gyorsított, 2026-06-28)

A rendszerterv (v2.0) lebontva **Claude Code-méretű, sorba rendezett ticketekre**. Egy ticket ≈ egy ülés (1–5 fájl). Minden ticket: scope, érintett fájlok, függőség (`→ T-xx`), elfogadási kritérium, bemásolható Claude Code prompt, felelős (Te / B1 full-stack / B2 integráció+mobil).

**Forrás:** mindig a `docs/rendszerterv.md` megfelelő számozott szakasza (8 = DB séma, 9 = RLS, 10 = API, 11 = App Store, 12 = billing). Nincsenek függelékek.

**Definition of Done (minden ticket):** kód + típusok zöld + elfogadási kritérium teljesül + nincs RLS-lyuk (tenant-izoláció áll) + teszt zöld.

**Jelölés:** `[P0]` blokkoló · `[P1]` fontos · `[P2]` Phase 2 · `✅` kész · `⚠️` részleges · `❌` hiányzik

---

## Implementációs állapot (2026-06-28)

| Epic | Kész | Részleges | Hiányzik |
|------|------|-----------|----------|
| EPIC 0 — Auth + Billing | ✅ T-01…09 | — | — |
| EPIC 1 — CRM | ✅ T-10…14 | — | — |
| EPIC 2 — Services + Jobs | ✅ T-20…23, T-26, T-27 | T-25 SmartSlotPicker | T-24 VROOM/OSRM (Phase 2) |
| EPIC 3 — Munkalap + PDF | ✅ T-30…34, T-36 | T-35 PDF letöltő UI gomb | — |
| EPIC 4 — Naptár + Szerelő | ✅ T-40, T-42…45 | — | T-41 hó/térkép nézet |
| EPIC 5 — App Store | ✅ T-50, T-51, T-54 | T-53 cron trigger | T-52 Google Calendar connector |
| EPIC 6 — Dashboard + Export | ✅ T-60…63 | — | T-64 Edge Functions, T-65 audit+e2e |

**Összesített MVP-haladás: ~85% kész.** Blokkoló hiányok: T-64 (dunning cron), T-65 (audit+pilot).

---

# EPIC 0 — Alap + Auth + Billing

### T-01 ✅ [P0] Projekt + Supabase + 3 kliens 👤 B1
**Fájlok:** `package.json`, `lib/supabase/{client,server,service}.ts`, `.env.example`, `app/layout.tsx`
**Elfogadás:** `npm run dev` fut; anon/server/service kliens; service kulcs csak szerver oldali fájlban.
**Prompt:** > Next.js 14 App Router + TS init, Vercel-deploy-ra készen (EU régió, Supabase EU külön). `lib/supabase/`: client (anon), server (RSC/Action, cookie), service (service_role, CSAK szerver) factory-k `@supabase/ssr`-rel. A service kulcs sosem importálható kliens komponensből.

### T-02 ✅ [P0] Migráció-keret + enumok → T-01 👤 B1
**Fájlok:** `supabase/migrations/0001_extensions_enums.sql`
**Elfogadás:** `supabase db push` fut; a rendszerterv 8.3 enumjai léteznek; pgcrypto + postgis aktív.

### T-03 ✅ [P0] Alaptáblák: companies, profiles, company_users, invitations → T-02 👤 B1
**Fájlok:** `supabase/migrations/0002_core.sql`
**Elfogadás:** táblák FK-kkal; `set_updated_at()` trigger; auth.users-hez kötött profiles.

### T-04 ✅ [P0] RLS helperek + core policy → T-03 👤 B1
**Fájlok:** `supabase/migrations/0003_rls_core.sql`
**Elfogadás:** `auth_company_ids()`, `has_role()`; idegen tenant nem látja a sorokat; user csak a saját profilját írja.

### T-05 ✅ [P0] SaaS billing séma + plan seed → T-03 👤 B1
**Fájlok:** `supabase/migrations/0004_billing.sql`, `supabase/seed/plans.sql`
**Elfogadás:** plan_definitions + subscriptions (rendszerterv 8.4) + RLS (csak owner); planek seed-elve (trial/alap/pro/business).

### T-06 ✅ [P0] Auth (Google/Apple/email) + onboarding + trial → T-05 👤 B1
**Fájlok:** `app/(auth)/{login,register}`, `app/onboarding`, `lib/auth.ts`
**Elfogadás:** belépés mindhárom úton; első belépésnél company + owner company_user + subscriptions(trialing, +14 nap); social belépésnél is fut az onboarding.

### T-07 ✅ [P0] Plan-gating (entitlement) → T-05 👤 B1
**Fájlok:** `lib/billing/entitlements.ts`
**Elfogadás:** `checkEntitlement(companyId, key)`; szerelő-limit, funkció-gate, past_due/suspended → read-only.

### T-08 ✅ [P0] Stripe Billing + webhook + NAV-számla magunkról → T-06, T-31 👤 B2
**Fájlok:** `lib/billing/stripe.ts`, `app/api/webhooks/stripe-billing/route.ts`, `app/(app)/settings/subscription/`
**Elfogadás:** Checkout → subscription; webhook frissíti subscriptions.status + companies.plan; sikeres terhelés után NAV-számla a saját Billingo-fiókunkból.

### T-09 ✅ [P1] Settings hub + account + company + billing + csapat → T-07 👤 Te+B1
**Fájlok:** `app/(app)/settings/layout.tsx`, `settings/{account,company,subscription,team}/page.tsx`, `app/(auth)/accept-invite/`
**Elfogadás:** (account) név/telefon/jelszó/nyelv; (company) cégadat+logó+ÁFA-alap; (subscription) plan/fizetőeszköz/számlák/upgrade/lemondás/trial-countdown; (team) tag lista + szerep váltás + eltávolítás + meghívás.

### T-01b ✅ [P0] Design rendszer + szuper-reszponzív shell + közös CRUD UI → T-01 👤 Te+B1
**Fájlok:** `app/(app)/layout.tsx`, `components/ui/*`, `components/common/{DataView,ConfirmDelete,UndoToast,EntityRowActions,EmptyState}.tsx`
**Elfogadás:** shell first-class mobil/tablet/desktopon; közös ConfirmDelete + UndoToast + sor-műveletek.

---

# EPIC 1 — CRM (a központ)

### T-10 ✅ [P0] customers + sites (geo/H3) + RLS → T-06 👤 B1
**Fájlok:** `supabase/migrations/0006_crm.sql`, `lib/geo/{geocode,h3}.ts`
**Elfogadás:** customers + sites (8.5); cím mentésekor lat/lng + h3_index (res 8); RLS; telefon-index.

### T-11 ✅ [P0] equipment + next_service trigger → T-10 👤 B1
**Fájlok:** `supabase/migrations/*`
**Elfogadás:** equipment (8.5) site-hoz kötve; `bump_next_service` trigger; index next_service_due-ra.

### T-12 ✅ [P0] Telefon-intake + CRM gyors-kereső 👤 Te+B1 → T-10
**Fájlok:** `app/(app)/intake/page.tsx`, `components/crm/QuickCustomerSearch.tsx`
**Elfogadás:** név/telefon élő keresés; nincs találat → "Új ügyfél" → profil.

### T-13 ✅ [P0] Ügyfélprofil (központi képernyő) → T-11, T-12 👤 Te+B1
**Fájlok:** `app/(app)/customers/[id]/page.tsx`, `components/crm/*`, `lib/validators/crm.ts`
**Elfogadás:** fej, címek, foglalások, berendezések, előzmény; "Új időpont" gomb.

### T-14 ✅ [P0] CRM teljes CRUD + törlés/undo → T-13 👤 B1
**Fájlok:** `lib/crm/actions.ts`, `components/common/{ConfirmDelete,UndoToast,EntityRowActions}.tsx`
**Elfogadás:** customer/site/equipment add/edit/delete; törlés megerősítéssel + deleted_at + undo; optimistic UI.

---

# EPIC 2 — Szolgáltatás + zóna + jobs + appointments

### T-20 ✅ [P0] services konfiguráció + UI → T-06 👤 B1
**Fájlok:** `supabase/migrations/0007_services.sql`, `app/(app)/settings/services/page.tsx`
**Elfogadás:** services (8.6) CRUD; a foglalás ezt használja.

### T-21 ✅ [P0] service_zones + UI → T-10 👤 B2
**Fájlok:** `supabase/migrations/*`, `app/(app)/settings/zones/page.tsx`
**Elfogadás:** service_zones (8.6) CRUD; szerelőnként bázispont + radius_km.

### T-22 ✅ [P0] jobs + status_history + state machine → T-11, T-20 👤 B1
**Fájlok:** `supabase/migrations/0008_jobs.sql`, `lib/jobs/status-machine.ts`, `lib/jobs/actions.ts`
**Elfogadás:** jobs + job_status_history; generate_job_number trigger; transitionJob a 8.7 mátrix szerint; CRUD soft delete+undo.

### T-23 ✅ [P0] appointments séma + ütközés → T-22 👤 B1
**Fájlok:** `supabase/migrations/0010_appointments.sql`
**Elfogadás:** appointments (8.7), kind felmeres/munka, status, travel_buffer; ütközés-index.

### T-24 ❌ [P2] Smart dispatch slot-motor (VROOM/OSRM) ⭐ → T-21, T-23, T-26 👤 B1+B2
> **Phase 2 — manual-first MVP.** A VROOM/OSRM NEM fut Vercelen → külön konténer-host kell (Fly.io/Railway/VPS, EU). Az MVP a manuális foglalással (T-26) indul.
**Fájlok:** `infra/osrm/`, `infra/vroom/`, `lib/dispatch/{vroom-client,slot-engine}.ts`, `app/api/dispatch/suggest/route.ts`
**Elfogadás:** site + service + nap → 3–5 javasolt sáv; H3/zóna előszűrés; OSRM Table mátrix; VROOM optimalizálás; fallback H3-becslés.
**Prompt:** > OSRM (BSD) EU OSM-mel + VROOM (vroom-docker). `lib/dispatch/slot-engine.ts` (rendszerterv 11 Dispatch): H3/zóna előszűrés → szabad rések → OSRM Table mátrix → VROOM → 3–5 javasolt sáv. Fallback: H3-becslés.

### T-25 ⚠️ [P1] Foglaló UI (drop-up) — smart mód ⭐ → T-24 👤 Te+B1
**Állapot:** BookingDropup kész (manual mód), `bookingMode` prop fogad, SmartSlotPicker **nem implementált** (TODO Phase 2). Jelenleg mindkét módban ManualSlotPicker fut.
**Fájlok:** `components/booking/BookingDropup.tsx`, `components/booking/SmartSlotPicker.tsx`
**Elfogadás:** T-24 elkészülte után SmartSlotPicker routing a `booking_mode === 'smart'` esetén.
**Prompt:** > SmartSlotPicker: 3 lépés (szolgáltatás → nap → javasolt sáv a slot-motortól); ügyfél+cím auto-fill a profilból; 1 kattintás = job+appointment. A BookingDropup `booking_mode` alapján SmartSlotPicker-t renderel (most ManualSlotPicker mindkét módban).

### T-26 ✅ [P0] Foglaló — manual mód (Google Calendar-szerű) + beállítás ⭐ → T-23, T-20 👤 Te+B1
**Fájlok:** `components/booking/ManualSlotPicker.tsx`, `app/(app)/settings/booking/page.tsx`, `lib/booking/mode.ts`
**Elfogadás:** Beállítás-kapcsoló `booking_mode`-ra + munkaidő-sávok; naptár-rács; ütközés tiltva; job+appointment létrejön.

### T-27 ✅ [P0] Job-detail Excel-fül shell ⭐ → T-22 👤 Te+B1
**Fájlok:** `app/(app)/jobs/[id]/layout.tsx`, `app/(app)/jobs/[id]/{page,worksheet,quote,invoice}/page.tsx`, `components/jobs/SheetTabs.tsx`, `components/jobs/StatusPipeline.tsx`
**Elfogadás:** sticky fejléc + SheetTabs; fülek a job státuszához igazodnak; Számla fül `kesz`-től aktív.

---

# EPIC 3 — Munkalap + árajánlat + PDF

### T-30 ✅ [P0] worksheets + lines + UI → T-22 👤 B1
**Fájlok:** `supabase/migrations/0010_worksheets.sql`, `components/worksheet/{WorksheetClient,WorksheetForm,LineEditor}.tsx`
**Elfogadás:** worksheets + worksheet_lines (generated line_total); tételszerkesztő élő összeggel; a Munkalap fülön.

### T-31 ✅ [P0] InvoicingProvider interfész + Billingo → T-30, T-50 👤 B2
**Fájlok:** `lib/apps/types.ts`, `lib/apps/registry.ts`, `lib/apps/invoicing/billingo.ts`, `lib/secrets/vault.ts`
**Elfogadás:** Connector interfész + `resolveConnector`; BillingoProvider a Vault-kulccsal; ÁFA tételenként.

### T-32 ✅ [P0] Idempotens számlázás → T-31 👤 B2
**Fájlok:** `app/api/jobs/[id]/invoice/route.ts`, `app/(app)/jobs/[id]/invoice/page.tsx`
**Elfogadás:** csak `kesz` jobból; idempotency_key; kétszeri hívás 1 számla; siker → `szamlazva`.

### T-33 ✅ [P0] NAV webhook + státusz → T-32 👤 B2
**Fájlok:** `app/api/webhooks/invoicing/route.ts`
**Elfogadás:** HMAC; nav_status (done/error); hibánál olvasható üzenet.

### T-34 ✅ [P1] quotes + lines + opciók + UI → T-22 👤 Te+B1
**Fájlok:** `supabase/migrations/0014_quotes.sql`, `components/quotes/QuoteEditor.tsx`
**Elfogadás:** quotes + quote_lines opciókkal; végösszeg a kiválasztottakból; Árajánlat fülön.

### T-35 ⚠️ [P0] PDF (munkalap, ajánlat, számla) → T-30, T-34 👤 B2
**Állapot:** `lib/pdf/worksheet.tsx` és `lib/pdf/quote.tsx` implementálva; `/api/pdf/[kind]/[id]/route.ts` létezik; **letöltő gombok a UI-on ellenőrzendők** — valószínűleg hiányoznak a worksheet/quote/invoice oldalakon.
**Fájlok:** `lib/pdf/{worksheet,quote,invoice}.ts`, `app/api/pdf/[kind]/[id]/route.ts`
**Tennivaló:** PDF letöltő gomb a job-detail Munkalap/Árajánlat/Számla fülein + Storage URL visszaadása.
**Elfogadás:** mindhárom PDF céges logóval → Storage; letöltő URL; csak saját tenant.

### T-36 ✅ [P1] Anyag katalógus + készlet → T-30 👤 B1
**Fájlok:** `supabase/migrations/0016_materials.sql`, `app/(app)/settings/materials/`
**Elfogadás:** materials + stock_movements; manuális bevételezés/kiadás; alacsony készlet figyelmeztetés; munkalap-tételnél katalógusból választható + készletlevonás.

---

# EPIC 4 — Naptár + szerelő-web + munkalap-rögzítés
> Web-first: a szerelő a reszponzív weben dolgozik. Dedikált mobil PWA, offline, GPS = **Phase 2**.

### T-40 ✅ [P0] Diszpécser naptár (appointments) → T-23 👤 B1
**Fájlok:** `app/(app)/calendar/page.tsx`, `components/calendar/DispatchCalendar.tsx`
**Elfogadás:** nap/hét nézet, szerelő-oszlopok, drag-drop → appointment idő/technikus; Supabase realtime.

### T-41 ❌ [P1] Hó + térkép nézet → T-40 👤 B1
**Fájlok:** `components/calendar/{MonthView,MapView}.tsx`
**Elfogadás:** hó nézet; Mapbox térkép az aznapi appointment-pinekkel.
**Prompt:** > Hó nézet a diszpécser naptárba (MonthView), és Mapbox térkép nézet: aznapi appointmentek pinjei a sites.lat/lng alapján. Élő GPS nélkül (Phase 2). Nézetváltó a meglévő DispatchCalendar fölé.

### T-42 ✅ [P0] Szerelő napi nézet (reszponzív web) → T-23 👤 B1
**Fájlok:** `app/(app)/my-day/page.tsx`, `components/jobs/TechDayList.tsx`
**Elfogadás:** a bejelentkezett technikus aznapi appointmentjei reszponzív listában; cím + ugrás job-fülre.

### T-43 ✅ [P0] Aláírás + fotó (webes Munkalap fülön) → T-30 👤 B2
**Fájlok:** `components/worksheet/SignaturePad.tsx`, `components/worksheet/PhotoUpload.tsx`
**Elfogadás:** aláírás canvas → PNG → Storage + signatures sor; fotó presigned upload → attachments.

### T-44 ✅ [P1] Időkövetés (webes Munkalap fülön) → T-42 👤 B2
**Fájlok:** `supabase/migrations/0019_time_entries.sql`, `components/worksheet/TimeTracker.tsx`, `lib/time-entries/actions.ts`
**Elfogadás:** time_entries start/stop; 1 futó/technikus (partial unique index); a Munkalap fülön.

### T-45 ✅ [P1] Ellenőrzőlista / job sablon → T-22 👤 B1
**Fájlok:** `supabase/migrations/0020_templates.sql`, `components/jobs/ChecklistPanel.tsx`, `app/(app)/settings/templates/`
**Elfogadás:** job_templates + checklist_items + job_checklist_state; sablon választható; a webes Munkalap fülön kipipálható.

---

# EPIC 5 — App Store + naptár sync + értesítés

### T-50 ✅ [P0] App Store séma + katalógus seed → T-06 👤 B2
**Fájlok:** `supabase/migrations/0012_app_store.sql`, `supabase/seed/app_definitions.sql`
**Elfogadás:** app_definitions + installed_apps (8.12) + RLS; katalógus seed.

### T-51 ✅ [P1] App Store UI → T-50, T-31 👤 Te+B1
**Fájlok:** `app/(app)/settings/integrations/page.tsx`, `components/apps/{AppCard,InstallDialog}.tsx`
**Elfogadás:** kategóriánként kártyák; telepítés → installed_apps + Vault; ki/be kapcsolás.

### T-52 ❌ [P1] Google + Apple naptár connector → T-31, T-23 👤 B2
**Fájlok:** `lib/apps/calendar/{google,apple_caldav}.ts`, `app/api/calendar/*`
**Elfogadás:** CalendarProvider Google (OAuth) + Apple (CalDAV); appointment push/update/delete; listBusy a slot-motorba.
**Prompt:** > CalendarProvider: Google (OAuth, push/update/delete + listBusy) és Apple (CalDAV). Appointment szinkron (gcal_event_id). A listBusy adja a foglalt sávokat a slot-motornak (T-24).

### T-53 ⚠️ [P1] Értesítés (SMS/email) → T-22 👤 B2
**Állapot:** `lib/notifications/send.ts` és `lib/notifications/templates.ts` implementálva; `/api/jobs/[id]/notify/route.ts` létezik; **a cron/scheduled trigger és az automatikus küldés még nem fut** (T-64 kell hozzá).
**Fájlok:** `lib/notifications/{send,templates}.ts`, `app/api/jobs/[id]/notify/route.ts`
**Elfogadás:** notifications (8.11); "on-my-way" SMS; minden üzenet naplózva.

### T-54 ✅ [P1] Értesítés-beállítások (settings/notifications) → T-53 👤 B1
**Fájlok:** `app/(app)/settings/notifications/page.tsx`
**Elfogadás:** eseményenként ki/be + csatorna + sablon-szerkesztő; a küldő réteg (T-53) ezt olvassa.

---

# EPIC 6 — Ajánlatkérő + dashboard + export + hardening

### T-60 ✅ [P1] Online ajánlatkérő (publikus) → T-10 👤 B1
**Fájlok:** `supabase/migrations/0021_booking_requests.sql`, `app/public/[slug]/request/page.tsx`, `app/api/public/request/route.ts`
**Elfogadás:** booking_requests + companies.public_slug; publikus oldal auth nélkül; rate limit; spam-jelölés.

### T-61 ✅ [P1] Kérés → job konverzió → T-60, T-13 👤 B1
**Fájlok:** `app/(app)/requests/page.tsx`
**Elfogadás:** owner/dispatcher lista; "Job létrehozása" → customer+site+job; request → converted.

### T-62 ✅ [P1] Dashboard → T-32 👤 Te+B1
**Fájlok:** `app/(app)/dashboard/page.tsx`, `app/(app)/dashboard/dashboard-sections.tsx`
**Elfogadás:** bevétel (heti/havi), kész-de-nem-számlázott, kintlévő, közelgő szervizek. Suspense streaming.

### T-63 ✅ [P1] Könyvelői számla-lista + export → T-32 👤 B2
**Fájlok:** `app/(app)/settings/billing-list/page.tsx`, `app/api/export/accounting/route.ts`
**Elfogadás:** csak-olvasó számla-lista (NAV státusz, fizetve, PDF, ugrás a jobra) + dátumtartomány CSV export.

### T-64 ❌ [P1] Cron: szerviz emlékeztető + trial/dunning → T-53, T-08 👤 B2
**Fájlok:** `supabase/functions/service-reminders/index.ts`, `supabase/functions/billing-lifecycle/index.ts`, `vercel.json`
**Elfogadás:** napi: szerviz ≤14 nap → ügyfél SMS; trial vége előtt emlékeztető; past_due → türelmi idő → suspended.
**Prompt:** > Supabase Edge Function + Vercel Cron (napi, pg_cron vagy Vercel): (1) `service-reminders` — equipment.next_service_due ≤14 nap → ügyfél SMS (T-53 küldő réteggel); (2) `billing-lifecycle` — trial vége előtt 3/1 nap emlékeztető, lejárt trial → paywall, past_due → 7 nap türelmi idő → suspended (subscriptions.status frissítés). Idempotens futás (napidönce check).

### T-65 ❌ [P0] RLS audit + e2e + pilot → minden epic 👤 Te
**Fájlok:** `tests/rls.spec.ts`, `tests/e2e/lifecycle.spec.ts`
**Elfogadás:** két-tenant izoláció minden táblán; service kulcs nincs a kliens bundle-ben; minden fő entitáson CRUD működik; UC-01…07 teljes lefutás; 3 pilot cég.
**Prompt:** > (1) RLS integrációs teszt két tenant userrel minden fő táblára (nincs cross-tenant olvasás/írás); ellenőrizd, hogy service_role nincs a kliens bundle-ben. (2) Playwright e2e: intake → ügyfél → foglalás → munkalap → aláírás → számla (mock connector) → fizetve.

---

# Phase 2 ticketek (moat) — részletes tervek

> **Mikor indítható:** T-65 (pilot) után, legalább 3 pilot céggel, fizetőképes érdeklődéssel. A Phase 2 moat = recurring bevétel a tenantnak, GPS tracking, offline mobil.

### T-70 [P2] Payment connectorok (Stripe + SimplePay + Barion) 👤 B2
**Scope:** In-app fizetés a munkalapon: a technikus a helyszínen fizettethet bankkártyával. A tenant saját Stripe/SimplePay/Barion fiókját köti be (App Store connector). Két fizetési sík: SaaS-előfizetés (T-08) és in-app (ez).
**Fájlok:** `lib/apps/payment/{stripe,simplepay,barion}.ts`, `components/worksheet/PaymentCapture.tsx`, `app/api/jobs/[id]/payment/route.ts`
**Elfogadás:** PaymentProvider connector interface; in-app fizetés a Munkalap fülön; sikeres terhelés → payments sor + job státusz → `fizetve`; Stripe (kártya), SimplePay (HUF local), Barion (kártya+QR).
**Prompt:** > PaymentProvider interfész (lib/apps/types.ts bővítés): `charge(amount, currency, metadata)`. Stripe, SimplePay, Barion connectorok az App Store-ban (installed_apps, Vault secret). PaymentCapture komponens a Munkalap fülön: összeg + fizetési mód → API hívás → job fizetve. payments tábla (8.x).

### T-71 [P2] Kártya tárolása (card on file) → tagság autopay 👤 B2
**Scope:** Az ügyfél kártyáját tárolják a tenanthoz kötve (Stripe Customer), hogy a recurring tagság havonta automatikusan terhelhető legyen.
**Fájlok:** `lib/apps/payment/card-on-file.ts`, `supabase/migrations/0030_card_tokens.sql`
**Elfogadás:** ügyfél card token Stripe Vaultban (nem a DB-ben); recurring charge a tagság díjából; 3DS challenge kezelés.

### T-72 [P2] Karbantartási tagság engine + autopay 👤 B2
**Scope:** A tenant recurring karbantartási szerződéseket kínálhat (évi/félévi szerviz, havidíjjal). Az engine automatikusan létrehozza a munkalapokat + számlázza a tagdíjat.
**Fájlok:** `supabase/migrations/0031_memberships.sql`, `lib/memberships/engine.ts`, `supabase/functions/membership-billing/index.ts`
**Elfogadás:** memberships tábla (customer + plan + next_billing_date); napi cron → esedékes tagságok invoice + autopay (T-71) + következő szerviz-appointment létrehozása; tagság-kezelő UI az ügyfélprofilon.

### T-73 [P2] Részletfizetési kalkulátor az árajánlatban 👤 B1
**Scope:** Az árajánlat alján opcionálisan részletfizetési tervet kalkulál (pl. 3×havi). Az ügyfél az ajánlat elfogadásakor választja a fizetési módot.
**Fájlok:** `components/quotes/InstallmentCalculator.tsx`, `lib/quotes/installments.ts`
**Elfogadás:** árajánlat végösszegéből 2/3/6/12 havi kalkuláció (kamat nélkül, vagy configurable %); a T-75 ügyfélportálon megjelenik; elfogadáskor payment_plan sor az adatbázisban.

### T-74 [P2] Automatikus review kérés 👤 B2
**Scope:** Munka lezárása + számla kiállítása után X nappal automatikus SMS/email a Google/Trustpilot review-hoz. A tenant beállítja a késleltetést és a linket.
**Fájlok:** `supabase/functions/review-requests/index.ts`, `lib/notifications/templates.ts` (bővítés)
**Elfogadás:** napi cron ellenőrzi a lezárt jobokat (closed_at + review_delay nap = ma); SMS/email a T-53 küldővel; review_sent_at mentése (idempotens).

### T-75 [P2] Ügyfélportál (ajánlat-elfogadás + online fizetés + előzmény) 👤 Te+B1
**Scope:** Az ügyfél kap egy linket (signed URL), ahol megtekintheti és elfogadhatja az árajánlatot, online fizethet, és látja a korábbi munkalapjait. Auth nélküli — a link maga az azonosítás.
**Fájlok:** `app/public/portal/[token]/page.tsx`, `app/api/public/portal/{quote,payment}/route.ts`
**Elfogadás:** signed JWT tokenrel védett; quote megtekintés + accept/reject gomb; T-70 payment capture; előzmény lista; csak a saját customer adatai láthatók (RLS bypass signed tokennel, service kulcscsal).

### T-76 [P2] Batch invoicing 👤 B2
**Scope:** Több lezárt job egyszerre számlázható (hó végi batch). A könyvelő kiválaszt N jobot → 1 összesítő számla vagy N darab számla egyszerre.
**Fájlok:** `app/(app)/settings/billing-list/batch-invoice.tsx`, `app/api/jobs/batch-invoice/route.ts`
**Elfogadás:** multi-select a billing-list oldalon; batch → N idempotens számla API hívás párhuzamosan; összesítő eredmény (X sikeres, Y hibás).

### T-77 [P2] Technikus mobil PWA + offline (Dexie + /api/mobile/sync) 👤 B2
**Scope:** Dedikált `/m/` route csoport Service Worker + Dexie.js cache-sel. A szerelő offline is tud munkalapon dolgozni, aláírni, fotót feltölteni; szinkron visszatérés után.
**Fájlok:** `app/m/layout.tsx`, `app/m/jobs/[id]/worksheet/page.tsx`, `app/api/mobile/sync/route.ts`, `lib/dexie/schema.ts`
**Elfogadás:** `/m/` route offline-first (SW cache); worksheet, signature, photo rögzítése Dexie-be; online visszatérésnél `/api/mobile/sync` feltölti; konfliktus-kezelés (server wins ha más már módosított).

### T-78 [P2] GPS live tracking (technician_locations + diszpécser élő térkép) 👤 B2
**Scope:** A szerelő mobil böngészőjéből Geolocation API-val 30 másodpercenként helyzet-frissítés. A diszpécser naptár Mapbox nézeten látja az élő pozíciókat.
**Fájlok:** `supabase/migrations/0032_technician_locations.sql`, `app/api/mobile/location/route.ts`, `components/calendar/LiveMapView.tsx`
**Elfogadás:** technician_locations tábla (technician_id, lat, lng, updated_at); Supabase Realtime subscription a diszpécser MapView-ban; 30s frissítési ciklus; privacy: technikus maga kapcsolhatja ki.

### T-79 [P2] Dunning + ügyfél-fizetési emlékeztető 👤 B2
**Scope:** Kiállított, nem fizetett számlák esetén automatikus emlékeztetők (3/7/14 nap). Konfigurálható ütemezés és csatorna (SMS/email).
**Fájlok:** `supabase/functions/dunning/index.ts`, `app/(app)/settings/notifications/page.tsx` (bővítés)
**Elfogadás:** napi cron; issued_at + X nap = ma AND fizetve = false → emlékeztető küldés; max N darab/számla; dunning_sent_at + dunning_count mentése.

### T-80 [P2] Smart dispatch aktiválás (VROOM/OSRM host) 👤 B1+B2
**Scope:** T-24 (VROOM/OSRM) valódi aktiválása production infra-val. Fly.io/Railway EU konténerek, CI/CD pipeline, health check. A T-25 SmartSlotPicker is ekkor lesz teljes.
**Fájlok:** `infra/osrm/Dockerfile`, `infra/vroom/Dockerfile`, `infra/fly.toml`, `.github/workflows/dispatch-deploy.yml`
**Elfogadás:** OSRM + VROOM EU konténereken fut; `/api/dispatch/suggest` valódi adatot ad; SmartSlotPicker a slot-motortól kapja a javaslatokat; fallback H3-becslésre ha a motor nem elérhető.

---

## Függőségi térkép (kritikus út)

```
T-01→02→03→04→05→06   (alap + auth + billing)  ✅
   ├ 07 entitlement · 08 stripe · 09 portal+csapat  ✅
   └ T-10 CRM → 11 equipment → 12 intake → 13 profil ⭐  ✅
        ├ 20 services · 21 zones  ✅
        ├ 22 jobs → 23 appointments → 24 dispatch ⭐ [P2] → 25 foglaló-smart [⚠️] · 26 foglaló-manual ✅
        │      └ 27 job-detail Excel-fül shell ⭐ ✅
        ├ 30 munkalap → 31 connector/Billingo → 32 számla → 33 NAV webhook  ✅
        │            34 ajánlat ✅ · 35 PDF [⚠️] · 36 anyag ✅
        ├ 40 naptár ✅ → 41 hó/térkép ❌
        ├ 42 szerelő-web ✅ → 43 aláírás+fotó ✅ → 44 idő ✅ · 45 ellenőrzőlista ✅
        ├ 50 app store ✅ → 51 UI ✅ · 52 naptár-sync ❌ · 53 értesítés [⚠️] · 54 értesítés-beállítás ✅
        └ 60 ajánlatkérő ✅ → 61 konverzió ✅ · 62 dashboard ✅ · 63 export ✅ · 64 cron ❌ → 65 audit+e2e ❌

Phase 2 (T-65 után):
  T-70 payment → 71 card-on-file → 72 tagság + 73 részletfizetés + 74 review
  T-75 ügyfélportál · T-76 batch invoicing
  T-77 mobil PWA + offline → T-78 GPS tracking
  T-79 dunning cron
  T-80 smart dispatch aktiválás (T-24+T-25 befejezése)
```

## Következő 3 sprint (MVP záráshoz)

| Sprint | Fókusz | Ticketek | Becsült CC idő |
|--------|--------|----------|----------------|
| **Sprint A** | PDF letöltők + hó/térkép | T-35 UI, T-41 | ~3-4 óra |
| **Sprint B** | Cron + dunning Edge Functions | T-64 | ~4-5 óra |
| **Sprint C** | RLS audit + Playwright e2e | T-65 | ~6-8 óra |

**Pilot-ready dátum:** Sprint C után, ~15-20 CC-óra munkával.

## Frissített mérföldkövek (v3.0)

| Mérföldkő | Státusz | Mikor |
|-----------|---------|-------|
| **M1: Auth + CRM** | ✅ KÉSZ | — |
| **M2: Jobs + Foglalás (manual)** | ✅ KÉSZ | — |
| **M3: Munkalap + Számla + PDF** | ✅ KÉSZ (PDF gomb ⚠️) | Sprint A |
| **M4: Naptár + Szerelő-web** | ✅ KÉSZ (hó/térkép ⚠️) | Sprint A |
| **M5: App Store + Értesítés** | 80% (Google Cal ❌, cron ❌) | Sprint B |
| **M6: Dashboard + Export** | ✅ KÉSZ | — |
| **M7: Cron + Dunning** | ❌ HIÁNYZIK | Sprint B |
| **M8: Audit + Pilot** | ❌ HIÁNYZIK | Sprint C |
| **M9: Phase 2 — Fizetés + Tagság** | — | Post-pilot |
| **M10: Phase 2 — Mobil PWA + GPS** | — | Post-pilot |
| **M11: Phase 2 — Smart Dispatch** | — | Post-pilot |

## Nyitott döntések (frissítve 2026-06-28)

1. **Árazás** (tier + HUF + éves kedvezmény) — üzleti döntés; a séma flat-tier + szerelő-limit. Javasolt: Trial 14 nap, Alap 9.900 Ft/hó (3 szerelő), Pro 24.900 Ft/hó (10 szerelő), Business 59.900 Ft/hó (korlátlan).
2. **Trial:** 14 nap, kártya nélkül — alacsonyabb súrlódás. Felülvizsgálható.
3. **Billingo vs Számlázz.hu** elsőként — Billingo (tisztább API, implementálva). Számlázz.hu connector Phase 2 cherry-pick.
4. **Utazási idő:** OSRM Table (pontos) vs. H3-becslés (fallback) — OSRM az alap, H3 a tartalék. Phase 2 (T-80).
5. **Dispatch-host:** VROOM/OSRM külön konténer-hoston (Fly.io/Railway/VPS, EU). MVP-ben manual-first.
6. **Google Calendar connector prioritása:** T-52 az MVP-en belül szállítható (CalendarProvider kész), de nem blokkoló — pilotok nélküle is tudnak dolgozni. Javasolt: Sprint B-vel párhuzamosan.
7. **Phase 2 sorrend:** Fizetés (T-70→71→72) > Ügyfélportál (T-75) > Mobil PWA (T-77) > GPS (T-78) > Smart dispatch (T-80). Az autopay + tagság a legmagasabb LTV növelő.

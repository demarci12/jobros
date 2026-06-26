# Jobro HVAC FSM

Magyar HVAC / klíma / gáz field service SaaS. Multi-tenant. Lokalizált, NAV-álló.
**A KÖZPONTI EGYSÉG A CRM** — a folyamat telefon-vezérelt: hívás → CRM-azonosítás →
foglalás az ügyfélprofilból. A moat: smart dispatch + beépített fizetés + recurring
tagság. **Compose-OSS elv:** bevált open-source elemekre + Cal.com-szerű app store
connector-architektúrára építünk; natív kód csak a moat-on. Részletek: `docs/market-analysis.md`.

## Tervdokumentumok — MINDIG ezek a forrás
- `docs/rendszerterv.md` — adatmodell, DB séma (SQL), RLS, API, integrációk
- `docs/build-plan.md` — ticketek (T-xx), sorrend, függőség, elfogadási kritérium
- `docs/ux-spec.md` — képernyőnként megjelenítendő adatok és prioritás
- `docs/market-analysis.md` — stratégia / moat (csak kontextus, nem implementáció)

Új feladat előtt olvasd be a vonatkozó ticketet a build-plan-ből és a hozzá tartozó
rendszerterv-szakaszt. UI ticketnél az ux-spec megfelelő képernyőjét is.

## Stack
Next.js 14 (App Router) · TypeScript · Supabase (Postgres + Auth + Realtime +
Storage, EU régió) · shadcn/ui · Tailwind · zod (validáció) · Dexie.js (offline mobil)
· @dnd-kit (naptár) · Mapbox (térkép)
· DEPLOY: Vercel (Next.js, EU) + Supabase (EU). Web-first MVP — NINCS mobil app/offline/GPS (Phase 2). A szerelő a reszponzív weben dolgozik.
· A VROOM/OSRM NEM fut Vercelen → külön konténer-host; a foglalás manual-first, a smart dispatch fast-follow.
· Auth: Supabase Auth (Google + Apple + email)
· Booking: natív, a slot-motor VROOM + OSRM-re épül (self-host, BSD) · Cal.diy (MIT) opcionális kód-forrás

## Parancsok
- Dev szerver: `npm run dev`
- Migráció push: `supabase db push`
- Unit teszt: `npm test`
- E2E teszt: `npm run e2e`
- Lint + típus: `npm run check`

## Projekt-felépítés
- `app/(app)/` — védett admin/diszpécser felület (RSC + Server Actions)
- `app/m/` — technikus mobil PWA (külön layout, offline-first)
- `app/public/` — auth nélküli oldalak (ajánlatkérő, aláírás)
- `app/api/` — Route Handlerek (mobil sync, webhookok, PDF)
- `lib/supabase/` — client (anon) / server (RSC) / service (CSAK szerver) kliensek
- `lib/validators/` — megosztott zod sémák
- `lib/jobs/status-machine.ts` — státusz-átmenet logika
- `supabase/migrations/` — sorszámozott SQL migrációk

## Vasszabályok
- Minden táblán RLS. A tenant izoláció (`company_id`) sosem sérülhet.
- A `service_role` kulcs CSAK szerver oldalon (`lib/supabase/service.ts`).
  Sosem importálható kliens komponensből, sosem kerül a bundle-be.
- KÉT fizetési sík, NE keverd: (1) SaaS-előfizetés — a tenant fizet NEKÜNK (Stripe Billing + NAV-számla magunkról, Függelék F); (2) in-app — a tenant ügyfele fizet a tenantnak (app store connector, Függelék D).
- Plan-gating: minden korlátozott művelet előtt `checkEntitlement(companyId, key)` (szerelő-limit, funkció-gate, past_due→read-only).
- MINDEN külső integráció connector az app store-on át (Függelék D): számlázás, naptár, fizetés, üzenet. Per-tenant telepítés (installed_apps).
- Integrációs titkok a Supabase Vaultban — az installed_apps csak secret_ref-et tárol, sosem plain kulcsot.
- Connector feloldás MINDIG a registryn át (`resolveConnector(companyId, category)`), nem közvetlen import.
- LICENC: a core termékbe CSAK MIT/BSD OSS-kód olvasztható. AGPL (Documenso, Twenty) csak különálló, hálózaton hívott service-ként — sosem a kódba olvasztva.
- Dispatch: VROOM (VRP) + OSRM (utazási mátrix) self-hostolva; H3/zóna csak előszűrés.
- Minden mutáció zod-dal validál a határon.
- Státusz-váltás MINDIG a `lib/jobs/status-machine.ts`-en át (tiltott átmenet hibát ad).
- Számla kiállítás idempotens (idempotency_key) — kétszeri hívás 1 számla.
- A CRM a központ: a foglalás az ügyfélprofilból indul.
- A munkalap, árajánlat és számla UI KIZÁRÓLAG a job-detail Excel-fül-szerű lapozóján él (Áttekintés/Munkalap/Árajánlat/Számla) — NINCS önálló felső menüpontjuk. A számla-lista csak könyvelői olvasó+export nézet.
- Az ütemezés az `appointments` entitáson él, NEM a jobs.scheduled mezőkön (több időpont/job).
- Teljes CRUD MINDEN entitáson és oldalon (add/edit/töröl): közös ConfirmDelete + UndoToast + EntityRowActions komponensekkel. Törlés = soft delete + megerősítés + undo; számla nem törölhető.
- Minden funkcióhoz tartozik beállítás (settings hub: account, company, team, services, zones, booking, notifications, integrations, subscription, billing-list). Az előfizetés a beállításokban lemondható.
- Szuper reszponzív: minden képernyő first-class mobil/tablet/desktopon; kis kijelzőn táblázat→kártya, nav összecsukódik. A frontend-design skill irányelvei szerint.
- A foglalás Google Calendar-szerű és maximálisan auto-fillel: ügyfél+cím a profilból előtöltve, sáv-hossz a szolgáltatásból, javasolt szabad sáv + zóna-szerelő. Minél kevesebb kézi mező.
- A foglalásnak KÉT módja van tenant-szinten (`companies.booking_mode`): `smart` (felajánlós, VROOM/OSRM javaslat) és `manual` (Google Calendar-szerű, kézi sáv+szerelő). A foglaló a booking_mode szerint rendereli a SmartSlotPicker vagy ManualSlotPicker komponenst. Mindkettő ütközést ellenőriz és appointmentet hoz létre.
- Smart módban a foglalás maximálisan egyszerű: szolgáltatás → nap → javasolt sáv (a H3/zóna/buffer rejtve).
- Magyar szakzsargon a UI-on: munkalap, árajánlat, felmérés, kiszállás. Ne fordított angol.
- Egy ticket = egy git branch (`T-xx-rovid-nev`) = egy PR.
- Migráció sosem szerkeszt meglévő, már push-olt fájlt — mindig új sorszám.

## Definition of Done (minden ticket)
Kód + típusok zöld + az adott ticket elfogadási kritériuma teljesül + nincs RLS-lyuk
(a tenant izoláció áll) + a releváns teszt zöld.

---
name: project-rls-baseline
description: T-01–T-03 audit eredménye — Supabase kliens architektúra, enum séma, alaptáblák biztonsági állapota
metadata:
  type: project
---

T-01 inicializálás auditálva: 2026-06-26.

**Megfigyelt minták:**
- `lib/supabase/client.ts` — `createBrowserClient` csak `NEXT_PUBLIC_` env-eket használ. Rendben.
- `lib/supabase/server.ts` — `createServerClient` + `@supabase/ssr` cookie kezelés, try/catch a Server Component-ből való írási kísérletnél. Rendben, de `cookies()` Next.js 14-ben szinkron (v15-ben async lesz — figyelmeztetés).
- `lib/supabase/service.ts` — `SUPABASE_SERVICE_ROLE_KEY` (nem NEXT_PUBLIC_), van `typeof window !== "undefined"` guard, `persistSession: false`. Rendben.
- Kliens komponens (`'use client'`) még nincs a projektben — nincs service.ts import kliensoldalon.
- `next.config.mjs` üres — nincs `serverExternalPackages` konfig a service.ts futásidejű bundle izolációjához.

**Hiányzó védelem (FIGYELEM):**
- A `typeof window` guard runtime ellenőrzés, nem build-time. Next.js nem akadályozza meg statikusan, hogy `service.ts`-t kliens bundle-be szerkessze valaki. Javasolt: `server-only` npm csomag importálása `service.ts`-ben.
- Nincs middleware.ts (auth gate) — a `/app/(app)/` útvonalak még nem védettek.

**T-02 audit (2026-06-26): 0001_extensions_enums.sql**
- Mind a 9 enum (company_role, job_status, job_activity, equipment_kind, appointment_kind, appointment_status, subscription_status, app_category, document_kind) egyezik a rendszerterv 8.3-mal. Byte-szintű egyezés, ékezet OK.
- `if not exists` mindkét extensionnél — idempotens. Rendben.
- Extension schema nincs megadva → `public` schemába kerül (Supabase alapértelmezés). FIGYELEM: pgcrypto és PostGIS funkciói PostgREST-en át az `anon` szerepkörnek is látszanak. Supabase managed platformon elfogadható, de T-03-ban érdemes megfontolni az `extensions` schema explicit megadását.
- RLS, policy, trigger még nincs — ezek T-03/T-04 feladata.

**T-03 audit (2026-06-26): 0002_core.sql**
- `companies`, `profiles`, `company_users`, `invitations` — séma 100%-ban egyezik rendszerterv 8.3-mal.
- `booking_mode` CHECK constraint rendben (rendszerterv nem tiltja, logikailag szükséges).
- `set_updated_at()` trigger: BEFORE UPDATE, FOR EACH ROW, bekötve companies és profiles-ra. Rendben.
- KRITIKUS VÁRAKOZÓ KOCKÁZAT: nincs `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` — minden adat szabad olvasható/írható Supabase anon kulccsal. T-04 blokkolja az éles deploymentet.
- `set_updated_at()` függvény nem tartalmaz `SET search_path = ''` védelmet — T-04-ben pótolni kell.
- `invitations.token` generálás nincs DB-szinten — alkalmazáslogikára bízva. Ha rövid/gyenge token kerül be, brute-force veszélyes. T-04/T-05-ban validálni kell, hogy `gen_random_bytes(32)` vagy JWT alapú token van-e.

**T-04 audit (2026-06-26): 0003_rls_core.sql**
- `auth_company_ids()` és `has_role()`: SECURITY DEFINER + STABLE + SET search_path = '' + public. prefix minden tábla ref-nél. Rendben.
- `service.ts` tartalmaz `import "server-only"` guard-ot (T-03 FIGYELEM javítva).
- KRITIKUS: `company_users_insert` policy nem korlátozza az beillesztendő `role` értékét. Dispatcher `role='owner'` sorokat illeszthet be harmadik felhasználók számára. Javasolt fix: `and (role != 'owner' or has_role(..., array['owner']))` hozzáadása a with check-hez.
- FIGYELEM: nincs last-owner deletion guard — trigger vagy Server Action szinten kell megakadályozni.
- FIGYELEM: Invitation accept flow service_role-on fut; elfogadás előtti felhasználó saját meghívóját nem látja RLS-en át — ez helyes, de dokumentálni kell az elfogadó Server Actionben.
- FIGYELEM: rendszerterv 9. szakasza nem tartalmazza a SET search_path = '' előírást — a migráció helyesen javított, de a tervet frissíteni kell.
- FORCE ROW LEVEL SECURITY hiányzik — Supabase kontextusban elfogadható, de érdemes konvencióként rögzíteni.

**T-08 audit (2026-06-26): Stripe Billing + webhook**

- `lib/billing/stripe.ts`: `import "server-only"` — rendben.
- `app/api/webhooks/stripe-billing/route.ts`: HMAC-validált event (`constructEvent`), service role-lal ír. A `company_id` a Stripe subscription.metadata-ból jön — ez manipulálható a HMAC-on kívül, de HMAC véd ellene. Azonban nincs ellenőrzés, hogy a `companyId` valóban létezik-e a `companies` táblában UPSERT előtt — csak `update().eq("company_id")` fut, ami csendesen üresen fut ha nincs ilyen sor. Ez nem RLS-veszély, de inkonzisztens állapotot okozhat.
- `app/(app)/settings/subscription/actions.ts`: `getCompanyAndSub()` hitelesített user + company_users RLS alapján olvas `company_id`-t, majd service role-lal kérdezi le csak azt a céget. Tenant izoláció rendben — az RLS garantálja, hogy a company_users query csak a bejelentkezett user cégeinek company_id-jét adja vissza.
- `resolveConnector` az `installed_apps` táblát service role-lal kérdezi, `company_id` szűrővel. Az `installed_apps` tábla nincs migrációban — 0001–0004 közül egyik sem tartalmazza. RLS-t még nem kapott, mert a tábla nem létezik. T-31 előtt ezt pótolni kell.
- `subscriptions_select` policy: `has_role(company_id, ['owner'])` — csak owner olvashat, dispatcher/technician nem. Rendben.
- `invoice.payment_succeeded`: a `companyId` extraction kettős fallback (metadata vagy subscription_details.metadata) — rendben, de ha mindkettő null, csendesen kihagyja.

**Visszatérő kockázati pont a jövőben:**
- Minden új kliens komponens (`'use client'`) létrehozásakor ellenőrizni kell, hogy nem importál-e `lib/supabase/service.ts`-t.
- Minden új migrációban `company_id` szűrés + RLS engedélyezés kötelező.
- Szerepkör-hozzárendelési policy-knál mindig ellenőrizni: a WITH CHECK nemcsak a hívó jogát, hanem az beillesztendő szerepkört is korlátozza-e (dispatcher→owner escalation minta).
- Invitation accept flow: elfogadó endpoint mindig service_role-t használ, tokenvalidáció (expired, already accepted) az első lépés.

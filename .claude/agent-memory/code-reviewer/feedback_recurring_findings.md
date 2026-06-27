---
name: recurring-findings
description: Known gaps and anti-patterns found in T-01/T-01b review — check these on every subsequent PR
metadata:
  type: feedback
---

## Auth guard missing in app/(app)/ routes

As of T-01b scaffold there is NO `middleware.ts` and NO session check in `app/(app)/layout.tsx`. Every protected route is publicly accessible until middleware is added. Flag as BLOCKER on any ticket that ships protected pages before a middleware PR lands.

**Why:** T-01 only scaffolded the shell; auth middleware is a distinct pending ticket.

**How to apply:** On any PR touching `app/(app)/`, confirm either middleware.ts exists or the ticket explicitly defers auth to a later ticket (and document that deferral).

---

## DataView `hideOnMobile` — IMPLEMENTED (memory updated 2026-06-26)

`hideOnMobile` IS wired up in the current `components/common/DataView.tsx`. Both `<th>` and `<td>` apply `hidden lg:table-cell` when `col.hideOnMobile` is true. Previous note that it was unimplemented is stale.

---

## Toaster — MOVED TO ROOT LAYOUT (memory updated 2026-06-26)

`<Toaster richColors closeButton />` now lives in `app/layout.tsx`, not inside `app-shell.tsx`. Public and mobile routes will receive toast rendering correctly. Previous note that it was in AppShell is stale.

---

## DataView mounts both table and card DOM trees simultaneously

`components/common/DataView.tsx` always renders both the `hidden md:block` table and the `md:hidden` card list. The two trees are independent: `col.cell(row)` runs only in the table branch, `renderCard(row, index)` runs only in the card branch — so cell functions do NOT execute twice. However, the DOM node count is doubled and both render trees execute, which is measurable overhead for large datasets. A `useMediaQuery` guard or CSS container queries would conditionally render only the active tree.

**Why:** CSS-visibility toggle is simpler to scaffold but does not eliminate render work for the hidden tree.

**How to apply:** Flag as "javasolt" on any DataView usage with expected row counts above ~50. Not a blocker for MVP but worth tracking. Do NOT claim cell functions run twice — they are partitioned between the two branches.

---

## plans.sql seed uses ON CONFLICT DO UPDATE — prices are mutable on re-seed

`supabase/seed/plans.sql` uses `ON CONFLICT (slug) DO UPDATE SET name=..., price_monthly=..., price_yearly=...`. Re-running the seed (e.g., accidental `supabase db seed` in CI against prod) silently overwrites live pricing.

**Why:** First flagged in altitude review of T-04/T-05 files (2026-06-26).

**How to apply:** Flag as "javasolt/altitude" on any PR that modifies plans.sql. Prefer `ON CONFLICT DO NOTHING` with explicit numbered migrations for price changes.

---

## 0004_billing.sql patches a 0003 security policy — wrong file separation

`0004_billing.sql` drops and recreates `company_users_insert` (originally in `0003_rls_core.sql`). Searching `0003_rls_core.sql` for all company_users policies gives an incomplete picture; the critical role-cap constraint lives in the billing migration.

**Why:** First flagged in altitude review of T-04/T-05 files (2026-06-26).

**How to apply:** Flag on any future PR that patches a security policy in a thematically unrelated migration file. Prefer a dedicated `0003b_patch_name.sql` naming convention for security fixes.

---

## NavLink / MobileNavLink active-state predicate is duplicated verbatim

`sidebar.tsx:67` and `mobile-nav.tsx:58` both define `pathname === item.href || pathname.startsWith(item.href + "/")`. Should be extracted to a shared `isNavActive(pathname, href)` utility in `lib/utils.ts` or a dedicated nav helper.

**Why:** When the active logic changes (e.g., exact-match toggle, search-param stripping) it must be updated in two places.

**How to apply:** Flag as "javasolt" on any PR that modifies nav active state logic in either file without updating the other.

---

## Supabase client env vars — RESOLVED via env.ts (memory updated 2026-06-26)

`lib/supabase/env.ts` now exports `SUPABASE_URL()`, `SUPABASE_ANON_KEY()`, `SUPABASE_SERVICE_ROLE_KEY()` as functions that call a `required()` guard throwing a clear error on missing values. All three callers (`client.ts`, `server.ts`, `service.ts`) correctly invoke them with `()`. The previous `!` assertion pattern is gone. For any NEW env var added, verify it follows the same `required()` pattern in env.ts rather than using `process.env.FOO!`.

---

## 0004_billing.sql dispatcher role-cap accidentally blocks 'accountant' role

`0004_billing.sql:20` patches `company_users_insert` with `role in ('technician', 'dispatcher')` for the dispatcher branch. The `company_role` enum (defined in `0001_extensions_enums.sql`) also contains `'accountant'`. The cap was intended only to prevent dispatcher from granting `'owner'` — but the positive allowlist silently blocks a dispatcher from inviting an accountant too. Correct check is `role <> 'owner'` (negative cap).

**Why:** First found in cross-file trace review 2026-06-26. T-04 audit patch comment says "owner szerepkört kizárólag owner adhat" — the intent is narrow but the implementation over-restricts.

**How to apply:** Flag as BLOKKOLÓ. When reviewing any future RLS role-cap policy for company_users INSERT, verify the allowed list matches ALL non-owner roles in the current enum.

---

## nav-items.ts uses English "Intake" label

`components/shell/nav-items.ts:12` has `label: "Intake"`. CLAUDE.md vasszabály: "Magyar szakzsargon a UI-on — Ne fordított angol." Both `sidebar.tsx` and `mobile-nav.tsx` render this label.

**Why:** First found in cross-file nav review 2026-06-26.

**How to apply:** Flag as BLOKKOLÓ on any PR that ships nav-items.ts with English labels.

---

## signInWithOtp NE Server Actionből hívd — PKCE cookie elvész

`lib/auth.ts`-ben `signInWithOtp` Server Actionből lett meghívva (`"use server"`). A `@supabase/ssr` PKCE `code_verifier` cookie-t generál, de Next.js 14 SA response pipeline nem garantáltan juttatja el a böngészőhöz. Callback-nél a verifier hiányzik → `exchangeCodeForSession` hibát dob. Magic link OTP-t mindig a **browser kliens** (`createClient()` from `lib/supabase/client`) hívjon közvetlenül a Client Componentből.

**Why:** Első megtalálva auth+settings PR review-ban 2026-06-26.

**How to apply:** Flag as BLOKKOLÓ ha `supabase.auth.signInWithOtp` vagy `supabase.auth.signInWithOAuth` Server Actionből van meghívva.

---

## `/accept-invite` MINDIG szerepeljen a middleware PUBLIC_PATHS-ban

`middleware.ts` `PUBLIC_PATHS` tömbéből hiányzott `/accept-invite`. Bejelentkezetlen meghívott user nem tudja elérni a meghívó oldalt.

**Why:** Első megtalálva 2026-06-26 auth review-ban.

**How to apply:** Flag as BLOKKOLÓ ha új publikus route (accept-invite, email-verify, password-reset, stb.) kerül `app/(auth)/`-ba anélkül, hogy a middleware `isPublic()` függvénye lefedi.

---

## auth/callback: `page.tsx` MINDIG explicit `exchangeCodeForSession` + `setSession` — NE `onAuthStateChange`-t várj

`@supabase/ssr` v0.5+ `createBrowserClient` alapértelmezetten PKCE módban fut. PKCE módban a kliens **szilentül figyelmen kívül hagyja** a `#access_token` hash fragmenteket. Adminisztrátor által generált linkek és varázs-linkek implicit flow-t használnak (hash token) → `getSession()` null-t ad, `onAuthStateChange` soha nem tüzel.

**Helyes pattern (app/auth/callback/page.tsx):**
1. `?code=` query param → `supabase.auth.exchangeCodeForSession(code)` (PKCE)
2. `#access_token=` hash fragment → `supabase.auth.setSession({ access_token, refresh_token })` (implicit/admin)
3. Egyéb → `supabase.auth.getSession()` (már meglévő session, OTP upstream)
4. Minden ágban sikeres session után: `upsertProfileAndRedirect(session.user.id, safeNext)` szerver action hívása — nincs DB trigger `auth.users`-ra.

**Why:** PKCE és implicit flow eltérő mechanizmussal szállítja a tokent. A `@supabase/ssr` kliens nem konvertálja automatikusan. Ráadásul nincs `auth.users` insert trigger a migrációkban, a profile row-t explicitly kell létrehozni.

**How to apply:** Flag as BLOKKOLÓ ha a callback oldal csak `getSession()` + `onAuthStateChange`-re épül, és nem kezeli külön a `?code=` és `#access_token` eseteket.

---

## Status machine bypass invoice route-ban

`app/api/jobs/[id]/invoice/route.ts:89` közvetlenül `service.from("jobs").update({ status: "szamlazva" })` — nem hívja az `assertTransition` függvényt a `lib/jobs/status-machine.ts`-ből. CLAUDE.md vasszabály: "Státusz-váltás MINDIG a status-machine-en át." Jelen esetben a sor előtt van `job.status !== "kesz"` ellenőrzés, tehát a `kesz → szamlazva` átmenet logikailag helyes, de a gépen való átmenetelés kötelező.

**Why:** Első megtalálva full-stack review-ban 2026-06-27.

**How to apply:** Flag as BLOKKOLÓ ha bármely route/action közvetlenül írja a `jobs.status` mezőt `assertTransition` meghívása nélkül.

---

## Job-number generálás TOCTOU race condition

`components/booking/actions.ts` job number generálása: `SELECT count ... + 1` → `INSERT job_number`. Egyidejű kérések ugyanazt a számot kapják, az INSERT unique constraint conflict-tel dob, retry logika nincs.

**Why:** Első megtalálva full-stack review-ban 2026-06-27.

**How to apply:** Flag as HIGH. Helyes minta: DB-szintű sequence vagy `FOR UPDATE` lock, esetleg `year_seq` counter tábla atomikus incrementtel.

---

## `createBooking` server action zod-validáció nélkül

`components/booking/actions.ts` `createBooking` függvény semmilyen zod sémát nem alkalmaz a határon. CLAUDE.md vasszabály: "Minden mutáció zod-dal validál a határon."

**Why:** Első megtalálva full-stack review-ban 2026-06-27.

**How to apply:** Flag as BLOKKOLÓ ha server action bemenete nincs zod sémán áthajtva.

---

## auth/callback `next` param figyelmen kívül marad `!company_user` esetén

`app/auth/callback/route.ts` ha a felhasználónak nincs `company_users` sora, mindig `/onboarding`-ra dob vissza — az explicit `next` paramétert elveti. Ez eltöri az accept-invite flow-t: a new user soha nem éri el `/accept-invite/[token]`-t. Ha `next` nem az alapértelmezett `/dashboard`, a `!cu` ágban is a `next` útvonalra kell irányítani.

**Why:** Első megtalálva 2026-06-26 auth review-ban.

**How to apply:** Flag as BLOKKOLÓ minden olyan callback-logikánál ahol `!company_user` ág felülírja az explicit `next` paramétert.

---

## Nyers meghívó token ne kerüljön vissza a Server Action válaszba

`settings/team/actions.ts inviteMember` `{ success: true, token }` formában adta vissza a tokent a kliensnek. A token csak emailben kell, a kliensnek nem. Bármely XSS vagy hálózatfigyelő kiolvashatja.

**Why:** Első megtalálva 2026-06-26 team actions review-ban.

**How to apply:** Flag as "javasolt/biztonsági" — a token mező maradjon ki a SA visszatérési értékéből.

---

## Read-modify-write race condition a készlet frissítésnél

`adjustStock` (settings/materials/actions.ts) és `addWorksheetLine` (lib/worksheets/actions.ts) mindkettő külön SELECT + UPDATE-tel módosítja a `materials.stock_qty`-t. Ez race condition. Helyes minta: `UPDATE materials SET stock_qty = stock_qty + $delta WHERE id = $id AND company_id = $company_id`.

**Why:** Két egyidejű munkalap-mentés ugyanarra az anyagra elveszítheti az egyik mozgást.

**How to apply:** Flag as CRITICAL ha bármely készlet-módosítás SELECT + UPDATE kétlépéses mintát követ. Mindig atomic UPDATE szükséges.

---

## `useDroppable` KÖTELEZŐ DnD Kit drop-zónákhoz — plain `<div id>` nem elegendő

`@dnd-kit/core` `onDragEnd` eseményének `over` property-je CSAK olyan elemre mutat, amelyet `useDroppable()` hook regisztrált. Plain `<div id="...">` elemek nem szerepelnek a DnD Kit droppable registry-jában — `over` mindig `null` lesz, az `onDragEnd` handler azonnal visszatér.

**Why:** `DispatchCalendar.tsx` drop-cell-ek plain `<div id={dropId}>` formában vannak megvalósítva `useDroppable` nélkül → drag-drop teljesen broken.

**How to apply:** Flag as CRITICAL ha DnD Kit drop target plain DOM elem id-vel van implementálva `useDroppable` hook nélkül.

---

## `require()` hook inside React component body

`useDraggable` (és bármely React hook) nem hívható `require()` dinamikus import belsejéből egy component function body-ban. Renderenként újra lefut, megsérti a Hooks szabályokat, és webpack/turbopack nem tudja statikusan elemezni.

**Why:** `DispatchCalendar.tsx` `DraggableAppt` komponens: `const { useDraggable } = require("@dnd-kit/core")` a component body-ban. Inkább top-level `import { useDraggable } from "@dnd-kit/core"` szükséges.

**How to apply:** Flag as HIGH ha bármely hook `require()` hívásból van destructure-ölve egy component function belsejében.

---

## `<form action={clientFn}>` nem működik React 18-ban

`<form action={fn}>` ahol `fn` kliens closure (nem server action) — a böngésző URL-ként kezeli és native POST-ot küld. React 18-ban ez csak server action függvénnyel működik. Kliens callback-hez `onSubmit` + `e.preventDefault()` szükséges.

**Why:** `materials-client.tsx` MaterialForm-ban ezzel hibázott.

**How to apply:** Flag as CRITICAL ha `<form action={...}>` kliens-oldali függvényt kap, nem server action-t.

---

## Site insert hiba eldobása `createQuickCustomer`-ben (crm/actions.ts)

Ha a site insert hibát ad, a gyors ügyfélrögzítés mégis `{ id }` értékkel tér vissza — ügyfél mentett, de telephelye nincs.

**Why:** A Supabase client hibáját nem ellenőrzik, a return statement mindig lefut.

**How to apply:** Flag as HIGH ha Server Action belső insert-eredményét nem ellenőrzik, és a függvény mégis sikert jelent.

---

## `company_users:assigned_to` join PostgREST-ben null-t adhat

Ha `jobs.assigned_to` → `auth.users(id)` (nem `company_users(id)`), a PostgREST `company_users:assigned_to (...)` szintaxis nem tud ezen az FK-n joinolni → null. Kétlépéses joinra van szükség.

**Why:** Notify route-ban technician_name mindig "Szerelőnk" lesz.

**How to apply:** Flag as HIGH ha egy join-alias a FK céltábláján kívüli táblát céloz.

---

## ConfirmDelete dialog can be dismissed via ESC/backdrop while loading

`components/common/ConfirmDelete.tsx` passes `onOpenChange` directly to `<Dialog>` without guarding against close events while `loading=true`. This means the dialog can be ESC-closed mid-operation, leaving the delete in flight with no UI feedback.

**Why:** Not addressed in T-01b scaffold.

**How to apply:** Flag on any ticket that uses ConfirmDelete with async operations and doesn't wrap `onOpenChange` to block close during loading.

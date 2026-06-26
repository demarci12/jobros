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

## ConfirmDelete dialog can be dismissed via ESC/backdrop while loading

`components/common/ConfirmDelete.tsx` passes `onOpenChange` directly to `<Dialog>` without guarding against close events while `loading=true`. This means the dialog can be ESC-closed mid-operation, leaving the delete in flight with no UI feedback.

**Why:** Not addressed in T-01b scaffold.

**How to apply:** Flag on any ticket that uses ConfirmDelete with async operations and doesn't wrap `onOpenChange` to block close during loading.

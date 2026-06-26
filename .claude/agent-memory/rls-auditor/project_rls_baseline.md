---
name: project-rls-baseline
description: T-01 audit eredménye — Supabase kliens architektúra biztonsági állapota, ismert minták és kockázatok
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
- Nincs `supabase/migrations/` könyvtár — RLS policy-k még nem léteznek.

**Visszatérő kockázati pont a jövőben:**
- Minden új kliens komponens (`'use client'`) létrehozásakor ellenőrizni kell, hogy nem importál-e `lib/supabase/service.ts`-t.
- Minden új migrációban `company_id` szűrés + RLS engedélyezés kötelező.

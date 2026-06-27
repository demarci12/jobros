#!/usr/bin/env bash
# ============================================================
# Jobro Pilot Setup Script
# Futtatás: bash scripts/pilot-setup.sh
# Szükséges: psql, vercel CLI (opcionális)
# ============================================================
set -e

echo "╔══════════════════════════════════════════╗"
echo "║       Jobro Pilot Setup                  ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. CRON_SECRET generálás ─────────────────────────────────
if [ -z "$CRON_SECRET" ]; then
  CRON_SECRET=$(openssl rand -hex 32)
  echo "✅ CRON_SECRET generálva: $CRON_SECRET"
  echo "   → Add hozzá a Vercel environment variables-hoz!"
  echo ""
else
  echo "✅ CRON_SECRET már beállítva."
fi

# ── 2. DB kapcsolat ellenőrzés ────────────────────────────────
DB_HOST="db.qnahbwwecposxaxmfsjr.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

echo "🔌 Supabase DB kapcsolat ellenőrzése..."
if [ -z "$DB_PASSWORD" ]; then
  echo "   ⚠️  DB_PASSWORD env változó nincs beállítva."
  echo "   Állítsd be: export DB_PASSWORD='<Supabase DB jelszó>'"
  echo "   majd futtasd újra: bash scripts/pilot-setup.sh"
  exit 1
fi

PGPASSFILE=$(mktemp)
printf '%s:%s:%s:%s:%s\n' "$DB_HOST" "$DB_PORT" "$DB_NAME" "$DB_USER" "$DB_PASSWORD" > "$PGPASSFILE"
chmod 600 "$PGPASSFILE"

# Kapcsolat teszt
PGPASSFILE="$PGPASSFILE" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1 && \
  echo "✅ DB kapcsolat OK" || \
  { echo "❌ DB kapcsolat sikertelen. Ellenőrizd a DB_PASSWORD értékét."; rm -f "$PGPASSFILE"; exit 1; }

# ── 3. App definitions + pilot seed push ─────────────────────
echo ""
echo "📦 App definitions seed futtatása..."
PGPASSFILE="$PGPASSFILE" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -f supabase/seed/app_definitions.sql 2>/dev/null && echo "✅ App definitions kész" || echo "⚠️  app_definitions.sql nem található (normális, ha már fut)"

echo ""
echo "🌱 Pilot seed adatok betöltése (3 demo cég)..."
PGPASSFILE="$PGPASSFILE" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -f supabase/seed/pilot.sql && echo "✅ Pilot seed kész" || echo "❌ Seed hiba"

rm -f "$PGPASSFILE"

# ── 4. Checklist ─────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════"
echo "  Pilot előkészítés kész!"
echo "════════════════════════════════════════════"
echo ""
echo "Következő lépések:"
echo ""
echo "  1. Vercel env változók beállítása:"
echo "     → .env.production.example alapján a Vercel Dashboard-ban"
echo "     → CRON_SECRET: $CRON_SECRET"
echo ""
echo "  2. 3 pilot cég owner-jeinek regisztrálása:"
echo "     → https://jobro.vercel.app/register"
echo "     Cégek (a seed adatokhoz igazítva):"
echo "     - Hűtéstechnika Kft. (slug: hutestechnika)"
echo "     - KlímaCenter Zrt. (slug: klimacenter)"
echo "     - Hőpumpa Szakszerviz Bt. (slug: hopumpa-pecs)"
echo ""
echo "  3. Billingo connector beállítás minden cégnél:"
echo "     → Beállítások → Integrációk → Billingo → Telepítés → API kulcs"
echo ""
echo "  4. Tesztelés:"
echo "     → npm test           (44 unit teszt)"
echo "     → E2E_EMAIL=... E2E_PASSWORD=... npm run e2e"
echo ""
echo "  5. Cron ellenőrzés (Vercel Dashboard → Cron Jobs):"
echo "     → /api/cron/service-reminders (08:00 CET)"
echo "     → /api/cron/billing-lifecycle (07:00 CET)"
echo ""

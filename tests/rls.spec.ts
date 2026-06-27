/**
 * T-65 RLS Audit — két-tenant izoláció
 *
 * Futtatás: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TENANT_A_JWT, TENANT_B_JWT
 * env változókkal.
 *
 * TENANT_A_JWT / TENANT_B_JWT: két különböző céghez tartozó user JWT token-ek.
 * Ezeket a Supabase Dashboard > Authentication > Users > "Copy JWT" opcióval
 * vagy a `supabase.auth.signInWithPassword()` response-ából lehet kinyerni.
 *
 * Ha a env változók hiányoznak, a tesztek skip-elődnek.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const JWT_A        = process.env.TENANT_A_JWT ?? "";
const JWT_B        = process.env.TENANT_B_JWT ?? "";

const skip = !SUPABASE_URL || !SERVICE_KEY || !JWT_A || !JWT_B;

function clientAs(jwt: string) {
  return createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

const service = skip ? null : createClient(SUPABASE_URL, SERVICE_KEY);

let companyA: string;
let companyB: string;

const TENANT_TABLES = [
  "customers", "sites", "equipment",
  "jobs", "appointments",
  "worksheets", "worksheet_lines",
  "quotes", "quote_lines",
  "invoices",
  "materials",
  "job_templates", "checklist_items", "job_checklist_state",
  "booking_requests",
  "notifications",
  "services", "service_zones",
  "time_entries",
  "signatures", "attachments",
] as const;

beforeAll(async () => {
  if (skip) return;
  // Resolve company IDs for both JWT users
  const clientA = clientAs(JWT_A);
  const clientB = clientAs(JWT_B);

  const { data: cuA } = await clientA.from("company_users")
    .select("company_id").eq("is_active", true).limit(1).maybeSingle();
  const { data: cuB } = await clientB.from("company_users")
    .select("company_id").eq("is_active", true).limit(1).maybeSingle();

  companyA = cuA?.company_id ?? "";
  companyB = cuB?.company_id ?? "";

  expect(companyA).toBeTruthy();
  expect(companyB).toBeTruthy();
  expect(companyA).not.toBe(companyB);
});

describe.skipIf(skip)("RLS két-tenant izoláció", () => {
  for (const table of TENANT_TABLES) {
    it(`${table}: Tenant A nem látja Tenant B sorait`, async () => {
      const clientA = clientAs(JWT_A);

      // Tenant B sorai (service role-lal olvasva)
      const { data: bRows } = await service!
        .from(table as string)
        .select("id, company_id")
        .eq("company_id", companyB)
        .limit(5);

      if (!bRows || bRows.length === 0) return; // nincs adat B-nél → skip

      const bIds = bRows.map(r => r.id);

      // Tenant A JWT-vel próbálunk B sorait olvasni
      const { data: leakRows } = await clientA
        .from(table as string)
        .select("id")
        .in("id", bIds);

      expect(leakRows ?? []).toHaveLength(0);
    });

    it(`${table}: Tenant A csak a saját sorait látja`, async () => {
      const clientA = clientAs(JWT_A);

      const { data: rows } = await clientA
        .from(table as string)
        .select("id, company_id")
        .limit(20);

      for (const row of rows ?? []) {
        expect(row.company_id).toBe(companyA);
      }
    });
  }
});

describe.skipIf(skip)("Service role kulcs nem kerülhet a kliensbe", () => {
  it("NEXT_PUBLIC_* változóban nincs service_role kulcs", () => {
    const publicEnvKeys = Object.keys(process.env).filter(k => k.startsWith("NEXT_PUBLIC_"));
    for (const key of publicEnvKeys) {
      // A service role key mindig 'service_role' claim-et tartalmaz JWT-ben
      // Ellenőrzés: a publikus env változók értéke ne legyen azonos a SERVICE_KEY-jel
      expect(process.env[key]).not.toBe(SERVICE_KEY);
    }
  });

  it("NEXT_PUBLIC_SUPABASE_ANON_KEY nem egyezik a service role kulccsal", () => {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    expect(anonKey).not.toBe(SERVICE_KEY);
    expect(anonKey).toBeTruthy();
  });
});

describe("Státuszgép izolációs szabályok (unit)", () => {
  it("fizetve státuszból nincs visszalépés", async () => {
    const { assertTransition, InvalidTransitionError } = await import("../lib/jobs/status-machine");
    const statuses = ["uj", "felmeres", "kesz", "szamlazva"] as const;
    for (const s of statuses) {
      expect(() => assertTransition("fizetve", s as any)).toThrow(InvalidTransitionError);
    }
  });

  it("kesz → szamlazva engedélyezett (számlázás előfeltétele)", async () => {
    const { assertTransition } = await import("../lib/jobs/status-machine");
    expect(() => assertTransition("kesz", "szamlazva")).not.toThrow();
  });
});

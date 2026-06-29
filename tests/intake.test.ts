import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock server-only (prevents "cannot import from Client Component" error) ──
vi.mock("server-only", () => ({}));

// ── Mock Supabase env + billing to avoid env var requirements ────────────────
vi.mock("@/lib/supabase/env", () => ({
  supabaseUrl: "https://test.supabase.co",
  supabaseAnonKey: "test-anon-key",
  supabaseServiceKey: "test-service-key",
}));
vi.mock("@/lib/billing/entitlements", () => ({
  checkEntitlement: vi.fn().mockResolvedValue({ allowed: true, reason: null }),
}));

// ── Mock Next.js server primitives ───────────────────────────────────────────
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

// ── Mock geo helpers (so no real HTTP) ───────────────────────────────────────
vi.mock("@/lib/geo/geocode", () => ({
  geocodeAddress: vi.fn().mockResolvedValue({ lat: 47.5, lng: 19.0 }),
}));
vi.mock("@/lib/geo/h3", () => ({
  toH3: vi.fn().mockReturnValue("8928308280fffff"),
}));

// ── Supabase query builder factory ───────────────────────────────────────────
//
// Creates a chainable mock where every builder method returns `this` so we can
// chain `.from().insert().select().single()` etc. without errors.
// The terminal methods (single, then-able insert/update/delete) return the
// configured `result` from `makeBuilder({ result })`.

function makeBuilder(result: { data?: unknown; error?: unknown; count?: number }) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;

  // Terminal async value
  const terminal = () =>
    Promise.resolve({ data: result.data ?? null, error: result.error ?? null, count: result.count ?? null });

  const methods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "lt", "gt", "like", "ilike", "or", "is",
    "order", "limit", "single",
  ];

  for (const m of methods) {
    builder[m] = vi.fn(chain);
  }

  // `.single()` must be awaitable
  (builder.single as ReturnType<typeof vi.fn>).mockImplementation(terminal);

  // `.insert()`, `.update()`, `.delete()` without `.single()` are also awaitable
  // Each returns a new sub-builder with the same result so `.select().single()` works
  for (const m of ["insert", "update", "delete"]) {
    (builder[m] as ReturnType<typeof vi.fn>).mockImplementation(() => makeBuilder(result));
  }

  // Make builder itself thenable so `await supabase.from("x").insert(...)` resolves
  builder.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: result.data ?? null, error: result.error ?? null }).then(resolve);

  return builder;
}

type Builder = ReturnType<typeof makeBuilder>;

// ── Auth context mock factory ─────────────────────────────────────────────────

function makeCtx(overrides: {
  customerResult?: { data?: unknown; error?: unknown };
  siteResult?: { data?: unknown; error?: unknown };
  jobResult?: { data?: unknown; error?: unknown };
  jobCountResult?: { count?: number };
  rpcResult?: { data?: unknown; error?: unknown };
  role?: string;
} = {}) {
  const {
    customerResult = { data: { id: "cust-uuid-1234-5678-9012" }, error: null },
    siteResult = { data: null, error: null },
    jobResult = { data: { id: "job-uuid-1234-5678-9012" }, error: null },
    jobCountResult = { count: 0 },
    rpcResult = { data: { customer_id: "cust-uuid-1234-5678-9012", site_id: "site-uuid-1234-5678-9012" }, error: null },
    role = "dispatcher",
  } = overrides;

  const fromMock = vi.fn((table: string): Builder => {
    if (table === "customers") return makeBuilder(customerResult);
    if (table === "sites") return makeBuilder(siteResult);
    if (table === "jobs") {
      const b = makeBuilder(jobResult);
      // select() with head:true → count query; without → normal builder
      (b.select as ReturnType<typeof vi.fn>).mockImplementation(
        (_col: string, opts?: { head?: boolean }) => {
          if (opts?.head) {
            // return a builder whose then resolves to { count }
            const cb = makeBuilder({ count: jobCountResult.count ?? 0, data: null });
            cb.then = (resolve: (v: unknown) => unknown) =>
              Promise.resolve({ count: jobCountResult.count ?? 0 }).then(resolve);
            return cb;
          }
          return b;
        },
      );
      return b;
    }
    return makeBuilder({});
  });

  const rpcMock = vi.fn().mockResolvedValue({ data: rpcResult.data ?? null, error: rpcResult.error ?? null });

  return {
    supabase: { from: fromMock, rpc: rpcMock },
    companyId: "company-uuid-0000-0000-0001",
    role,
    user: { id: "user-uuid-0000-0000-0001" },
  };
}

// ── Wire up the auth-context mock ─────────────────────────────────────────────

import { getAuthContext } from "@/lib/supabase/auth-context";

vi.mock("@/lib/supabase/auth-context", () => ({
  getAuthContext: vi.fn(),
}));

const mockGetAuthContext = vi.mocked(getAuthContext);

// ── Import actions under test (after mocks) ───────────────────────────────────
import { createQuickCustomer } from "@/lib/crm/actions";
import { createJob } from "@/lib/jobs/actions";

// ── Helper: build FormData from plain object ──────────────────────────────────
function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
}

// ═══════════════════════════════════════════════════════════════════════════════
// createQuickCustomer
// ═══════════════════════════════════════════════════════════════════════════════

describe("createQuickCustomer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("visszaadja a customer id-t siker esetén (customer + site létrejön)", async () => {
    mockGetAuthContext.mockResolvedValue(makeCtx() as never);

    const result = await createQuickCustomer(
      fd({ name: "Kovács Bt.", address: "Fő utca 1", city: "Budapest" }),
    );

    expect(result).toMatchObject({ id: "cust-uuid-1234-5678-9012" });
  });

  it("hibát ad vissza, ha a név hiányzik", async () => {
    mockGetAuthContext.mockResolvedValue(makeCtx() as never);

    const result = await createQuickCustomer(fd({ address: "Fő utca 1" }));

    expect(result).toMatchObject({ error: expect.stringContaining("Név") });
  });

  it("hibát ad vissza, ha a cím hiányzik", async () => {
    mockGetAuthContext.mockResolvedValue(makeCtx() as never);

    const result = await createQuickCustomer(fd({ name: "Kovács Bt." }));

    expect(result).toMatchObject({ error: expect.stringContaining("Cím") });
  });

  it("hibát ad vissza, ha nincs jogosultság (ismeretlen szerepkör)", async () => {
    mockGetAuthContext.mockResolvedValue(makeCtx({ role: "accountant" }) as never);

    const result = await createQuickCustomer(
      fd({ name: "Kovács Bt.", address: "Fő utca 1" }),
    );

    expect(result).toMatchObject({ error: "Nincs jogosultság." });
  });

  it("rollback: ha az RPC hibás, hibát ad vissza", async () => {
    const ctx = makeCtx({
      rpcResult: { data: null, error: { message: "violates foreign key" } },
    });
    mockGetAuthContext.mockResolvedValue(ctx as never);

    const result = await createQuickCustomer(
      fd({ name: "Teszt Kft.", address: "Kossuth tér 2", city: "Pécs" }),
    );

    expect(result).toMatchObject({ error: expect.any(String) });
  });

  it("ha nincs auth context, hibát ad vissza", async () => {
    mockGetAuthContext.mockResolvedValue(null as never);

    const result = await createQuickCustomer(fd({ name: "X", address: "Y" }));

    expect(result).toMatchObject({ error: "Nincs jogosultság." });
  });

  it("RPC DB hiba esetén error-t ad vissza", async () => {
    mockGetAuthContext.mockResolvedValue(
      makeCtx({ rpcResult: { data: null, error: { message: "db hiba" } } }) as never,
    );

    const result = await createQuickCustomer(
      fd({ name: "Példa Kft.", address: "Rákóczi út 3" }),
    );

    expect(result).toMatchObject({ error: "db hiba" });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// createJob
// ═══════════════════════════════════════════════════════════════════════════════

describe("createJob", () => {
  const VALID_CUSTOMER_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const VALID_SITE_ID = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("létrehozza a munkát valid customer_id + site_id esetén", async () => {
    mockGetAuthContext.mockResolvedValue(makeCtx() as never);

    const result = await createJob(
      fd({ customer_id: VALID_CUSTOMER_ID, site_id: VALID_SITE_ID }),
    );

    expect(result).toEqual({ id: "job-uuid-1234-5678-9012" });
  });

  it("hibát ad vissza, ha a customer_id nem valid UUID", async () => {
    mockGetAuthContext.mockResolvedValue(makeCtx() as never);

    const result = await createJob(
      fd({ customer_id: "nem-uuid", site_id: VALID_SITE_ID }),
    );

    expect(result).toMatchObject({ error: expect.any(String) });
  });

  it("hibát ad vissza, ha a site_id nem valid UUID", async () => {
    mockGetAuthContext.mockResolvedValue(makeCtx() as never);

    const result = await createJob(
      fd({ customer_id: VALID_CUSTOMER_ID, site_id: "rossz-id" }),
    );

    expect(result).toMatchObject({ error: expect.any(String) });
  });

  it("hibát ad vissza, ha a customer_id hiányzik", async () => {
    mockGetAuthContext.mockResolvedValue(makeCtx() as never);

    const result = await createJob(fd({ site_id: VALID_SITE_ID }));

    expect(result).toMatchObject({ error: expect.any(String) });
  });

  it("hibát ad vissza, ha a technikusnak nincs create joga", async () => {
    mockGetAuthContext.mockResolvedValue(makeCtx({ role: "technician" }) as never);

    const result = await createJob(
      fd({ customer_id: VALID_CUSTOMER_ID, site_id: VALID_SITE_ID }),
    );

    expect(result).toMatchObject({ error: "Nincs jogosultság." });
  });

  it("Supabase hiba esetén error-t ad vissza", async () => {
    mockGetAuthContext.mockResolvedValue(
      makeCtx({ jobResult: { data: null, error: { message: "db error" } } }) as never,
    );

    const result = await createJob(
      fd({ customer_id: VALID_CUSTOMER_ID, site_id: VALID_SITE_ID }),
    );

    expect(result).toMatchObject({ error: "db error" });
  });

  it("opcionális mezők (title, description) elfogadottak", async () => {
    mockGetAuthContext.mockResolvedValue(makeCtx() as never);

    const result = await createJob(
      fd({
        customer_id: VALID_CUSTOMER_ID,
        site_id: VALID_SITE_ID,
        title: "Kazán szerviz",
        description: "Éves karbantartás",
      }),
    );

    expect(result).toEqual({ id: "job-uuid-1234-5678-9012" });
  });
});

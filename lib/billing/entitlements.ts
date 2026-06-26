import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

// Feature flags a plan_definitions.features JSONB-ből
export type FeatureKey = "app_store" | "gps" | "memberships" | "dispatch_smart" | "priority_support";

// Limit kulcsok
export type LimitKey = "technicians";

export type EntitlementKey = FeatureKey | LimitKey;

export type EntitlementResult =
  | { allowed: true }
  | { allowed: false; reason: "read_only" | "feature_gate" | "limit_exceeded" | "no_subscription" };

/**
 * Ellenőrzi, hogy egy company jogosult-e az adott funkcióra / limitre.
 *
 * feature kulcsoknál: true/false a plan features jsonb-ből
 * "technicians" limitnél: count < max_technicians (null = korlátlan)
 * past_due / suspended: minden write művelet read_only-ra vált
 */
export async function checkEntitlement(
  companyId: string,
  key: EntitlementKey
): Promise<EntitlementResult> {
  const service = createServiceClient();

  const { data: sub } = await service
    .from("subscriptions")
    .select(`
      status,
      trial_ends_at,
      plan_definitions (
        max_technicians,
        features
      )
    `)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!sub) return { allowed: false, reason: "no_subscription" };

  // past_due / suspended → read-only: csak lekérdezés engedélyezett
  if (sub.status === "past_due" || sub.status === "suspended") {
    return { allowed: false, reason: "read_only" };
  }

  // trialing: ellenőrizzük, hogy nem járt-e le a trial
  if (sub.status === "trialing" && sub.trial_ends_at) {
    if (new Date(sub.trial_ends_at) < new Date()) {
      return { allowed: false, reason: "read_only" };
    }
  }

  const rawPlan = Array.isArray(sub.plan_definitions)
    ? sub.plan_definitions[0]
    : sub.plan_definitions;
  const plan = rawPlan as {
    max_technicians: number | null;
    features: Record<string, boolean> | null;
  } | null;

  if (!plan) return { allowed: false, reason: "no_subscription" };

  // Szerelő-limit ellenőrzés
  if (key === "technicians") {
    if (plan.max_technicians === null) return { allowed: true };

    // owner + dispatcher + technician mind helyet foglal (accountant nem operatív)
    const { count } = await service
      .from("company_users")
      .select("user_id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("is_active", true)
      .neq("role", "accountant");

    const current = count ?? 0;
    if (current >= plan.max_technicians) {
      return { allowed: false, reason: "limit_exceeded" };
    }
    return { allowed: true };
  }

  // Feature-gate: hiányzó kulcs = tiltott (fail-closed)
  const features = plan.features ?? {};
  if (features[key] !== true) {
    return { allowed: false, reason: "feature_gate" };
  }

  return { allowed: true };
}

/**
 * Egyszerű dobó wrapper — Server Action-ökből használható.
 * Eldobja a hibát, amit a hívó kezelhet strukturált error-ként.
 */
export async function assertEntitlement(
  companyId: string,
  key: EntitlementKey
): Promise<void> {
  const result = await checkEntitlement(companyId, key);
  if (!result.allowed) {
    const messages: Record<NonNullable<typeof result extends { allowed: false } ? typeof result["reason"] : never>, string> = {
      read_only: "Az előfizetés lejárt vagy felfüggesztett — csak olvasás engedélyezett.",
      feature_gate: "Ez a funkció nem érhető el az aktuális csomagban.",
      limit_exceeded: "Elérte a szerelők számának korlátját.",
      no_subscription: "Nincs aktív előfizetés.",
    };
    throw new Error(messages[(result as { allowed: false; reason: string }).reason as keyof typeof messages]);
  }
}

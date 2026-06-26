import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { AppCategory, Connector } from "./types";

/**
 * T-31-ben kerül implementálásra a tényleges provider-map.
 * Egyelőre stub: null-t ad vissza, ha a provider nem elérhető.
 */
export async function resolveConnector<T extends Connector>(
  companyId: string,
  category: AppCategory
): Promise<T | null> {
  const service = createServiceClient();

  const { data } = await service
    .from("installed_apps")
    .select(`
      app_slug,
      config,
      secret_ref,
      is_enabled,
      app_definitions ( category )
    `)
    .eq("company_id", companyId)
    .eq("is_enabled", true)
    .maybeSingle();

  if (!data) return null;

  // T-31 implementálja a slug → provider mapping-et
  return null;
}

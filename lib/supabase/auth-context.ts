import "server-only";
import { cache } from "react";
import { createClient } from "./server";

/**
 * Per-request cached auth context. React cache() deduplicates calls within
 * a single RSC render tree, so multiple pages/actions calling this won't
 * issue duplicate Supabase round-trips.
 */
export const getAuthContext = cache(async () => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: cu } = await supabase
    .from("company_users")
    .select("company_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!cu) return null;

  return { supabase, user, companyId: cu.company_id as string, role: cu.role as string };
});

import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient } from "./server";

// Cache the company_users lookup per userId for 5 minutes.
// This is safe: role changes are rare and handled via revalidateTag("company-user:<id>").
const getCachedCompanyUser = (userId: string) =>
  unstable_cache(
    async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("company_users")
        .select("company_id, role")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
    [`company-user-${userId}`],
    { revalidate: 300, tags: [`company-user-${userId}`] }
  )();

/**
 * Per-request cached auth context. Uses getUser() for JWT validation against
 * the Supabase Auth server (required — getSession() is not safe in RSC).
 * The company_users row is cached 5 min via unstable_cache.
 */
export const getAuthContext = cache(async () => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const cu = await getCachedCompanyUser(user.id);
  if (!cu) return null;

  return { supabase, user, companyId: cu.company_id as string, role: cu.role as string };
});

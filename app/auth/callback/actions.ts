"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export async function upsertProfileAndRedirect(userId: string, rawNext: string): Promise<string> {
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Server session may not be set yet right after client-side exchange — fall back to service client
  const service = createServiceClient();

  const meta: Record<string, unknown> = user?.user_metadata ?? {};

  await service.from("profiles").upsert(
    {
      id: userId,
      full_name: (meta.full_name ?? meta.name ?? null) as string | null,
      phone: (meta.phone ?? null) as string | null,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  const { data: cu } = await service
    .from("company_users")
    .select("company_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!cu) {
    return next !== "/dashboard" ? next : "/onboarding";
  }

  return next;
}

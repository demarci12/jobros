import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const { access_token, refresh_token, next } = await request.json();

  if (!access_token || !refresh_token) {
    return NextResponse.json({ redirect: "/login?error=no_token" });
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });

  if (error || !data.user) {
    return NextResponse.json({ redirect: "/login?error=session" });
  }

  const service = createServiceClient();

  await service.from("profiles").upsert(
    {
      id: data.user.id,
      full_name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? null,
      phone: data.user.user_metadata?.phone ?? null,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  const { data: cu } = await service
    .from("company_users")
    .select("company_id")
    .eq("user_id", data.user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const safeNext = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const dest = !cu ? (safeNext !== "/dashboard" ? safeNext : "/onboarding") : safeNext;

  return NextResponse.json({ redirect: dest });
}

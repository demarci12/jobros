import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  // Only allow same-origin relative paths — reject protocol-relative or absolute URLs
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const service = createServiceClient();

  await service.from("profiles").upsert(
    {
      id: data.user.id,
      full_name:
        data.user.user_metadata?.full_name ??
        data.user.user_metadata?.name ??
        null,
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

  if (!cu) {
    // Preserve next param — accept-invite sets it so the invite flow completes after login
    const dest = next !== "/dashboard" ? next : "/onboarding";
    return NextResponse.redirect(`${origin}${dest}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

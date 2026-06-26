import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function finishLogin(request: Request, userId: string) {
  const { searchParams, origin } = new URL(request.url);
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const service = createServiceClient();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?error=session`);

  await service.from("profiles").upsert(
    {
      id: user.id,
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      phone: user.user_metadata?.phone ?? null,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  const { data: cu } = await service
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const dest = !cu ? (next !== "/dashboard" ? next : "/onboarding") : next;
  return NextResponse.redirect(`${origin}${dest}`);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "email" | "recovery" | "invite" | null;

  const supabase = createClient();

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) return NextResponse.redirect(`${origin}/login?error=auth`);
    return finishLogin(request, data.user.id);
  }

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error || !data.user) return NextResponse.redirect(`${origin}/login?error=auth`);
    return finishLogin(request, data.user.id);
  }

  // No server-visible params — the tokens are in the URL fragment (#access_token=...).
  // Return a tiny client-side page that reads the fragment and exchanges the session.
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Belépés…</title></head><body>
<script>
(async () => {
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) {
    window.location.href = '/login?error=no_token';
    return;
  }
  // Store session via Supabase JS so the SSR cookie is set on next navigation
  const { createClient } = await import('/node_modules/@supabase/supabase-js/dist/module/index.js').catch(() => null) || {};
  // Use fetch to exchange tokens server-side
  const next = new URLSearchParams(window.location.search).get('next') || '/dashboard';
  const res = await fetch('/auth/callback/set-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken, next }),
    credentials: 'include',
  });
  const json = await res.json().catch(() => ({}));
  window.location.href = json.redirect || '/login?error=session';
})();
</script>
<p style="font-family:sans-serif;padding:2rem">Belépés folyamatban…</p>
</body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

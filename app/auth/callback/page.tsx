"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { upsertProfileAndRedirect } from "./actions";

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const next = searchParams.get("next") ?? "/dashboard";
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

    async function handleCallback() {
      // 1. PKCE flow: Supabase appends ?code= to the callback URL.
      //    @supabase/ssr PKCE mode does NOT auto-exchange — must call explicitly.
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { data, error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exchErr) { setError(exchErr.message); return; }
        if (data.session) {
          const dest = await upsertProfileAndRedirect(data.session.user.id, safeNext);
          window.location.replace(dest);
        }
        return;
      }

      // 2. Implicit / admin-generated link flow: token arrives as #access_token= fragment.
      //    PKCE-mode createBrowserClient silently ignores hash fragments, so we parse manually.
      const hash = window.location.hash.slice(1);
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        const { data, error: sessErr } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessErr) { setError(sessErr.message); return; }
        if (data.session) {
          const dest = await upsertProfileAndRedirect(data.session.user.id, safeNext);
          window.location.replace(dest);
        }
        return;
      }

      // 3. OTP / email-link already verified upstream — session cookie may already exist.
      const { data: { session }, error: getErr } = await supabase.auth.getSession();
      if (getErr) { setError(getErr.message); return; }
      if (session) {
        const dest = await upsertProfileAndRedirect(session.user.id, safeNext);
        window.location.replace(dest);
        return;
      }

      setError("Nincs érvényes belépési token. Kérjük próbáld újra.");
    }

    handleCallback();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div>
          <p className="font-medium text-destructive">{error}</p>
          <a href="/login" className="mt-3 inline-block text-sm underline">
            Vissza a belépéshez
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">Belépés folyamatban…</p>
    </div>
  );
}

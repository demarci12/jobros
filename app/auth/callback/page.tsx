"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { upsertProfileAndRedirect } from "./actions";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createClient();

    // onAuthStateChange fires for PKCE (?code=), fragment (#access_token=), and OTP flows
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const next = searchParams.get("next") ?? "/dashboard";
        const dest = await upsertProfileAndRedirect(session.user.id, next);
        router.replace(dest);
      }
    });

    // Also check if already signed in (e.g. page reload)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const next = searchParams.get("next") ?? "/dashboard";
        upsertProfileAndRedirect(session.user.id, next).then(dest => router.replace(dest));
      }
    });

    return () => subscription.unsubscribe();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">Belépés folyamatban…</p>
    </div>
  );
}

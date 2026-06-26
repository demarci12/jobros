"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { signInWithMagicLink } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  async function handleOAuth(provider: "google" | "apple") {
    setOauthLoading(provider);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${siteUrl}/auth/callback` },
    });
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("email", email);
    const result = await signInWithMagicLink(fd);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
    } else {
      setSent(true);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Ingyenes regisztráció</CardTitle>
        <CardDescription>14 napos próbaidőszak, kártyaszám nélkül</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sent ? (
          <div className="text-center space-y-2 py-4">
            <p className="font-medium">Ellenőrizze az e-mail fiókját!</p>
            <p className="text-sm text-muted-foreground">
              Regisztrációs linket küldtünk a(z) <strong>{email}</strong> címre.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleOAuth("google")}
                disabled={!!oauthLoading}
              >
                {oauthLoading === "google" ? "Átirányítás…" : "Regisztráció Google-lel"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleOAuth("apple")}
                disabled={!!oauthLoading}
              >
                {oauthLoading === "apple" ? "Átirányítás…" : "Regisztráció Apple-lel"}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">vagy</span>
              <Separator className="flex-1" />
            </div>

            <form onSubmit={handleMagicLink} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email">Munkahelyi e-mail cím</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nev@ceg.hu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Küldés…" : "Regisztrációs link küldése"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Már van fiókja?{" "}
              <Link href="/login" className="underline underline-offset-4">
                Belépés
              </Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

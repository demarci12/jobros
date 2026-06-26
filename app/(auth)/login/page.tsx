"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Step = "email" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);

  async function handleOAuth(provider: "google" | "apple") {
    setOauthLoading(provider);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${siteUrl}/auth/callback` },
    });
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setStep("otp");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.replace("/dashboard");
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Jobro</CardTitle>
        <CardDescription>
          {step === "email" ? "Lépjen be a fiókjába" : `Kód elküldve: ${email}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === "email" ? (
          <>
            <div className="space-y-2">
              <Button variant="outline" className="w-full" onClick={() => handleOAuth("google")} disabled={!!oauthLoading}>
                {oauthLoading === "google" ? "Átirányítás…" : "Folytatás Google-lel"}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => handleOAuth("apple")} disabled={!!oauthLoading}>
                {oauthLoading === "apple" ? "Átirányítás…" : "Folytatás Apple-lel"}
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">vagy</span>
              <Separator className="flex-1" />
            </div>
            <form onSubmit={handleSendOtp} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email">E-mail cím</Label>
                <Input id="email" type="email" placeholder="nev@ceg.hu" value={email}
                  onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Küldés…" : "Kód küldése e-mailre"}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              Még nincs fiókja?{" "}
              <Link href="/register" className="underline underline-offset-4">Regisztráció</Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="otp">6 jegyű kód</Label>
              <Input id="otp" type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
                placeholder="123456" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} required autoFocus />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || otp.length < 6}>
              {loading ? "Ellenőrzés…" : "Belépés"}
            </Button>
            <Button type="button" variant="ghost" className="w-full text-sm" onClick={() => { setStep("email"); setError(null); setOtp(""); }}>
              ← Más e-mail cím
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

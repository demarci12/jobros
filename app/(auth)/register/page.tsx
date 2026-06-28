"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
  }

  if (done) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Ellenőrizze e-mailjét</CardTitle>
          <CardDescription>
            Megerősítő linket küldtünk a <strong>{email}</strong> címre.
            Kattintson rá a fiók aktiválásához.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            Már van fiókja?{" "}
            <Link href="/login" className="underline underline-offset-4">Belépés</Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Ingyenes regisztráció</CardTitle>
        <CardDescription>14 napos próbaidőszak, kártyaszám nélkül</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Munkahelyi e-mail cím</Label>
            <Input id="email" type="email" placeholder="nev@ceg.hu" value={email}
              onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Jelszó</Label>
            <Input id="password" type="password" placeholder="legalább 6 karakter" value={password}
              onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Regisztráció…" : "Fiók létrehozása"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Már van fiókja?{" "}
          <Link href="/login" className="underline underline-offset-4">Belépés</Link>
        </p>
      </CardContent>
    </Card>
  );
}

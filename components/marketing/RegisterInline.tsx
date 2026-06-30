"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";

export function RegisterInline() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("A jelszó legalább 8 karakter legyen.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-xl border bg-background p-8 text-center space-y-3">
        <CheckCircle2 size={40} className="text-green-500 mx-auto" />
        <h3 className="font-semibold text-lg">Ellenőrizze e-mailjét</h3>
        <p className="text-sm text-muted-foreground">
          Megerősítő linket küldtünk a(z) <strong>{email}</strong> címre.
          Kattintson rá a fiók aktiválásához.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-background p-6 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="reg-email">E-mail cím</Label>
        <Input
          id="reg-email"
          type="email"
          placeholder="nev@ceg.hu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-password">Jelszó</Label>
        <Input
          id="reg-password"
          type="password"
          placeholder="legalább 8 karakter"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Regisztráció..." : "Ingyenes próba indítása →"}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        14 nap ingyenes &middot; Kártya nem szükséges &middot; Bármikor lemondható
      </p>
    </form>
  );
}

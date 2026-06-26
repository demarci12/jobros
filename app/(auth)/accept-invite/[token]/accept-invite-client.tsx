"use client";

import { useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function AcceptInviteClient({ token, email, companyName }: {
  token: string;
  email: string;
  companyName: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [sent, setSent] = useState(false);

  function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=/accept-invite/${token}` },
      });
      if (error) toast.error(error.message);
      else setSent(true);
    });
  }

  function handlePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = fd.get("password") as string;
    startTransition(async () => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=/accept-invite/${token}` },
      });
      if (error) {
        if (error.message.includes("already registered")) {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) { toast.error(signInError.message); return; }
          location.href = `/accept-invite/${token}`;
        } else {
          toast.error(error.message);
        }
      } else {
        setSent(true);
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Meghívó elfogadása</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            <strong>{companyName}</strong> meghívott tagnak. E-mail: <strong>{email}</strong>
          </p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm">Ellenőrizd az e-mail fiókodat a belépési linkért.</p>
          ) : mode === "magic" ? (
            <div className="space-y-4">
              <form onSubmit={handleMagicLink}>
                <Button type="submit" className="w-full" disabled={isPending}>
                  Belépés magic link-kel
                </Button>
              </form>
              <Button variant="ghost" className="w-full text-xs" onClick={() => setMode("password")}>
                Belépés jelszóval
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <form onSubmit={handlePassword} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="password">Jelszó</Label>
                  <Input id="password" name="password" type="password" minLength={8} required />
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>Tovább</Button>
              </form>
              <Button variant="ghost" className="w-full text-xs" onClick={() => setMode("magic")}>
                Vissza a magic link-hez
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

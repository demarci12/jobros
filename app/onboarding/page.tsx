"use client";

import { useState, useTransition } from "react";
import { completeOnboarding } from "@/lib/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OnboardingPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await completeOnboarding(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Cégadatok megadása</CardTitle>
        <CardDescription>
          Már csak egy lépés — ezeket az adatokat bármikor módosíthatja a beállításokban.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">
              Cég / vállalkozás neve <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="Kovács Klíma Kft."
              required
              minLength={2}
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="tax_number">Adószám</Label>
            <Input
              id="tax_number"
              name="tax_number"
              placeholder="12345678-1-42"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="phone">Telefonszám</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+36 30 123 4567"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">Értesítési e-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="iroda@ceg.hu"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Létrehozás…" : "Fiók létrehozása — 14 napos próba indul"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Kártyaszám nem szükséges. A próbaidőszak lejártakor válasszon előfizetést.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

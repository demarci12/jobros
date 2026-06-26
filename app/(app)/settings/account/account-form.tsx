"use client";

import { useState, useTransition } from "react";
import { updateAccount, updatePassword } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export function AccountForm({
  email,
  fullName,
  phone,
  hasPassword,
}: {
  email: string;
  fullName: string;
  phone: string;
  hasPassword: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateAccount(new FormData(e.currentTarget));
      if (result?.error) toast.error(result.error);
      else toast.success("Adatok mentve.");
    });
  }

  function handlePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updatePassword(fd);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Jelszó frissítve.");
        (e.target as HTMLFormElement).reset();
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Személyes adatok</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleProfile} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">E-mail cím</Label>
              <Input id="email" value={email} disabled className="bg-muted" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="full_name">Teljes név</Label>
              <Input id="full_name" name="full_name" defaultValue={fullName} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Telefonszám</Label>
              <Input id="phone" name="phone" type="tel" defaultValue={phone} />
            </div>
            <Button type="submit" disabled={isPending}>Mentés</Button>
          </form>
        </CardContent>
      </Card>

      {hasPassword && (
        <Card>
          <CardHeader><CardTitle className="text-base">Jelszó módosítása</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handlePassword} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="password">Új jelszó</Label>
                <Input id="password" name="password" type="password" minLength={8} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirm">Jelszó mégegyszer</Label>
                <Input id="confirm" name="confirm" type="password" required />
              </div>
              <Button type="submit" disabled={isPending}>Jelszó frissítése</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

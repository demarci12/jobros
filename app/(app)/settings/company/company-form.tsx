"use client";

import { useTransition } from "react";
import { updateCompany } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

type Company = {
  name: string | null;
  tax_number: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
};

export function CompanyForm({ company, isOwner }: { company: Company | null; isOwner: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateCompany(new FormData(e.currentTarget));
      if (result?.error) toast.error(result.error);
      else toast.success("Cégadatok mentve.");
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Cég neve <span className="text-destructive">*</span></Label>
            <Input id="name" name="name" defaultValue={company?.name ?? ""} required disabled={!isOwner} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tax_number">Adószám</Label>
            <Input id="tax_number" name="tax_number" defaultValue={company?.tax_number ?? ""} disabled={!isOwner} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="address">Cím</Label>
            <Input id="address" name="address" defaultValue={company?.address ?? ""} disabled={!isOwner} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={company?.phone ?? ""} disabled={!isOwner} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" defaultValue={company?.email ?? ""} disabled={!isOwner} />
          </div>
          {isOwner && (
            <Button type="submit" disabled={isPending}>Mentés</Button>
          )}
          {!isOwner && (
            <p className="text-xs text-muted-foreground">Csak az owner szerkesztheti a cégadatokat.</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useTransition, useState } from "react";
import { updateCompany } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";

type Company = {
  name: string | null;
  tax_number: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  public_slug: string | null;
};

export function CompanyForm({ company, isOwner, siteUrl }: {
  company: Company | null;
  isOwner: boolean;
  siteUrl: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [slug, setSlug] = useState(company?.public_slug ?? "");

  const bookingUrl = slug ? `${siteUrl}/public/${slug}/request` : null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateCompany(new FormData(e.currentTarget));
      if (result?.error) toast.error(result.error);
      else toast.success("Cégadatok mentve.");
    });
  }

  function copyLink() {
    if (!bookingUrl) return;
    navigator.clipboard.writeText(bookingUrl);
    toast.success("Link másolva.");
  }

  return (
    <div className="space-y-6">
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

      {/* Nyilvános ajánlatkérő link */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Nyilvános ajánlatkérő link</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ezt a linket küldd el az ügyfeleidnek — ők ezen az oldalon tudnak ajánlatot kérni.
            A beérkező kérések a <strong>Beállítások → Ajánlatkérések</strong> alatt jelennek meg.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="public_slug">URL azonosító</Label>
            <div className="flex gap-2">
              <div className="flex items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground whitespace-nowrap">
                /public/
              </div>
              <Input
                id="public_slug"
                name="public_slug"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                placeholder="cegnev-kft"
                disabled={!isOwner}
                className="font-mono"
              />
              <div className="flex items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground whitespace-nowrap">
                /request
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Csak kisbetű, szám és kötőjel. Pl: <code>klimacenter-kft</code></p>
          </div>

          {bookingUrl && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
              <span className="text-sm font-mono text-muted-foreground truncate flex-1">{bookingUrl}</span>
              <button onClick={copyLink} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors" title="Másolás">
                <Copy size={14} />
              </button>
              <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground transition-colors" title="Megnyitás">
                <ExternalLink size={14} />
              </a>
            </div>
          )}

          {!bookingUrl && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Adj meg egy URL azonosítót, majd mentsd el a cégadatokat a link aktiválásához.
            </p>
          )}

          {isOwner && slug && (
            <form action={async (fd) => {
              fd.set("public_slug", slug);
              // reuse the main form submit
            }}>
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={() => {
                  const fd = new FormData();
                  fd.set("name", company?.name ?? "");
                  fd.set("tax_number", company?.tax_number ?? "");
                  fd.set("address", company?.address ?? "");
                  fd.set("phone", company?.phone ?? "");
                  fd.set("email", company?.email ?? "");
                  fd.set("public_slug", slug);
                  startTransition(async () => {
                    const { updateCompany: uc } = await import("./actions");
                    const result = await uc(fd);
                    if (result?.error) toast.error(result.error);
                    else toast.success("Link mentve.");
                  });
                }}
              >
                Link mentése
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

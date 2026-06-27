"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

type Service = { id: string; name: string };

export function RequestForm({ companySlug, services }: { companySlug: string; services: Service[] }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    service_id: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, slug: companySlug }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Hiba történt."); return; }
      setDone(true);
    } catch {
      setError("Hálózati hiba. Kérjük, próbáld újra.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card>
        <CardContent className="pt-10 pb-10 flex flex-col items-center gap-3 text-center">
          <CheckCircle2 size={48} className="text-green-500" />
          <h2 className="font-semibold text-lg">Köszönjük!</h2>
          <p className="text-sm text-muted-foreground">
            Megkaptuk az ajánlatkérését. Hamarosan felvesszük Önnel a kapcsolatot.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Neve *</label>
            <Input
              required
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="Teljes neve"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Telefonszám</label>
              <Input
                type="tel"
                value={form.phone}
                onChange={e => set("phone", e.target.value)}
                placeholder="+36 20 123 4567"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">E-mail</label>
              <Input
                type="email"
                value={form.email}
                onChange={e => set("email", e.target.value)}
                placeholder="nev@pelda.hu"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Cím</label>
            <Input
              value={form.address}
              onChange={e => set("address", e.target.value)}
              placeholder="Irányítószám, város, utca, házszám"
            />
          </div>

          {services.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Milyen munkát szeretne?</label>
              <Select value={form.service_id} onValueChange={v => set("service_id", v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Válasszon szolgáltatást…" />
                </SelectTrigger>
                <SelectContent>
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Üzenet</label>
            <Textarea
              value={form.message}
              onChange={e => set("message", e.target.value)}
              placeholder="Írja le röviden, miben segíthetünk…"
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={submitting || !form.name.trim()}>
            {submitting ? "Küldés…" : "Ajánlatot kérek"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

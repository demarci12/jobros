"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, User, Plus, Search } from "lucide-react";
import { searchCustomers, createQuickCustomer } from "@/lib/crm/actions";
import { toast } from "sonner";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

export function QuickCustomerSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searched, setSearched] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    startTransition(async () => {
      const data = await searchCustomers(query);
      setResults(data);
      setSearched(true);
      setShowNewForm(false);
    });
  }

  function handleSelect(id: string) {
    router.push(`/customers/${id}`);
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createQuickCustomer(fd);
      if (result.error) { toast.error(result.error); return; }
      router.push(`/customers/${result.id}`);
    });
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            className="pl-9 h-12 text-base"
            placeholder="Név vagy telefonszám…"
            value={query}
            onChange={e => { setQuery(e.target.value); setSearched(false); }}
            autoFocus
          />
        </div>
        <Button type="submit" size="lg" disabled={isPending || !query.trim()}>
          Keresés
        </Button>
      </form>

      {searched && results.length === 0 && !showNewForm && (
        <Card>
          <CardContent className="py-6 text-center space-y-3">
            <p className="text-muted-foreground text-sm">Nincs találat a(z) <strong>{query}</strong> kifejezésre.</p>
            <Button onClick={() => setShowNewForm(true)} variant="outline">
              <Plus size={16} className="mr-2" /> Új ügyfél felvitele
            </Button>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && !showNewForm && (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {results.map(c => (
                <li key={c.id}>
                  <button
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => handleSelect(c.id)}
                  >
                    <User size={18} className="shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{c.name}</p>
                      {c.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone size={12} /> {c.phone}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t px-4 py-2">
              <button className="text-xs text-muted-foreground hover:underline" onClick={() => setShowNewForm(true)}>
                + Mégsem, új ügyfél
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {showNewForm && (
        <Card>
          <CardContent className="pt-5">
            <p className="font-medium mb-4 text-sm">Új ügyfél gyorsfelvitel</p>
            <form onSubmit={handleCreate} className="space-y-3">
              <Input name="name" placeholder="Ügyfél neve *" defaultValue={query.match(/[a-zA-ZÁáÉéÍíÓóÖöŐőÚúÜüŰű]/) ? query : ""} required />
              <Input name="phone" placeholder="Telefonszám" type="tel" defaultValue={query.match(/^\d/) ? query : ""} />
              <Input name="address" placeholder="Cím (utca, hsz) *" required />
              <Input name="city" placeholder="Város" />
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending} className="flex-1">Profil megnyitása</Button>
                <Button type="button" variant="outline" onClick={() => setShowNewForm(false)}>Vissza</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

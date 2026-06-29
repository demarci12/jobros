"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Phone, Search, UserPlus, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { searchCustomers, createQuickCustomer } from "@/lib/crm/actions";
import { createJob } from "@/lib/jobs/actions";

type Customer = { id: string; name: string; phone: string | null; email: string | null };

type Step = "search" | "new-customer" | "job";

export function PhoneIntakeDialog({ fullWidth }: { fullWidth?: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // Services fetched lazily when job step opens — passed via prop in production;
  // for intake we create a bare job (service_id optional)
  const [jobTitle, setJobTitle] = useState("");
  const [jobNote, setJobNote] = useState("");

  function reset() {
    setStep("search");
    setQuery("");
    setResults([]);
    setSelectedCustomer(null);
    setCustomerId(null);
    setJobTitle("");
    setJobNote("");
  }

  function handleOpen(v: boolean) {
    setOpen(v);
    if (!v) reset();
  }

  function handleQueryChange(q: string) {
    setQuery(q);
    clearTimeout(searchTimer.current);
    if (q.trim().length < 2) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchCustomers(q);
      setResults(res as Customer[]);
      setSearching(false);
    }, 250);
  }

  function selectCustomer(c: Customer) {
    setSelectedCustomer(c);
    setCustomerId(c.id);
    setStep("job");
  }

  // New customer form state
  const [ncName, setNcName] = useState("");
  const [ncPhone, setNcPhone] = useState("");
  const [ncEmail, setNcEmail] = useState("");
  const [ncAddress, setNcAddress] = useState("");
  const [ncCity, setNcCity] = useState("");

  function openNewCustomer() {
    setNcName(query); // pre-fill with what was typed
    setNcPhone("");
    setNcEmail("");
    setNcAddress("");
    setNcCity("");
    setStep("new-customer");
  }

  function handleCreateCustomer() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", ncName);
      fd.set("phone", ncPhone);
      fd.set("email", ncEmail);
      fd.set("address", ncAddress);
      fd.set("city", ncCity);
      const res = await createQuickCustomer(fd);
      if ("error" in res && res.error) { toast.error(res.error); return; }
      const newCustomer: Customer = { id: (res as any).id, name: ncName, phone: ncPhone || null, email: ncEmail || null };
      setSelectedCustomer(newCustomer);
      setCustomerId((res as any).id);
      setStep("job");
    });
  }

  function handleCreateJob() {
    if (!customerId) return;
    startTransition(async () => {
      // We need a site_id — for quick intake we grab the first site of this customer.
      // In a full flow this would be a site selector; for phone intake speed takes priority.
      const { createClient } = await import("@/lib/supabase/client");
      const sb = createClient();
      const { data: sites } = await sb.from("sites").select("id").eq("customer_id", customerId).limit(1);
      const siteId = sites?.[0]?.id;
      if (!siteId) {
        toast.error("Az ügyfélhez nincs rögzített helyszín. Előbb add hozzá a CRM-ben.");
        return;
      }
      const fd = new FormData();
      fd.set("customer_id", customerId);
      fd.set("site_id", siteId);
      if (jobTitle) fd.set("title", jobTitle);
      if (jobNote) fd.set("description", jobNote);
      const res = await createJob(fd);
      if ("error" in res && res.error) { toast.error(res.error); return; }
      toast.success("Munka létrehozva!");
      handleOpen(false);
      router.push(`/jobs/${(res as any).id}`);
    });
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className={`gap-1.5 h-8 ${fullWidth ? "w-full justify-start" : ""}`}
        onClick={() => setOpen(true)}
      >
        <Phone size={14} />
        <span className={fullWidth ? "" : "hidden lg:inline"}>Hívás fogadása</span>
      </Button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone size={16} className="text-primary" />
              Hívás fogadása
            </DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          {(() => {
            const steps = [
              { id: "search", label: "Ügyfél" },
              { id: "new-customer", label: "Adatok" },
              { id: "job", label: "Munka" },
            ] as const;
            const currentIdx = step === "search" ? 0 : step === "new-customer" ? 1 : 2;
            return (
              <div className="flex items-center gap-0 pb-1">
                {steps.map((s, i) => (
                  <div key={s.id} className="flex items-center">
                    {i > 0 && <div className={`h-px w-6 ${i <= currentIdx ? "bg-primary" : "bg-border"}`} />}
                    <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                      i === currentIdx ? "bg-primary text-primary-foreground" :
                      i < currentIdx ? "bg-primary/15 text-primary" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      <span>{i + 1}.</span>
                      <span>{s.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ── Step 1: Search ── */}
          {step === "search" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Ügyfél keresés (név vagy telefonszám)</Label>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    autoFocus
                    className="pl-8"
                    placeholder="pl. Kovács János vagy +36…"
                    value={query}
                    onChange={e => handleQueryChange(e.target.value)}
                  />
                </div>
              </div>

              {searching && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" /> Keresés…
                </div>
              )}

              {results.length > 0 && (
                <ul className="rounded-lg border divide-y max-h-52 overflow-y-auto">
                  {results.map(c => (
                    <li key={c.id}>
                      <button
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 text-left transition-colors"
                        onClick={() => selectCustomer(c)}
                      >
                        <div>
                          <div className="text-sm font-medium">{c.name}</div>
                          {c.phone && <div className="text-xs text-muted-foreground">{c.phone}</div>}
                        </div>
                        <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {query.trim().length >= 2 && !searching && results.length === 0 && (
                <p className="text-sm text-muted-foreground">Nem találtunk ilyen ügyfelet.</p>
              )}

              <Button
                variant="outline"
                className="w-full gap-1.5"
                onClick={openNewCustomer}
              >
                <UserPlus size={14} /> Új ügyfél felvétele
              </Button>
            </div>
          )}

          {/* ── Step 2: New customer ── */}
          {step === "new-customer" && (
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Név *</Label>
                <Input value={ncName} onChange={e => setNcName(e.target.value)} placeholder="Kovács János" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Telefonszám</Label>
                  <Input value={ncPhone} onChange={e => setNcPhone(e.target.value)} placeholder="+36 30 000 0000" type="tel" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">E-mail</Label>
                  <Input value={ncEmail} onChange={e => setNcEmail(e.target.value)} placeholder="nev@email.hu" type="email" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cím *</Label>
                <Input value={ncAddress} onChange={e => setNcAddress(e.target.value)} placeholder="Fő utca 1." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Város</Label>
                <Input value={ncCity} onChange={e => setNcCity(e.target.value)} placeholder="Budapest" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setStep("search")}>← Vissza</Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!ncName.trim() || !ncAddress.trim() || isPending}
                  onClick={handleCreateCustomer}
                >
                  {isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                  Ügyfél létrehozása →
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Job details ── */}
          {step === "job" && selectedCustomer && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted/50 px-3 py-2 flex items-center gap-2">
                <Badge variant="outline" className="text-xs shrink-0">Ügyfél</Badge>
                <span className="text-sm font-medium">{selectedCustomer.name}</span>
                {selectedCustomer.phone && (
                  <span className="text-xs text-muted-foreground ml-auto">{selectedCustomer.phone}</span>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Probléma / feladat leírása</Label>
                <Input
                  autoFocus
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  placeholder="pl. Klíma nem hűt, szerviz esedékes…"
                  onKeyDown={e => { if (e.key === "Enter" && jobTitle) handleCreateJob(); }}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Megjegyzés (opcionális)</Label>
                <Input
                  value={jobNote}
                  onChange={e => setJobNote(e.target.value)}
                  placeholder="Pl. 3. emelet, nincs lift"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setStep("search")}>Vissza</Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={isPending}
                  onClick={handleCreateJob}
                >
                  {isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                  Munka létrehozása →
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

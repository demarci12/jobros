"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Phone, Search, UserPlus, ChevronRight, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  searchCustomers, searchCustomersByPhone, createQuickCustomer,
  getServicesForIntake, getIntakeBookingConfig,
} from "@/lib/crm/actions";
import { getCustomerSitesAndEquipment, createBooking } from "@/components/booking/actions";
import { BookingSetupForm } from "@/components/booking/BookingSetupForm";
import { ManualSlotPicker } from "@/components/booking/ManualSlotPicker";

type Customer = { id: string; name: string; phone: string | null; email: string | null };
type Service = { id: string; name: string; duration_min: number | null; requiresSurvey: boolean; followUpCount: number };
type Site = { id: string; address: string; city: string | null; zip?: string | null };
type Equipment = { id: string; manufacturer: string; model: string | null; kind: string; site_id: string | null };
type Technician = { id: string; name: string };
type Appointment = { starts_at: string; ends_at: string; technician_id: string | null };
type Setup = { siteId: string; serviceId: string; equipmentId: string; title: string; kind: "felmeres" | "munka" | "kovetes" };

const DEFAULT_WORKING_HOURS = {
  mon: { open: true, start: "08:00", end: "17:00" },
  tue: { open: true, start: "08:00", end: "17:00" },
  wed: { open: true, start: "08:00", end: "17:00" },
  thu: { open: true, start: "08:00", end: "17:00" },
  fri: { open: true, start: "08:00", end: "17:00" },
  sat: { open: false, start: "08:00", end: "13:00" },
  sun: { open: false, start: "08:00", end: "13:00" },
};

type Step = "search" | "new-customer" | "setup" | "slot";

export function PhoneIntakeDialog({ fullWidth }: { fullWidth?: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const [services, setServices] = useState<Service[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [setup, setSetup] = useState<Setup | null>(null);

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<Appointment[]>([]);
  const [defaultSlotDurationMin, setDefaultSlotDurationMin] = useState(60);
  const [workingHours, setWorkingHours] = useState(DEFAULT_WORKING_HOURS);

  function reset() {
    setStep("search");
    setQuery("");
    setResults([]);
    setSelectedCustomer(null);
    setServices([]);
    setSites([]);
    setEquipment([]);
    setSetup(null);
    setPhoneMatches([]);
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

  async function selectCustomer(c: Customer) {
    setSelectedCustomer(c);
    setLoadingDetails(true);
    const [{ sites: s, equipment: e }, svc, cfg] = await Promise.all([
      getCustomerSitesAndEquipment(c.id),
      getServicesForIntake(),
      getIntakeBookingConfig(),
    ]);
    setSites(s);
    setEquipment(e);
    setServices(svc as Service[]);
    setTechnicians(cfg.technicians);
    setExistingAppointments(cfg.existingAppointments);
    setDefaultSlotDurationMin(cfg.defaultSlotDurationMin);
    setWorkingHours(cfg.workingHours);
    setLoadingDetails(false);
    setStep("setup");
  }

  // New customer form state
  const [ncName, setNcName] = useState("");
  const [ncPhone, setNcPhone] = useState("");
  const [ncEmail, setNcEmail] = useState("");
  const [ncAddress, setNcAddress] = useState("");
  const [ncCity, setNcCity] = useState("");
  const [phoneMatches, setPhoneMatches] = useState<{ id: string; name: string; phone: string | null }[]>([]);
  const phoneDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(phoneDebounceRef.current);
    if (ncPhone.trim().length < 4) { setPhoneMatches([]); return; }
    phoneDebounceRef.current = setTimeout(async () => {
      const res = await searchCustomersByPhone(ncPhone);
      setPhoneMatches(res);
    }, 300);
    return () => clearTimeout(phoneDebounceRef.current);
  }, [ncPhone]);

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
      const { id } = res as { id: string; site_id: string; name: string; phone: string | null };
      const newCustomer: Customer = { id, name: ncName, phone: ncPhone || null, email: ncEmail || null };
      await selectCustomer(newCustomer);
    });
  }

  const selectedService = services.find(s => s.id === setup?.serviceId);
  const durationMin = selectedService?.duration_min ?? defaultSlotDurationMin;

  function handleSlotSelect(slot: { start: Date; end: Date }, technicianId: string | null) {
    if (!selectedCustomer || !setup) return;
    startTransition(async () => {
      const result = await createBooking({
        customerId: selectedCustomer.id,
        siteId: setup.siteId,
        serviceId: setup.serviceId,
        equipmentId: setup.equipmentId,
        title: setup.title || selectedService?.name || null,
        kind: setup.kind,
        technicianId,
        startsAt: slot.start.toISOString(),
        endsAt: slot.end.toISOString(),
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Foglalás létrehozva!");
      handleOpen(false);
      router.push(`/jobs/${(result as any).jobId}`);
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
        <DialogContent className={step === "slot" ? "sm:max-w-none w-screen h-screen max-h-screen rounded-none overflow-y-auto" : "sm:max-w-md"}>
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
              { id: "setup", label: "Foglalás" },
              { id: "slot", label: "Időpont" },
            ] as const;
            const currentIdx = steps.findIndex(s => s.id === step);
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
              {phoneMatches.length > 0 && (
                <div className="rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-700 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-yellow-800 dark:text-yellow-300">
                    <AlertTriangle size={13} />
                    Úgy tűnik, ez az ügyfél már szerepel:
                  </div>
                  {phoneMatches.map(m => (
                    <div key={m.id} className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-semibold">{m.name}</span>
                        {m.phone && <span className="text-xs text-muted-foreground ml-1.5">{m.phone}</span>}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs shrink-0 border-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/40"
                        onClick={() => selectCustomer({ id: m.id, name: m.name, phone: m.phone, email: null })}
                      >
                        Kiválasztom
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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

          {/* ── Step 3: Foglalás setup (site + service + equipment) ── */}
          {step === "setup" && selectedCustomer && (
            loadingDetails ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-muted-foreground" size={20} />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-md bg-muted/50 px-3 py-2 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs shrink-0">Ügyfél</Badge>
                  <span className="text-sm font-medium">{selectedCustomer.name}</span>
                  {selectedCustomer.phone && (
                    <span className="text-xs text-muted-foreground ml-auto">{selectedCustomer.phone}</span>
                  )}
                </div>
                <BookingSetupForm
                  sites={sites}
                  services={services}
                  equipment={equipment}
                  onBack={() => setStep("search")}
                  onSubmit={v => { setSetup(v); setStep("slot"); }}
                />
              </div>
            )
          )}

          {/* ── Step 4: Időpont ── */}
          {step === "slot" && selectedCustomer && setup && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setStep("setup")}>← Vissza</Button>
                <span className="text-sm text-muted-foreground">
                  {selectedService?.name ?? setup.title ?? "Foglalás"} · {durationMin} perc
                </span>
              </div>
              <ManualSlotPicker
                durationMin={durationMin}
                existingAppointments={existingAppointments}
                technicians={technicians}
                workingHours={workingHours}
                onSelect={handleSlotSelect}
                isPending={isPending}
              />
              {isPending && (
                <p className="text-sm text-muted-foreground text-center">Foglalás létrehozása…</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

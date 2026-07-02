"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ManualSlotPicker } from "./ManualSlotPicker";
import { BookingSetupForm } from "./BookingSetupForm";
import { searchCustomers, getCustomerSitesAndEquipment, createBooking } from "./actions";
import { createQuickCustomer, searchCustomersByPhone } from "@/lib/crm/actions";
import { toast } from "sonner";
import { Search, Loader2, UserPlus, AlertTriangle } from "lucide-react";

type Service = { id: string; name: string; duration_min: number | null; requiresSurvey: boolean; followUpCount: number };
type Technician = { id: string; name: string };
type Appointment = { starts_at: string; ends_at: string; technician_id: string | null };

type Customer = { id: string; name: string; phone: string | null };
type Site = { id: string; address: string; city: string | null; zip: string | null };
type Equipment = { id: string; manufacturer: string; model: string | null; kind: string; site_id: string | null };

type Step = "customer" | "new-customer" | "setup" | "slot";

export function CalendarBookingDialog({
  open,
  onClose,
  services,
  technicians,
  existingAppointments,
  defaultSlotDurationMin,
  workingHours,
}: {
  open: boolean;
  onClose: () => void;
  services: Service[];
  technicians: Technician[];
  existingAppointments: Appointment[];
  defaultSlotDurationMin: number;
  workingHours: Record<string, { open: boolean; start: string; end: string }>;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("customer");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [setup, setSetup] = useState<{ siteId: string; serviceId: string; equipmentIds: string[]; title: string; kind: "felmeres" | "munka" | "kovetes" } | null>(null);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ncName, setNcName] = useState("");
  const [ncPhone, setNcPhone] = useState("");
  const [ncEmail, setNcEmail] = useState("");
  const [ncAddress, setNcAddress] = useState("");
  const [ncCity, setNcCity] = useState("");
  const [phoneMatches, setPhoneMatches] = useState<{ id: string; name: string; phone: string | null }[]>([]);
  const phoneDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!open) {
      setStep("customer");
      setQuery("");
      setResults([]);
      setCustomer(null);
      setSites([]);
      setEquipment([]);
      setSetup(null);
      setNcName(""); setNcPhone(""); setNcEmail(""); setNcAddress(""); setNcCity("");
      setPhoneMatches([]);
    }
  }, [open]);

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
    setNcName(query);
    setNcPhone(""); setNcEmail(""); setNcAddress(""); setNcCity("");
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
      const { id } = res as { id: string };
      await selectCustomer({ id, name: ncName, phone: ncPhone || null });
    });
  }

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const found = await searchCustomers(query);
      setResults(found);
      setSearching(false);
    }, 300);
  }, [query]);

  async function selectCustomer(c: Customer) {
    setCustomer(c);
    setLoadingDetails(true);
    const { sites: s, equipment: e } = await getCustomerSitesAndEquipment(c.id);
    setSites(s);
    setEquipment(e);
    setLoadingDetails(false);
    setStep("setup");
  }

  const selectedService = services.find(s => s.id === setup?.serviceId);
  const durationMin = selectedService?.duration_min ?? defaultSlotDurationMin;

  function handleSlotSelect(slot: { start: Date; end: Date }, technicianId: string | null) {
    if (!customer || !setup) return;
    startTransition(async () => {
      const result = await createBooking({
        customerId: customer.id,
        siteId: setup.siteId,
        serviceId: setup.serviceId,
        equipmentIds: setup.equipmentIds,
        title: setup.title || selectedService?.name || null,
        kind: setup.kind,
        technicianId,
        startsAt: slot.start.toISOString(),
        endsAt: slot.end.toISOString(),
      });
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Foglalás létrehozva.");
        router.push(`/jobs/${result.jobId}`);
        onClose();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className={step === "slot" ? "sm:max-w-none w-screen h-screen max-h-screen rounded-none overflow-y-auto" : "max-w-3xl w-full max-h-[90vh] overflow-y-auto"}>
        <DialogHeader>
          <DialogTitle>
            {step === "customer" && "Új foglalás — ügyfél kiválasztása"}
            {step === "new-customer" && "Új ügyfél felvétele"}
            {step === "setup" && `Új foglalás — ${customer?.name}`}
            {step === "slot" && `Időpont — ${customer?.name}`}
          </DialogTitle>
        </DialogHeader>

        {step === "customer" && (
          <div className="space-y-4">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Ügyfél neve vagy telefonszáma…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
              {searching && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
            </div>
            {results.length > 0 && (
              <div className="rounded-md border divide-y max-h-64 overflow-y-auto">
                {results.map(c => (
                  <button
                    key={c.id}
                    className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors"
                    onClick={() => selectCustomer(c)}
                  >
                    <p className="font-medium text-sm">{c.name}</p>
                    {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                  </button>
                ))}
              </div>
            )}
            {query.length >= 2 && !searching && results.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nincs találat.</p>
            )}
            {loadingDetails && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="animate-spin text-muted-foreground" size={20} />
              </div>
            )}
            <Button variant="outline" className="w-full gap-1.5" onClick={openNewCustomer}>
              <UserPlus size={14} /> Új ügyfél felvétele
            </Button>
          </div>
        )}

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
                      onClick={() => selectCustomer({ id: m.id, name: m.name, phone: m.phone })}
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
              <Button variant="ghost" size="sm" onClick={() => setStep("customer")}>← Vissza</Button>
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

        {step === "setup" && customer && (
          <BookingSetupForm
            sites={sites}
            services={services}
            equipment={equipment}
            onBack={() => setStep("customer")}
            onCancel={onClose}
            onSubmit={v => { setSetup(v); setStep("slot"); }}
          />
        )}

        {step === "slot" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep("setup")}>← Vissza</Button>
              <span className="text-sm text-muted-foreground">
                {selectedService?.name} · {durationMin} perc
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
  );
}

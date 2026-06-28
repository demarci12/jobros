"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ManualSlotPicker } from "./ManualSlotPicker";
import { searchCustomers, getCustomerSitesAndEquipment, createBooking } from "./actions";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";

type Service = { id: string; name: string; duration_min: number | null };
type Technician = { id: string; name: string };
type Appointment = { starts_at: string; ends_at: string; technician_id: string | null };

type Customer = { id: string; name: string; phone: string | null };
type Site = { id: string; address: string; city: string | null };
type Equipment = { id: string; manufacturer: string; model: string | null; kind: string; site_id: string | null };

type Step = "customer" | "setup" | "slot";

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
  const [siteId, setSiteId] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [equipmentId, setEquipmentId] = useState("");
  const [kind, setKind] = useState<"munka" | "felmeres">("munka");
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("customer");
      setQuery("");
      setResults([]);
      setCustomer(null);
      setSites([]);
      setEquipment([]);
      setSiteId("");
      setServiceId(services[0]?.id ?? "");
      setEquipmentId("");
      setKind("munka");
    }
  }, [open, services]);

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
    setSiteId(s[0]?.id ?? "");
    setLoadingDetails(false);
    setStep("setup");
  }

  const selectedService = services.find(s => s.id === serviceId);
  const durationMin = selectedService?.duration_min ?? defaultSlotDurationMin;
  const siteEquipment = equipment.filter(e => !e.site_id || e.site_id === siteId);

  function handleSlotSelect(slot: { start: Date; end: Date }, technicianId: string | null) {
    if (!customer) return;
    startTransition(async () => {
      const result = await createBooking({
        customerId: customer.id,
        siteId: siteId || null,
        serviceId: serviceId || null,
        equipmentId: equipmentId || null,
        title: selectedService?.name ?? null,
        kind,
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
      <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "customer" && "Új foglalás — ügyfél kiválasztása"}
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
          </div>
        )}

        {step === "setup" && customer && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Telephely / cím</Label>
                <Select value={siteId} onValueChange={v => { setSiteId(v ?? ""); setEquipmentId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Válassz…" /></SelectTrigger>
                  <SelectContent>
                    {sites.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.address}{s.city ? `, ${s.city}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Szolgáltatás</Label>
                <Select value={serviceId} onValueChange={v => v && setServiceId(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {services.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}{s.duration_min ? ` (${s.duration_min} perc)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Berendezés (opcionális)</Label>
                <Select value={equipmentId} onValueChange={v => setEquipmentId(!v || v === "__none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="— nincs —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— nincs —</SelectItem>
                    {siteEquipment.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.manufacturer}{e.model ? ` ${e.model}` : ""} ({e.kind})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Típus</Label>
                <Select value={kind} onValueChange={v => setKind(v as "munka" | "felmeres")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="munka">Munka</SelectItem>
                    <SelectItem value="felmeres">Felmérés</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("customer")}>← Vissza</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>Mégsem</Button>
                <Button onClick={() => setStep("slot")}>
                  Időpont választása →
                </Button>
              </div>
            </div>
          </div>
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

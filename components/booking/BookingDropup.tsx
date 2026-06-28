"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ManualSlotPicker } from "./ManualSlotPicker";
import { createBooking } from "./actions";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Site = { id: string; address: string; city: string | null; zip?: string | null };
type Service = { id: string; name: string; duration_min: number | null };
type Technician = { id: string; name: string };
type Appointment = { starts_at: string; ends_at: string; technician_id: string | null };
type Equipment = { id: string; manufacturer: string; model: string | null; kind: string; site_id: string | null };

export function BookingDropup({
  open,
  onClose,
  customerId,
  customerName,
  sites,
  services,
  technicians,
  equipment,
  existingAppointments,
  bookingMode,
  defaultSlotDurationMin,
  workingHours,
}: {
  open: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  sites: Site[];
  services: Service[];
  technicians: Technician[];
  equipment: Equipment[];
  existingAppointments: Appointment[];
  // TODO: render SmartSlotPicker when bookingMode === "smart" (Phase 2 dispatch — VROOM/OSRM)
  bookingMode: "smart" | "manual";
  defaultSlotDurationMin: number;
  workingHours: Record<string, { open: boolean; start: string; end: string }>;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"setup" | "slot">("setup");
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [equipmentId, setEquipmentId] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"munka" | "felmeres">("munka");
  const [isPending, startTransition] = useTransition();

  // Reset when reopened
  useEffect(() => {
    if (open) {
      setStep("setup");
      setSiteId(sites[0]?.id ?? "");
      setServiceId(services[0]?.id ?? "");
      setEquipmentId("");
      setTitle("");
      setKind("munka");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const siteEquipment = equipment.filter(e => !e.site_id || e.site_id === siteId);
  const selectedSite = sites.find(s => s.id === siteId);
  const siteLabel = selectedSite ? [selectedSite.zip, selectedSite.address, selectedSite.city].filter(Boolean).join(", ") : undefined;
  const selectedService = services.find(s => s.id === serviceId);
  const serviceLabel = selectedService ? `${selectedService.name}${selectedService.duration_min ? ` — ${selectedService.duration_min} perc` : ""}` : undefined;
  const durationMin = selectedService?.duration_min ?? defaultSlotDurationMin;
  const kindLabel = kind === "munka" ? "Munka / kiszállás" : "Felmérés";
  const selectedEquipment = siteEquipment.find(e => e.id === equipmentId);
  const equipmentLabel = selectedEquipment ? `${selectedEquipment.manufacturer}${selectedEquipment.model ? ` ${selectedEquipment.model}` : ""} (${selectedEquipment.kind})` : undefined;

  function handleSlotSelect(slot: { start: Date; end: Date }, technicianId: string | null) {
    startTransition(async () => {
      const result = await createBooking({
        customerId,
        siteId,
        serviceId: serviceId || null,
        equipmentId: equipmentId || null,
        title: title || selectedService?.name || null,
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

  const canProceed = !!siteId;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Új foglalás — {customerName}</DialogTitle>
        </DialogHeader>

        {step === "setup" ? (
          <div className="space-y-5">
            {/* Telephely — kötelező */}
            <div className="rounded-md border p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Telephely *</p>
              {sites.length === 0 ? (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  Ehhez az ügyfélhez nincs rögzített cím. Az ügyfél profiljánál add hozzá először.
                </p>
              ) : (
                <Select value={siteId} onValueChange={v => { setSiteId(v ?? ""); setEquipmentId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Válassz helyszínt…">{siteLabel}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {sites.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {[s.zip, s.address, s.city].filter(Boolean).join(", ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Munka részletei */}
            <div className="rounded-md border p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Munka részletei</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Szolgáltatás</Label>
                  {services.length === 0 ? (
                    <p className="text-xs text-muted-foreground pt-1">
                      Nincs szolgáltatás.{" "}
                      <a href="/settings/services" className="underline">Beállítások → Szolgáltatások</a>
                    </p>
                  ) : (
                    <Select value={serviceId} onValueChange={v => v && setServiceId(v)}>
                      <SelectTrigger><SelectValue placeholder="Válassz szolgáltatást…">{serviceLabel}</SelectValue></SelectTrigger>
                      <SelectContent>
                        {services.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}{s.duration_min ? ` — ${s.duration_min} perc` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Típus</Label>
                  <Select value={kind} onValueChange={v => setKind(v as "munka" | "felmeres")}>
                    <SelectTrigger><SelectValue>{kindLabel}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="munka">Munka / kiszállás</SelectItem>
                      <SelectItem value="felmeres">Felmérés</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {siteId && siteEquipment.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Berendezés (opcionális)</Label>
                  <Select value={equipmentId} onValueChange={v => setEquipmentId(!v || v === "__none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="— nincs kiválasztva —">{equipmentLabel}</SelectValue></SelectTrigger>
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
              )}

              <div className="space-y-1.5">
                <Label>Megnevezés (opcionális)</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={selectedService?.name ?? "Pl. Éves klíma karbantartás"}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Mégsem</Button>
              <Button onClick={() => setStep("slot")} disabled={!canProceed}>
                Időpont választása →
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep("setup")}>← Vissza</Button>
              <span className="text-sm text-muted-foreground">
                {selectedService?.name ?? title ?? "Foglalás"} · {durationMin} perc
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

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ManualSlotPicker } from "./ManualSlotPicker";
import { createBooking } from "./actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Site = { id: string; address: string; city: string | null };
type Service = { id: string; name: string; duration_min: number | null };
type Technician = { id: string; name: string };
type Appointment = { starts_at: string; ends_at: string; technician_id: string | null };

export function BookingDropup({
  open,
  onClose,
  customerId,
  customerName,
  sites,
  services,
  technicians,
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
  existingAppointments: Appointment[];
  bookingMode: "smart" | "manual";
  defaultSlotDurationMin: number;
  workingHours: Record<string, { open: boolean; start: string; end: string }>;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"setup" | "slot">("setup");
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"munka" | "felmeres">("munka");
  const [isPending, startTransition] = useTransition();

  const selectedService = services.find(s => s.id === serviceId);
  const durationMin = selectedService?.duration_min ?? defaultSlotDurationMin;

  function handleSlotSelect(slot: { start: Date; end: Date }, technicianId: string | null) {
    startTransition(async () => {
      const result = await createBooking({
        customerId,
        siteId,
        serviceId: serviceId || null,
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

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Új foglalás — {customerName}</DialogTitle>
        </DialogHeader>

        {step === "setup" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Telephely</Label>
                <Select value={siteId} onValueChange={v => v && setSiteId(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Label>Típus</Label>
                <Select value={kind} onValueChange={v => setKind(v as "munka" | "felmeres")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="munka">Munka</SelectItem>
                    <SelectItem value="felmeres">Felmérés</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Cím (opcionális)</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder={selectedService?.name ?? "Pl. Klíma szerviz"} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Mégsem</Button>
              <Button onClick={() => setStep("slot")} disabled={!siteId}>
                Időpont választása →
              </Button>
            </div>
          </div>
        ) : (
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

"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ManualSlotPicker } from "./ManualSlotPicker";
import { BookingSetupForm } from "./BookingSetupForm";
import { createBooking } from "./actions";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Site = { id: string; address: string; city: string | null; zip?: string | null };
type Service = { id: string; name: string; duration_min: number | null; requiresSurvey: boolean; followUpCount: number };
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
  const [setup, setSetup] = useState<{ siteId: string; serviceId: string; equipmentIds: string[]; title: string; kind: "felmeres" | "munka" | "kovetes" } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset when reopened
  useEffect(() => {
    if (open) {
      setStep("setup");
      setSetup(null);
    }
  }, [open]);

  const selectedService = services.find(s => s.id === setup?.serviceId);
  const durationMin = selectedService?.duration_min ?? defaultSlotDurationMin;

  function handleSlotSelect(slot: { start: Date; end: Date }, technicianId: string | null) {
    if (!setup) return;
    startTransition(async () => {
      const result = await createBooking({
        customerId,
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
          <DialogTitle>Új foglalás — {customerName}</DialogTitle>
        </DialogHeader>

        {step === "setup" ? (
          <BookingSetupForm
            sites={sites}
            services={services}
            equipment={equipment}
            onCancel={onClose}
            onSubmit={v => { setSetup(v); setStep("slot"); }}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep("setup")}>← Vissza</Button>
              <span className="text-sm text-muted-foreground">
                {selectedService?.name ?? setup?.title ?? "Foglalás"} · {durationMin} perc
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

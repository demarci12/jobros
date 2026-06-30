"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarPlus } from "lucide-react";
import { ManualSlotPicker } from "@/components/booking/ManualSlotPicker";
import { addAppointmentToJob } from "@/components/booking/actions";
import { toast } from "sonner";

type Technician = { id: string; name: string };
type Appointment = { starts_at: string; ends_at: string; technician_id: string | null };

export function JobBookingButton({
  jobId,
  technicians,
  existingAppointments,
  defaultSlotDurationMin,
  workingHours,
  hasAppointments,
}: {
  jobId: string;
  technicians: Technician[];
  existingAppointments: Appointment[];
  defaultSlotDurationMin: number;
  workingHours: Record<string, { open: boolean; start: string; end: string }>;
  hasAppointments: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"munka" | "felmeres">("munka");
  const [isPending, startTransition] = useTransition();

  function handleSlotSelect(slot: { start: Date; end: Date }, technicianId: string | null) {
    startTransition(async () => {
      const result = await addAppointmentToJob({
        jobId,
        kind,
        technicianId,
        startsAt: slot.start.toISOString(),
        endsAt: slot.end.toISOString(),
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Időpont foglalva.");
        setOpen(false);
      }
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CalendarPlus size={14} className="mr-1.5" />
        {hasAppointments ? "Még egy időpont" : "Időpont foglalása"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Időpont foglalása</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Kind toggle */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-20">Típus</span>
              <div className="flex gap-1">
                <Button size="sm" variant={kind === "munka" ? "default" : "outline"} onClick={() => setKind("munka")}>Munka</Button>
                <Button size="sm" variant={kind === "felmeres" ? "default" : "outline"} onClick={() => setKind("felmeres")}>Felmérés</Button>
              </div>
            </div>

            {/* Slot picker */}
            <ManualSlotPicker
              durationMin={defaultSlotDurationMin}
              technicians={technicians}
              existingAppointments={existingAppointments}
              workingHours={workingHours}
              onSelect={handleSlotSelect}
              isPending={isPending}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

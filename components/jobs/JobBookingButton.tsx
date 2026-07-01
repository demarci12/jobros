"use client";

import { useState, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarPlus } from "lucide-react";
import { ManualSlotPicker } from "@/components/booking/ManualSlotPicker";
import { addAppointmentToJob } from "@/components/booking/actions";
import { getNextAppointmentKind, getSequenceLabel, type AppointmentKind } from "@/lib/jobs/appointment-sequence";
import { toast } from "sonner";

type Technician = { id: string; name: string };
type Appointment = { starts_at: string; ends_at: string; technician_id: string | null };
type JobAppointment = { kind: AppointmentKind };
type Service = { requires_survey: boolean; follow_up_count: number };

export function JobBookingButton({
  jobId,
  technicians,
  existingAppointments,
  jobAppointments,
  service,
  defaultSlotDurationMin,
  workingHours,
  hasAppointments,
}: {
  jobId: string;
  technicians: Technician[];
  existingAppointments: Appointment[];
  jobAppointments: JobAppointment[];
  service: Service | null;
  defaultSlotDurationMin: number;
  workingHours: Record<string, { open: boolean; start: string; end: string }>;
  hasAppointments: boolean;
}) {
  const [open, setOpen] = useState(false);
  const suggestedKind = useMemo(() => getNextAppointmentKind(service, jobAppointments), [service, jobAppointments]);
  const [kind, setKind] = useState<AppointmentKind>(suggestedKind);
  const [isPending, startTransition] = useTransition();

  function handleOpen(v: boolean) {
    setOpen(v);
    if (v) setKind(suggestedKind);
  }

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

  const kindOptions: AppointmentKind[] = ["felmeres", "munka", "kovetes"];

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => handleOpen(true)}>
        <CalendarPlus size={14} className="mr-1.5" />
        {hasAppointments ? "Még egy időpont" : "Időpont foglalása"}
      </Button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="sm:max-w-none w-screen h-screen max-h-screen rounded-none overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Időpont foglalása</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Kind toggle — előre kitöltve a szekvencia szerint */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-20">Típus</span>
              <div className="flex gap-1">
                {kindOptions.map(k => (
                  <Button key={k} size="sm" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k)}>
                    {getSequenceLabel(k)}
                  </Button>
                ))}
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

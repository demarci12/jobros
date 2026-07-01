"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";
import { BookingDropup } from "./BookingDropup";

type Site = { id: string; address: string; city: string | null };
type Service = { id: string; name: string; duration_min: number | null; requiresSurvey: boolean; followUpCount: number };
type Technician = { id: string; name: string };
type Equipment = { id: string; manufacturer: string; model: string | null; kind: string; site_id: string | null };
type Appointment = { starts_at: string; ends_at: string; technician_id: string | null };

export function BookingButton(props: {
  customerId: string;
  customerName: string;
  sites: Site[];
  services: Service[];
  technicians: Technician[];
  equipment: Equipment[];
  existingAppointments: Appointment[];
  bookingMode: "smart" | "manual";
  defaultSlotDurationMin: number;
  workingHours: Record<string, { open: boolean; start: string; end: string }>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <CalendarPlus size={15} className="mr-1.5" />
        Új időpont
      </Button>
      <BookingDropup {...props} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

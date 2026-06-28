import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { BookingSettingsClient } from "./booking-settings-client";

export default async function BookingSettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { supabase, companyId, role } = ctx;

  const { data: company } = await supabase
    .from("companies")
    .select("booking_mode, default_slot_duration_min, working_hours")
    .eq("id", companyId)
    .single();

  const defaultHours = {
    mon: { open: true,  start: "08:00", end: "17:00" },
    tue: { open: true,  start: "08:00", end: "17:00" },
    wed: { open: true,  start: "08:00", end: "17:00" },
    thu: { open: true,  start: "08:00", end: "17:00" },
    fri: { open: true,  start: "08:00", end: "17:00" },
    sat: { open: false, start: "08:00", end: "13:00" },
    sun: { open: false, start: "08:00", end: "13:00" },
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Foglalás</h1>
        <p className="text-sm text-muted-foreground">Foglalási mód és munkaidő-sávok beállítása.</p>
      </div>
      <BookingSettingsClient initialData={{
        booking_mode: company?.booking_mode ?? "manual",
        default_slot_duration_min: company?.default_slot_duration_min ?? 120,
        working_hours: (company?.working_hours as typeof defaultHours) ?? defaultHours,
      }} />
    </div>
  );
}

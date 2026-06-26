import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingSettingsClient } from "./booking-settings-client";

export default async function BookingSettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) redirect("/onboarding");

  const { data: company } = await supabase
    .from("companies")
    .select("booking_mode, default_slot_duration_min, working_hours")
    .eq("id", cu.company_id)
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

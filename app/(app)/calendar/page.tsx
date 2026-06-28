import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CalendarShell } from "@/components/calendar/CalendarShell";

const DEFAULT_WORKING_HOURS = {
  mon: { open: true,  start: "08:00", end: "17:00" },
  tue: { open: true,  start: "08:00", end: "17:00" },
  wed: { open: true,  start: "08:00", end: "17:00" },
  thu: { open: true,  start: "08:00", end: "17:00" },
  fri: { open: true,  start: "08:00", end: "17:00" },
  sat: { open: false, start: "08:00", end: "13:00" },
  sun: { open: false, start: "08:00", end: "13:00" },
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { view?: string; month?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) redirect("/onboarding");

  const view = searchParams.view ?? "week";

  let from: Date, to: Date;
  if (view === "month" && searchParams.month) {
    const [y, m] = searchParams.month.split("-").map(Number);
    from = new Date(y, m - 1, 1);
    to = new Date(y, m, 0, 23, 59, 59);
  } else {
    from = new Date();
    from.setDate(from.getDate() - 7);
    to = new Date();
    to.setDate(to.getDate() + 21);
  }

  const [
    { data: appointments },
    { data: technicians },
    { data: services },
    { data: bookingSettings },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select(`
        id, job_id, kind, starts_at, ends_at, technician_id, status,
        jobs (
          job_number, title,
          customers (name),
          sites (lat, lng, address)
        )
      `)
      .eq("company_id", cu.company_id)
      .neq("status", "lemondva")
      .gte("starts_at", from.toISOString())
      .lte("starts_at", to.toISOString())
      .order("starts_at"),

    supabase
      .from("company_users")
      .select("user_id, profiles(id, full_name)")
      .eq("company_id", cu.company_id)
      .eq("role", "technician")
      .eq("is_active", true),

    supabase
      .from("services")
      .select("id, name, duration_min")
      .eq("company_id", cu.company_id)
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("booking_settings")
      .select("default_slot_duration_min, working_hours")
      .eq("company_id", cu.company_id)
      .maybeSingle(),
  ]);

  const techList = (technicians ?? []).map((t: any) => ({
    id: t.profiles?.id ?? t.user_id,
    name: t.profiles?.full_name ?? "Szerelő",
  }));

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const defaultSlotDurationMin = bookingSettings?.default_slot_duration_min ?? 60;
  const workingHours = (bookingSettings?.working_hours as Record<string, { open: boolean; start: string; end: string }>) ?? DEFAULT_WORKING_HOURS;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <CalendarShell
        initialAppointments={(appointments ?? []) as any}
        technicians={techList}
        services={(services ?? []) as any}
        companyId={cu.company_id}
        mapboxToken={mapboxToken}
        initialView={view as "week" | "month" | "map"}
        initialMonth={searchParams.month}
        defaultSlotDurationMin={defaultSlotDurationMin}
        workingHours={workingHours}
      />
    </div>
  );
}

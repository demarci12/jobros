import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/auth-context";
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
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { supabase, companyId, role } = ctx;

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
      .eq("company_id", companyId)
      .neq("status", "lemondva")
      .gte("starts_at", from.toISOString())
      .lte("starts_at", to.toISOString())
      .order("starts_at"),

    supabase
      .from("company_users")
      .select("user_id, profiles(id, full_name)")
      .eq("company_id", companyId)
      .eq("role", "technician")
      .eq("is_active", true),

    supabase
      .from("services")
      .select("id, name, default_duration_min, requires_survey, follow_up_count")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("booking_settings")
      .select("default_slot_duration_min, working_hours")
      .eq("company_id", companyId)
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
        services={(services ?? []).map((s: any) => ({ id: s.id, name: s.name, duration_min: s.default_duration_min ?? null, requiresSurvey: s.requires_survey ?? false, followUpCount: s.follow_up_count ?? 2 }))}
        companyId={companyId}
        mapboxToken={mapboxToken}
        initialView={view as "week" | "month" | "map"}
        initialMonth={searchParams.month}
        defaultSlotDurationMin={defaultSlotDurationMin}
        workingHours={workingHours}
      />
    </div>
  );
}

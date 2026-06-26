import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DispatchCalendar } from "@/components/calendar/DispatchCalendar";

export default async function CalendarPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) redirect("/onboarding");

  // 4 hét: előző hét + 3 jövő hét
  const from = new Date();
  from.setDate(from.getDate() - 7);
  const to = new Date();
  to.setDate(to.getDate() + 21);

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, job_id, kind, starts_at, ends_at, technician_id, status, jobs(job_number, title, customers(name))")
    .eq("company_id", cu.company_id)
    .neq("status", "lemondva")
    .gte("starts_at", from.toISOString())
    .lte("starts_at", to.toISOString())
    .order("starts_at");

  const { data: technicians } = await supabase
    .from("company_users")
    .select("user_id, profiles(id, full_name)")
    .eq("company_id", cu.company_id)
    .eq("role", "technician")
    .eq("is_active", true);

  const techList = (technicians ?? []).map((t: any) => ({
    id: t.profiles?.id ?? t.user_id,
    name: t.profiles?.full_name ?? "Szerelő",
  }));

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <h1 className="text-xl font-semibold mb-3">Naptár</h1>
      <div className="flex-1 min-h-0">
        <DispatchCalendar
          initialAppointments={(appointments ?? []) as any}
          technicians={techList}
          companyId={cu.company_id}
        />
      </div>
    </div>
  );
}

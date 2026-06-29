import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { TechDayList } from "@/components/jobs/TechDayList";

export default async function MyDayPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { supabase, companyId, role, user } = ctx;

  // Aznapi időpont sáv
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  let query = supabase
    .from("appointments")
    .select(`
      id, job_id, kind, starts_at, ends_at, status,
      jobs(id, job_number, title,
        customers(name, phone),
        sites(address, city, lat, lng)
      )
    `)
    .eq("company_id", companyId)
    .neq("status", "lemondva")
    .gte("starts_at", todayStart.toISOString())
    .lte("starts_at", todayEnd.toISOString())
    .order("starts_at");

  // Szerelők csak a saját napjukat látják
  if (role === "technician") {
    query = query.eq("technician_id", user.id);
  }

  const { data: appointments } = await query;

  const today = new Date().toLocaleDateString("hu-HU", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="border-b pb-4">
        <h1 className="text-xl font-semibold">Mai napom</h1>
        <p className="text-sm text-muted-foreground capitalize">{today}</p>
      </div>

      <TechDayList appointments={(appointments ?? []) as any} />
    </div>
  );
}

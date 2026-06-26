import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TechDayList } from "@/components/jobs/TechDayList";

export default async function MyDayPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) redirect("/onboarding");

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
    .eq("company_id", cu.company_id)
    .neq("status", "lemondva")
    .gte("starts_at", todayStart.toISOString())
    .lte("starts_at", todayEnd.toISOString())
    .order("starts_at");

  // Szerelők csak a saját napjukat látják
  if (cu.role === "technician") {
    query = query.eq("technician_id", user.id);
  }

  const { data: appointments } = await query;

  const today = new Date().toLocaleDateString("hu-HU", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Mai napom</h1>
        <p className="text-sm text-muted-foreground capitalize">{today}</p>
      </div>

      <TechDayList appointments={(appointments ?? []) as any} />
    </div>
  );
}

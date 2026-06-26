import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ServicesClient } from "./services-client";

export default async function ServicesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) redirect("/onboarding");

  const { data: services } = await supabase
    .from("services")
    .select("id, name, activity, default_duration_min, requires_survey, default_price, vat_rate, color, is_active, sort_order")
    .eq("company_id", cu.company_id)
    .order("sort_order").order("name");

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Szolgáltatások</h1>
        <p className="text-sm text-muted-foreground mt-1">A foglaláskor választható tevékenységek és árak.</p>
      </div>
      <ServicesClient services={(services ?? []) as any} />
    </div>
  );
}

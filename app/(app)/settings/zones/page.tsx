import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ZonesClient } from "./zones-client";

export default async function ZonesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) redirect("/onboarding");

  const [{ data: zones }, { data: technicians }] = await Promise.all([
    supabase.from("service_zones")
      .select("id, name, technician_id, home_lat, home_lng, radius_km, is_active")
      .eq("company_id", cu.company_id)
      .order("created_at"),
    supabase.from("company_users")
      .select("user_id, profiles(id, full_name)")
      .eq("company_id", cu.company_id)
      .eq("role", "technician")
      .eq("is_active", true),
  ]);

  const techList = (technicians ?? []).map((t: any) => ({
    id: t.profiles?.id ?? t.user_id,
    name: t.profiles?.full_name ?? "Szerelő",
  }));

  const canEdit = ["owner", "dispatcher"].includes(cu.role);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Szervizzónák</h1>
        <p className="text-sm text-muted-foreground">Szerelőnként bázispont és kiszállási radius.</p>
      </div>
      <ZonesClient zones={zones ?? []} technicians={techList} canEdit={canEdit} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { ZonesClient } from "./zones-client";

export default async function ZonesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { supabase, companyId, role } = ctx;

  const [{ data: zones }, { data: technicians }] = await Promise.all([
    supabase.from("service_zones")
      .select("id, name, technician_id, home_lat, home_lng, radius_km, is_active")
      .eq("company_id", companyId)
      .order("created_at"),
    supabase.from("company_users")
      .select("user_id, profiles(id, full_name)")
      .eq("company_id", companyId)
      .eq("role", "technician")
      .eq("is_active", true),
  ]);

  const techList = (technicians ?? []).map((t: any) => ({
    id: t.profiles?.id ?? t.user_id,
    name: t.profiles?.full_name ?? "Szerelő",
  }));

  const canEdit = ["owner", "dispatcher"].includes(role);

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-lg font-semibold">Szervizzónák</h1>
        <p className="text-sm text-muted-foreground">Szerelőnként bázispont és kiszállási radius.</p>
      </div>
      <ZonesClient zones={zones ?? []} technicians={techList} canEdit={canEdit} />
    </div>
  );
}

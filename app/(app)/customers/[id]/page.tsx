import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomerHeader } from "@/components/crm/CustomerHeader";
import { SitesList } from "@/components/crm/SitesList";
import { EquipmentList } from "@/components/crm/EquipmentList";

export default async function CustomerPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) redirect("/onboarding");

  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, phone, email, tax_number, notes, is_company, deleted_at")
    .eq("id", params.id).eq("company_id", cu.company_id).maybeSingle();
  if (!customer) notFound();

  const { data: sites } = await supabase
    .from("sites")
    .select("id, label, address, city, zip, access_notes, lat, lng")
    .eq("customer_id", params.id).eq("company_id", cu.company_id)
    .order("created_at");

  const { data: equipment } = await supabase
    .from("equipment")
    .select("id, kind, manufacturer, model, serial_number, installed_at, warranty_until, next_service_due, notes, site_id")
    .eq("company_id", cu.company_id)
    .in("site_id", (sites ?? []).map(s => s.id))
    .order("created_at");

  const canEdit = ["owner", "dispatcher"].includes(cu.role);

  return (
    <div className="space-y-6 max-w-3xl">
      <CustomerHeader customer={customer} canEdit={canEdit} />

      <SitesList
        customerId={params.id}
        sites={sites ?? []}
        equipment={equipment ?? []}
        canEdit={canEdit}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { MaterialsClient } from "./materials-client";

export default async function MaterialsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { supabase, companyId, role } = ctx;

  const { data: materials } = await supabase
    .from("materials")
    .select("id, name, unit, unit_price, vat_rate, sku, stock_qty, min_stock_qty")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("name");

  const canEdit = ["owner", "dispatcher"].includes(role);

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-xl font-semibold">Anyag katalógus</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Anyagok, alkatrészek, egységárak és készletkezelés.
        </p>
      </div>
      <MaterialsClient materials={materials ?? []} canEdit={canEdit} />
    </div>
  );
}

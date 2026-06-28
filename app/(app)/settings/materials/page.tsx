import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MaterialsClient } from "./materials-client";

export default async function MaterialsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) redirect("/dashboard");

  const { data: materials } = await supabase
    .from("materials")
    .select("id, name, unit, unit_price, vat_rate, sku, stock_qty, min_stock_qty")
    .eq("company_id", cu.company_id)
    .eq("is_active", true)
    .order("name");

  const canEdit = ["owner", "dispatcher"].includes(cu.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Anyag katalógus</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Anyagok, alkatrészek, egységárak és készletkezelés.
        </p>
      </div>
      <MaterialsClient materials={materials ?? []} canEdit={canEdit} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { RaktarClient } from "./raktar-client";

export default async function RaktarPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { supabase, companyId, role } = ctx;

  const [{ data: materials }, { data: movements }] = await Promise.all([
    supabase
      .from("materials")
      .select("id, name, unit, unit_price, stock_qty, min_stock_qty, sku")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("stock_movements")
      .select("id, material_id, quantity, reason, created_at, materials(name, unit), jobs(job_number)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const canEdit = ["owner", "dispatcher"].includes(role);

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-xl font-semibold">Raktárkezelés</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Készletszintek, készletérték és mozgásnapló. Anyagokat a{" "}
          <a href="/settings/materials" className="underline underline-offset-2">Beállítások → Anyagok</a> menüben vehet fel.
        </p>
      </div>
      <RaktarClient
        materials={(materials ?? []) as any}
        movements={(movements ?? []) as any}
        canEdit={canEdit}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BillingListClient } from "@/components/billing/BillingListClient";

export default async function BillingListPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) redirect("/dashboard");

  // Only owner or accountant-level (owner/dispatcher) can view
  if (!["owner", "dispatcher"].includes(cu.role)) redirect("/dashboard");

  const { data: invoices } = await supabase
    .from("invoices")
    .select(`
      id, invoice_number, gross_total, nav_status, nav_error,
      pdf_url, issued_at, created_at,
      jobs (
        id, job_number,
        customers (name)
      )
    `)
    .eq("company_id", cu.company_id)
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Számlák</h1>
        <p className="text-sm text-muted-foreground">
          Csak olvasó számla-lista könyvelési és NAV-ellenőrzési célra.
          Számla kiállítás a munka Számla fülén érhető el.
        </p>
      </div>
      <BillingListClient
        initialInvoices={(invoices ?? []) as any}
        companyId={cu.company_id}
      />
    </div>
  );
}

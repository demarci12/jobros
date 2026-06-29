import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { BillingListClient } from "@/components/billing/BillingListClient";

export default async function BillingListPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { supabase, companyId, role } = ctx;

  // Only owner or accountant-level (owner/dispatcher) can view
  if (!["owner", "dispatcher"].includes(role)) redirect("/dashboard");

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
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-lg font-semibold">Számlák</h1>
        <p className="text-sm text-muted-foreground">
          Csak olvasó számla-lista könyvelési és NAV-ellenőrzési célra.
          Számla kiállítás a munka Számla fülén érhető el.
        </p>
      </div>
      <BillingListClient
        initialInvoices={(invoices ?? []) as any}
        companyId={companyId}
      />
    </div>
  );
}

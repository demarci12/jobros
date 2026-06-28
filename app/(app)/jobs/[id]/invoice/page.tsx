import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { InvoiceTab } from "@/components/invoice/InvoiceTab";

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { supabase, companyId, role } = ctx;

  const { data: job } = await supabase
    .from("jobs").select("id, status")
    .eq("id", params.id).eq("company_id", companyId).maybeSingle();
  if (!job) notFound();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, invoice_number, nav_status, nav_error, gross_total, pdf_url, issued_at")
    .eq("job_id", params.id)
    .eq("company_id", companyId)
    .maybeSingle();

  const canIssue = ["owner", "dispatcher"].includes(role);

  return (
    <InvoiceTab
      jobId={params.id}
      jobStatus={job.status}
      invoice={invoice}
      canIssue={canIssue}
    />
  );
}

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvoiceTab } from "@/components/invoice/InvoiceTab";

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) redirect("/onboarding");

  const { data: job } = await supabase
    .from("jobs").select("id, status")
    .eq("id", params.id).eq("company_id", cu.company_id).maybeSingle();
  if (!job) notFound();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, invoice_number, nav_status, nav_error, gross_total, pdf_url, issued_at")
    .eq("job_id", params.id)
    .eq("company_id", cu.company_id)
    .maybeSingle();

  const canIssue = ["owner", "dispatcher"].includes(cu.role);

  return (
    <InvoiceTab
      jobId={params.id}
      jobStatus={job.status}
      invoice={invoice}
      canIssue={canIssue}
    />
  );
}

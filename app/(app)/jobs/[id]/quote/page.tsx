import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { QuoteEditor } from "@/components/quotes/QuoteEditor";

export default async function QuotePage({ params }: { params: { id: string } }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { supabase, companyId, role } = ctx;

  const { data: job } = await supabase
    .from("jobs").select("id")
    .eq("id", params.id).eq("company_id", companyId).maybeSingle();
  if (!job) notFound();

  const [{ data: quote }, { data: quoteTemplates }] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, quote_number, status, valid_until, notes")
      .eq("job_id", params.id)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("job_templates")
      .select("id, name, default_lines")
      .eq("company_id", companyId)
      .eq("template_kind", "quote")
      .order("name"),
  ]);

  const { data: lines } = quote
    ? await supabase
        .from("quote_lines")
        .select("id, description, quantity, unit, unit_price, vat_rate, line_total, is_optional, option_group, is_selected")
        .eq("quote_id", quote.id)
        .order("created_at")
    : { data: null };

  const canEdit = ["owner", "dispatcher"].includes(role);

  return (
    <QuoteEditor
      jobId={params.id}
      initialQuote={quote ? { ...quote, lines: (lines ?? []) as any } : null}
      canEdit={canEdit}
      quoteTemplates={(quoteTemplates ?? []) as any}
    />
  );
}

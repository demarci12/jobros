import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuoteEditor } from "@/components/quotes/QuoteEditor";

export default async function QuotePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) redirect("/dashboard");

  const { data: job } = await supabase
    .from("jobs").select("id")
    .eq("id", params.id).eq("company_id", cu.company_id).maybeSingle();
  if (!job) notFound();

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, quote_number, status, valid_until, notes")
    .eq("job_id", params.id)
    .eq("company_id", cu.company_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: lines } = quote
    ? await supabase
        .from("quote_lines")
        .select("id, description, quantity, unit, unit_price, vat_rate, line_total, is_optional, option_group, is_selected")
        .eq("quote_id", quote.id)
        .order("created_at")
    : { data: null };

  const canEdit = ["owner", "dispatcher"].includes(cu.role);

  return (
    <QuoteEditor
      jobId={params.id}
      initialQuote={quote ? { ...quote, lines: (lines ?? []) as any } : null}
    />
  );
}

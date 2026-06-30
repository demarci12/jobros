import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { ServicesClient } from "./services-client";

export default async function ServicesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { supabase, companyId, role } = ctx;

  const [{ data: services }, { data: quoteTemplates }, { data: worksheetTemplates }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, activity, default_duration_min, requires_survey, default_price, vat_rate, color, is_active, sort_order, default_quote_template_id, default_worksheet_template_id")
      .eq("company_id", companyId)
      .order("sort_order").order("name"),
    supabase.from("job_templates").select("id, name").eq("company_id", companyId).eq("template_kind", "quote").order("name"),
    supabase.from("job_templates").select("id, name").eq("company_id", companyId).eq("template_kind", "worksheet").order("name"),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="border-b pb-4">
        <h1 className="text-xl font-semibold">Szolgáltatások</h1>
        <p className="text-sm text-muted-foreground mt-1">A foglaláskor választható tevékenységek és árak.</p>
      </div>
      <ServicesClient
        services={(services ?? []) as any}
        quoteTemplates={(quoteTemplates ?? []) as any}
        worksheetTemplates={(worksheetTemplates ?? []) as any}
      />
    </div>
  );
}

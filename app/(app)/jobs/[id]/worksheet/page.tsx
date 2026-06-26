import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorksheetClient } from "@/components/worksheet/WorksheetClient";

export default async function WorksheetPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) redirect("/onboarding");

  // verify job belongs to company
  const { data: job } = await supabase
    .from("jobs").select("id, assigned_to")
    .eq("id", params.id).eq("company_id", cu.company_id).maybeSingle();
  if (!job) notFound();

  const canEdit = ["owner", "dispatcher"].includes(cu.role) || job.assigned_to === user.id;

  const { data: worksheet } = await supabase
    .from("worksheets")
    .select("id, work_done, labor_hours")
    .eq("job_id", params.id)
    .eq("company_id", cu.company_id)
    .maybeSingle();

  const { data: lines } = worksheet
    ? await supabase
        .from("worksheet_lines")
        .select("id, description, quantity, unit, unit_price, vat_rate, line_total, is_labor")
        .eq("worksheet_id", worksheet.id)
        .order("created_at")
    : { data: null };

  return (
    <WorksheetClient
      jobId={params.id}
      worksheet={{
        id: worksheet?.id ?? null,
        work_done: worksheet?.work_done ?? null,
        labor_hours: worksheet?.labor_hours ?? null,
        lines: (lines ?? []) as any,
      }}
      canEdit={canEdit}
    />
  );
}

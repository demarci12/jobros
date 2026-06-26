import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorksheetClient } from "@/components/worksheet/WorksheetClient";
import { SignaturePad } from "@/components/worksheet/SignaturePad";
import { PhotoUpload } from "@/components/worksheet/PhotoUpload";

export default async function WorksheetPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) redirect("/onboarding");

  const { data: job } = await supabase
    .from("jobs").select("id, assigned_to")
    .eq("id", params.id).eq("company_id", cu.company_id).maybeSingle();
  if (!job) notFound();

  const canEdit = ["owner", "dispatcher"].includes(cu.role) || job.assigned_to === user.id;

  const [
    { data: worksheet },
    { data: signatures },
    { data: attachments },
  ] = await Promise.all([
    supabase.from("worksheets").select("id, work_done, labor_hours")
      .eq("job_id", params.id).eq("company_id", cu.company_id).maybeSingle(),
    supabase.from("signatures").select("id, signer_role, signer_name, image_url, signed_at")
      .eq("job_id", params.id).order("signed_at"),
    supabase.from("attachments").select("id, storage_path, caption")
      .eq("job_id", params.id).eq("kind", "photo").order("created_at"),
  ]);

  const { data: lines } = worksheet
    ? await supabase
        .from("worksheet_lines")
        .select("id, description, quantity, unit, unit_price, vat_rate, line_total, is_labor")
        .eq("worksheet_id", worksheet.id)
        .order("created_at")
    : { data: null };

  return (
    <div className="space-y-8 max-w-2xl">
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

      {/* Fotók */}
      {canEdit && (
        <div className="space-y-2">
          <h2 className="font-semibold text-sm">Fotók</h2>
          <PhotoUpload
            jobId={params.id}
            initialAttachments={(attachments ?? []) as any}
          />
        </div>
      )}

      {/* Aláírás */}
      {canEdit && (
        <div className="space-y-2">
          <h2 className="font-semibold text-sm">Aláírás</h2>
          {(signatures ?? []).length > 0 && (
            <div className="flex gap-3 flex-wrap">
              {(signatures ?? []).map((s: any) => (
                <div key={s.id} className="text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image_url} alt={`${s.signer_name ?? s.signer_role} aláírása`}
                    className="w-40 h-20 object-contain border rounded bg-white" />
                  <p className="text-xs text-muted-foreground mt-1">{s.signer_name ?? s.signer_role}</p>
                </div>
              ))}
            </div>
          )}
          <SignaturePad jobId={params.id} />
        </div>
      )}
    </div>
  );
}

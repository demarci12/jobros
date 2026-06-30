import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { WorksheetClient } from "@/components/worksheet/WorksheetClient";
import { SignaturePad } from "@/components/worksheet/SignaturePad";
import { PhotoUpload } from "@/components/worksheet/PhotoUpload";
import { ChecklistPanel } from "@/components/jobs/ChecklistPanel";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

export default async function WorksheetPage({ params }: { params: { id: string } }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { supabase, companyId, role, user } = ctx;

  const { data: job } = await supabase
    .from("jobs").select("id, assigned_to")
    .eq("id", params.id).eq("company_id", companyId).maybeSingle();
  if (!job) notFound();

  const canEdit = ["owner", "dispatcher"].includes(role) || job.assigned_to === user.id;

  const [
    { data: worksheet },
    { data: signatures },
    { data: attachments },
    { data: catalogMaterials },
    { data: checklistItems },
    { data: checklistTemplates },
    { data: worksheetTemplates },
  ] = await Promise.all([
    supabase.from("worksheets").select("id, work_done")
      .eq("job_id", params.id).eq("company_id", companyId).maybeSingle(),
    supabase.from("signatures").select("id, signer_role, signer_name, image_url, signed_at")
      .eq("job_id", params.id).order("signed_at"),
    supabase.from("attachments").select("id, storage_path, caption")
      .eq("job_id", params.id).eq("kind", "photo").order("created_at"),
    supabase.from("materials").select("id, name, unit, unit_price, vat_rate")
      .eq("company_id", companyId).eq("is_active", true).order("name"),
    supabase.from("job_checklist_state")
      .select("id, label, is_done, done_at, done_by")
      .eq("job_id", params.id).eq("company_id", companyId)
      .order("created_at"),
    supabase.from("job_templates")
      .select("id, name")
      .eq("company_id", companyId)
      .eq("template_kind", "checklist")
      .order("name"),
    supabase.from("job_templates")
      .select("id, name")
      .eq("company_id", companyId)
      .eq("template_kind", "worksheet")
      .order("name"),
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
      {worksheet && (
        <div className="flex justify-end">
          <Link href={`/api/pdf/worksheet/${worksheet.id}`} target="_blank">
            <Button variant="outline" size="sm">
              <FileDown size={14} className="mr-1.5" /> Munkalap PDF
            </Button>
          </Link>
        </div>
      )}
      <WorksheetClient
        jobId={params.id}
        worksheet={{
          id: worksheet?.id ?? null,
          work_done: worksheet?.work_done ?? null,
          lines: (lines ?? []) as any,
        }}
        canEdit={canEdit}
        catalogMaterials={(catalogMaterials ?? []) as any}
        worksheetTemplates={(worksheetTemplates ?? []) as any}
      />

      {/* Ellenőrzőlista */}
      <div className="space-y-2">
        <ChecklistPanel
          jobId={params.id}
          initialItems={(checklistItems ?? []) as any}
          templates={(checklistTemplates ?? []) as any}
          canEdit={canEdit}
        />
      </div>

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

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/lib/supabase/auth-context";

async function getWorksheetCtx(jobId: string) {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  const { supabase, companyId } = ctx;

  const { data: job } = await supabase
    .from("jobs").select("id, assigned_to")
    .eq("id", jobId).eq("company_id", companyId).maybeSingle();
  if (!job) return null;

  const canWrite = ["owner", "dispatcher"].includes(ctx.role) || job.assigned_to === ctx.user.id;
  return { supabase, companyId, userId: ctx.user.id, canWrite };
}

export async function upsertWorksheet(jobId: string, formData: FormData) {
  const ctx = await getWorksheetCtx(jobId);
  if (!ctx?.canWrite) return { error: "Nincs jogosultság." };

  const workDone = formData.get("work_done") as string | null;

  const { data: existing } = await ctx.supabase
    .from("worksheets").select("id")
    .eq("job_id", jobId).eq("company_id", ctx.companyId).maybeSingle();

  let worksheetId: string;
  if (existing) {
    const { error } = await ctx.supabase.from("worksheets")
      .update({ work_done: workDone })
      .eq("id", existing.id);
    if (error) return { error: error.message };
    worksheetId = existing.id;
  } else {
    const { data, error } = await ctx.supabase.from("worksheets")
      .insert({ company_id: ctx.companyId, job_id: jobId, work_done: workDone, technician_id: ctx.userId })
      .select("id").single();
    if (error) return { error: error.message };
    worksheetId = data.id;

    // Auto-apply default worksheet template from the job's service if configured
    const { data: jobService } = await ctx.supabase
      .from("jobs")
      .select("services(default_worksheet_template_id)")
      .eq("id", jobId).eq("company_id", ctx.companyId)
      .maybeSingle();
    const defaultTemplateId = (jobService as any)?.services?.default_worksheet_template_id;
    if (defaultTemplateId) {
      const { data: tmpl } = await ctx.supabase
        .from("job_templates").select("default_lines")
        .eq("id", defaultTemplateId).eq("company_id", ctx.companyId).maybeSingle();
      const defaultLines = (tmpl?.default_lines as any[]) ?? [];
      if (defaultLines.length > 0) {
        await ctx.supabase.from("worksheet_lines").insert(
          defaultLines.map((l: any) => ({
            company_id: ctx.companyId,
            worksheet_id: worksheetId,
            description: l.description ?? "",
            quantity: l.quantity ?? 1,
            unit: l.unit ?? "db",
            unit_price: l.unit_price ?? 0,
            vat_rate: l.vat_rate ?? 27,
            line_total: (l.quantity ?? 1) * (l.unit_price ?? 0),
            is_labor: l.is_labor ?? false,
          }))
        );
      }
    }
  }

  revalidatePath(`/jobs/${jobId}/worksheet`);
  return { success: true, worksheetId };
}

const lineSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.string().default("db"),
  unit_price: z.coerce.number().min(0),
  vat_rate: z.coerce.number().int().refine(v => [0, 5, 18, 27].includes(v), { message: "ÁFA: 0, 5, 18 vagy 27%" }),
  is_labor: z.coerce.boolean().default(false),
  material_id: z.string().uuid().nullish(),
});

export async function addWorksheetLine(worksheetId: string, jobId: string, formData: FormData) {
  const ctx = await getWorksheetCtx(jobId);
  if (!ctx?.canWrite) return { error: "Nincs jogosultság." };

  const rawMaterialId = formData.get("material_id");
  const parsed = lineSchema.safeParse({
    description: formData.get("description"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit") || "db",
    unit_price: formData.get("unit_price"),
    vat_rate: formData.get("vat_rate") || 27,
    is_labor: formData.get("is_labor") === "1",
    material_id: rawMaterialId || null,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { material_id, ...lineData } = parsed.data;

  const { data: insertedLine, error } = await ctx.supabase.from("worksheet_lines").insert({
    company_id: ctx.companyId,
    worksheet_id: worksheetId,
    ...(material_id ? { material_id } : {}),
    ...lineData,
  }).select("id, description, quantity, unit, unit_price, vat_rate, line_total, is_labor").single();
  if (error) return { error: error.message };

  // Stock is NOT deducted here — it is deducted atomically at signature time.

  revalidatePath(`/jobs/${jobId}/worksheet`);
  return { line: insertedLine };
}

export async function deleteWorksheetLine(lineId: string, worksheetId: string, jobId: string) {
  const ctx = await getWorksheetCtx(jobId);
  if (!ctx?.canWrite) return { error: "Nincs jogosultság." };

  const { data: ws } = await ctx.supabase
    .from("worksheets")
    .select("id")
    .eq("id", worksheetId)
    .eq("company_id", ctx.companyId)
    .maybeSingle();

  if (ws) {
    const { data: sig } = await ctx.supabase
      .from("signatures")
      .select("id")
      .eq("job_id", jobId)
      .limit(1)
      .maybeSingle();
    if (sig) {
      return { error: "Az aláírás után a tételek nem módosíthatók." };
    }
  }

  const { error } = await ctx.supabase.from("worksheet_lines")
    .delete().eq("id", lineId).eq("company_id", ctx.companyId);
  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}/worksheet`);
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

async function getWorksheetCtx(jobId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) return null;

  // verify job access
  const { data: job } = await supabase
    .from("jobs").select("id, assigned_to")
    .eq("id", jobId).eq("company_id", cu.company_id).maybeSingle();
  if (!job) return null;

  const canWrite = ["owner", "dispatcher"].includes(cu.role) || job.assigned_to === user.id;
  return { supabase, companyId: cu.company_id as string, userId: user.id, canWrite };
}

export async function upsertWorksheet(jobId: string, formData: FormData) {
  const ctx = await getWorksheetCtx(jobId);
  if (!ctx?.canWrite) return { error: "Nincs jogosultság." };

  const workDone = formData.get("work_done") as string | null;
  const laborHours = formData.get("labor_hours") ? Number(formData.get("labor_hours")) : null;

  // upsert: one worksheet per job
  const { data: existing } = await ctx.supabase
    .from("worksheets").select("id")
    .eq("job_id", jobId).eq("company_id", ctx.companyId).maybeSingle();

  let worksheetId: string;
  if (existing) {
    const { error } = await ctx.supabase.from("worksheets")
      .update({ work_done: workDone, labor_hours: laborHours })
      .eq("id", existing.id);
    if (error) return { error: error.message };
    worksheetId = existing.id;
  } else {
    const { data, error } = await ctx.supabase.from("worksheets")
      .insert({ company_id: ctx.companyId, job_id: jobId, work_done: workDone, labor_hours: laborHours, technician_id: ctx.userId })
      .select("id").single();
    if (error) return { error: error.message };
    worksheetId = data.id;
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
});

export async function addWorksheetLine(worksheetId: string, jobId: string, formData: FormData) {
  const ctx = await getWorksheetCtx(jobId);
  if (!ctx?.canWrite) return { error: "Nincs jogosultság." };

  const parsed = lineSchema.safeParse({
    description: formData.get("description"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit") || "db",
    unit_price: formData.get("unit_price"),
    vat_rate: formData.get("vat_rate") || 27,
    is_labor: formData.get("is_labor") === "1",
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { error } = await ctx.supabase.from("worksheet_lines").insert({
    company_id: ctx.companyId,
    worksheet_id: worksheetId,
    ...parsed.data,
  });
  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}/worksheet`);
  return { success: true };
}

export async function deleteWorksheetLine(lineId: string, worksheetId: string, jobId: string) {
  const ctx = await getWorksheetCtx(jobId);
  if (!ctx?.canWrite) return { error: "Nincs jogosultság." };

  const { error } = await ctx.supabase.from("worksheet_lines")
    .delete().eq("id", lineId).eq("company_id", ctx.companyId);
  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}/worksheet`);
  return { success: true };
}

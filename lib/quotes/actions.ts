"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/lib/supabase/auth-context";

async function getDispatchCtx() {
  const ctx = await getAuthContext();
  if (!ctx || !["owner", "dispatcher"].includes(ctx.role)) return null;
  return { supabase: ctx.supabase, companyId: ctx.companyId, userId: ctx.user.id };
}

export async function createQuote(jobId: string) {
  const ctx = await getDispatchCtx();
  if (!ctx) return { error: "Nincs jogosultság." };

  const year = new Date().getFullYear().toString();

  async function generateQuoteNumber(): Promise<string> {
    const { count } = await ctx!.supabase
      .from("quotes").select("id", { count: "exact", head: true })
      .eq("company_id", ctx!.companyId)
      .like("quote_number", `${year}-AJ%`);
    return `${year}-AJ${((count ?? 0) + 1).toString().padStart(4, "0")}`;
  }

  let quoteNumber = await generateQuoteNumber();
  let quoteData: { id: string; quote_number: string; status: string; valid_until: string | null; notes: string | null } | null = null;
  let quoteError: any = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await ctx.supabase.from("quotes").insert({
      company_id: ctx.companyId,
      job_id: jobId,
      quote_number: quoteNumber,
    }).select("id, quote_number, status, valid_until, notes").single();
    if (!result.error) { quoteData = result.data; break; }
    if (result.error.code === "23505") {
      quoteNumber = await generateQuoteNumber();
      quoteError = result.error;
      continue;
    }
    quoteError = result.error; break;
  }

  if (!quoteData) return { error: quoteError?.code === "23505" ? "Árajánlat szám ütközés, próbáld újra." : quoteError?.message ?? "Hiba." };

  // Auto-apply default quote template from the job's service if configured
  const { data: jobService } = await ctx.supabase
    .from("jobs")
    .select("services(default_quote_template_id)")
    .eq("id", jobId).eq("company_id", ctx.companyId)
    .maybeSingle();
  const defaultTemplateId = (jobService as any)?.services?.default_quote_template_id;
  if (defaultTemplateId) {
    const { data: tmpl } = await ctx.supabase
      .from("job_templates").select("default_lines")
      .eq("id", defaultTemplateId).eq("company_id", ctx.companyId).maybeSingle();
    const defaultLines = (tmpl?.default_lines as any[]) ?? [];
    if (defaultLines.length > 0) {
      await ctx.supabase.from("quote_lines").insert(
        defaultLines.map((l: any) => ({
          company_id: ctx.companyId,
          quote_id: quoteData!.id,
          description: l.description ?? "",
          quantity: l.quantity ?? 1,
          unit: l.unit ?? "db",
          unit_price: l.unit_price ?? 0,
          vat_rate: l.vat_rate ?? 27,
          is_optional: false,
          is_selected: true,
        }))
      );
    }
  }

  revalidatePath(`/jobs/${jobId}/quote`);
  revalidatePath(`/jobs/${jobId}`);
  return { quote: { ...quoteData, lines: [] } };
}

const lineSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.string().default("db"),
  unit_price: z.coerce.number().min(0),
  vat_rate: z.coerce.number().int().refine(v => [0, 5, 18, 27].includes(v)),
  is_optional: z.coerce.boolean().default(false),
  option_group: z.enum(["good", "better", "best", ""]).optional(),
  is_selected: z.coerce.boolean().default(true),
});

export async function addQuoteLine(quoteId: string, jobId: string, formData: FormData) {
  const ctx = await getDispatchCtx();
  if (!ctx) return { error: "Nincs jogosultság." };

  const rawMaterialId = formData.get("material_id");
  const parsed = lineSchema.safeParse({
    description: formData.get("description"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit") || "db",
    unit_price: formData.get("unit_price"),
    vat_rate: formData.get("vat_rate") || 27,
    is_optional: formData.get("is_optional") === "1",
    option_group: formData.get("option_group") || "",
    is_selected: formData.get("is_selected") !== "0",
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const materialId = rawMaterialId && typeof rawMaterialId === "string" ? rawMaterialId : null;

  const { data, error } = await ctx.supabase.from("quote_lines").insert({
    company_id: ctx.companyId,
    quote_id: quoteId,
    ...parsed.data,
    option_group: parsed.data.option_group || null,
    ...(materialId ? { material_id: materialId } : {}),
  }).select("id, description, quantity, unit, unit_price, vat_rate, line_total, is_optional, option_group, is_selected, material_id").single();

  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}/quote`);
  return { line: data };
}

export async function toggleLineSelected(lineId: string, isSelected: boolean, jobId: string) {
  const ctx = await getDispatchCtx();
  if (!ctx) return { error: "Nincs jogosultság." };
  const { error } = await ctx.supabase.from("quote_lines")
    .update({ is_selected: isSelected }).eq("id", lineId).eq("company_id", ctx.companyId);
  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}/quote`);
  return { success: true };
}

export async function deleteQuoteLine(lineId: string, jobId: string) {
  const ctx = await getDispatchCtx();
  if (!ctx) return { error: "Nincs jogosultság." };
  const { error } = await ctx.supabase.from("quote_lines")
    .delete().eq("id", lineId).eq("company_id", ctx.companyId);
  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}/quote`);
  return { success: true };
}

export async function updateQuoteStatus(quoteId: string, status: string, jobId: string) {
  const ctx = await getDispatchCtx();
  if (!ctx) return { error: "Nincs jogosultság." };
  const validStatus = z.enum(["draft", "sent", "accepted", "rejected"]).safeParse(status);
  if (!validStatus.success) return { error: "Érvénytelen státusz." };

  const { data: currentQuote } = await ctx.supabase.from("quotes")
    .select("status").eq("id", quoteId).eq("company_id", ctx.companyId).maybeSingle();
  if (!currentQuote) return { error: "Árajánlat nem található." };

  const { error } = await ctx.supabase.from("quotes")
    .update({ status: validStatus.data }).eq("id", quoteId).eq("company_id", ctx.companyId);
  if (error) return { error: error.message };

  // Stock reservation management: sent → reserve, rejected/accepted → release.
  // Only act when crossing the relevant boundary.
  const newStatus = validStatus.data;
  const oldStatus = currentQuote.status as string;
  const shouldReserve = newStatus === "sent" && oldStatus !== "sent";
  const shouldRelease = (newStatus === "rejected" || newStatus === "accepted") && oldStatus === "sent";

  if (shouldReserve || shouldRelease) {
    const { data: lines } = await ctx.supabase
      .from("quote_lines")
      .select("material_id, quantity")
      .eq("quote_id", quoteId)
      .eq("company_id", ctx.companyId)
      .eq("is_selected", true)
      .not("material_id", "is", null);

    for (const line of lines ?? []) {
      if (!line.material_id || line.quantity <= 0) continue;
      const delta = shouldReserve ? line.quantity : -line.quantity;
      await ctx.supabase.rpc("increment_reserved", {
        p_material_id: line.material_id,
        p_delta: delta,
      });
    }
  }

  revalidatePath(`/jobs/${jobId}/quote`);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  return { success: true };
}

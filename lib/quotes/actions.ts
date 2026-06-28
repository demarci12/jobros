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
  const { count } = await ctx.supabase
    .from("quotes").select("id", { count: "exact", head: true })
    .eq("company_id", ctx.companyId)
    .like("quote_number", `${year}-AJ%`);
  const seq = ((count ?? 0) + 1).toString().padStart(4, "0");
  const quoteNumber = `${year}-AJ${seq}`;

  const { data, error } = await ctx.supabase.from("quotes").insert({
    company_id: ctx.companyId,
    job_id: jobId,
    quote_number: quoteNumber,
  }).select("id").single();

  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}/quote`);
  return { quoteId: data.id };
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

  const { error } = await ctx.supabase.from("quote_lines").insert({
    company_id: ctx.companyId,
    quote_id: quoteId,
    ...parsed.data,
    option_group: parsed.data.option_group || null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}/quote`);
  return { success: true };
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
  const { error } = await ctx.supabase.from("quotes")
    .update({ status }).eq("id", quoteId).eq("company_id", ctx.companyId);
  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}/quote`);
  return { success: true };
}

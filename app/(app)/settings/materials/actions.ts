"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { z } from "zod";

const MaterialSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1).default("db"),
  unit_price: z.coerce.number().min(0),
  vat_rate: z.coerce.number().int().refine(v => [0, 5, 18, 27].includes(v)),
  sku: z.string().optional(),
  min_stock_qty: z.coerce.number().min(0).default(0),
});

async function getCtx() {
  const ctx = await getAuthContext();
  if (!ctx || !["owner", "dispatcher"].includes(ctx.role)) return null;
  return { supabase: ctx.supabase, companyId: ctx.companyId, userId: ctx.user.id };
}

export async function upsertMaterial(id: string | null, formData: FormData) {
  const ctx = await getCtx();
  if (!ctx) return { error: "Nincs jogosultság." };

  const parsed = MaterialSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Érvénytelen adatok." };

  const { error } = id
    ? await ctx.supabase.from("materials")
        .update({ ...parsed.data })
        .eq("id", id).eq("company_id", ctx.companyId)
    : await ctx.supabase.from("materials")
        .insert({ ...parsed.data, company_id: ctx.companyId });

  if (error) return { error: error.message };
  revalidatePath("/settings/materials");
  return { success: true };
}

export async function deleteMaterial(id: string) {
  const ctx = await getCtx();
  if (!ctx) return { error: "Nincs jogosultság." };

  const { error } = await ctx.supabase.from("materials")
    .update({ is_active: false })
    .eq("id", id).eq("company_id", ctx.companyId);

  if (error) return { error: error.message };
  revalidatePath("/settings/materials");
  return { success: true };
}

export async function adjustStock(materialId: string, quantity: number, reason: string) {
  const ctx = await getCtx();
  if (!ctx) return { error: "Nincs jogosultság." };

  // Verify the material belongs to this company before touching stock
  const { data: mat, error: matErr } = await ctx.supabase
    .from("materials").select("id")
    .eq("id", materialId).eq("company_id", ctx.companyId).maybeSingle();
  if (matErr || !mat) return { error: "Az anyag nem található." };

  // Atomic increment — avoids read-modify-write race condition
  const { error: stockErr } = await ctx.supabase.rpc("increment_stock", {
    p_material_id: materialId,
    p_delta: quantity,
  });
  if (stockErr) return { error: stockErr.message };

  await ctx.supabase.from("stock_movements").insert({
    company_id: ctx.companyId,
    material_id: materialId,
    quantity,
    reason,
    created_by: ctx.userId,
  });

  revalidatePath("/settings/materials");
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu || !["owner", "dispatcher"].includes(cu.role)) return null;
  return { supabase, companyId: cu.company_id as string, userId: user.id };
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

  const { error } = await ctx.supabase.from("stock_movements").insert({
    company_id: ctx.companyId,
    material_id: materialId,
    quantity,
    reason,
    created_by: ctx.userId,
  });

  if (error) return { error: error.message };

  // Update stock_qty
  const { data: mat } = await ctx.supabase.from("materials")
    .select("stock_qty").eq("id", materialId).single();
  if (mat) {
    await ctx.supabase.from("materials")
      .update({ stock_qty: Number(mat.stock_qty) + quantity })
      .eq("id", materialId);
  }

  revalidatePath("/settings/materials");
  return { success: true };
}

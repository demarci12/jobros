"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/lib/supabase/auth-context";

async function getCtx() {
  const ctx = await getAuthContext();
  if (!ctx || !["owner", "dispatcher"].includes(ctx.role)) return null;
  return { supabase: ctx.supabase, companyId: ctx.companyId, userId: ctx.user.id };
}

const adjustSchema = z.object({
  material_id: z.string().uuid(),
  quantity: z.coerce.number().refine(v => v !== 0, { message: "A mennyiség nem lehet 0." }),
  reason: z.string().min(1, "Add meg az ok/megjegyzést."),
});

export async function adjustStock(formData: FormData) {
  const ctx = await getCtx();
  if (!ctx) return { error: "Nincs jogosultság." };

  const parsed = adjustSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { material_id, quantity, reason } = parsed.data;

  // Verify ownership
  const { data: mat } = await ctx.supabase
    .from("materials").select("id, name, stock_qty")
    .eq("id", material_id).eq("company_id", ctx.companyId).maybeSingle();
  if (!mat) return { error: "Az anyag nem található." };

  const { error: rpcErr } = await ctx.supabase.rpc("increment_stock", {
    p_material_id: material_id,
    p_delta: quantity,
  });
  if (rpcErr) return { error: rpcErr.message };

  await ctx.supabase.from("stock_movements").insert({
    company_id: ctx.companyId,
    material_id,
    quantity,
    reason,
    created_by: ctx.userId,
  });

  revalidatePath("/raktar");
  return { success: true };
}

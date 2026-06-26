"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { inviteSchema, roleSchema } from "@/lib/validators/settings";
import { checkEntitlement } from "@/lib/billing/entitlements";

async function getOwnerOrDispatcherCtx() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: cu } = await supabase
    .from("company_users")
    .select("company_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!cu) return null;
  if (!["owner", "dispatcher"].includes(cu.role)) return null;
  return { supabase, user, companyId: cu.company_id as string, role: cu.role as string };
}

export async function inviteMember(formData: FormData) {
  const ctx = await getOwnerOrDispatcherCtx();
  if (!ctx) return { error: "Nincs jogosultságod." };

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const ent = await checkEntitlement(ctx.companyId, "technicians");
  if (!ent.allowed) return { error: "Elérted a szerelő-limitet. Válts magasabb csomagra." };

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await ctx.supabase.from("invitations").insert({
    company_id: ctx.companyId,
    email: parsed.data.email,
    role: parsed.data.role,
    token,
    expires_at: expiresAt,
    invited_by: ctx.user.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/settings/team");
  return { success: true };
}

export async function changeRole(formData: FormData) {
  const ctx = await getOwnerOrDispatcherCtx();
  if (!ctx) return { error: "Nincs jogosultságod." };

  const parsed = roleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  if (parsed.data.userId === ctx.user.id) return { error: "A saját szerepedet nem módosíthatod." };

  const { error } = await ctx.supabase
    .from("company_users")
    .update({ role: parsed.data.role })
    .eq("company_id", ctx.companyId)
    .eq("user_id", parsed.data.userId);

  if (error) return { error: error.message };
  revalidatePath("/settings/team");
  return { success: true };
}

export async function deactivateMember(formData: FormData) {
  const ctx = await getOwnerOrDispatcherCtx();
  if (!ctx) return { error: "Nincs jogosultságod." };

  const userId = formData.get("userId") as string;
  if (!userId) return { error: "Hiányzó userId." };
  if (userId === ctx.user.id) return { error: "Saját magad nem távolíthatod el." };

  const { error } = await ctx.supabase
    .from("company_users")
    .update({ is_active: false })
    .eq("company_id", ctx.companyId)
    .eq("user_id", userId);

  if (error) return { error: error.message };
  revalidatePath("/settings/team");
  return { success: true };
}

export async function reactivateMember(formData: FormData) {
  const ctx = await getOwnerOrDispatcherCtx();
  if (!ctx) return { error: "Nincs jogosultságod." };

  const userId = formData.get("userId") as string;
  if (!userId) return { error: "Hiányzó userId." };

  const ent = await checkEntitlement(ctx.companyId, "technicians");
  if (!ent.allowed) return { error: "Elérted a szerelő-limitet." };

  const { error } = await ctx.supabase
    .from("company_users")
    .update({ is_active: true })
    .eq("company_id", ctx.companyId)
    .eq("user_id", userId);

  if (error) return { error: error.message };
  revalidatePath("/settings/team");
  return { success: true };
}

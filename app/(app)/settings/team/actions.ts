"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { createServiceClient } from "@/lib/supabase/service";
import { inviteSchema, roleSchema } from "@/lib/validators/settings";
import { checkEntitlement } from "@/lib/billing/entitlements";
import { z } from "zod";

async function getOwnerOrDispatcherCtx() {
  const ctx = await getAuthContext();
  if (!ctx || !["owner", "dispatcher"].includes(ctx.role)) return null;
  return { supabase: ctx.supabase, user: ctx.user, companyId: ctx.companyId, role: ctx.role };
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

const addTechnicianSchema = z.object({
  full_name: z.string().min(2, "Legalább 2 karakter"),
  email: z.string().email("Érvénytelen e-mail"),
  phone: z.string().optional(),
  password: z.string().min(6, "Minimum 6 karakter"),
  trades: z.string().optional(), // JSON array string
});

export async function addTechnician(formData: FormData) {
  const ctx = await getOwnerOrDispatcherCtx();
  if (!ctx) return { error: "Nincs jogosultságod." };

  const parsed = addTechnicianSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
    trades: formData.get("trades") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const ent = await checkEntitlement(ctx.companyId, "technicians");
  if (!ent.allowed) return { error: "Elérted a szerelő-limitet. Válts magasabb csomagra." };

  const service = createServiceClient();

  // Create auth user
  const { data: authUser, error: authErr } = await service.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });
  if (authErr || !authUser.user) return { error: authErr?.message ?? "Felhasználó létrehozása sikertelen." };

  const userId = authUser.user.id;

  // Upsert profile
  await service.from("profiles").upsert({
    id: userId,
    full_name: parsed.data.full_name,
    phone: parsed.data.phone ?? null,
  });

  // Parse trades
  let trades: string[] = [];
  try { trades = parsed.data.trades ? JSON.parse(parsed.data.trades) : []; } catch { trades = []; }

  // Add to company
  const { error: cuErr } = await service.from("company_users").insert({
    company_id: ctx.companyId,
    user_id: userId,
    role: "technician",
    is_active: true,
    trades,
  });

  if (cuErr) {
    await service.auth.admin.deleteUser(userId);
    return { error: cuErr.message };
  }

  revalidatePath("/settings/team");
  return { success: true };
}

export async function updateTechnicianTrades(userId: string, trades: string[]) {
  const ctx = await getOwnerOrDispatcherCtx();
  if (!ctx) return { error: "Nincs jogosultságod." };

  const { error } = await ctx.supabase
    .from("company_users")
    .update({ trades })
    .eq("company_id", ctx.companyId)
    .eq("user_id", userId);

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

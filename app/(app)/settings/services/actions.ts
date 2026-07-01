"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { serviceSchema } from "@/lib/validators/services";

async function getOwnerCtx() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu || !["owner", "dispatcher"].includes(cu.role)) return null;
  return { supabase, companyId: cu.company_id as string };
}

function parseService(formData: FormData) {
  return serviceSchema.safeParse({
    name: formData.get("name"),
    activity: formData.get("activity"),
    default_duration_min: formData.get("default_duration_min"),
    requires_survey: formData.get("requires_survey") === "true",
    follow_up_count: formData.get("follow_up_count") || 2,
    default_price: formData.get("default_price") || null,
    vat_rate: formData.get("vat_rate"),
    color: formData.get("color") || null,
    is_active: formData.get("is_active") !== "false",
    default_quote_template_id: formData.get("default_quote_template_id") || null,
    default_worksheet_template_id: formData.get("default_worksheet_template_id") || null,
  });
}

export async function createService(formData: FormData) {
  const ctx = await getOwnerCtx();
  if (!ctx) return { error: "Nincs jogosultság." };
  const parsed = parseService(formData);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { error } = await ctx.supabase.from("services")
    .insert({ company_id: ctx.companyId, ...parsed.data });
  if (error) return { error: error.message };
  revalidatePath("/settings/services");
  return { success: true };
}

export async function updateService(serviceId: string, formData: FormData) {
  const ctx = await getOwnerCtx();
  if (!ctx) return { error: "Nincs jogosultság." };
  const parsed = parseService(formData);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { error } = await ctx.supabase.from("services")
    .update(parsed.data).eq("id", serviceId).eq("company_id", ctx.companyId);
  if (error) return { error: error.message };
  revalidatePath("/settings/services");
  return { success: true };
}

export async function deleteService(serviceId: string) {
  const ctx = await getOwnerCtx();
  if (!ctx) return { error: "Nincs jogosultság." };
  const { error } = await ctx.supabase.from("services")
    .delete().eq("id", serviceId).eq("company_id", ctx.companyId);
  if (error) return { error: error.message };
  revalidatePath("/settings/services");
  return { success: true };
}

export async function reorderService(serviceId: string, sortOrder: number) {
  const ctx = await getOwnerCtx();
  if (!ctx) return { error: "Nincs jogosultság." };
  const { error } = await ctx.supabase.from("services")
    .update({ sort_order: sortOrder }).eq("id", serviceId).eq("company_id", ctx.companyId);
  if (error) return { error: error.message };
  revalidatePath("/settings/services");
  return { success: true };
}

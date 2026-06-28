"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { createServiceClient } from "@/lib/supabase/service";
import { geocodeAddress } from "@/lib/geo/geocode";
import { toH3 } from "@/lib/geo/h3";
import { customerSchema, siteSchema, equipmentSchema } from "@/lib/validators/crm";

async function getCompanyCtx(roles = ["owner", "dispatcher"] as string[]) {
  const ctx = await getAuthContext();
  if (!ctx || !roles.includes(ctx.role)) return null;
  return { supabase: ctx.supabase, companyId: ctx.companyId, role: ctx.role };
}

// --- Search ---

export async function searchCustomers(query: string) {
  const ctx = await getCompanyCtx(["owner", "dispatcher", "technician", "accountant"]);
  if (!ctx) return [];
  const q = query.trim();
  const { data } = await ctx.supabase
    .from("customers")
    .select("id, name, phone, email")
    .eq("company_id", ctx.companyId)
    .is("deleted_at", null)
    .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
    .order("name")
    .limit(20);
  return data ?? [];
}

// --- Quick create (intake) ---

export async function createQuickCustomer(formData: FormData) {
  const ctx = await getCompanyCtx();
  if (!ctx) return { error: "Nincs jogosultság." };

  const name = (formData.get("name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim();
  const city = (formData.get("city") as string)?.trim() || null;

  if (!name) return { error: "Név kötelező." };
  if (!address) return { error: "Cím kötelező." };

  const { data: customer, error: custErr } = await ctx.supabase
    .from("customers")
    .insert({ company_id: ctx.companyId, name, phone })
    .select("id").single();
  if (custErr || !customer) return { error: custErr?.message ?? "Hiba." };

  // Geocode async, don't block on failure
  let lat: number | null = null;
  let lng: number | null = null;
  let h3_index: string | null = null;
  const geo = await geocodeAddress(address, city ?? undefined);
  if (geo) { lat = geo.lat; lng = geo.lng; h3_index = toH3(geo.lat, geo.lng); }

  const { error: siteErr } = await ctx.supabase.from("sites").insert({
    company_id: ctx.companyId,
    customer_id: customer.id,
    address,
    city,
    lat,
    lng,
    h3_index,
  });

  if (siteErr) {
    // Roll back the customer if site creation fails — leave no orphan
    await ctx.supabase.from("customers").delete().eq("id", customer.id);
    return { error: `Helyszín mentése sikertelen: ${siteErr.message}` };
  }

  return { id: customer.id };
}

// --- Customer CRUD ---

export async function createCustomer(formData: FormData) {
  const ctx = await getCompanyCtx();
  if (!ctx) return { error: "Nincs jogosultság." };
  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    is_company: formData.get("is_company") === "true",
    tax_number: formData.get("tax_number") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { data, error } = await ctx.supabase.from("customers")
    .insert({ company_id: ctx.companyId, ...parsed.data }).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/customers");
  return { id: data.id };
}

export async function updateCustomer(customerId: string, formData: FormData) {
  const ctx = await getCompanyCtx();
  if (!ctx) return { error: "Nincs jogosultság." };
  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    is_company: formData.get("is_company") === "true",
    tax_number: formData.get("tax_number") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { error } = await ctx.supabase.from("customers")
    .update(parsed.data).eq("id", customerId).eq("company_id", ctx.companyId);
  if (error) return { error: error.message };
  revalidatePath(`/customers/${customerId}`);
  return { success: true };
}

export async function softDeleteCustomer(customerId: string) {
  const ctx = await getCompanyCtx();
  if (!ctx) return { error: "Nincs jogosultság." };
  const { error } = await ctx.supabase.from("customers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", customerId).eq("company_id", ctx.companyId);
  if (error) return { error: error.message };
  revalidatePath("/customers");
  redirect("/customers");
}

export async function restoreCustomer(customerId: string) {
  const ctx = await getCompanyCtx();
  if (!ctx) return { error: "Nincs jogosultság." };
  const { error } = await ctx.supabase.from("customers")
    .update({ deleted_at: null })
    .eq("id", customerId).eq("company_id", ctx.companyId);
  if (error) return { error: error.message };
  revalidatePath(`/customers/${customerId}`);
  return { success: true };
}

// --- Site CRUD ---

export async function createSite(customerId: string, formData: FormData) {
  const ctx = await getCompanyCtx();
  if (!ctx) return { error: "Nincs jogosultság." };
  const parsed = siteSchema.safeParse({
    label: formData.get("label") || undefined,
    address: formData.get("address"),
    city: formData.get("city") || undefined,
    zip: formData.get("zip") || undefined,
    access_notes: formData.get("access_notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  let lat: number | null = null, lng: number | null = null, h3_index: string | null = null;
  const geo = await geocodeAddress(parsed.data.address, parsed.data.city, parsed.data.zip);
  if (geo) { lat = geo.lat; lng = geo.lng; h3_index = toH3(geo.lat, geo.lng); }

  const { error } = await ctx.supabase.from("sites").insert({
    company_id: ctx.companyId, customer_id: customerId, ...parsed.data, lat, lng, h3_index,
  });
  if (error) return { error: error.message };
  revalidatePath(`/customers/${customerId}`);
  return { success: true };
}

export async function updateSite(siteId: string, customerId: string, formData: FormData) {
  const ctx = await getCompanyCtx();
  if (!ctx) return { error: "Nincs jogosultság." };
  const parsed = siteSchema.safeParse({
    label: formData.get("label") || undefined,
    address: formData.get("address"),
    city: formData.get("city") || undefined,
    zip: formData.get("zip") || undefined,
    access_notes: formData.get("access_notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  let lat: number | null = null, lng: number | null = null, h3_index: string | null = null;
  const geo = await geocodeAddress(parsed.data.address, parsed.data.city, parsed.data.zip);
  if (geo) { lat = geo.lat; lng = geo.lng; h3_index = toH3(geo.lat, geo.lng); }

  const { error } = await ctx.supabase.from("sites")
    .update({ ...parsed.data, lat, lng, h3_index })
    .eq("id", siteId).eq("company_id", ctx.companyId);
  if (error) return { error: error.message };
  revalidatePath(`/customers/${customerId}`);
  return { success: true };
}

export async function deleteSite(siteId: string, customerId: string) {
  const ctx = await getCompanyCtx();
  if (!ctx) return { error: "Nincs jogosultság." };
  const { error } = await ctx.supabase.from("sites")
    .delete().eq("id", siteId).eq("company_id", ctx.companyId);
  if (error) return { error: error.message };
  revalidatePath(`/customers/${customerId}`);
  return { success: true };
}

// --- Equipment CRUD ---

export async function createEquipment(siteId: string, customerId: string, formData: FormData) {
  const ctx = await getCompanyCtx();
  if (!ctx) return { error: "Nincs jogosultság." };
  const parsed = equipmentSchema.safeParse({
    kind: formData.get("kind"),
    manufacturer: formData.get("manufacturer") || undefined,
    model: formData.get("model") || undefined,
    serial_number: formData.get("serial_number") || undefined,
    installed_at: formData.get("installed_at") || undefined,
    warranty_until: formData.get("warranty_until") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { error } = await ctx.supabase.from("equipment").insert({
    company_id: ctx.companyId, site_id: siteId, ...parsed.data,
  });
  if (error) return { error: error.message };
  revalidatePath(`/customers/${customerId}`);
  return { success: true };
}

export async function updateEquipment(equipmentId: string, customerId: string, formData: FormData) {
  const ctx = await getCompanyCtx();
  if (!ctx) return { error: "Nincs jogosultság." };
  const parsed = equipmentSchema.safeParse({
    kind: formData.get("kind"),
    manufacturer: formData.get("manufacturer") || undefined,
    model: formData.get("model") || undefined,
    serial_number: formData.get("serial_number") || undefined,
    installed_at: formData.get("installed_at") || undefined,
    warranty_until: formData.get("warranty_until") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { error } = await ctx.supabase.from("equipment")
    .update(parsed.data).eq("id", equipmentId).eq("company_id", ctx.companyId);
  if (error) return { error: error.message };
  revalidatePath(`/customers/${customerId}`);
  return { success: true };
}

export async function softDeleteEquipment(equipmentId: string, customerId: string) {
  const ctx = await getCompanyCtx();
  if (!ctx) return { error: "Nincs jogosultság." };
  // equipment has no deleted_at — hard delete allowed (no invoicing dependency yet)
  const { error } = await ctx.supabase.from("equipment")
    .delete().eq("id", equipmentId).eq("company_id", ctx.companyId);
  if (error) return { error: error.message };
  revalidatePath(`/customers/${customerId}`);
  return { success: true };
}

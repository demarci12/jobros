"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { createServiceClient } from "@/lib/supabase/service";
import { geocodeAddress } from "@/lib/geo/geocode";
import { toH3 } from "@/lib/geo/h3";
import { customerSchema, siteSchema, equipmentSchema } from "@/lib/validators/crm";

async function geocodeWithTimeout(address: string, city?: string, zip?: string) {
  return Promise.race([
    geocodeAddress(address, city, zip),
    new Promise<null>(resolve => setTimeout(() => resolve(null), 800)),
  ]);
}

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

export async function searchCustomersByPhone(phone: string) {
  const ctx = await getCompanyCtx(["owner", "dispatcher", "technician", "accountant"]);
  if (!ctx) return [];
  const q = phone.trim();
  if (q.length < 4) return [];
  const { data } = await ctx.supabase
    .from("customers")
    .select("id, name, phone")
    .eq("company_id", ctx.companyId)
    .is("deleted_at", null)
    .ilike("phone", `%${q}%`)
    .order("name")
    .limit(3);
  return (data ?? []) as { id: string; name: string; phone: string | null }[];
}

// --- Quick create (intake) ---

export async function createQuickCustomer(formData: FormData) {
  const ctx = await getCompanyCtx();
  if (!ctx) return { error: "Nincs jogosultság." };

  const name = (formData.get("name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim();
  const city = (formData.get("city") as string)?.trim() || null;

  if (!name) return { error: "Név kötelező." };
  if (!address) return { error: "Cím kötelező." };

  const geo = await geocodeWithTimeout(address, city ?? undefined);

  const { data: result, error: rpcErr } = await ctx.supabase.rpc("create_customer_with_site", {
    p_company_id: ctx.companyId,
    p_name: name,
    p_phone: phone ?? "",
    p_email: email ?? "",
    p_address: address,
    p_city: city ?? "",
    p_lat: geo?.lat ?? 0,
    p_lng: geo?.lng ?? 0,
    p_h3_index: geo ? toH3(geo.lat, geo.lng) : "",
  });

  if (rpcErr || !result) return { error: rpcErr?.message ?? "Hiba." };

  const { customer_id, site_id } = result as { customer_id: string; site_id: string };

  revalidatePath("/customers");
  return { id: customer_id, site_id, name, phone };
}

export async function getSiteForCustomer(customerId: string) {
  const ctx = await getCompanyCtx(["owner", "dispatcher", "technician"]);
  if (!ctx) return null;
  const { data } = await ctx.supabase
    .from("sites")
    .select("id")
    .eq("customer_id", customerId)
    .eq("company_id", ctx.companyId)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export async function getServicesForIntake() {
  const ctx = await getCompanyCtx(["owner", "dispatcher"]);
  if (!ctx) return [];
  const { data } = await ctx.supabase
    .from("services")
    .select("id, name, default_duration_min, requires_survey, follow_up_count")
    .eq("company_id", ctx.companyId)
    .eq("is_active", true)
    .order("name");
  return (data ?? []).map(s => ({
    id: s.id,
    name: s.name,
    duration_min: s.default_duration_min ?? null,
    requiresSurvey: s.requires_survey ?? false,
    followUpCount: s.follow_up_count ?? 2,
  }));
}

const DEFAULT_WORKING_HOURS = {
  mon: { open: true, start: "08:00", end: "17:00" },
  tue: { open: true, start: "08:00", end: "17:00" },
  wed: { open: true, start: "08:00", end: "17:00" },
  thu: { open: true, start: "08:00", end: "17:00" },
  fri: { open: true, start: "08:00", end: "17:00" },
  sat: { open: false, start: "08:00", end: "13:00" },
  sun: { open: false, start: "08:00", end: "13:00" },
};

export async function getIntakeBookingConfig() {
  const ctx = await getCompanyCtx(["owner", "dispatcher"]);
  if (!ctx) return { technicians: [], defaultSlotDurationMin: 60, workingHours: DEFAULT_WORKING_HOURS, existingAppointments: [] };
  const in90Days = new Date(Date.now() + 90 * 86400_000).toISOString();
  const [{ data: technicians }, { data: company }, { data: existingAppointments }] = await Promise.all([
    ctx.supabase.from("company_users").select("user_id, profiles(id, full_name)").eq("company_id", ctx.companyId).eq("role", "technician").eq("is_active", true),
    ctx.supabase.from("companies").select("default_slot_duration_min, working_hours").eq("id", ctx.companyId).single(),
    ctx.supabase.from("appointments").select("starts_at, ends_at, technician_id").eq("company_id", ctx.companyId).gte("starts_at", new Date().toISOString()).lte("starts_at", in90Days).neq("status", "lemondva"),
  ]);
  return {
    technicians: (technicians ?? []).map((t: any) => ({ id: t.profiles?.id ?? t.user_id, name: t.profiles?.full_name ?? "Szerelő" })),
    defaultSlotDurationMin: company?.default_slot_duration_min ?? 60,
    workingHours: (company?.working_hours as typeof DEFAULT_WORKING_HOURS) ?? DEFAULT_WORKING_HOURS,
    existingAppointments: (existingAppointments ?? []) as { starts_at: string; ends_at: string; technician_id: string | null }[],
  };
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
  const geo = await geocodeWithTimeout(parsed.data.address, parsed.data.city, parsed.data.zip);
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

  const geo = await geocodeWithTimeout(parsed.data.address, parsed.data.city, parsed.data.zip);
  const geoFields = geo ? { lat: geo.lat, lng: geo.lng, h3_index: toH3(geo.lat, geo.lng) } : {};

  const { error } = await ctx.supabase.from("sites")
    .update({ ...parsed.data, ...geoFields })
    .eq("id", siteId).eq("company_id", ctx.companyId);
  if (error) return { error: error.message };
  revalidatePath(`/customers/${customerId}`);
  return { success: true, ...(geo ? {} : { geoFailed: true }) };
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

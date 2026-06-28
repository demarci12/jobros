"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { toH3 } from "@/lib/geo/h3";

async function getOwnerCtx() {
  const ctx = await getAuthContext();
  if (!ctx || !["owner", "dispatcher"].includes(ctx.role)) return null;
  return { supabase: ctx.supabase, companyId: ctx.companyId };
}

const zoneSchema = z.object({
  name: z.string().min(1).max(100),
  technician_id: z.string().uuid().optional().nullable(),
  home_lat: z.coerce.number().min(-90).max(90).optional().nullable(),
  home_lng: z.coerce.number().min(-180).max(180).optional().nullable(),
  radius_km: z.coerce.number().min(1).max(500).default(25),
});

export async function createZone(formData: FormData) {
  const ctx = await getOwnerCtx();
  if (!ctx) return { error: "Nincs jogosultság." };

  const parsed = zoneSchema.safeParse({
    name: formData.get("name"),
    technician_id: formData.get("technician_id") || null,
    home_lat: formData.get("home_lat") || null,
    home_lng: formData.get("home_lng") || null,
    radius_km: formData.get("radius_km") || 25,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { home_lat, home_lng, ...rest } = parsed.data;
  const home_h3 = home_lat && home_lng ? toH3(home_lat, home_lng) : null;

  const { error } = await ctx.supabase.from("service_zones").insert({
    company_id: ctx.companyId,
    home_lat, home_lng, home_h3,
    ...rest,
  });
  if (error) return { error: error.message };
  revalidatePath("/settings/zones");
  return { success: true };
}

export async function updateZone(zoneId: string, formData: FormData) {
  const ctx = await getOwnerCtx();
  if (!ctx) return { error: "Nincs jogosultság." };

  const parsed = zoneSchema.safeParse({
    name: formData.get("name"),
    technician_id: formData.get("technician_id") || null,
    home_lat: formData.get("home_lat") || null,
    home_lng: formData.get("home_lng") || null,
    radius_km: formData.get("radius_km") || 25,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { home_lat, home_lng, ...rest } = parsed.data;
  const home_h3 = home_lat && home_lng ? toH3(home_lat, home_lng) : null;

  const { error } = await ctx.supabase.from("service_zones")
    .update({ home_lat, home_lng, home_h3, ...rest })
    .eq("id", zoneId).eq("company_id", ctx.companyId);
  if (error) return { error: error.message };
  revalidatePath("/settings/zones");
  return { success: true };
}

export async function deleteZone(zoneId: string) {
  const ctx = await getOwnerCtx();
  if (!ctx) return { error: "Nincs jogosultság." };
  const { error } = await ctx.supabase.from("service_zones")
    .delete().eq("id", zoneId).eq("company_id", ctx.companyId);
  if (error) return { error: error.message };
  revalidatePath("/settings/zones");
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

async function getOwnerCtx() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu || cu.role !== "owner") return null;
  return { supabase, companyId: cu.company_id as string };
}

const daySchema = z.object({ open: z.boolean(), start: z.string(), end: z.string() });
const bookingSettingsSchema = z.object({
  booking_mode: z.enum(["smart", "manual"]),
  default_slot_duration_min: z.coerce.number().int().min(15).max(480),
  working_hours: z.object({
    mon: daySchema, tue: daySchema, wed: daySchema, thu: daySchema,
    fri: daySchema, sat: daySchema, sun: daySchema,
  }),
});

export async function updateBookingSettings(data: unknown) {
  const ctx = await getOwnerCtx();
  if (!ctx) return { error: "Nincs jogosultság." };

  const parsed = bookingSettingsSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { error } = await ctx.supabase
    .from("companies")
    .update({
      booking_mode: parsed.data.booking_mode,
      default_slot_duration_min: parsed.data.default_slot_duration_min,
      working_hours: parsed.data.working_hours,
    })
    .eq("id", ctx.companyId);

  if (error) return { error: error.message };
  revalidatePath("/settings/booking");
  return { success: true };
}

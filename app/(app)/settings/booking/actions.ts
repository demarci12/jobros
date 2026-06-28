"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/lib/supabase/auth-context";

async function getOwnerCtx() {
  const ctx = await getAuthContext();
  if (!ctx || ctx.role !== "owner") return null;
  return { supabase: ctx.supabase, companyId: ctx.companyId };
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

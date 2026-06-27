"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const SettingSchema = z.object({
  event: z.enum([
    "technician_on_the_way",
    "quote_ready",
    "invoice_sent",
    "service_reminder",
    "appointment_confirmed",
    "appointment_cancelled",
  ]),
  is_enabled: z.coerce.boolean(),
  channels: z.array(z.enum(["sms", "email"])).min(1).default(["sms"]),
  template: z.string().optional(),
});

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

export async function upsertNotificationSetting(data: {
  event: string;
  is_enabled: boolean;
  channels: string[];
  template?: string;
}) {
  const ctx = await getOwnerCtx();
  if (!ctx) return { error: "Nincs jogosultság." };

  const parsed = SettingSchema.safeParse(data);
  if (!parsed.success) return { error: "Érvénytelen adatok." };

  const { error } = await ctx.supabase
    .from("notification_settings")
    .upsert({
      company_id: ctx.companyId,
      ...parsed.data,
      updated_at: new Date().toISOString(),
    }, { onConflict: "company_id,event" });

  if (error) return { error: error.message };
  revalidatePath("/settings/notifications");
  return { success: true };
}

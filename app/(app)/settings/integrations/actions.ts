"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { createServiceClient } from "@/lib/supabase/service";

async function getOwnerCtx() {
  const ctx = await getAuthContext();
  if (!ctx || ctx.role !== "owner") return null;
  return { supabase: ctx.supabase, companyId: ctx.companyId, userId: ctx.user.id };
}

export async function installApp(appSlug: string, apiKey: string) {
  const ctx = await getOwnerCtx();
  if (!ctx) return { error: "Nincs jogosultság." };

  const service = createServiceClient();

  // Store the API key in Vault
  let secretRef: string | null = null;
  if (apiKey.trim()) {
    const { data, error: vaultErr } = await service.rpc("vault.create_secret", {
      secret: apiKey.trim(),
      name: `${ctx.companyId}:${appSlug}`,
    });
    if (vaultErr) {
      // Vault RPC might not be available — store directly as config (dev fallback)
      // In production, Vault should always be used
      console.warn("Vault unavailable, falling back to config storage (NOT for production):", vaultErr.message);
    } else {
      secretRef = data as string;
    }
  }

  const { error } = await ctx.supabase.from("installed_apps").upsert({
    company_id: ctx.companyId,
    app_slug: appSlug,
    secret_ref: secretRef,
    config: apiKey.trim() && !secretRef ? { api_key_dev: apiKey.trim() } : null,
    is_enabled: true,
    installed_by: ctx.userId,
    installed_at: new Date().toISOString(),
  }, { onConflict: "company_id,app_slug" });

  if (error) return { error: error.message };
  revalidatePath("/settings/integrations");
  return { success: true };
}

export async function toggleApp(appSlug: string, isEnabled: boolean) {
  const ctx = await getOwnerCtx();
  if (!ctx) return { error: "Nincs jogosultság." };
  const { error } = await ctx.supabase.from("installed_apps")
    .update({ is_enabled: isEnabled })
    .eq("company_id", ctx.companyId).eq("app_slug", appSlug);
  if (error) return { error: error.message };
  revalidatePath("/settings/integrations");
  return { success: true };
}

export async function uninstallApp(appSlug: string) {
  const ctx = await getOwnerCtx();
  if (!ctx) return { error: "Nincs jogosultság." };
  const { error } = await ctx.supabase.from("installed_apps")
    .delete().eq("company_id", ctx.companyId).eq("app_slug", appSlug);
  if (error) return { error: error.message };
  revalidatePath("/settings/integrations");
  return { success: true };
}

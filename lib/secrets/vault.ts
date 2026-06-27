import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Reads a secret from Supabase Vault by its ref.
 * The ref is stored in installed_apps.secret_ref (never the plain key).
 */
export async function getSecret(secretRef: string): Promise<string | null> {
  const service = createServiceClient();
  // Supabase Vault stores secrets in vault.secrets (accessible via service role)
  const { data, error } = await service
    .from("vault.secrets")
    .select("decrypted_secret")
    .eq("id", secretRef)
    .maybeSingle();

  if (error || !data) return null;
  return (data as any).decrypted_secret ?? null;
}

export async function storeSecret(name: string, secret: string): Promise<string | null> {
  const service = createServiceClient();
  const { data, error } = await service.rpc("vault.create_secret", {
    secret,
    name,
  });
  if (error || !data) return null;
  return data as string;
}

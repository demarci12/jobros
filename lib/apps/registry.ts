import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { getSecret } from "@/lib/secrets/vault";
import type { AppCategory, Connector, InvoicingProvider } from "./types";
import { BillingoProvider } from "./invoicing/billingo";

type ProviderFactory = (apiKey: string) => Connector;

const PROVIDER_MAP: Record<string, ProviderFactory> = {
  billingo: (key) => new BillingoProvider(key),
};

export async function resolveConnector<T extends Connector>(
  companyId: string,
  category: AppCategory
): Promise<T | null> {
  const service = createServiceClient();

  const { data: apps } = await service
    .from("installed_apps")
    .select("app_slug, config, secret_ref, is_enabled, app_definitions(category)")
    .eq("company_id", companyId)
    .eq("is_enabled", true);

  if (!apps) return null;

  const match = apps.find((a: any) => a.app_definitions?.category === category);
  if (!match) return null;

  const factory = PROVIDER_MAP[match.app_slug];
  if (!factory) return null;

  const apiKey = match.secret_ref ? await getSecret(match.secret_ref) : null;
  if (!apiKey) return null;

  return factory(apiKey) as T;
}

export async function resolveInvoicingProvider(companyId: string): Promise<InvoicingProvider | null> {
  return resolveConnector<InvoicingProvider>(companyId, "invoicing");
}

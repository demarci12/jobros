import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { createServiceClient } from "@/lib/supabase/service";
import { SubscriptionClient } from "./subscription-client";

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: { success?: string; canceled?: string };
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { companyId, role } = ctx;

  const service = createServiceClient();

  const [{ data: sub }, { data: plans }] = await Promise.all([
    service
      .from("subscriptions")
      .select("*, plan_definitions(name, price_monthly, price_yearly, features, max_technicians)")
      .eq("company_id", companyId)
      .maybeSingle(),
    service
      .from("plan_definitions")
      .select("slug, name, price_monthly, price_yearly, max_technicians, features, stripe_price_id, is_active")
      .eq("is_active", true)
      .neq("slug", "trial")
      .order("sort_order"),
  ]);

  return (
    <SubscriptionClient
      sub={sub}
      plans={plans ?? []}
      role={role}
      success={searchParams.success === "1"}
      canceled={searchParams.canceled === "1"}
    />
  );
}

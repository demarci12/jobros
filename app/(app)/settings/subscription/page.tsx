import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SubscriptionClient } from "./subscription-client";

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: { success?: string; canceled?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users")
    .select("company_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!cu) redirect("/onboarding");

  const service = createServiceClient();

  const [{ data: sub }, { data: plans }] = await Promise.all([
    service
      .from("subscriptions")
      .select("*, plan_definitions(name, price_monthly, price_yearly, features, max_technicians)")
      .eq("company_id", cu.company_id)
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
      role={cu.role}
      success={searchParams.success === "1"}
      canceled={searchParams.canceled === "1"}
    />
  );
}

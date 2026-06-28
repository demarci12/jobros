import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/shell/app-shell";

async function ensureCompany(userId: string, email: string) {
  const service = createServiceClient();

  // Check again with service role to avoid RLS timing issues
  const { data: existing } = await service
    .from("company_users")
    .select("company_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (existing) return;

  // Derive company name from email
  const companyName = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase()) + " Kft.";

  const { data: company } = await service
    .from("companies")
    .insert({ name: companyName, plan: "trial" })
    .select("id")
    .single();
  if (!company) return;

  const trialEndsAt = new Date(Date.now() + 14 * 86400000).toISOString();

  await Promise.all([
    service.from("company_users").insert({
      company_id: company.id,
      user_id: userId,
      role: "owner",
      is_active: true,
    }),
    service.from("subscriptions").insert({
      company_id: company.id,
      plan_slug: "trial",
      status: "trialing",
      trial_ends_at: trialEndsAt,
    }),
  ]);
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!cu) {
    await ensureCompany(user.id, user.email ?? "felhasznalo");
  }

  return (
    <TooltipProvider>
      <AppShell>{children}</AppShell>
    </TooltipProvider>
  );
}

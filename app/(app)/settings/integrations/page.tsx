import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppCard } from "@/components/apps/AppCard";

const CATEGORY_LABELS: Record<string, string> = {
  invoicing: "Számlázás",
  calendar: "Naptár",
  payment: "Fizetés",
  messaging: "Üzenetküldés",
  accounting: "Könyvelés",
};

const CATEGORY_ORDER = ["invoicing", "calendar", "messaging", "payment", "accounting"];

export default async function IntegrationsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) redirect("/dashboard");

  const [{ data: appDefs }, { data: installed }] = await Promise.all([
    supabase.from("app_definitions").select("slug, name, category, description, auth_type, sort_order").eq("is_active", true).order("sort_order"),
    supabase.from("installed_apps").select("app_slug, is_enabled").eq("company_id", cu.company_id),
  ]);

  const installedMap = Object.fromEntries((installed ?? []).map(a => [a.app_slug, a]));
  const canEdit = cu.role === "owner";

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const apps = (appDefs ?? []).filter(a => a.category === cat);
    if (apps.length) acc[cat] = apps;
    return acc;
  }, {} as Record<string, typeof appDefs>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Integrációk</h1>
        <p className="text-sm text-muted-foreground">Számlázó, naptár, üzenetküldő és fizetési csatlakozók telepítése.</p>
      </div>

      {Object.entries(grouped).map(([cat, apps]) => (
        <div key={cat} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {CATEGORY_LABELS[cat] ?? cat}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(apps ?? []).map(app => (
              <AppCard
                key={app.slug}
                app={app}
                installed={installedMap[app.slug] ?? null}
                canEdit={canEdit}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

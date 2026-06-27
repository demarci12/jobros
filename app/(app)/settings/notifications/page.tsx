import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationsClient } from "./notifications-client";
import { DEFAULT_TEMPLATES } from "@/lib/notifications/templates";
import type { NotificationEvent } from "@/lib/notifications/templates";

const EVENT_LABELS: Record<NotificationEvent, string> = {
  technician_on_the_way:  "Szerelő úton (on-my-way)",
  quote_ready:            "Árajánlat elkészült",
  invoice_sent:           "Számla kiállítva",
  service_reminder:       "Szerviz emlékeztető",
  appointment_confirmed:  "Időpont visszaigazolás",
  appointment_cancelled:  "Időpont lemondás",
};

export default async function NotificationsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) redirect("/onboarding");

  const { data: dbSettings } = await supabase
    .from("notification_settings")
    .select("event, is_enabled, channels, template")
    .eq("company_id", cu.company_id);

  const settingsMap = Object.fromEntries((dbSettings ?? []).map(s => [s.event, s]));

  // Build full settings list from enum keys, filling defaults
  const settings = (Object.keys(EVENT_LABELS) as NotificationEvent[]).map(event => ({
    event,
    label: EVENT_LABELS[event],
    is_enabled: settingsMap[event]?.is_enabled ?? true,
    channels: (settingsMap[event]?.channels ?? ["sms"]) as ("sms" | "email")[],
    template: settingsMap[event]?.template ?? DEFAULT_TEMPLATES[event],
    defaultTemplate: DEFAULT_TEMPLATES[event],
  }));

  const canEdit = cu.role === "owner";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Értesítések</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Eseményenkénti ki/be kapcsoló, csatorna (SMS/email) és sablon.
        </p>
      </div>
      <NotificationsClient settings={settings} canEdit={canEdit} />
    </div>
  );
}

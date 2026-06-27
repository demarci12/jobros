"use client";

import { useState, useTransition } from "react";
import { toggleApp, uninstallApp } from "@/app/(app)/settings/integrations/actions";
import { InstallDialog } from "./InstallDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type AppDef = { slug: string; name: string; description: string | null; auth_type: string };
type InstalledApp = { is_enabled: boolean } | null;

export function AppCard({
  app,
  installed,
  canEdit,
}: {
  app: AppDef;
  installed: InstalledApp;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [showInstall, setShowInstall] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    if (!installed) return;
    startTransition(async () => {
      const result = await toggleApp(app.slug, !installed.is_enabled);
      if (result?.error) toast.error(result.error);
      else router.refresh();
    });
  }

  function handleUninstall() {
    if (!confirm(`Eltávolítod: ${app.name}?`)) return;
    startTransition(async () => {
      const result = await uninstallApp(app.slug);
      if (result?.error) toast.error(result.error);
      else { toast.success(`${app.name} eltávolítva.`); router.refresh(); }
    });
  }

  return (
    <>
      <div className={`rounded-xl border p-4 space-y-3 transition-colors ${installed?.is_enabled ? "border-foreground/20" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm">{app.name}</p>
              {installed && (
                <Badge variant="outline" className={`text-xs ${installed.is_enabled ? "text-green-700 border-green-300" : "text-muted-foreground"}`}>
                  {installed.is_enabled ? "Aktív" : "Letiltva"}
                </Badge>
              )}
            </div>
            {app.description && <p className="text-xs text-muted-foreground">{app.description}</p>}
          </div>
          <Badge variant="outline" className="text-xs shrink-0 capitalize">{app.auth_type}</Badge>
        </div>

        {canEdit && (
          <div className="flex gap-2">
            {!installed ? (
              <Button size="sm" variant="outline" onClick={() => setShowInstall(true)}>
                Telepítés
              </Button>
            ) : (
              <>
                <Button size="sm" variant="ghost" disabled={isPending} onClick={handleToggle}
                  className={installed.is_enabled ? "text-muted-foreground" : "text-green-700"}>
                  {installed.is_enabled
                    ? <><ToggleRight size={14} className="mr-1" /> Letilt</>
                    : <><ToggleLeft size={14} className="mr-1" /> Engedélyez</>}
                </Button>
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive"
                  disabled={isPending} onClick={handleUninstall}>
                  <Trash2 size={13} className="mr-1" /> Eltávolít
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <InstallDialog open={showInstall} onClose={() => setShowInstall(false)} app={app} />
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { installApp } from "@/app/(app)/settings/integrations/actions";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function InstallDialog({
  open,
  onClose,
  app,
}: {
  open: boolean;
  onClose: () => void;
  app: { slug: string; name: string; auth_type: string; description: string | null };
}) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleInstall() {
    startTransition(async () => {
      const result = await installApp(app.slug, apiKey);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`${app.name} telepítve.`);
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{app.name} telepítése</DialogTitle>
          {app.description && <DialogDescription>{app.description}</DialogDescription>}
        </DialogHeader>

        {app.auth_type === "api_key" ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>API kulcs</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="Illeszd be az API kulcsot"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                A kulcsot titkosítva tároljuk a Supabase Vaultban.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>Mégsem</Button>
              <Button disabled={isPending || !apiKey.trim()} onClick={handleInstall}>
                {isPending ? "Telepítés…" : "Telepítés"}
              </Button>
            </div>
          </div>
        ) : app.auth_type === "oauth" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Az OAuth telepítés a következő verzióban lesz elérhető. Addig API-kulccsal is konfigurálható.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>Bezárás</Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Mégsem</Button>
            <Button disabled={isPending} onClick={handleInstall}>Telepítés</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

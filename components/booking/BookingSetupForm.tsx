"use client";

import { useState, useEffect } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getNextAppointmentKind, getSequenceLabel } from "@/lib/jobs/appointment-sequence";
import { createQuickEquipment } from "./actions";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Site = { id: string; address: string; city: string | null; zip?: string | null };
type Service = { id: string; name: string; duration_min: number | null; requiresSurvey: boolean; followUpCount: number };
type Equipment = { id: string; manufacturer: string; model: string | null; kind: string; site_id: string | null };

export function BookingSetupForm({
  sites,
  services,
  equipment,
  onCancel,
  onBack,
  onSubmit,
}: {
  sites: Site[];
  services: Service[];
  equipment: Equipment[];
  onCancel?: () => void;
  onBack?: () => void;
  onSubmit: (v: { siteId: string; serviceId: string; equipmentIds: string[]; title: string; kind: "felmeres" | "munka" | "kovetes" }) => void;
}) {
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [equipmentIds, setEquipmentIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [localEquipment, setLocalEquipment] = useState<Equipment[]>(equipment);
  const [newEquipmentLabel, setNewEquipmentLabel] = useState("");
  const [addingEquipment, setAddingEquipment] = useState(false);

  useEffect(() => {
    setSiteId(sites[0]?.id ?? "");
    setServiceId(services[0]?.id ?? "");
    setEquipmentIds([]);
    setTitle("");
    setLocalEquipment(equipment);
    setNewEquipmentLabel("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const siteEquipment = localEquipment.filter(e => !e.site_id || e.site_id === siteId);

  async function handleAddEquipment() {
    const label = newEquipmentLabel.trim();
    if (!label || !siteId) return;
    setAddingEquipment(true);
    const result = await createQuickEquipment({ siteId, label });
    setAddingEquipment(false);
    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }
    const newEquip = result.equipment!;
    setLocalEquipment(prev => [...prev, newEquip]);
    setEquipmentIds(prev => [...prev, newEquip.id]);
    setNewEquipmentLabel("");
  }
  const selectedSite = sites.find(s => s.id === siteId);
  const siteLabel = selectedSite ? [selectedSite.zip, selectedSite.address, selectedSite.city].filter(Boolean).join(", ") : undefined;
  const selectedService = services.find(s => s.id === serviceId);
  const serviceLabel = selectedService ? `${selectedService.name}${selectedService.duration_min ? ` — ${selectedService.duration_min} perc` : ""}` : undefined;

  function toggleEquipment(id: string) {
    setEquipmentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const nextKind = selectedService
    ? getNextAppointmentKind({ requires_survey: selectedService.requiresSurvey, follow_up_count: selectedService.followUpCount }, [])
    : "munka";

  const canProceed = !!siteId && !!serviceId;

  return (
    <div className="space-y-5">
      {/* Telephely — kötelező */}
      <div className="rounded-md border p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Telephely *</p>
        {sites.length === 0 ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            Ehhez az ügyfélhez nincs rögzített cím. Az ügyfél profiljánál add hozzá először.
          </p>
        ) : (
          <Select value={siteId} onValueChange={v => { setSiteId(v ?? ""); setEquipmentIds([]); }}>
            <SelectTrigger><SelectValue placeholder="Válassz helyszínt…">{siteLabel}</SelectValue></SelectTrigger>
            <SelectContent>
              {sites.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {[s.zip, s.address, s.city].filter(Boolean).join(", ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Munka részletei */}
      <div className="rounded-md border p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Munka részletei</p>
        <div className="space-y-1.5">
          <Label>Szolgáltatás *</Label>
          {services.length === 0 ? (
            <p className="text-xs text-muted-foreground pt-1">
              Nincs szolgáltatás.{" "}
              <a href="/settings/services" className="underline">Beállítások → Szolgáltatások</a>
            </p>
          ) : (
            <Select value={serviceId} onValueChange={v => v && setServiceId(v)}>
              <SelectTrigger><SelectValue placeholder="Válassz szolgáltatást…">{serviceLabel}</SelectValue></SelectTrigger>
              <SelectContent>
                {services.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}{s.duration_min ? ` — ${s.duration_min} perc` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedService && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Ez lesz:</span>
            <Badge variant="secondary">{getSequenceLabel(nextKind)}</Badge>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Berendezés (opcionális)</Label>
          {siteEquipment.length === 0 ? (
            <p className="text-xs text-muted-foreground pt-1">
              Ehhez a helyszínhez nincs még rögzített berendezés — vedd fel gyorsan alább, a részleteket később kitöltheted.
            </p>
          ) : (
            <div className="rounded-md border divide-y max-h-48 overflow-y-auto">
              {siteEquipment.map(e => (
                <label key={e.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={equipmentIds.includes(e.id)}
                    onChange={() => toggleEquipment(e.id)}
                  />
                  <span>{e.manufacturer}{e.model ? ` ${e.model}` : ""} ({e.kind})</span>
                </label>
              ))}
            </div>
          )}
          {siteId && (
            <div className="flex gap-2 pt-1">
              <Input
                value={newEquipmentLabel}
                onChange={e => setNewEquipmentLabel(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddEquipment(); } }}
                placeholder="Pl. Daikin split klíma…"
                className="h-8 text-sm"
              />
              <Button
                type="button" size="sm" variant="outline" className="h-8 shrink-0"
                disabled={!newEquipmentLabel.trim() || addingEquipment}
                onClick={handleAddEquipment}
              >
                {addingEquipment ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Megnevezés (opcionális)</Label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={selectedService?.name ?? "Pl. Éves klíma karbantartás"}
          />
        </div>
      </div>

      <div className="flex justify-between gap-2">
        {onBack ? <Button variant="ghost" onClick={onBack}>← Vissza</Button> : <span />}
        <div className="flex gap-2">
          {onCancel && <Button variant="outline" onClick={onCancel}>Mégsem</Button>}
          <Button
            disabled={!canProceed}
            onClick={() => onSubmit({ siteId, serviceId, equipmentIds, title, kind: nextKind })}
          >
            Időpont választása →
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { createZone, updateZone, deleteZone } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Zone = { id: string; name: string | null; technician_id: string | null; home_lat: number | null; home_lng: number | null; radius_km: number | null; is_active: boolean };
type Technician = { id: string; name: string };

function ZoneRow({ zone, technicians, canEdit }: { zone: Zone; technicians: Technician[]; canEdit: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  function handleDelete() {
    if (!confirm("Törlöd ezt a zónát?")) return;
    startTransition(async () => {
      const result = await deleteZone(zone.id);
      if (result?.error) toast.error(result.error);
      else { toast.success("Zóna törölve."); router.refresh(); }
    });
  }

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateZone(zone.id, fd);
      if (result?.error) toast.error(result.error);
      else { toast.success("Zóna frissítve."); setEditing(false); router.refresh(); }
    });
  }

  const tech = technicians.find(t => t.id === zone.technician_id);

  if (editing) {
    return (
      <form onSubmit={handleUpdate} className="rounded-lg border p-3 space-y-3 bg-muted/20">
        <ZoneForm defaultValues={zone} technicians={technicians} />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isPending}>Mentés</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Mégsem</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm">
      <MapPin size={15} className="text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">{zone.name ?? "Névtelen zóna"}</p>
        <p className="text-xs text-muted-foreground">
          {tech ? tech.name : "Egész cég"} · {zone.radius_km ?? 25} km radius
          {zone.home_lat && zone.home_lng ? ` · ${zone.home_lat.toFixed(4)}, ${zone.home_lng.toFixed(4)}` : ""}
        </p>
      </div>
      {canEdit && (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Szerkeszt</Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
            disabled={isPending} onClick={handleDelete}>
            <Trash2 size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}

function ZoneForm({ defaultValues, technicians }: { defaultValues?: Partial<Zone>; technicians: Technician[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div className="col-span-2 sm:col-span-3 space-y-1">
        <Label className="text-xs">Zóna neve</Label>
        <Input name="name" defaultValue={defaultValues?.name ?? ""} placeholder="Pl. Budapest belváros" className="h-8" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Szerelő (opcionális)</Label>
        <select name="technician_id" defaultValue={defaultValues?.technician_id ?? ""}
          className="h-8 w-full rounded-md border bg-background px-2 text-sm">
          <option value="">— Egész cég —</option>
          {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Radius (km)</Label>
        <Input type="number" name="radius_km" defaultValue={defaultValues?.radius_km ?? 25} min={1} max={500} className="h-8" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Szélességi fok</Label>
        <Input type="number" name="home_lat" defaultValue={defaultValues?.home_lat ?? ""} step={0.000001} placeholder="47.4979" className="h-8" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Hosszúsági fok</Label>
        <Input type="number" name="home_lng" defaultValue={defaultValues?.home_lng ?? ""} step={0.000001} placeholder="19.0402" className="h-8" />
      </div>
    </div>
  );
}

export function ZonesClient({ zones, technicians, canEdit }: { zones: Zone[]; technicians: Technician[]; canEdit: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createZone(fd);
      if (result?.error) toast.error(result.error);
      else { toast.success("Zóna létrehozva."); setShowAdd(false); router.refresh(); }
    });
  }

  return (
    <div className="space-y-2 max-w-xl">
      {zones.map(z => (
        <ZoneRow key={z.id} zone={z} technicians={technicians} canEdit={canEdit} />
      ))}

      {zones.length === 0 && !showAdd && (
        <p className="text-sm text-muted-foreground">Még nincs szervizzóna. Adj hozzá egyet a dispatch-hez.</p>
      )}

      {showAdd ? (
        <form onSubmit={handleCreate} className="rounded-lg border p-3 space-y-3 bg-muted/20">
          <ZoneForm technicians={technicians} />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending}>Létrehozás</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Mégsem</Button>
          </div>
        </form>
      ) : canEdit ? (
        <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={14} className="mr-1.5" /> Új zóna
        </Button>
      ) : null}
    </div>
  );
}

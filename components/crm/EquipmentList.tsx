"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wrench, Plus, Pencil, Trash2, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ConfirmDelete } from "@/components/common/ConfirmDelete";
import { createEquipment, updateEquipment, softDeleteEquipment } from "@/lib/crm/actions";
import { toast } from "sonner";

type Equipment = {
  id: string; kind: string; manufacturer: string | null; model: string | null;
  serial_number: string | null; installed_at: string | null; warranty_until: string | null;
  next_service_due: string | null; notes: string | null; site_id: string;
};

const KIND_LABELS: Record<string, string> = {
  klima: "Klíma", kazan: "Kazán", hoszivattyu: "Hőszivattyú",
  legkezelo: "Légkezelő", egyeb: "Egyéb",
};

function EquipmentForm({ eq, siteId, customerId, onDone }: {
  eq?: Equipment; siteId: string; customerId: string; onDone: () => void;
}) {
  const router = useRouter();
  const [kind, setKind] = useState(eq?.kind ?? "klima");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("kind", kind);
    startTransition(async () => {
      const result = eq
        ? await updateEquipment(eq.id, customerId, fd)
        : await createEquipment(siteId, customerId, fd);
      if (result?.error) toast.error(result.error);
      else { toast.success(eq ? "Berendezés mentve." : "Berendezés hozzáadva."); onDone(); router.refresh(); }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t mt-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <Label>Típus *</Label>
          <Select value={kind} onValueChange={v => v && setKind(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(KIND_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="manufacturer">Gyártó</Label>
          <Input id="manufacturer" name="manufacturer" defaultValue={eq?.manufacturer ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="model">Modell</Label>
          <Input id="model" name="model" defaultValue={eq?.model ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="serial_number">Szériaszám</Label>
          <Input id="serial_number" name="serial_number" defaultValue={eq?.serial_number ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="installed_at">Beépítés dátuma</Label>
          <Input id="installed_at" name="installed_at" type="date" defaultValue={eq?.installed_at ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="warranty_until">Garancia lejárat</Label>
          <Input id="warranty_until" name="warranty_until" type="date" defaultValue={eq?.warranty_until ?? ""} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>{eq ? "Mentés" : "Hozzáadás"}</Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone}>Mégsem</Button>
      </div>
    </form>
  );
}

export function EquipmentList({ siteId, customerId, equipment, canEdit }: {
  siteId: string; customerId: string; equipment: Equipment[]; canEdit: boolean;
}) {
  const router = useRouter();
  const [addingNew, setAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await softDeleteEquipment(deleteId, customerId);
      if (result?.error) toast.error(result.error);
      else { toast.success("Berendezés törölve."); setDeleteId(null); router.refresh(); }
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-2">
      {equipment.length === 0 && !addingNew && (
        <p className="text-xs text-muted-foreground">Nincs berendezés ezen a helyszínen.</p>
      )}
      {equipment.map(eq => (
        <div key={eq.id} className="flex items-start justify-between gap-2 rounded-md border px-3 py-2">
          <div className="flex items-start gap-2 min-w-0">
            <Wrench size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-medium">{KIND_LABELS[eq.kind] ?? eq.kind}</span>
                {eq.manufacturer && <span className="text-xs text-muted-foreground">{eq.manufacturer}</span>}
                {eq.model && <span className="text-xs text-muted-foreground">{eq.model}</span>}
              </div>
              {eq.serial_number && <p className="text-xs text-muted-foreground">S/N: {eq.serial_number}</p>}
              {eq.next_service_due && (
                <p className={`text-xs flex items-center gap-1 mt-0.5 ${eq.next_service_due < today ? "text-destructive" : "text-muted-foreground"}`}>
                  <CalendarClock size={11} />
                  Köv. szerviz: {eq.next_service_due}
                  {eq.next_service_due < today && <Badge variant="destructive" className="text-[10px] px-1 py-0">Lejárt</Badge>}
                </p>
              )}
              {editingId === eq.id && (
                <EquipmentForm eq={eq} siteId={siteId} customerId={customerId} onDone={() => setEditingId(null)} />
              )}
            </div>
          </div>
          {canEdit && editingId !== eq.id && (
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" className="h-6 w-6"
                onClick={() => setEditingId(editingId === eq.id ? null : eq.id)}>
                <Pencil size={12} />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => setDeleteId(eq.id)}>
                <Trash2 size={12} />
              </Button>
            </div>
          )}
        </div>
      ))}

      {addingNew && (
        <EquipmentForm siteId={siteId} customerId={customerId} onDone={() => setAddingNew(false)} />
      )}

      {canEdit && !addingNew && (
        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setAddingNew(true)}>
          <Plus size={12} className="mr-1" /> Berendezés
        </Button>
      )}

      <ConfirmDelete
        open={!!deleteId}
        onOpenChange={open => !open && setDeleteId(null)}
        title="Berendezés törlése"
        description="A berendezés és szerviz-előzménye törlődik."
        onConfirm={handleDelete}
        loading={isPending}
      />
    </div>
  );
}

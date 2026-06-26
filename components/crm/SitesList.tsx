"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDelete } from "@/components/common/ConfirmDelete";
import { EquipmentList } from "./EquipmentList";
import { createSite, updateSite, deleteSite } from "@/lib/crm/actions";
import { toast } from "sonner";

type Site = { id: string; label: string | null; address: string; city: string | null; zip: string | null; access_notes: string | null; lat: unknown; lng: unknown; };
type Equipment = { id: string; kind: string; manufacturer: string | null; model: string | null; serial_number: string | null; installed_at: string | null; warranty_until: string | null; next_service_due: string | null; notes: string | null; site_id: string; };

function SiteForm({ site, customerId, onDone }: { site?: Site; customerId: string; onDone: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = site
        ? await updateSite(site.id, customerId, fd)
        : await createSite(customerId, fd);
      if (result?.error) toast.error(result.error);
      else { toast.success(site ? "Cím mentve." : "Cím hozzáadva."); onDone(); router.refresh(); }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="label">Cím neve (pl. Iroda)</Label>
          <Input id="label" name="label" defaultValue={site?.label ?? ""} placeholder="Lakás, Iroda…" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="zip">Irányítószám</Label>
          <Input id="zip" name="zip" defaultValue={site?.zip ?? ""} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="address">Utca, házszám *</Label>
          <Input id="address" name="address" defaultValue={site?.address ?? ""} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="city">Város</Label>
          <Input id="city" name="city" defaultValue={site?.city ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="access_notes">Bejutási info</Label>
          <Input id="access_notes" name="access_notes" defaultValue={site?.access_notes ?? ""} placeholder="kapukód…" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>{site ? "Mentés" : "Hozzáadás"}</Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone}>Mégsem</Button>
      </div>
    </form>
  );
}

export function SitesList({ customerId, sites, equipment, canEdit }: {
  customerId: string;
  sites: Site[];
  equipment: Equipment[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [addingNew, setAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deleteSite(deleteId, customerId);
      if (result?.error) toast.error(result.error);
      else { toast.success("Cím törölve."); setDeleteId(null); router.refresh(); }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Helyszínek</h2>
        {canEdit && !addingNew && (
          <Button size="sm" variant="outline" onClick={() => setAddingNew(true)}>
            <Plus size={14} className="mr-1" /> Új cím
          </Button>
        )}
      </div>

      {addingNew && (
        <Card>
          <CardContent className="pt-4">
            <SiteForm customerId={customerId} onDone={() => setAddingNew(false)} />
          </CardContent>
        </Card>
      )}

      {sites.map(site => {
        const siteEquipment = equipment.filter(e => e.site_id === site.id);
        const isCollapsed = collapsed[site.id];
        return (
          <Card key={site.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <button
                  className="flex items-center gap-2 text-left flex-1"
                  onClick={() => setCollapsed(p => ({ ...p, [site.id]: !p[site.id] }))}
                >
                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  <MapPin size={16} className="shrink-0 text-muted-foreground" />
                  <div>
                    {site.label && <span className="text-xs font-medium text-muted-foreground mr-2">{site.label}</span>}
                    <span className="font-medium text-sm">{site.address}{site.city ? `, ${site.city}` : ""}</span>
                    {site.access_notes && <p className="text-xs text-muted-foreground">{site.access_notes}</p>}
                  </div>
                </button>
                {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => setEditingId(editingId === site.id ? null : site.id)}>
                      <Pencil size={13} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(site.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                )}
              </div>
              {editingId === site.id && (
                <SiteForm site={site} customerId={customerId} onDone={() => setEditingId(null)} />
              )}
            </CardHeader>
            {!isCollapsed && (
              <CardContent className="pt-0">
                <EquipmentList siteId={site.id} customerId={customerId} equipment={siteEquipment} canEdit={canEdit} />
              </CardContent>
            )}
          </Card>
        );
      })}

      {sites.length === 0 && !addingNew && (
        <p className="text-sm text-muted-foreground">Még nincs rögzített helyszín.</p>
      )}

      <ConfirmDelete
        open={!!deleteId}
        onOpenChange={open => !open && setDeleteId(null)}
        title="Helyszín törlése"
        description="A helyszínen lévő berendezések is törlődnek."
        onConfirm={handleDelete}
        loading={isPending}
      />
    </div>
  );
}

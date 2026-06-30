"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ConfirmDelete } from "@/components/common/ConfirmDelete";
import { createService, updateService, deleteService } from "./actions";
import { toast } from "sonner";

type Service = {
  id: string; name: string; activity: string; default_duration_min: number;
  requires_survey: boolean; default_price: number | null; vat_rate: number;
  color: string | null; is_active: boolean; sort_order: number;
  default_quote_template_id: string | null;
  default_worksheet_template_id: string | null;
};

type Template = { id: string; name: string };

const ACTIVITY_LABELS: Record<string, string> = {
  szerviz: "Szerviz", telepites: "Telepítés", felszeres: "Felszerelés",
  csere: "Csere", felmeres: "Felmérés", garancias: "Garanciális", egyeb: "Egyéb",
};

const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#06b6d4","#84cc16"];

function ServiceForm({
  service, quoteTemplates, worksheetTemplates, onDone,
}: {
  service?: Service;
  quoteTemplates: Template[];
  worksheetTemplates: Template[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [activity, setActivity] = useState(service?.activity ?? "szerviz");
  const [color, setColor] = useState(service?.color ?? COLORS[0]);
  const [quoteTmplId, setQuoteTmplId] = useState(service?.default_quote_template_id ?? "");
  const [worksheetTmplId, setWorksheetTmplId] = useState(service?.default_worksheet_template_id ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("activity", activity);
    fd.set("color", color);
    fd.set("default_quote_template_id", quoteTmplId);
    fd.set("default_worksheet_template_id", worksheetTmplId);
    startTransition(async () => {
      const result = service
        ? await updateService(service.id, fd)
        : await createService(fd);
      if (result?.error) toast.error(result.error);
      else { toast.success(service ? "Szolgáltatás mentve." : "Szolgáltatás létrehozva."); onDone(); router.refresh(); }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="name">Név *</Label>
          <Input id="name" name="name" defaultValue={service?.name ?? ""} required placeholder="pl. Klíma karbantartás" />
        </div>
        <div className="space-y-1">
          <Label>Tevékenység</Label>
          <Select value={activity} onValueChange={v => v && setActivity(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ACTIVITY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="default_duration_min">Időtartam (perc)</Label>
          <Input id="default_duration_min" name="default_duration_min" type="number" min={15} max={480} step={15}
            defaultValue={service?.default_duration_min ?? 60} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="default_price">Alapár (Ft)</Label>
          <Input id="default_price" name="default_price" type="number" min={0}
            defaultValue={service?.default_price ?? ""} placeholder="opcionális" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vat_rate">ÁFA (%)</Label>
          <Input id="vat_rate" name="vat_rate" type="number" min={0} max={27}
            defaultValue={service?.vat_rate ?? 27} />
        </div>

        {quoteTemplates.length > 0 && (
          <div className="space-y-1">
            <Label>Alapértelmezett árajánlat sablon</Label>
            <Select value={quoteTmplId} onValueChange={v => setQuoteTmplId(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="— Nincs —" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">— Nincs —</SelectItem>
                {quoteTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {worksheetTemplates.length > 0 && (
          <div className="space-y-1">
            <Label>Alapértelmezett munkalap sablon</Label>
            <Select value={worksheetTmplId} onValueChange={v => setWorksheetTmplId(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="— Nincs —" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">— Nincs —</SelectItem>
                {worksheetTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label>Szín</Label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" name="requires_survey" value="true"
            defaultChecked={service?.requires_survey ?? false} className="rounded" />
          Előzetes felmérés szükséges
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>{service ? "Mentés" : "Létrehozás"}</Button>
        <Button type="button" variant="outline" onClick={onDone}>Mégsem</Button>
      </div>
    </form>
  );
}

export function ServicesClient({
  services, quoteTemplates = [], worksheetTemplates = [],
}: {
  services: Service[];
  quoteTemplates?: Template[];
  worksheetTemplates?: Template[];
}) {
  const router = useRouter();
  const [addingNew, setAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deleteService(deleteId);
      if (result?.error) toast.error(result.error);
      else { toast.success("Szolgáltatás törölve."); setDeleteId(null); router.refresh(); }
    });
  }

  return (
    <div className="space-y-4">
      {addingNew ? (
        <Card><CardContent className="pt-5">
          <ServiceForm
            quoteTemplates={quoteTemplates}
            worksheetTemplates={worksheetTemplates}
            onDone={() => setAddingNew(false)}
          />
        </CardContent></Card>
      ) : (
        <Button onClick={() => setAddingNew(true)} variant="outline">
          <Plus size={16} className="mr-2" /> Új szolgáltatás
        </Button>
      )}

      {services.length === 0 && !addingNew && (
        <p className="text-sm text-muted-foreground">Még nincs szolgáltatás. Hozd létre az elsőt!</p>
      )}

      <div className="space-y-2">
        {services.map(s => (
          <Card key={s.id} className={s.is_active ? "" : "opacity-60"}>
            <CardContent className="py-3">
              {editingId === s.id ? (
                <ServiceForm
                  service={s}
                  quoteTemplates={quoteTemplates}
                  worksheetTemplates={worksheetTemplates}
                  onDone={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-center gap-3">
                  <GripVertical size={16} className="text-muted-foreground shrink-0 cursor-grab" />
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: s.color ?? "#94a3b8" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">{s.name}</span>
                      <Badge variant="secondary" className="text-xs">{ACTIVITY_LABELS[s.activity] ?? s.activity}</Badge>
                      {s.requires_survey && <Badge variant="outline" className="text-xs">Felmérés</Badge>}
                      {!s.is_active && <Badge variant="secondary" className="text-xs">Inaktív</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {s.default_duration_min} perc
                      {s.default_price != null && ` · ${s.default_price.toLocaleString("hu-HU")} Ft`}
                      {` · ÁFA: ${s.vat_rate}%`}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(s.id)}>
                      <Pencil size={14} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(s.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDelete
        open={!!deleteId}
        onOpenChange={open => !open && setDeleteId(null)}
        title="Szolgáltatás törlése"
        description="A törlés visszafordíthatatlan. A foglalások hivatkozásai megmaradnak."
        onConfirm={handleDelete}
        loading={isPending}
      />
    </div>
  );
}

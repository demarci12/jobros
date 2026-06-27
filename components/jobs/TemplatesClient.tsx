"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { createTemplate, updateTemplate, deleteTemplate } from "@/lib/templates/actions";

const ACTIVITY_LABELS: Record<string, string> = {
  szerviz: "Szerviz",
  csere: "Csere",
  telepites: "Telepítés",
  felmeres: "Felmérés",
  garancia: "Garancia",
  egyeb: "Egyéb",
};

type ChecklistItem = { id?: string; label: string; is_required: boolean; sort_order: number };
type Template = {
  id: string;
  name: string;
  activity: string;
  checklist_items: ChecklistItem[];
};

const EMPTY_FORM = { name: "", activity: "szerviz", items: [] as ChecklistItem[] };

export function TemplatesClient({
  initialTemplates,
  canEdit,
}: {
  initialTemplates: Template[];
  canEdit: boolean;
}) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setNewItemLabel("");
    setError(null);
    setOpen(true);
  }

  function openEdit(t: Template) {
    setEditing(t);
    setForm({
      name: t.name,
      activity: t.activity,
      items: [...t.checklist_items].sort((a, b) => a.sort_order - b.sort_order),
    });
    setNewItemLabel("");
    setError(null);
    setOpen(true);
  }

  function addItem() {
    const label = newItemLabel.trim();
    if (!label) return;
    setForm(f => ({
      ...f,
      items: [...f.items, { label, is_required: false, sort_order: f.items.length }],
    }));
    setNewItemLabel("");
  }

  function removeItem(idx: number) {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  function toggleRequired(idx: number) {
    setForm(f => ({
      ...f,
      items: f.items.map((it, i) => i === idx ? { ...it, is_required: !it.is_required } : it),
    }));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const payload = { name: form.name, activity: form.activity, items: form.items };
      const res = editing
        ? await updateTemplate(editing.id, payload)
        : await createTemplate(payload);
      if ("error" in res && res.error) { setError(res.error); return; }
      setOpen(false);
      // refresh via full reload (simple, RSC page)
      window.location.reload();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Biztosan törlöd a sablont?")) return;
    startTransition(async () => {
      const res = await deleteTemplate(id);
      if (res.error) { alert(res.error); return; }
      setTemplates(prev => prev.filter(t => t.id !== id));
    });
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <Button onClick={openCreate} size="sm">
          <Plus size={14} className="mr-1.5" /> Új sablon
        </Button>
      )}

      {templates.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Még nincsenek sablonok. Hozz létre egyet a Munkalap ellenőrzőlistájához.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map(t => (
          <Card key={t.id}>
            <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold">{t.name}</CardTitle>
                <Badge variant="secondary" className="text-xs mt-1">
                  {ACTIVITY_LABELS[t.activity] ?? t.activity}
                </Badge>
              </div>
              {canEdit && (
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                    <Pencil size={13} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(t.id)}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-1">
              {t.checklist_items.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nincs tétel</p>
              ) : (
                t.checklist_items.slice().sort((a, b) => a.sort_order - b.sort_order).map((it, i) => (
                  <div key={it.id ?? i} className="flex items-center gap-2 text-xs">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                    <span className="flex-1">{it.label}</span>
                    {it.is_required && <Badge variant="outline" className="text-[10px] py-0 h-4">kötelező</Badge>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Sablon szerkesztése" : "Új sablon"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Sablon neve</label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="pl. Klíma éves szerviz"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Típus</label>
                <Select value={form.activity} onValueChange={(v) => setForm(f => ({ ...f, activity: v ?? f.activity }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTIVITY_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ellenőrzőlista tételek</label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {form.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-2 group">
                    <GripVertical size={14} className="text-muted-foreground/40 shrink-0" />
                    <span className="flex-1 text-sm">{it.label}</span>
                    <label className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Checkbox
                        checked={it.is_required}
                        onCheckedChange={() => toggleRequired(i)}
                        className="h-3 w-3"
                      />
                      kötelező
                    </label>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => removeItem(i)}>
                      <Trash2 size={11} />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newItemLabel}
                  onChange={e => setNewItemLabel(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addItem())}
                  placeholder="Új tétel…"
                  className="h-8 text-sm"
                />
                <Button size="sm" variant="outline" className="h-8 shrink-0"
                  disabled={!newItemLabel.trim()}
                  onClick={addItem}>
                  <Plus size={13} />
                </Button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Mégsem</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || isPending}>
              {editing ? "Mentés" : "Létrehozás"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
type LineItem = { description: string; quantity: number; unit: string; unit_price: number; vat_rate: number };
type TemplateKind = "quote" | "worksheet";

type Template = {
  id: string;
  name: string;
  activity: string;
  template_kind: TemplateKind;
  checklist_items: ChecklistItem[];
  default_lines?: LineItem[];
};

const EMPTY_CHECKLIST_FORM = {
  name: "", activity: "szerviz", template_kind: "worksheet" as TemplateKind,
  items: [] as ChecklistItem[], default_lines: [] as LineItem[],
};

const EMPTY_LINE: LineItem = { description: "", quantity: 1, unit: "db", unit_price: 0, vat_rate: 27 };

const VAT_OPTIONS = [0, 5, 18, 27];

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
  const [activeKind, setActiveKind] = useState<TemplateKind>("worksheet");
  const [form, setForm] = useState({ ...EMPTY_CHECKLIST_FORM });
  const [newItemLabel, setNewItemLabel] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function openCreate(kind: TemplateKind) {
    setEditing(null);
    setForm({ ...EMPTY_CHECKLIST_FORM, template_kind: kind });
    setNewItemLabel("");
    setError(null);
    setOpen(true);
  }

  function openEdit(t: Template) {
    setEditing(t);
    setForm({
      name: t.name,
      activity: t.activity,
      template_kind: t.template_kind,
      items: [...t.checklist_items].sort((a, b) => a.sort_order - b.sort_order),
      default_lines: t.default_lines ? [...t.default_lines] : [],
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

  function addLine() {
    setForm(f => ({ ...f, default_lines: [...f.default_lines, { ...EMPTY_LINE }] }));
  }

  function removeLine(idx: number) {
    setForm(f => ({ ...f, default_lines: f.default_lines.filter((_, i) => i !== idx) }));
  }

  function updateLine(idx: number, field: keyof LineItem, value: string | number) {
    setForm(f => ({
      ...f,
      default_lines: f.default_lines.map((l, i) =>
        i === idx ? { ...l, [field]: typeof value === "string" && field !== "description" && field !== "unit" ? Number(value) : value } : l
      ),
    }));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const payload = {
        name: form.name,
        activity: form.activity,
        template_kind: form.template_kind,
        items: form.items,
        default_lines: form.default_lines,
      };
      const res = editing
        ? await updateTemplate(editing.id, payload)
        : await createTemplate(payload);
      if ("error" in res && res.error) { setError(res.error); return; }
      setOpen(false);
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

  const byKind = (kind: TemplateKind) => templates.filter(t => t.template_kind === kind);

  function TemplateGrid({ kind }: { kind: TemplateKind }) {
    const list = byKind(kind);
    return (
      <div className="space-y-4">
        {canEdit && (
          <Button onClick={() => openCreate(kind)} size="sm">
            <Plus size={14} className="mr-1.5" /> Új sablon
          </Button>
        )}
        {list.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Még nincsenek sablonok.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map(t => (
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
              <CardContent className="px-4 pb-4 space-y-2">
                {kind === "worksheet" && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Ellenőrzőlista</p>
                    {t.checklist_items.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nincs tétel</p>
                    ) : (
                      t.checklist_items.slice().sort((a, b) => a.sort_order - b.sort_order).slice(0, 3).map((it, i) => (
                        <div key={it.id ?? i} className="flex items-center gap-2 text-xs">
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                          <span className="flex-1">{it.label}</span>
                          {it.is_required && <Badge variant="outline" className="text-[10px] py-0 h-4">kötelező</Badge>}
                        </div>
                      ))
                    )}
                    {t.checklist_items.length > 3 && (
                      <p className="text-xs text-muted-foreground">+{t.checklist_items.length - 3} tétel</p>
                    )}
                  </div>
                )}
                <div className="space-y-1">
                  {kind === "worksheet" && (
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Munkalap sorok</p>
                  )}
                  {(t.default_lines ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nincs sor</p>
                  ) : (
                    (t.default_lines ?? []).slice(0, 3).map((l, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                        <span className="flex-1 truncate">{l.description}</span>
                        <span className="text-muted-foreground shrink-0">{l.unit_price.toLocaleString("hu-HU")} Ft</span>
                      </div>
                    ))
                  )}
                  {(t.default_lines ?? []).length > 3 && (
                    <p className="text-xs text-muted-foreground">+{(t.default_lines ?? []).length - 3} sor</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeKind} onValueChange={(v) => setActiveKind(v as TemplateKind)}>
        <TabsList>
          <TabsTrigger value="worksheet">Munkalap sablon</TabsTrigger>
          <TabsTrigger value="quote">Árajánlat sablon</TabsTrigger>
        </TabsList>
        <TabsContent value="worksheet" className="mt-4">
          <TemplateGrid kind="worksheet" />
        </TabsContent>
        <TabsContent value="quote" className="mt-4">
          <TemplateGrid kind="quote" />
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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

            {form.template_kind === "worksheet" && (
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
            )}

            <div className="space-y-2">
                <label className="text-sm font-medium">Munkalap sorok</label>
                {form.default_lines.length > 0 && (
                  <div className="rounded-lg border overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/50 text-muted-foreground">
                          <th className="px-2 py-1.5 text-left">Leírás</th>
                          <th className="px-2 py-1.5 text-right w-16">Menny.</th>
                          <th className="px-2 py-1.5 text-left w-16">Egys.</th>
                          <th className="px-2 py-1.5 text-right w-24">Egységár (Ft)</th>
                          <th className="px-2 py-1.5 text-right w-16">ÁFA%</th>
                          <th className="px-2 py-1.5 w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {form.default_lines.map((l, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="px-2 py-1">
                              <Input
                                value={l.description}
                                onChange={e => updateLine(i, "description", e.target.value)}
                                className="h-7 text-xs min-w-[120px]"
                                placeholder="Leírás"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                type="number"
                                min={0}
                                step={0.1}
                                value={l.quantity}
                                onChange={e => updateLine(i, "quantity", e.target.value)}
                                className="h-7 text-xs w-16 text-right"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                value={l.unit}
                                onChange={e => updateLine(i, "unit", e.target.value)}
                                className="h-7 text-xs w-16"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                type="number"
                                min={0}
                                value={l.unit_price}
                                onChange={e => updateLine(i, "unit_price", e.target.value)}
                                className="h-7 text-xs w-24 text-right"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <select
                                value={l.vat_rate}
                                onChange={e => updateLine(i, "vat_rate", e.target.value)}
                                className="h-7 w-16 rounded-md border bg-background px-1 text-xs"
                              >
                                {VAT_OPTIONS.map(v => <option key={v} value={v}>{v}%</option>)}
                              </select>
                            </td>
                            <td className="px-2 py-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => removeLine(i)}>
                                <Trash2 size={11} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Button size="sm" variant="outline" onClick={addLine} className="h-8">
                  <Plus size={13} className="mr-1" /> Sor hozzáadása
                </Button>
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

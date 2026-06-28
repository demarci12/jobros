"use client";

import { useState, useTransition } from "react";
import { upsertWorksheet, addWorksheetLine, deleteWorksheetLine } from "@/lib/worksheets/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

type Line = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
  line_total: number;
  is_labor: boolean;
};

type Worksheet = {
  id: string | null;
  work_done: string | null;
  labor_hours: number | null;
  lines: Line[];
};

export type CatalogMaterial = {
  id: string;
  name: string;
  unit: string;
  unit_price: number;
  vat_rate: number;
};

const VAT_OPTIONS = [0, 5, 18, 27];

export function WorksheetClient({
  jobId,
  worksheet,
  canEdit,
  catalogMaterials = [],
}: {
  jobId: string;
  worksheet: Worksheet;
  canEdit: boolean;
  catalogMaterials?: CatalogMaterial[];
}) {
  const [isPending, startTransition] = useTransition();
  const [workDone, setWorkDone] = useState(worksheet.work_done ?? "");
  const [laborHours, setLaborHours] = useState(worksheet.labor_hours?.toString() ?? "");
  const [worksheetId, setWorksheetId] = useState(worksheet.id);
  const [lines, setLines] = useState<Line[]>(worksheet.lines);

  // New line form state
  const [newLine, setNewLine] = useState({
    description: "", quantity: "1", unit: "db",
    unit_price: "0", vat_rate: "27", is_labor: false,
    material_id: "",
  });

  function handleSaveWorksheet() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("work_done", workDone);
      if (laborHours) fd.set("labor_hours", laborHours);
      const result = await upsertWorksheet(jobId, fd);
      if (result?.error) toast.error(result.error);
      else {
        if (result.worksheetId) setWorksheetId(result.worksheetId);
        toast.success("Munkalap mentve.");
      }
    });
  }

  function handleAddLine() {
    if (!worksheetId) { toast.error("Előbb mentsd a munkalapot!"); return; }
    startTransition(async () => {
      const fd = new FormData();
      Object.entries(newLine).forEach(([k, v]) => { if (v !== "") fd.set(k, v.toString()); });
      if (newLine.is_labor) fd.set("is_labor", "1");
      const result = await addWorksheetLine(worksheetId, jobId, fd);
      if (result?.error) {
        toast.error(result.error);
      } else if ("line" in result && result.line) {
        setLines(ls => [...ls, result.line as Line]);
        setNewLine({ description: "", quantity: "1", unit: "db", unit_price: "0", vat_rate: "27", is_labor: false, material_id: "" });
        toast.success("Tétel hozzáadva.");
      }
    });
  }

  function handleDeleteLine(lineId: string) {
    if (!worksheetId) return;
    const prev = lines;
    setLines(ls => ls.filter(l => l.id !== lineId));
    startTransition(async () => {
      const result = await deleteWorksheetLine(lineId, worksheetId, jobId);
      if (result?.error) {
        toast.error(result.error);
        setLines(prev);
      }
    });
  }

  const subtotal = lines.reduce((s: number, l: Line) => s + l.line_total, 0);
  const vatTotal = lines.reduce((s: number, l: Line) => s + l.line_total * (l.vat_rate / 100), 0);
  const total = subtotal + vatTotal;

  return (
    <div className="space-y-6">
      {/* Elvégzett munka leírás */}
      <div className="space-y-2">
        <h2 className="font-semibold text-sm">Elvégzett munka</h2>
        <Textarea
          value={workDone}
          onChange={e => setWorkDone(e.target.value)}
          placeholder="A végzett munkák részletes leírása…"
          rows={4}
          disabled={!canEdit}
          className="resize-none"
        />
        <div className="flex items-center gap-3">
          <Label className="text-sm whitespace-nowrap">Munkaidő (óra)</Label>
          <Input type="number" min={0} step={0.5} value={laborHours}
            onChange={e => setLaborHours(e.target.value)}
            disabled={!canEdit} className="w-24 h-8" />
          {canEdit && (
            <Button size="sm" variant="outline" disabled={isPending} onClick={handleSaveWorksheet}>
              Mentés
            </Button>
          )}
        </div>
      </div>

      {/* Tételek */}
      <div className="space-y-2">
        <h2 className="font-semibold text-sm">Tételek</h2>

        {lines.length > 0 && (
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left">Megnevezés</th>
                  <th className="px-3 py-2 text-right">Menny.</th>
                  <th className="px-3 py-2 text-left">Egység</th>
                  <th className="px-3 py-2 text-right">Egységár</th>
                  <th className="px-3 py-2 text-right">ÁFA%</th>
                  <th className="px-3 py-2 text-right">Nettó</th>
                  {canEdit && <th className="px-2 py-2" />}
                </tr>
              </thead>
              <tbody>
                {lines.map(l => (
                  <tr key={l.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2">
                      {l.description}
                      {l.is_labor && <span className="ml-1.5 text-xs text-muted-foreground">(munka)</span>}
                    </td>
                    <td className="px-3 py-2 text-right">{l.quantity}</td>
                    <td className="px-3 py-2">{l.unit}</td>
                    <td className="px-3 py-2 text-right">{l.unit_price.toLocaleString("hu-HU")} Ft</td>
                    <td className="px-3 py-2 text-right">{l.vat_rate}%</td>
                    <td className="px-3 py-2 text-right font-medium">{l.line_total.toLocaleString("hu-HU")} Ft</td>
                    {canEdit && (
                      <td className="px-2 py-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          disabled={isPending} onClick={() => handleDeleteLine(l.id)}>
                          <Trash2 size={13} />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Összesítő */}
        {lines.length > 0 && (
          <div className="flex justify-end">
            <div className="text-sm space-y-0.5 text-right">
              <div className="text-muted-foreground">Nettó: {subtotal.toLocaleString("hu-HU")} Ft</div>
              <div className="text-muted-foreground">ÁFA: {vatTotal.toLocaleString("hu-HU")} Ft</div>
              <div className="font-semibold text-base">Bruttó: {total.toLocaleString("hu-HU")} Ft</div>
            </div>
          </div>
        )}

        {/* Új tétel form */}
        {canEdit && (
          <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
            <p className="text-xs font-medium text-muted-foreground">Új tétel</p>

            {/* Catalog picker */}
            {catalogMaterials.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Katalógusból</Label>
                <select
                  className="h-8 w-full rounded-md border bg-background px-2 text-sm"
                  value={newLine.material_id}
                  onChange={e => {
                    const mat = catalogMaterials.find(m => m.id === e.target.value);
                    if (mat) {
                      setNewLine(s => ({
                        ...s,
                        material_id: mat.id,
                        description: mat.name,
                        unit: mat.unit,
                        unit_price: mat.unit_price.toString(),
                        vat_rate: mat.vat_rate.toString(),
                      }));
                    } else {
                      setNewLine(s => ({ ...s, material_id: "" }));
                    }
                  }}
                >
                  <option value="">— Kézi bevitel —</option>
                  {catalogMaterials.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.unit_price.toLocaleString("hu-HU")} Ft/{m.unit})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="col-span-2 sm:col-span-4 space-y-1">
                <Label className="text-xs">Megnevezés</Label>
                <Input value={newLine.description} onChange={e => setNewLine(s => ({ ...s, description: e.target.value }))}
                  placeholder="Pl. Freon feltöltés" className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mennyiség</Label>
                <Input type="number" min={0} step={0.1} value={newLine.quantity}
                  onChange={e => setNewLine(s => ({ ...s, quantity: e.target.value }))} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Egység</Label>
                <Input value={newLine.unit} onChange={e => setNewLine(s => ({ ...s, unit: e.target.value }))}
                  placeholder="db" className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Egységár (Ft)</Label>
                <Input type="number" min={0} value={newLine.unit_price}
                  onChange={e => setNewLine(s => ({ ...s, unit_price: e.target.value }))} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ÁFA%</Label>
                <select value={newLine.vat_rate} onChange={e => setNewLine(s => ({ ...s, vat_rate: e.target.value }))}
                  className="h-8 w-full rounded-md border bg-background px-2 text-sm">
                  {VAT_OPTIONS.map(v => <option key={v} value={v}>{v}%</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={newLine.is_labor}
                  onChange={e => setNewLine(s => ({ ...s, is_labor: e.target.checked }))} className="h-4 w-4" />
                Munkadíj
              </label>
              <Button size="sm" disabled={isPending || !newLine.description} onClick={handleAddLine}>
                <Plus size={14} className="mr-1" /> Hozzáad
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

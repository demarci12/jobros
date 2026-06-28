"use client";

import { useState, useTransition } from "react";
import {
  createQuote, addQuoteLine, toggleLineSelected, deleteQuoteLine, updateQuoteStatus,
} from "@/lib/quotes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Send, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

type QuoteLine = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
  line_total: number;
  is_optional: boolean;
  option_group: string | null;
  is_selected: boolean;
};

type Quote = {
  id: string;
  quote_number: string;
  status: string;
  valid_until: string | null;
  notes: string | null;
  lines: QuoteLine[];
};

const OPTION_LABELS: Record<string, string> = { good: "Alap", better: "Standard", best: "Prémium" };
const STATUS_LABELS: Record<string, string> = { draft: "Vázlat", sent: "Elküldve", accepted: "Elfogadva", rejected: "Elutasítva" };
const STATUS_COLORS: Record<string, string> = { draft: "bg-gray-100 text-gray-700", sent: "bg-blue-100 text-blue-700", accepted: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-700" };
const VAT_OPTIONS = [0, 5, 18, 27];

export function QuoteEditor({ jobId, initialQuote, canEdit = true }: { jobId: string; initialQuote: Quote | null; canEdit?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [quote, setQuote] = useState<Quote | null>(initialQuote);
  const [newLine, setNewLine] = useState({
    description: "", quantity: "1", unit: "db",
    unit_price: "0", vat_rate: "27", is_optional: false, option_group: "",
  });

  function handleCreateQuote() {
    startTransition(async () => {
      const result = await createQuote(jobId);
      if (result?.error) toast.error(result.error);
      else if ("quote" in result) {
        setQuote(result.quote as Quote);
        toast.success("Árajánlat létrehozva.");
      }
    });
  }

  function handleAddLine() {
    if (!quote) return;
    startTransition(async () => {
      const fd = new FormData();
      Object.entries(newLine).forEach(([k, v]) => fd.set(k, v.toString()));
      if (newLine.is_optional) fd.set("is_optional", "1");
      const result = await addQuoteLine(quote.id, jobId, fd);
      if (result?.error) {
        toast.error(result.error);
      } else if ("line" in result && result.line) {
        setQuote(q => q ? { ...q, lines: [...q.lines, result.line as QuoteLine] } : q);
        setNewLine({ description: "", quantity: "1", unit: "db", unit_price: "0", vat_rate: "27", is_optional: false, option_group: "" });
        toast.success("Tétel hozzáadva.");
      }
    });
  }

  function handleToggle(lineId: string, current: boolean) {
    // Optimistic update
    setQuote(q => q ? { ...q, lines: q.lines.map(l => l.id === lineId ? { ...l, is_selected: !current } : l) } : q);
    startTransition(async () => {
      const result = await toggleLineSelected(lineId, !current, jobId);
      if (result?.error) {
        toast.error(result.error);
        // Revert
        setQuote(q => q ? { ...q, lines: q.lines.map(l => l.id === lineId ? { ...l, is_selected: current } : l) } : q);
      }
    });
  }

  function handleDelete(lineId: string) {
    if (!quote) return;
    // Optimistic update
    const prev = quote.lines;
    setQuote(q => q ? { ...q, lines: q.lines.filter(l => l.id !== lineId) } : q);
    startTransition(async () => {
      const result = await deleteQuoteLine(lineId, jobId);
      if (result?.error) {
        toast.error(result.error);
        setQuote(q => q ? { ...q, lines: prev } : q);
      }
    });
  }

  function handleStatusChange(status: string) {
    if (!quote) return;
    const prevStatus = quote.status;
    // Optimistic update
    setQuote(q => q ? { ...q, status } : q);
    startTransition(async () => {
      const result = await updateQuoteStatus(quote.id, status, jobId);
      if (result?.error) {
        toast.error(result.error);
        setQuote(q => q ? { ...q, status: prevStatus } : q);
      } else {
        toast.success(`Állapot: ${STATUS_LABELS[status]}`);
      }
    });
  }

  if (!quote) {
    return (
      <div className="text-center py-10 space-y-3">
        <p className="text-sm text-muted-foreground">Még nincs árajánlat ehhez a munkához.</p>
        {canEdit && (
          <Button onClick={handleCreateQuote} disabled={isPending}>
            <Plus size={15} className="mr-1.5" /> Árajánlat létrehozása
          </Button>
        )}
      </div>
    );
  }

  const selectedLines = quote.lines.filter(l => l.is_selected);
  const subtotal = selectedLines.reduce((s, l) => s + l.line_total, 0);
  const vatTotal = selectedLines.reduce((s, l) => s + l.line_total * (l.vat_rate / 100), 0);
  const total = subtotal + vatTotal;

  const groups = Array.from(new Set(quote.lines.map(l => l.option_group ?? ""))).sort();

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Fejléc */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono text-sm text-muted-foreground">{quote.quote_number}</p>
          <Badge className={`text-xs mt-0.5 ${STATUS_COLORS[quote.status] ?? ""}`} variant="outline">
            {STATUS_LABELS[quote.status] ?? quote.status}
          </Badge>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            {quote.status === "draft" && (
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleStatusChange("sent")}>
                <Send size={13} className="mr-1" /> Elküld
              </Button>
            )}
            {quote.status === "sent" && (
              <>
                <Button size="sm" variant="outline" className="text-green-700" disabled={isPending} onClick={() => handleStatusChange("accepted")}>
                  <CheckCircle size={13} className="mr-1" /> Elfogadva
                </Button>
                <Button size="sm" variant="outline" className="text-destructive" disabled={isPending} onClick={() => handleStatusChange("rejected")}>
                  <XCircle size={13} className="mr-1" /> Elutasítva
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Tételek csoportonként */}
      {groups.map(group => {
        const groupLines = quote.lines.filter(l => (l.option_group ?? "") === group);
        return (
          <div key={group || "base"}>
            {group && (
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                {OPTION_LABELS[group] ?? group}
              </h3>
            )}
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                    <th className="px-2 py-1.5 w-6" />
                    <th className="px-3 py-1.5 text-left">Megnevezés</th>
                    <th className="px-3 py-1.5 text-right">Menny.</th>
                    <th className="px-3 py-1.5 text-right">Egységár</th>
                    <th className="px-3 py-1.5 text-right">ÁFA%</th>
                    <th className="px-3 py-1.5 text-right">Nettó</th>
                    {canEdit && <th className="px-2 py-1.5" />}
                  </tr>
                </thead>
                <tbody>
                  {groupLines.map(l => (
                    <tr key={l.id} className={`border-b last:border-0 ${l.is_optional && !l.is_selected ? "opacity-50" : ""}`}>
                      <td className="px-2 py-2">
                        {l.is_optional && canEdit && (
                          <input type="checkbox" checked={l.is_selected} onChange={() => handleToggle(l.id, l.is_selected)}
                            className="h-3.5 w-3.5 accent-foreground" />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {l.description}
                        {l.is_optional && <span className="ml-1 text-xs text-muted-foreground">(opcionális)</span>}
                      </td>
                      <td className="px-3 py-2 text-right">{l.quantity} {l.unit}</td>
                      <td className="px-3 py-2 text-right">{l.unit_price.toLocaleString("hu-HU")} Ft</td>
                      <td className="px-3 py-2 text-right">{l.vat_rate}%</td>
                      <td className="px-3 py-2 text-right font-medium">{l.line_total.toLocaleString("hu-HU")} Ft</td>
                      {canEdit && (
                        <td className="px-2 py-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            disabled={isPending} onClick={() => handleDelete(l.id)}>
                            <Trash2 size={13} />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Összesítő */}
      {quote.lines.length > 0 && (
        <div className="flex justify-end">
          <div className="text-sm space-y-0.5 text-right">
            <div className="text-muted-foreground">Nettó (kiválasztott): {subtotal.toLocaleString("hu-HU")} Ft</div>
            <div className="text-muted-foreground">ÁFA: {vatTotal.toLocaleString("hu-HU")} Ft</div>
            <div className="font-semibold text-base">Bruttó: {total.toLocaleString("hu-HU")} Ft</div>
          </div>
        </div>
      )}

      {/* Új tétel */}
      {canEdit && quote.status === "draft" && (
        <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
          <p className="text-xs font-medium text-muted-foreground">Új tétel</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="col-span-2 sm:col-span-4 space-y-1">
              <Label className="text-xs">Megnevezés</Label>
              <Input value={newLine.description} onChange={e => setNewLine(s => ({ ...s, description: e.target.value }))}
                placeholder="Pl. Inverteres klíma egység" className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mennyiség</Label>
              <Input type="number" min={0} step={0.1} value={newLine.quantity}
                onChange={e => setNewLine(s => ({ ...s, quantity: e.target.value }))} className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Egység</Label>
              <Input value={newLine.unit} onChange={e => setNewLine(s => ({ ...s, unit: e.target.value }))} className="h-8" />
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
            <div className="space-y-1">
              <Label className="text-xs">Csomag</Label>
              <select value={newLine.option_group} onChange={e => setNewLine(s => ({ ...s, option_group: e.target.value }))}
                className="h-8 w-full rounded-md border bg-background px-2 text-sm">
                <option value="">— Nincs —</option>
                {(["good", "better", "best"] as const).map(g => <option key={g} value={g}>{OPTION_LABELS[g]}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={newLine.is_optional}
                onChange={e => setNewLine(s => ({ ...s, is_optional: e.target.checked }))} className="h-4 w-4" />
              Opcionális
            </label>
            <Button size="sm" disabled={isPending || !newLine.description} onClick={handleAddLine}>
              <Plus size={14} className="mr-1" /> Hozzáad
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { adjustStock } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Package, AlertTriangle, TrendingUp } from "lucide-react";

type Material = {
  id: string;
  name: string;
  unit: string;
  unit_price: number;
  stock_qty: number;
  min_stock_qty: number;
  sku: string | null;
};

type Movement = {
  id: string;
  material_id: string;
  quantity: number;
  reason: string | null;
  created_at: string;
  materials: { name: string; unit: string } | null;
  jobs: { job_number: string } | null;
};

type AdjustTarget = { material: Material; mode: "be" | "ki" };

function AdjustDialog({ target, onClose }: { target: AdjustTarget; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState(target.mode === "be" ? "Bevételezés" : "Kiadás / felhasználás");

  function handleSubmit() {
    const q = parseFloat(qty);
    if (!q || q <= 0) { toast.error("Add meg a mennyiséget."); return; }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("material_id", target.material.id);
      fd.set("quantity", target.mode === "be" ? q.toString() : (-q).toString());
      fd.set("reason", reason);
      const res = await adjustStock(fd);
      if (res.error) toast.error(res.error);
      else { toast.success(target.mode === "be" ? "Bevételezve." : "Kiadás rögzítve."); onClose(); }
    });
  }

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {target.mode === "be" ? "Bevételezés" : "Kiadás"} — {target.material.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Jelenlegi készlet: <strong>{target.material.stock_qty} {target.material.unit}</strong>
          </p>
          <div className="space-y-1">
            <Label>Mennyiség ({target.material.unit})</Label>
            <Input type="number" step="0.001" min="0.001" value={qty}
              onChange={e => setQty(e.target.value)} placeholder="pl. 10" autoFocus />
          </div>
          <div className="space-y-1">
            <Label>Ok / megjegyzés</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Mégsem</Button>
            <Button disabled={isPending || !qty} onClick={handleSubmit}
              className={target.mode === "be" ? "" : "bg-orange-600 hover:bg-orange-700"}>
              {isPending ? "Mentés…" : target.mode === "be" ? "Bevételez" : "Kiad"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RaktarClient({
  materials,
  movements,
  canEdit,
}: {
  materials: Material[];
  movements: Movement[];
  canEdit: boolean;
}) {
  const [adjustTarget, setAdjustTarget] = useState<AdjustTarget | null>(null);
  const [tab, setTab] = useState<"keszlet" | "mozgasok">("keszlet");

  const totalValue = materials.reduce((s, m) => s + m.stock_qty * m.unit_price, 0);
  const lowStock = materials.filter(m => m.min_stock_qty > 0 && m.stock_qty < m.min_stock_qty);
  const zeroStock = materials.filter(m => m.stock_qty === 0);

  return (
    <div className="space-y-6">
      {/* KPI kártyák */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border p-4 space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp size={12} /> Készletérték
          </p>
          <p className="text-2xl font-bold">{totalValue.toLocaleString("hu-HU")} Ft</p>
        </div>
        <div className="rounded-lg border p-4 space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Package size={12} /> Tételek
          </p>
          <p className="text-2xl font-bold">{materials.length}</p>
          {zeroStock.length > 0 && (
            <p className="text-xs text-muted-foreground">{zeroStock.length} db elfogyott</p>
          )}
        </div>
        <div className="rounded-lg border p-4 space-y-1 col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertTriangle size={12} /> Alacsony készlet
          </p>
          <p className="text-2xl font-bold text-orange-600">{lowStock.length}</p>
          {lowStock.length > 0 && (
            <p className="text-xs text-muted-foreground truncate">{lowStock.map(m => m.name).join(", ")}</p>
          )}
        </div>
      </div>

      {/* Tab váltó */}
      <div className="flex gap-1 border-b">
        {(["keszlet", "mozgasok"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t === "keszlet" ? "Készlet" : "Mozgásnapló"}
          </button>
        ))}
      </div>

      {/* Készlet tábla */}
      {tab === "keszlet" && (
        <>
          {lowStock.length > 0 && (
            <div className="rounded-md bg-orange-50 border border-orange-200 px-4 py-2 text-sm text-orange-800 flex items-center gap-2">
              <AlertTriangle size={14} />
              Alacsony készlet: {lowStock.map(m => m.name).join(", ")}
            </div>
          )}

          {/* Desktop tábla */}
          <div className="hidden md:block rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Anyag</th>
                  <th className="px-3 py-2 text-left">SKU</th>
                  <th className="px-3 py-2 text-right">Készlet</th>
                  <th className="px-3 py-2 text-right">Egységár</th>
                  <th className="px-3 py-2 text-right">Készletérték</th>
                  <th className="px-3 py-2 text-center">Állapot</th>
                  {canEdit && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody className="divide-y">
                {materials.map(m => {
                  const isLow = m.min_stock_qty > 0 && m.stock_qty < m.min_stock_qty;
                  const isEmpty = m.stock_qty === 0;
                  return (
                    <tr key={m.id} className="hover:bg-muted/40">
                      <td className="px-3 py-2 font-medium">{m.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{m.sku ?? "—"}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${isEmpty ? "text-destructive" : isLow ? "text-orange-600" : ""}`}>
                        {m.stock_qty} {m.unit}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {m.unit_price.toLocaleString("hu-HU")} Ft
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {(m.stock_qty * m.unit_price).toLocaleString("hu-HU")} Ft
                      </td>
                      <td className="px-3 py-2 text-center">
                        {isEmpty ? (
                          <Badge variant="destructive" className="text-xs">Elfogyott</Badge>
                        ) : isLow ? (
                          <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200" variant="outline">Alacsony</Badge>
                        ) : (
                          <Badge className="text-xs bg-green-100 text-green-700 border-green-200" variant="outline">OK</Badge>
                        )}
                      </td>
                      {canEdit && (
                        <td className="px-3 py-2">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                              onClick={() => setAdjustTarget({ material: m, mode: "be" })}>
                              <ArrowDownToLine size={12} /> Be
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                              onClick={() => setAdjustTarget({ material: m, mode: "ki" })}>
                              <ArrowUpFromLine size={12} /> Ki
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {materials.length === 0 && (
                  <tr>
                    <td colSpan={canEdit ? 7 : 6} className="px-3 py-8 text-center text-muted-foreground">
                      Még nincs anyag. Add hozzá a Beállítások → Anyagok menüben.
                    </td>
                  </tr>
                )}
              </tbody>
              {materials.length > 0 && (
                <tfoot className="bg-muted/50 text-sm font-semibold">
                  <tr>
                    <td className="px-3 py-2" colSpan={4}>Összesen</td>
                    <td className="px-3 py-2 text-right">{totalValue.toLocaleString("hu-HU")} Ft</td>
                    <td colSpan={canEdit ? 2 : 1} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Mobil kártyák */}
          <div className="md:hidden space-y-2">
            {materials.map(m => {
              const isLow = m.min_stock_qty > 0 && m.stock_qty < m.min_stock_qty;
              const isEmpty = m.stock_qty === 0;
              return (
                <div key={m.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{m.name}</p>
                    {isEmpty ? (
                      <Badge variant="destructive" className="text-xs">Elfogyott</Badge>
                    ) : isLow ? (
                      <Badge className="text-xs bg-orange-100 text-orange-700" variant="outline">Alacsony</Badge>
                    ) : (
                      <Badge className="text-xs bg-green-100 text-green-700" variant="outline">OK</Badge>
                    )}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className={`font-semibold ${isEmpty ? "text-destructive" : isLow ? "text-orange-600" : ""}`}>
                      {m.stock_qty} {m.unit}
                    </span>
                    <span className="text-muted-foreground">{(m.stock_qty * m.unit_price).toLocaleString("hu-HU")} Ft</span>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1"
                        onClick={() => setAdjustTarget({ material: m, mode: "be" })}>
                        <ArrowDownToLine size={12} /> Bevételezés
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1"
                        onClick={() => setAdjustTarget({ material: m, mode: "ki" })}>
                        <ArrowUpFromLine size={12} /> Kiadás
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Mozgásnapló */}
      {tab === "mozgasok" && (
        <>
          {/* Desktop tábla */}
          <div className="hidden md:block rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Anyag</th>
                  <th className="px-3 py-2 text-right">Mennyiség</th>
                  <th className="px-3 py-2 text-left hidden sm:table-cell">Ok</th>
                  <th className="px-3 py-2 text-left hidden sm:table-cell">Munka</th>
                  <th className="px-3 py-2 text-left">Dátum</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movements.map(mv => (
                  <tr key={mv.id} className="hover:bg-muted/40">
                    <td className="px-3 py-2 font-medium">{mv.materials?.name ?? "—"}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${mv.quantity > 0 ? "text-green-700" : "text-orange-600"}`}>
                      {mv.quantity > 0 ? "+" : ""}{mv.quantity} {mv.materials?.unit ?? ""}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{mv.reason ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                      {mv.jobs?.job_number ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">
                      {new Date(mv.created_at).toLocaleString("hu-HU", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      Még nincs készletmozgás.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobil kártyák */}
          <div className="md:hidden space-y-2">
            {movements.map(mv => (
              <div key={mv.id} className="rounded-lg border p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm truncate">{mv.materials?.name ?? "—"}</p>
                  <span className={`font-semibold text-sm shrink-0 ${mv.quantity > 0 ? "text-green-700" : "text-orange-600"}`}>
                    {mv.quantity > 0 ? "+" : ""}{mv.quantity} {mv.materials?.unit ?? ""}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {mv.reason && <span>{mv.reason}</span>}
                  {mv.jobs?.job_number && <span>Munka: {mv.jobs.job_number}</span>}
                  <span>{new Date(mv.created_at).toLocaleString("hu-HU", { dateStyle: "short", timeStyle: "short" })}</span>
                </div>
              </div>
            ))}
            {movements.length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-8">Még nincs készletmozgás.</p>
            )}
          </div>
        </>
      )}

      {adjustTarget && (
        <AdjustDialog target={adjustTarget} onClose={() => setAdjustTarget(null)} />
      )}
    </div>
  );
}

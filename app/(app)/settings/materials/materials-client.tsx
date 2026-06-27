"use client";

import { useState, useTransition } from "react";
import { upsertMaterial, deleteMaterial, adjustStock } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ConfirmDelete } from "@/components/common/ConfirmDelete";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ArrowUpDown } from "lucide-react";

type Material = {
  id: string;
  name: string;
  unit: string;
  unit_price: number;
  vat_rate: number;
  sku: string | null;
  stock_qty: number;
  min_stock_qty: number;
};

const VAT_RATES = [0, 5, 18, 27];

function MaterialForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
}: {
  initial?: Partial<Material>;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label>Megnevezés *</Label>
          <Input name="name" defaultValue={initial?.name} required />
        </div>
        <div className="space-y-1">
          <Label>Egység</Label>
          <Input name="unit" defaultValue={initial?.unit ?? "db"} />
        </div>
        <div className="space-y-1">
          <Label>Cikkszám (SKU)</Label>
          <Input name="sku" defaultValue={initial?.sku ?? ""} />
        </div>
        <div className="space-y-1">
          <Label>Egységár (Ft)</Label>
          <Input name="unit_price" type="number" step="1" min="0"
            defaultValue={initial?.unit_price ?? 0} required />
        </div>
        <div className="space-y-1">
          <Label>ÁFA kulcs</Label>
          <select name="vat_rate"
            defaultValue={initial?.vat_rate ?? 27}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            {VAT_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
          </select>
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Min. készlet figyelmeztetés</Label>
          <Input name="min_stock_qty" type="number" step="0.001" min="0"
            defaultValue={initial?.min_stock_qty ?? 0} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Mégsem</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Mentés…" : "Mentés"}
        </Button>
      </div>
    </form>
  );
}

function StockAdjustDialog({
  material,
  onClose,
}: {
  material: Material;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("Bevételezés");

  function handleSubmit() {
    const q = parseFloat(qty);
    if (isNaN(q) || q === 0) return;
    startTransition(async () => {
      const res = await adjustStock(material.id, q, reason);
      if (res?.error) toast.error(res.error);
      else { toast.success("Készlet módosítva."); onClose(); router.refresh(); }
    });
  }

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Készlet módosítás — {material.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Jelenlegi készlet: <strong>{material.stock_qty} {material.unit}</strong>
          </p>
          <div className="space-y-1">
            <Label>Mennyiség (+ bevételezés / − felhasználás)</Label>
            <Input type="number" step="0.001" value={qty} onChange={e => setQty(e.target.value)}
              placeholder="+10 vagy -3" />
          </div>
          <div className="space-y-1">
            <Label>Ok / megjegyzés</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Mégsem</Button>
            <Button disabled={isPending || !qty} onClick={handleSubmit}>
              {isPending ? "Mentés…" : "Mentés"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MaterialsClient({
  materials,
  canEdit,
}: {
  materials: Material[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);
  const [stockTarget, setStockTarget] = useState<Material | null>(null);

  function handleSubmit(id: string | null) {
    return (fd: FormData) => {
      startTransition(async () => {
        const res = await upsertMaterial(id, fd);
        if (res?.error) toast.error(res.error);
        else {
          toast.success(id ? "Anyag frissítve." : "Anyag hozzáadva.");
          setShowForm(false);
          setEditing(null);
          router.refresh();
        }
      });
    };
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await deleteMaterial(deleteTarget.id);
      if (res?.error) toast.error(res.error);
      else { toast.success("Anyag archiválva."); setDeleteTarget(null); router.refresh(); }
    });
  }

  const lowStock = materials.filter(m => m.min_stock_qty > 0 && m.stock_qty < m.min_stock_qty);

  return (
    <div className="space-y-4">
      {lowStock.length > 0 && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-2 text-sm text-yellow-800">
          Alacsony készlet: {lowStock.map(m => m.name).join(", ")}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{materials.length} anyag</p>
        {canEdit && (
          <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={14} className="mr-1" /> Új anyag
          </Button>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={showForm || !!editing} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Anyag szerkesztése" : "Új anyag"}</DialogTitle>
          </DialogHeader>
          <MaterialForm
            initial={editing ?? undefined}
            onSubmit={handleSubmit(editing?.id ?? null)}
            onCancel={() => { setShowForm(false); setEditing(null); }}
            isPending={isPending}
          />
        </DialogContent>
      </Dialog>

      {stockTarget && (
        <StockAdjustDialog material={stockTarget} onClose={() => setStockTarget(null)} />
      )}

      <ConfirmDelete
        open={!!deleteTarget}
        onOpenChange={v => !v && setDeleteTarget(null)}
        title="Anyag archiválása"
        description={`"${deleteTarget?.name}" törlődik a katalógusból (soft delete).`}
        onConfirm={handleDelete}
        loading={isPending}
      />

      {/* Table / Cards */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Megnevezés</th>
              <th className="px-3 py-2 text-left">SKU</th>
              <th className="px-3 py-2 text-right">Egységár</th>
              <th className="px-3 py-2 text-center">ÁFA</th>
              <th className="px-3 py-2 text-right">Készlet</th>
              {canEdit && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y">
            {materials.map(m => (
              <tr key={m.id} className="hover:bg-muted/40">
                <td className="px-3 py-2 font-medium">{m.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{m.sku ?? "—"}</td>
                <td className="px-3 py-2 text-right">{m.unit_price.toLocaleString("hu-HU")} Ft/{m.unit}</td>
                <td className="px-3 py-2 text-center">{m.vat_rate}%</td>
                <td className="px-3 py-2 text-right">
                  <span className={m.min_stock_qty > 0 && m.stock_qty < m.min_stock_qty ? "text-destructive font-semibold" : ""}>
                    {m.stock_qty} {m.unit}
                  </span>
                </td>
                {canEdit && (
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setStockTarget(m)} title="Készlet módosítás">
                        <ArrowUpDown size={13} />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(m); setShowForm(false); }}>
                        <Pencil size={13} />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(m)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {materials.length === 0 && (
              <tr><td colSpan={canEdit ? 6 : 5} className="px-3 py-8 text-center text-muted-foreground">Még nincs anyag a katalógusban.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {materials.map(m => (
          <div key={m.id} className="rounded-lg border p-3 space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">{m.name}</p>
              {canEdit && (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setStockTarget(m)}><ArrowUpDown size={13} /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(m)}><Pencil size={13} /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(m)}><Trash2 size={13} /></Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{m.unit_price.toLocaleString("hu-HU")} Ft/{m.unit} · ÁFA: {m.vat_rate}%</p>
            <p className="text-xs">Készlet: <span className={m.min_stock_qty > 0 && m.stock_qty < m.min_stock_qty ? "text-destructive font-semibold" : ""}>{m.stock_qty} {m.unit}</span></p>
          </div>
        ))}
        {materials.length === 0 && (
          <p className="text-sm text-center text-muted-foreground py-8">Még nincs anyag a katalógusban.</p>
        )}
      </div>
    </div>
  );
}

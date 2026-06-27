"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileDown, ExternalLink, AlertCircle, CheckCircle2, Clock } from "lucide-react";

type Invoice = {
  id: string;
  invoice_number: string | null;
  gross_total: number | null;
  nav_status: string | null;
  nav_error: string | null;
  pdf_url: string | null;
  issued_at: string | null;
  created_at: string;
  jobs: {
    id: string;
    job_number: string;
    customers: { name: string } | null;
  } | null;
};

const NAV_BADGE: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Folyamatban", icon: <Clock size={12} />, variant: "secondary" },
  done:    { label: "NAV OK", icon: <CheckCircle2 size={12} />, variant: "default" },
  error:   { label: "NAV hiba", icon: <AlertCircle size={12} />, variant: "destructive" },
};

function fmt(amount: number | null) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(amount);
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("hu-HU", { year: "numeric", month: "short", day: "numeric" });
}

export function BillingListClient({ initialInvoices, companyId }: { initialInvoices: Invoice[]; companyId: string }) {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [navFilter, setNavFilter] = useState<"all" | "pending" | "done" | "error">("all");
  const [exporting, setExporting] = useState(false);

  const filtered = initialInvoices.filter(inv => {
    if (navFilter !== "all" && inv.nav_status !== navFilter) return false;
    const createdAt = inv.created_at.slice(0, 10);
    if (from && createdAt < from) return false;
    if (to && createdAt > to) return false;
    if (search) {
      const q = search.toLowerCase();
      const matches =
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.jobs?.job_number?.toLowerCase().includes(q) ||
        inv.jobs?.customers?.name?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  // NAV hibás számlákat előre
  const sorted = [...filtered].sort((a, b) => {
    if (a.nav_status === "error" && b.nav_status !== "error") return -1;
    if (b.nav_status === "error" && a.nav_status !== "error") return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const total = sorted.reduce((s, inv) => s + (inv.gross_total ?? 0), 0);

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/export/accounting?${params}`);
      if (!res.ok) { alert("Export hiba"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `szamlak-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters + export */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Keresés</label>
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Számlaszám, job, ügyfél…"
            className="h-8 w-48 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Dátumtól</label>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Dátumig</label>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="flex gap-1">
          {(["all", "error", "pending", "done"] as const).map(f => (
            <Button key={f} size="sm" variant={navFilter === f ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => setNavFilter(f)}>
              {f === "all" ? "Mind" : NAV_BADGE[f]?.label}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="outline" className="h-8 ml-auto"
          disabled={exporting}
          onClick={handleExport}>
          <FileDown size={14} className="mr-1.5" />
          {exporting ? "Exportálás…" : "CSV export"}
        </Button>
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground">
        {sorted.length} számla · Összesen: <span className="font-medium text-foreground">{fmt(total)}</span>
      </div>

      {/* Table — desktop */}
      <div className="hidden sm:block rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Számlaszám</th>
              <th className="px-3 py-2 text-left font-medium">Ügyfél</th>
              <th className="px-3 py-2 text-left font-medium">Job</th>
              <th className="px-3 py-2 text-left font-medium">Kiállítva</th>
              <th className="px-3 py-2 text-right font-medium">Összeg</th>
              <th className="px-3 py-2 text-center font-medium">NAV</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Nincs találat</td></tr>
            )}
            {sorted.map(inv => {
              const nav = NAV_BADGE[inv.nav_status ?? "pending"] ?? NAV_BADGE.pending;
              return (
                <tr key={inv.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono text-xs">{inv.invoice_number ?? "—"}</td>
                  <td className="px-3 py-2">{inv.jobs?.customers?.name ?? "—"}</td>
                  <td className="px-3 py-2">
                    {inv.jobs ? (
                      <a href={`/jobs/${inv.jobs.id}/invoice`}
                        className="text-primary hover:underline text-xs font-mono">
                        {inv.jobs.job_number}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{fmtDate(inv.issued_at ?? inv.created_at)}</td>
                  <td className="px-3 py-2 text-right font-medium">{fmt(inv.gross_total)}</td>
                  <td className="px-3 py-2 text-center">
                    <Badge variant={nav.variant} className="gap-1 text-xs">
                      {nav.icon} {nav.label}
                    </Badge>
                    {inv.nav_error && (
                      <div className="text-[10px] text-destructive mt-0.5 max-w-[160px] truncate" title={inv.nav_error}>
                        {inv.nav_error}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-end">
                      {inv.pdf_url && (
                        <a href={inv.pdf_url} target="_blank" rel="noreferrer"
                          className="text-muted-foreground hover:text-foreground">
                          <FileDown size={14} />
                        </a>
                      )}
                      {inv.jobs && (
                        <a href={`/jobs/${inv.jobs.id}/invoice`}
                          className="text-muted-foreground hover:text-foreground">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cards — mobile */}
      <div className="sm:hidden space-y-2">
        {sorted.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Nincs találat</p>
        )}
        {sorted.map(inv => {
          const nav = NAV_BADGE[inv.nav_status ?? "pending"] ?? NAV_BADGE.pending;
          return (
            <div key={inv.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-xs font-medium">{inv.invoice_number ?? "—"}</div>
                  <div className="text-sm">{inv.jobs?.customers?.name ?? "—"}</div>
                </div>
                <Badge variant={nav.variant} className="gap-1 text-xs shrink-0">
                  {nav.icon} {nav.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{fmtDate(inv.issued_at ?? inv.created_at)}</span>
                <span className="font-medium">{fmt(inv.gross_total)}</span>
              </div>
              {inv.jobs && (
                <a href={`/jobs/${inv.jobs.id}/invoice`}
                  className="text-xs text-primary hover:underline font-mono">
                  {inv.jobs.job_number} →
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

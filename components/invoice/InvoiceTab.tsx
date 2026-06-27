"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

type Invoice = {
  id: string;
  invoice_number: string | null;
  nav_status: string | null;
  nav_error: string | null;
  gross_total: number | null;
  pdf_url: string | null;
  issued_at: string | null;
};

const NAV_ICONS = {
  pending: <Clock size={14} className="text-yellow-600" />,
  done:    <CheckCircle size={14} className="text-green-600" />,
  error:   <AlertCircle size={14} className="text-red-600" />,
};

const NAV_LABELS = { pending: "NAV feldolgozás alatt", done: "NAV jóváhagyta", error: "NAV hiba" };

export function InvoiceTab({
  jobId,
  jobStatus,
  invoice: initialInvoice,
  canIssue,
}: {
  jobId: string;
  jobStatus: string;
  invoice: Invoice | null;
  canIssue: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [invoice, setInvoice] = useState<Invoice | null>(initialInvoice);

  const isReady = jobStatus === "kesz" || jobStatus === "szamlazva" || jobStatus === "fizetve";

  function handleIssue() {
    startTransition(async () => {
      const res = await fetch(`/api/jobs/${jobId}/invoice`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Számlakiállítás sikertelen.");
        return;
      }
      if (data.alreadyExisted) {
        toast.info("A számla már ki volt állítva.");
      } else {
        toast.success("Számla kiállítva.");
      }
      setInvoice(data.invoice);
      router.refresh();
    });
  }

  if (!isReady) {
    return (
      <div className="text-center py-16 space-y-2 text-muted-foreground">
        <FileText size={32} className="mx-auto opacity-30" />
        <p className="font-medium">A számla fül a munka lezárása után aktív</p>
        <p className="text-sm">Zárd le a munkát a Munkalap fülön, majd állítsd a státuszt Kész-re.</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-sm space-y-4">
        <div className="space-y-1">
          <h2 className="font-semibold">Számla kiállítása</h2>
          <p className="text-sm text-muted-foreground">
            A számlát a beállított számlázó integráció állítja ki (Billingo / Számlázz.hu).
            Kétszer kattintva is csak egy számla jön létre.
          </p>
        </div>
        {canIssue ? (
          <Button onClick={handleIssue} disabled={isPending}>
            <FileText size={15} className="mr-1.5" />
            {isPending ? "Kiállítás…" : "Számla kiállítása"}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Csak owner vagy diszpécser állíthat ki számlát.</p>
        )}
      </div>
    );
  }

  const navStatus = (invoice.nav_status ?? "pending") as keyof typeof NAV_LABELS;

  return (
    <div className="max-w-sm space-y-5">
      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{invoice.invoice_number ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {invoice.issued_at
                ? new Date(invoice.issued_at).toLocaleDateString("hu-HU", { dateStyle: "medium" })
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {NAV_ICONS[navStatus] ?? <Clock size={14} />}
            <span className="text-xs text-muted-foreground">{NAV_LABELS[navStatus]}</span>
          </div>
        </div>

        {invoice.gross_total && (
          <p className="text-xl font-semibold">{invoice.gross_total.toLocaleString("hu-HU")} Ft</p>
        )}

        {invoice.nav_error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {invoice.nav_error}
          </div>
        )}

        {invoice.pdf_url && (
          <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="w-full">
              <ExternalLink size={13} className="mr-1.5" />
              PDF letöltése
            </Button>
          </a>
        )}
      </div>

      {canIssue && !invoice && (
        <Button variant="outline" size="sm" onClick={handleIssue} disabled={isPending}>
          Újra kiállítás
        </Button>
      )}
    </div>
  );
}

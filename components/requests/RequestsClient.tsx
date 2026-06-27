"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Mail, MapPin, MessageSquare, Wrench, ExternalLink } from "lucide-react";
import { updateRequestStatus, convertRequestToJob } from "@/lib/requests/actions";

type Request = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  message: string | null;
  status: string;
  job_id: string | null;
  created_at: string;
  services: { name: string } | null;
};

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  new: { label: "Új", variant: "default" },
  contacted: { label: "Kapcsolatba léptek", variant: "secondary" },
  converted: { label: "Konvertálva", variant: "outline" },
  spam: { label: "Spam", variant: "destructive" },
};

const FILTER_OPTIONS = [
  { value: "all", label: "Mind" },
  { value: "new", label: "Új" },
  { value: "contacted", label: "Kapcsolatba léptek" },
  { value: "converted", label: "Konvertálva" },
  { value: "spam", label: "Spam" },
];

export function RequestsClient({ initialRequests, companyId }: { initialRequests: Request[]; companyId: string }) {
  const [requests, setRequests] = useState<Request[]>(initialRequests);
  const [filter, setFilter] = useState("new");
  const [converting, setConverting] = useState<Request | null>(null);
  const [convertForm, setConvertForm] = useState({ newCustomerName: "", newCustomerPhone: "", newCustomerEmail: "", siteAddress: "" });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const visible = filter === "all" ? requests : requests.filter(r => r.status === filter);

  function handleStatusChange(id: string, status: string) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    startTransition(async () => {
      await updateRequestStatus(id, status as any);
    });
  }

  function openConvert(req: Request) {
    setConverting(req);
    setConvertForm({
      newCustomerName: req.name,
      newCustomerPhone: req.phone ?? "",
      newCustomerEmail: req.email ?? "",
      siteAddress: req.address ?? "",
    });
  }

  function handleConvert() {
    if (!converting) return;
    startTransition(async () => {
      const res = await convertRequestToJob({
        requestId: converting.id,
        customerId: null,
        newCustomerName: convertForm.newCustomerName,
        newCustomerPhone: convertForm.newCustomerPhone || undefined,
        newCustomerEmail: convertForm.newCustomerEmail || undefined,
        siteAddress: convertForm.siteAddress || undefined,
        serviceId: null,
      });
      if ("error" in res && res.error) { alert(res.error); return; }
      setConverting(null);
      setRequests(prev => prev.map(r => r.id === converting.id
        ? { ...r, status: "converted", job_id: (res as any).jobId }
        : r
      ));
      if ((res as any).jobId) router.push(`/jobs/${(res as any).jobId}`);
    });
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map(opt => (
          <Button key={opt.value} size="sm"
            variant={filter === opt.value ? "default" : "outline"}
            onClick={() => setFilter(opt.value)}>
            {opt.label}
            {opt.value !== "all" && (
              <span className="ml-1.5 text-xs opacity-70">
                {requests.filter(r => r.status === opt.value).length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nincs {filter === "all" ? "" : STATUS_LABELS[filter]?.label.toLowerCase() + " "}ajánlatkérés.
        </p>
      )}

      <div className="space-y-3">
        {visible.map(req => {
          const st = STATUS_LABELS[req.status] ?? STATUS_LABELS.new;
          return (
            <Card key={req.id}>
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-medium">{req.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {req.phone && (
                    <a href={`tel:${req.phone}`} className="flex items-center gap-1 hover:text-foreground">
                      <Phone size={13} /> {req.phone}
                    </a>
                  )}
                  {req.email && (
                    <a href={`mailto:${req.email}`} className="flex items-center gap-1 hover:text-foreground">
                      <Mail size={13} /> {req.email}
                    </a>
                  )}
                  {req.address && (
                    <span className="flex items-center gap-1">
                      <MapPin size={13} /> {req.address}
                    </span>
                  )}
                  {req.services?.name && (
                    <span className="flex items-center gap-1">
                      <Wrench size={13} /> {req.services.name}
                    </span>
                  )}
                </div>

                {req.message && (
                  <div className="flex gap-1.5 text-sm bg-muted/50 rounded p-2">
                    <MessageSquare size={13} className="shrink-0 mt-0.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{req.message}</span>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap pt-1">
                  {req.status === "new" && (
                    <Button size="sm" variant="outline"
                      disabled={isPending}
                      onClick={() => handleStatusChange(req.id, "contacted")}>
                      Kapcsolatba léptem
                    </Button>
                  )}
                  {req.status !== "converted" && req.status !== "spam" && (
                    <Button size="sm"
                      disabled={isPending}
                      onClick={() => openConvert(req)}>
                      Job létrehozása
                    </Button>
                  )}
                  {req.status !== "spam" && req.status !== "converted" && (
                    <Button size="sm" variant="ghost" className="text-muted-foreground"
                      disabled={isPending}
                      onClick={() => handleStatusChange(req.id, "spam")}>
                      Spam
                    </Button>
                  )}
                  {req.job_id && (
                    <a href={`/jobs/${req.job_id}`}
                      className="inline-flex items-center gap-1 h-8 px-3 text-sm border rounded-md hover:bg-muted">
                      <ExternalLink size={13} /> Job megtekintése
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Convert dialog */}
      <Dialog open={!!converting} onOpenChange={v => !v && setConverting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Job létrehozása kérésből</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Új ügyfél és job jön létre az alábbi adatokkal.
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ügyfél neve *</label>
              <Input value={convertForm.newCustomerName}
                onChange={e => setConvertForm(f => ({ ...f, newCustomerName: e.target.value }))}
                placeholder="Teljes neve" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Telefon</label>
                <Input value={convertForm.newCustomerPhone}
                  onChange={e => setConvertForm(f => ({ ...f, newCustomerPhone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">E-mail</label>
                <Input type="email" value={convertForm.newCustomerEmail}
                  onChange={e => setConvertForm(f => ({ ...f, newCustomerEmail: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cím</label>
              <Input value={convertForm.siteAddress}
                onChange={e => setConvertForm(f => ({ ...f, siteAddress: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConverting(null)}>Mégsem</Button>
            <Button
              disabled={!convertForm.newCustomerName.trim() || isPending}
              onClick={handleConvert}>
              Job létrehozása
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

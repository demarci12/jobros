import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, Wrench, CalendarClock, ArrowRight } from "lucide-react";

function fmt(n: number) {
  return n.toLocaleString("hu-HU") + " Ft";
}

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { supabase, companyId, role } = ctx;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  const [
    { data: invoicesThisMonth },
    { data: invoicesLastMonth },
    { data: unbilledJobs },
    { data: outstandingInvoices },
    { data: upcomingServices },
    { data: todayAppts },
    openJobsResult,
  ] = await Promise.all([
    supabase.from("invoices")
      .select("gross_total, status")
      .eq("company_id", companyId)
      .gte("created_at", monthStart),

    supabase.from("invoices")
      .select("gross_total")
      .eq("company_id", companyId)
      .gte("created_at", prevMonthStart)
      .lt("created_at", monthStart),

    // Kész de nem számlázott
    supabase.from("jobs")
      .select("id, job_number, title, customers(name)")
      .eq("company_id", companyId)
      .eq("status", "kesz")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(5),

    // Kiállított de nem fizetett számlák
    supabase.from("invoices")
      .select("id, invoice_number, gross_total, created_at, job_id, jobs(job_number, customers(name))")
      .eq("company_id", companyId)
      .eq("status", "szamlazva")
      .order("created_at", { ascending: true })
      .limit(5),

    // Közelgő szervizek (14 napon belül)
    supabase.from("equipment")
      .select("id, manufacturer, model, next_service_due, sites(address, customers(name))")
      .eq("company_id", companyId)
      .not("next_service_due", "is", null)
      .lte("next_service_due", new Date(now.getTime() + 14 * 86400000).toISOString().slice(0, 10))
      .gte("next_service_due", now.toISOString().slice(0, 10))
      .order("next_service_due")
      .limit(5),

    // Mai kiszállások
    supabase.from("appointments")
      .select("id, starts_at, ends_at, kind, job_id, jobs(job_number, title, customers(name))")
      .eq("company_id", companyId)
      .neq("status", "lemondva")
      .gte("starts_at", new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
      .lt("starts_at", new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString())
      .order("starts_at")
      .limit(6),

    // Nyitott munkák száma
    supabase.from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .in("status", ["uj", "elfogadva", "folyamatban"])
      .is("deleted_at", null),
  ]);

  const revenueMonth = (invoicesThisMonth ?? []).reduce((s, i) => s + (i.gross_total ?? 0), 0);
  const revenuePrev = (invoicesLastMonth ?? []).reduce((s, i) => s + (i.gross_total ?? 0), 0);
  const paidMonth = (invoicesThisMonth ?? []).filter(i => i.status === "fizetve").reduce((s, i) => s + (i.gross_total ?? 0), 0);
  const outstandingTotal = (outstandingInvoices ?? []).reduce((s, i) => s + (i.gross_total ?? 0), 0);
  const revDiff = revenuePrev > 0 ? Math.round(((revenueMonth - revenuePrev) / revenuePrev) * 100) : null;
  const openCount = (openJobsResult as any)?.count ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Irányítópult</h1>

      {/* KPI kártyák */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-normal uppercase tracking-wide">Bevétel (hónap)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{fmt(revenueMonth)}</p>
            {revDiff !== null && (
              <p className={`text-xs mt-1 ${revDiff >= 0 ? "text-green-600" : "text-destructive"}`}>
                {revDiff >= 0 ? "+" : ""}{revDiff}% előző hónaphoz
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-normal uppercase tracking-wide">Befolyt (hónap)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{fmt(paidMonth)}</p>
            <p className="text-xs text-muted-foreground mt-1">fizetve</p>
          </CardContent>
        </Card>

        <Card className={outstandingTotal > 0 ? "border-orange-200" : undefined}>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-normal uppercase tracking-wide">Kintlévőség</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className={`text-2xl font-bold ${outstandingTotal > 0 ? "text-orange-600" : ""}`}>{fmt(outstandingTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">{(outstandingInvoices ?? []).length} számla</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-normal uppercase tracking-wide">Nyitott munkák</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{openCount}</p>
            <p className="text-xs text-muted-foreground mt-1">folyamatban</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mai kiszállások */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarClock size={15} /> Mai kiszállások
            </CardTitle>
            <Link href="/calendar">
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                Naptár <ArrowRight size={12} className="ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-0.5 pb-3">
            {(todayAppts ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Ma nincs kiszállás.</p>
            ) : (todayAppts ?? []).map((a: any) => {
              const job = Array.isArray(a.jobs) ? a.jobs[0] : a.jobs;
              const customer = Array.isArray(job?.customers) ? job?.customers[0] : job?.customers;
              return (
                <Link key={a.id} href={`/jobs/${a.job_id}`}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors">
                  <span className="text-xs text-muted-foreground whitespace-nowrap w-10 shrink-0">
                    {new Date(a.starts_at).toLocaleTimeString("hu-HU", { timeStyle: "short" })}
                  </span>
                  <span className="text-sm truncate">{customer?.name ?? job?.title ?? "—"}</span>
                  <Badge variant="outline" className="text-[10px] ml-auto shrink-0">{a.kind}</Badge>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Számlázandó munkák */}
        <Card className={(unbilledJobs ?? []).length > 0 ? "border-yellow-200" : undefined}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle size={15} className={(unbilledJobs ?? []).length > 0 ? "text-yellow-500" : "text-muted-foreground"} />
              Számlázandó munkák
            </CardTitle>
            <Link href="/jobs?status=kesz">
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                Mind <ArrowRight size={12} className="ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-0.5 pb-3">
            {(unbilledJobs ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Minden munka számlázva.</p>
            ) : (unbilledJobs ?? []).map((j: any) => {
              const customer = Array.isArray(j.customers) ? j.customers[0] : j.customers;
              return (
                <Link key={j.id} href={`/jobs/${j.id}`}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors">
                  <span className="text-xs text-muted-foreground w-16 shrink-0">{j.job_number}</span>
                  <span className="text-sm truncate">{customer?.name ?? j.title ?? "—"}</span>
                  <Badge className="ml-auto shrink-0 text-[10px] bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">Kész</Badge>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Kintlévő számlák */}
        {(outstandingInvoices ?? []).length > 0 && (
          <Card className="border-orange-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock size={15} className="text-orange-500" /> Kintlévő számlák
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5 pb-3">
              {(outstandingInvoices ?? []).map((inv: any) => {
                const job = Array.isArray(inv.jobs) ? inv.jobs[0] : inv.jobs;
                const customer = Array.isArray(job?.customers) ? job?.customers[0] : job?.customers;
                const daysPast = Math.floor((now.getTime() - new Date(inv.created_at).getTime()) / 86400000);
                return (
                  <Link key={inv.id} href={`/jobs/${inv.job_id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">{inv.invoice_number}</span>
                    <span className="text-sm truncate">{customer?.name ?? "—"}</span>
                    <div className="ml-auto text-right shrink-0">
                      <p className="text-xs font-semibold">{fmt(inv.gross_total ?? 0)}</p>
                      <p className={`text-[10px] ${daysPast > 30 ? "text-destructive" : "text-muted-foreground"}`}>{daysPast} napja</p>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Közelgő szervizek */}
        {(upcomingServices ?? []).length > 0 && (
          <Card className="border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wrench size={15} className="text-blue-500" /> Közelgő szervizek (14 napon belül)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pb-3">
              {(upcomingServices ?? []).map((eq: any) => {
                const site = Array.isArray(eq.sites) ? eq.sites[0] : eq.sites;
                const customer = Array.isArray(site?.customers) ? site?.customers[0] : site?.customers;
                const daysLeft = Math.ceil((new Date(eq.next_service_due).getTime() - now.getTime()) / 86400000);
                return (
                  <div key={eq.id} className="flex items-center gap-2 rounded-md px-2 py-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{customer?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{eq.manufacturer} {eq.model}</p>
                    </div>
                    <Badge variant="outline"
                      className={`text-[10px] shrink-0 ${daysLeft <= 3 ? "border-red-300 text-red-600" : "border-blue-300 text-blue-600"}`}>
                      {daysLeft === 0 ? "Ma" : `${daysLeft} nap`}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

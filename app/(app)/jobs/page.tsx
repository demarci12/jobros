import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase } from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, type JobStatus } from "@/lib/jobs/status-machine";

const STATUS_FILTERS: JobStatus[] = ["uj","felmeres","arajanlat","utemezve","folyamatban","kesz","szamlazva"];

async function JobsList({ activeStatus }: { activeStatus?: JobStatus }) {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  const { supabase, companyId, role, user } = ctx;

  let query = supabase
    .from("jobs")
    .select("id, job_number, title, status, created_at, customers(name), services(name), sites(address, city, zip)")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (activeStatus) query = query.eq("status", activeStatus);
  if (role === "technician") query = query.eq("assigned_to", user.id);

  const { data: jobs } = await query;

  if ((jobs ?? []).length === 0) {
    return <EmptyState icon={Briefcase} title="Nincs munka" description="A munkák az ügyfélprofilból foglalással jönnek létre." />;
  }

  return (
    <ul className="divide-y rounded-lg border">
      {(jobs ?? []).map((j: any) => (
        <li key={j.id}>
          <Link href={`/jobs/${j.id}`}
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono shrink-0">{j.job_number}</span>
                <span className="font-medium text-sm truncate">{j.title || (j as any).services?.name || "—"}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {j.customers?.name}
                {(() => {
                  const s = (j as any).sites;
                  const addr = s ? [s.zip, s.address, s.city].filter(Boolean).join(" ") : null;
                  return addr ? ` · ${addr}` : "";
                })()}
              </p>
            </div>
            <Badge className={`text-xs shrink-0 ${STATUS_COLORS[j.status as JobStatus]}`} variant="outline">
              {STATUS_LABELS[j.status as JobStatus] ?? j.status}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function JobsListSkeleton() {
  return (
    <div className="rounded-lg border divide-y">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3 gap-3">
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default async function JobsPage({ searchParams }: { searchParams: { status?: string } }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const activeStatus = searchParams.status as JobStatus | undefined;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Munkák</h1>

      <div className="flex gap-1.5 flex-wrap">
        <Link href="/jobs" className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${!activeStatus ? "bg-foreground text-background" : "hover:bg-muted"}`}>
          Mind
        </Link>
        {STATUS_FILTERS.map(s => (
          <Link key={s} href={`/jobs?status=${s}`}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${activeStatus === s ? "bg-foreground text-background" : "hover:bg-muted"}`}>
            {STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      <Suspense fallback={<JobsListSkeleton />}>
        <JobsList activeStatus={activeStatus} />
      </Suspense>
    </div>
  );
}

import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, MapPin, User } from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, type JobStatus } from "@/lib/jobs/status-machine";

const STATUS_FILTERS: JobStatus[] = ["uj","felmeres","arajanlat","utemezve","folyamatban","kesz","szamlazva"];

// Left border accent per status for quick visual scanning
const STATUS_BORDER: Record<string, string> = {
  uj:          "border-l-gray-400",
  felmeres:    "border-l-purple-400",
  arajanlat:   "border-l-yellow-400",
  utemezve:    "border-l-blue-400",
  folyamatban: "border-l-orange-400",
  kesz:        "border-l-green-400",
  szamlazva:   "border-l-teal-400",
  fizetve:     "border-l-emerald-500",
};

async function JobsList({ activeStatus }: { activeStatus?: JobStatus }) {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  const { supabase, companyId, role, user } = ctx;

  let query = supabase
    .from("jobs")
    .select(`
      id, job_number, title, status, created_at,
      customers(name),
      services(name),
      sites(address, city, zip),
      profiles!jobs_assigned_to_fkey(full_name)
    `)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (activeStatus) query = query.eq("status", activeStatus);
  if (role === "technician") query = query.eq("assigned_to", user.id);

  const { data: jobs, error } = await query;

  if (error && !jobs) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Adatok betöltése sikertelen. Frissítsd az oldalt, vagy próbáld újra.
      </div>
    );
  }

  if ((jobs ?? []).length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Nincs munka"
        description="A munkák az ügyfélprofilból foglalással jönnek létre."
      />
    );
  }

  return (
    <ul className="space-y-1.5">
      {(jobs ?? []).map((j: any) => {
        const site = j.sites;
        const addr = site ? [site.zip, site.city, site.address].filter(Boolean).join(" ") : null;
        const techName = j.profiles?.full_name ?? null;
        const dateStr = new Date(j.created_at).toLocaleDateString("hu-HU", {
          month: "short", day: "numeric",
        });

        return (
          <li key={j.id}>
            <Link
              href={`/jobs/${j.id}`}
              className={`flex items-stretch gap-0 rounded-lg border border-l-4 overflow-hidden hover:bg-muted/40 transition-colors ${STATUS_BORDER[j.status] ?? "border-l-gray-300"}`}
            >
              {/* Main content */}
              <div className="flex-1 min-w-0 px-4 py-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-[11px] text-muted-foreground shrink-0">{j.job_number}</span>
                  <span className="font-medium text-sm truncate">
                    {j.title || j.services?.name || "—"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  {j.customers?.name && (
                    <span className="font-medium text-foreground/70">{j.customers.name}</span>
                  )}
                  {addr && (
                    <span className="flex items-center gap-0.5">
                      <MapPin size={11} className="shrink-0" />
                      <span className="truncate max-w-[200px]">{addr}</span>
                    </span>
                  )}
                  {techName && (
                    <span className="flex items-center gap-0.5">
                      <User size={11} className="shrink-0" />
                      {techName}
                    </span>
                  )}
                </div>
              </div>

              {/* Right column: status + date */}
              <div className="flex flex-col items-end justify-center gap-1.5 px-3 py-3 shrink-0">
                <Badge className={`text-xs ${STATUS_COLORS[j.status as JobStatus]}`} variant="outline">
                  {STATUS_LABELS[j.status as JobStatus] ?? j.status}
                </Badge>
                <span className="text-[11px] text-muted-foreground">{dateStr}</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function JobsListSkeleton() {
  return (
    <div className="space-y-1.5">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center justify-between rounded-lg border border-l-4 border-l-gray-300 px-4 py-3 gap-3">
          <div className="space-y-1.5 flex-1">
            <div className="flex gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
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
      <div className="border-b pb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Munkák</h1>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        <Link
          href="/jobs"
          className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
            !activeStatus ? "bg-foreground text-background" : "hover:bg-muted"
          }`}
        >
          Mind
        </Link>
        {STATUS_FILTERS.map(s => (
          <Link
            key={s}
            href={`/jobs?status=${s}`}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              activeStatus === s ? "bg-foreground text-background" : "hover:bg-muted"
            }`}
          >
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

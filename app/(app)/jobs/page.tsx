import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { Briefcase } from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, type JobStatus } from "@/lib/jobs/status-machine";

const STATUS_FILTERS: JobStatus[] = ["uj","felmeres","arajanlat","utemezve","folyamatban","kesz","szamlazva"];

export default async function JobsPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) redirect("/onboarding");

  const activeStatus = searchParams.status as JobStatus | undefined;

  let query = supabase
    .from("jobs")
    .select("id, job_number, title, status, created_at, customers(name), services(name)")
    .eq("company_id", cu.company_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (activeStatus) query = query.eq("status", activeStatus);
  if (cu.role === "technician") query = query.eq("assigned_to", user.id);

  const { data: jobs } = await query;

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

      {(jobs ?? []).length === 0 ? (
        <EmptyState icon={Briefcase} title="Nincs munka" description="A munkák az ügyfélprofilból foglalással jönnek létre." />
      ) : (
        <ul className="divide-y rounded-lg border">
          {(jobs ?? []).map((j: any) => (
            <li key={j.id}>
              <Link href={`/jobs/${j.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">{j.job_number}</span>
                    <span className="font-medium text-sm truncate">{j.title || j.services?.name || "—"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{j.customers?.name}</p>
                </div>
                <Badge className={`text-xs shrink-0 ${STATUS_COLORS[j.status as JobStatus]}`} variant="outline">
                  {STATUS_LABELS[j.status as JobStatus] ?? j.status}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

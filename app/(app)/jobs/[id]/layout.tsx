import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { Button } from "@/components/ui/button";
import { JobStatusPipeline } from "@/components/jobs/JobStatusPipeline";
import { SheetTabs } from "@/components/jobs/SheetTabs";
import { type JobStatus } from "@/lib/jobs/status-machine";
import { ArrowLeft } from "lucide-react";

export default async function JobDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { supabase, companyId, role, user } = ctx;

  const { data: job } = await supabase
    .from("jobs")
    .select("id, job_number, title, status, assigned_to, customers(id, name)")
    .eq("id", params.id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!job) notFound();

  const canEdit = ["owner", "dispatcher"].includes(role);

  return (
    <div className="flex flex-col min-h-0">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background border-b">
        <div className="px-4 pt-3 pb-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <Link href="/jobs">
              <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8">
                <ArrowLeft size={16} />
              </Button>
            </Link>
            <span className="font-mono text-xs text-muted-foreground">{job.job_number}</span>
            <span className="font-semibold text-sm truncate">
              {job.title || (job as any).customers?.name || "Munka"}
            </span>
          </div>

          {(job as any).customers && (
            <p className="text-xs text-muted-foreground pl-8">
              <Link href={`/customers/${(job as any).customers.id}`} className="hover:underline">
                {(job as any).customers.name}
              </Link>
            </p>
          )}

          <div className="pl-8">
            <JobStatusPipeline
              jobId={job.id}
              currentStatus={job.status as JobStatus}
              canEdit={canEdit}
              assignedTo={job.assigned_to}
              currentUserId={user.id}
              currentUserRole={role}
            />
          </div>
        </div>

        <SheetTabs jobId={job.id} status={job.status as JobStatus} />
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>
    </div>
  );
}

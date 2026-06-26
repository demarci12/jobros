import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) redirect("/onboarding");

  const { data: job } = await supabase
    .from("jobs")
    .select("id, job_number, title, status, assigned_to, customers(id, name)")
    .eq("id", params.id)
    .eq("company_id", cu.company_id)
    .maybeSingle();
  if (!job) notFound();

  const canEdit = ["owner", "dispatcher"].includes(cu.role);

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
              currentUserRole={cu.role}
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

"use client";

import { useState, useTransition } from "react";
import { transitionJob } from "@/lib/jobs/actions";
import { canTransition, STATUS_LABELS, type JobStatus } from "@/lib/jobs/status-machine";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PIPELINE_STEPS: JobStatus[] = ["uj","utemezve","folyamatban","kesz","szamlazva","fizetve"];

export function JobStatusPipeline({ jobId, currentStatus, canEdit, assignedTo, currentUserId, currentUserRole }: {
  jobId: string;
  currentStatus: JobStatus;
  canEdit: boolean;
  assignedTo: string | null;
  currentUserId: string;
  currentUserRole: string;
}) {
  const [status, setStatus] = useState<JobStatus>(currentStatus);
  const [isPending, startTransition] = useTransition();

  const allowedNext = (["uj","felmeres","arajanlat","utemezve","folyamatban","kesz","szamlazva","fizetve","elutasitva","lemondva"] as JobStatus[])
    .filter(s => canTransition(status, s));

  const isTech = currentUserRole === "technician";
  const canAct = canEdit || (isTech && assignedTo === currentUserId);

  function handleTransition(to: JobStatus) {
    const prev = status;
    setStatus(to);
    startTransition(async () => {
      const result = await transitionJob(jobId, to);
      if (result?.error) {
        toast.error(result.error);
        setStatus(prev);
      } else {
        toast.success(`Státusz: ${STATUS_LABELS[to]}`);
      }
    });
  }

  return (
    <div className="space-y-2">
      {/* Pipeline vizuális */}
      <div className="flex items-center gap-0.5 overflow-x-auto">
        {PIPELINE_STEPS.map((step, i) => {
          const idx = PIPELINE_STEPS.indexOf(status);
          const isPast = i < idx;
          const isCurrent = step === status;
          return (
            <div key={step} className="flex items-center">
              <div className={`px-2 py-0.5 text-xs rounded whitespace-nowrap ${
                isCurrent ? "bg-foreground text-background font-semibold" :
                isPast ? "bg-muted text-muted-foreground" :
                "text-muted-foreground"
              }`}>
                {STATUS_LABELS[step]}
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className={`w-4 h-px ${isPast || isCurrent ? "bg-muted-foreground" : "bg-muted"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Akció gombok */}
      {canAct && allowedNext.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {allowedNext.map(to => (
            <Button key={to} size="sm" variant={to === "lemondva" || to === "elutasitva" ? "outline" : "default"}
              className={to === "lemondva" || to === "elutasitva" ? "text-destructive hover:text-destructive" : ""}
              disabled={isPending} onClick={() => handleTransition(to)}>
              → {STATUS_LABELS[to]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

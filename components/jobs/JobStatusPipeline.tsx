"use client";

import { useState, useTransition } from "react";
import { transitionJob } from "@/lib/jobs/actions";
import { canTransition, STATUS_LABELS, type JobStatus } from "@/lib/jobs/status-machine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";

const STATUS_VARIANT: Record<JobStatus, "default" | "secondary" | "outline" | "destructive"> = {
  uj:          "outline",
  felmeres:    "secondary",
  arajanlat:   "secondary",
  utemezve:    "secondary",
  folyamatban: "default",
  kesz:        "default",
  szamlazva:   "secondary",
  fizetve:     "default",
  elutasitva:  "destructive",
  lemondva:    "destructive",
};

const FORWARD_STATUSES: JobStatus[] = ["uj","felmeres","arajanlat","utemezve","folyamatban","kesz","szamlazva","fizetve"];
const CANCEL_STATUSES: JobStatus[] = ["elutasitva","lemondva"];

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

  const isTech = currentUserRole === "technician";
  const canAct = canEdit || (isTech && assignedTo === currentUserId);

  const forwardNext = FORWARD_STATUSES.filter(s => canTransition(status, s));
  const cancelNext  = CANCEL_STATUSES.filter(s => canTransition(status, s));

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
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant={STATUS_VARIANT[status]} className="text-xs">
        {STATUS_LABELS[status]}
      </Badge>

      {canAct && forwardNext.length > 0 && (
        <div className="flex items-center gap-1">
          {forwardNext.map(to => (
            <Button key={to} size="sm" variant="ghost"
              className="h-6 px-2 text-xs gap-0.5 text-muted-foreground hover:text-foreground"
              disabled={isPending} onClick={() => handleTransition(to)}>
              <ChevronRight size={12} />
              {STATUS_LABELS[to]}
            </Button>
          ))}
        </div>
      )}

      {canAct && cancelNext.length > 0 && (
        <div className="flex items-center gap-1">
          {cancelNext.map(to => (
            <Button key={to} size="sm" variant="ghost"
              className="h-6 px-2 text-xs text-destructive/70 hover:text-destructive"
              disabled={isPending} onClick={() => handleTransition(to)}>
              {STATUS_LABELS[to]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

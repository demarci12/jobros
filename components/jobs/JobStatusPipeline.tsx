"use client";

import { useState, useTransition } from "react";
import { transitionJob } from "@/lib/jobs/actions";
import { canTransition, STATUS_LABELS, type JobStatus } from "@/lib/jobs/status-machine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronRight, MoreHorizontal } from "lucide-react";
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

  // Az elsőként elérhető, pipeline-sorrend szerinti következő státusz — ez a "könnyed léptetés" gomb.
  const primaryNext = forwardNext[0];
  const otherOptions = [...forwardNext.slice(1), ...cancelNext];

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

      {canAct && primaryNext && (
        <Button size="sm" className="h-7 px-2.5 text-xs gap-1"
          disabled={isPending} onClick={() => handleTransition(primaryNext)}>
          {STATUS_LABELS[primaryNext]}
          <ChevronRight size={13} />
        </Button>
      )}

      {canAct && otherOptions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
            disabled={isPending}
            aria-label="További státuszok"
          >
            <MoreHorizontal size={14} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {otherOptions.map(to => (
              <DropdownMenuItem
                key={to}
                className={CANCEL_STATUSES.includes(to) ? "text-destructive focus:text-destructive" : ""}
                onClick={() => handleTransition(to)}
              >
                {STATUS_LABELS[to]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

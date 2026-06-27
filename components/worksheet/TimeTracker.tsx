"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clockIn, clockOut, deleteTimeEntry } from "@/lib/time-entries/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDelete } from "@/components/common/ConfirmDelete";
import { toast } from "sonner";
import { Play, Square, Trash2, Clock } from "lucide-react";

type TimeEntry = {
  id: string;
  technician_id: string;
  started_at: string;
  stopped_at: string | null;
  duration_min: number | null;
  note: string | null;
  profiles: { full_name: string | null } | null;
};

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h} ó ${m} p` : `${m} p`;
}

function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const update = () => {
      const ms = Date.now() - new Date(startedAt).getTime();
      setElapsed(Math.floor(ms / 60000));
    };
    update();
    const id = setInterval(update, 10000); // update every 10s
    return () => clearInterval(id);
  }, [startedAt]);

  return <span className="font-mono text-sm">{formatDuration(elapsed)}</span>;
}

export function TimeTracker({
  jobId,
  entries,
  currentUserId,
  canEdit,
}: {
  jobId: string;
  entries: TimeEntry[];
  currentUserId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TimeEntry | null>(null);

  const running = entries.find(e => e.stopped_at === null && e.technician_id === currentUserId);
  const totalMin = entries
    .filter(e => e.stopped_at !== null && e.duration_min != null)
    .reduce((s, e) => s + (e.duration_min ?? 0), 0);

  function handleClockIn() {
    startTransition(async () => {
      const res = await clockIn(jobId);
      if (res?.error) toast.error(res.error);
      else { toast.success("Időmérő elindítva."); router.refresh(); }
    });
  }

  function handleClockOut() {
    if (!running) return;
    startTransition(async () => {
      const res = await clockOut(running.id, jobId, note || undefined);
      if (res?.error) toast.error(res.error);
      else { toast.success("Időmérő leállítva."); setNote(""); router.refresh(); }
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await deleteTimeEntry(deleteTarget.id, jobId);
      if (res?.error) toast.error(res.error);
      else { toast.success("Bejegyzés törölve."); setDeleteTarget(null); router.refresh(); }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock size={15} className="text-muted-foreground" />
        <h3 className="font-semibold text-sm">Időkövetés</h3>
        {totalMin > 0 && (
          <Badge variant="secondary" className="text-xs">
            Összesen: {formatDuration(totalMin)}
          </Badge>
        )}
      </div>

      {/* Running timer */}
      {running && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-green-800 flex-1">
            Fut: <ElapsedTimer startedAt={running.started_at} />
          </span>
          <Input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Megjegyzés (opcionális)"
            className="h-7 text-xs max-w-[180px]"
          />
          <Button size="sm" variant="destructive" className="h-7 px-2" disabled={isPending} onClick={handleClockOut}>
            <Square size={12} className="mr-1" /> Stop
          </Button>
        </div>
      )}

      {/* Clock-in button */}
      {canEdit && !running && (
        <Button size="sm" variant="outline" disabled={isPending} onClick={handleClockIn}>
          <Play size={13} className="mr-1 text-green-600" /> Időmérő indítása
        </Button>
      )}

      {/* Entries list */}
      {entries.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-xs text-muted-foreground border-b">
                <th className="px-3 py-1.5 text-left">Kezdés</th>
                <th className="px-3 py-1.5 text-left">Befejezés</th>
                <th className="px-3 py-1.5 text-right">Idő</th>
                <th className="px-3 py-1.5 text-left">Megjegyzés</th>
                <th className="px-2 py-1.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map(e => (
                <tr key={e.id} className="hover:bg-muted/20">
                  <td className="px-3 py-1.5 whitespace-nowrap text-xs">
                    {new Date(e.started_at).toLocaleString("hu-HU", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-xs">
                    {e.stopped_at
                      ? new Date(e.stopped_at).toLocaleTimeString("hu-HU", { timeStyle: "short" })
                      : <span className="text-green-600 font-medium">Fut…</span>}
                  </td>
                  <td className="px-3 py-1.5 text-right font-medium text-xs whitespace-nowrap">
                    {e.duration_min != null ? formatDuration(e.duration_min) : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground truncate max-w-[140px]">
                    {e.note ?? ""}
                  </td>
                  <td className="px-2 py-1.5">
                    {canEdit && e.stopped_at && (
                      <Button
                        size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        disabled={isPending}
                        onClick={() => setDeleteTarget(e)}
                      >
                        <Trash2 size={11} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {entries.length === 0 && !running && (
        <p className="text-xs text-muted-foreground">Még nincs időbejegyzés ennél a munkánál.</p>
      )}

      <ConfirmDelete
        open={!!deleteTarget}
        onOpenChange={v => !v && setDeleteTarget(null)}
        title="Időbejegyzés törlése"
        description="Ez a lépés nem vonható vissza."
        onConfirm={handleDelete}
        loading={isPending}
      />
    </div>
  );
}

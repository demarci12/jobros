import { Clock } from "lucide-react";
import { STATUS_LABELS } from "@/lib/jobs/status-machine";

interface TimelineEntry {
  id: string;
  from_status: string | null;
  to_status: string;
  created_at: string;
  note: string | null;
  profiles: { full_name: string | null } | null;
}

interface Props {
  entries: TimelineEntry[];
}

export function JobTimeline({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Még nincs státuszváltozás.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id} className="flex gap-3 text-sm">
          <div className="mt-0.5 shrink-0">
            <Clock size={14} className="text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {entry.from_status && (
                <>
                  <span className="text-muted-foreground">
                    {STATUS_LABELS[entry.from_status as keyof typeof STATUS_LABELS] ?? entry.from_status}
                  </span>
                  <span className="text-muted-foreground">→</span>
                </>
              )}
              <span className="font-medium">
                {STATUS_LABELS[entry.to_status as keyof typeof STATUS_LABELS] ?? entry.to_status}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              {entry.profiles?.full_name && (
                <span>{entry.profiles.full_name}</span>
              )}
              {entry.profiles?.full_name && <span>·</span>}
              <span>
                {new Date(entry.created_at).toLocaleString("hu-HU", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            </div>
            {entry.note && (
              <p className="text-xs text-muted-foreground mt-0.5 italic">{entry.note}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

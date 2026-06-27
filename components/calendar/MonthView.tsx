"use client";

import Link from "next/link";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

type Appointment = {
  id: string;
  job_id: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  technician_id: string | null;
  status: string;
  jobs: { job_number: string; title: string | null; customers: { name: string } | null } | null;
};

const KIND_COLORS: Record<string, string> = {
  felmeres: "bg-yellow-400",
  munka:    "bg-blue-500",
  garancia: "bg-purple-500",
};

const HU_DAYS = ["H", "K", "Sz", "Cs", "P", "Sz", "V"];
const HU_MONTHS = ["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"];

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

export function MonthView({
  month,
  appointments,
  technicians,
}: {
  month: Date;
  appointments: Appointment[];
  technicians: { id: string; name: string }[];
}) {
  const techMap = useMemo(
    () => Object.fromEntries(technicians.map(t => [t.id, t.name])),
    [technicians]
  );

  // Build 6-week grid starting Monday
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  const gridStart = new Date(first);
  const dow = gridStart.getDay();
  gridStart.setDate(gridStart.getDate() - (dow === 0 ? 6 : dow - 1));

  const days: Date[] = [];
  const cur = new Date(gridStart);
  while (days.length < 42) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }

  // Group appointments by ISO date
  const byDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      const key = a.starts_at.slice(0, 10);
      (map[key] ??= []).push(a);
    }
    return map;
  }, [appointments]);

  const today = isoDate(new Date());

  return (
    <div className="flex flex-col gap-0 select-none">
      {/* Header row */}
      <div className="grid grid-cols-7 border-b">
        {HU_DAYS.map((d, i) => (
          <div key={i} className="py-1.5 text-center text-xs font-semibold text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* 6 weeks */}
      <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: "minmax(90px, 1fr)" }}>
        {days.map(day => {
          const key = isoDate(day);
          const isThisMonth = day.getMonth() === month.getMonth();
          const isToday = key === today;
          const dayAppts = byDate[key] ?? [];

          return (
            <div
              key={key}
              className={cn(
                "border-b border-r p-1 flex flex-col gap-0.5 min-h-[90px]",
                !isThisMonth && "bg-muted/30",
              )}
            >
              <span className={cn(
                "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                isToday ? "bg-primary text-primary-foreground" : isThisMonth ? "" : "text-muted-foreground/50"
              )}>
                {day.getDate()}
              </span>

              {dayAppts.slice(0, 3).map(a => (
                <Link
                  key={a.id}
                  href={`/jobs/${a.job_id}`}
                  className={cn(
                    "text-[10px] leading-tight px-1 py-0.5 rounded truncate text-white font-medium hover:opacity-80",
                    KIND_COLORS[a.kind] ?? "bg-gray-400"
                  )}
                  title={`${a.jobs?.customers?.name ?? ""} — ${a.jobs?.title ?? a.kind}`}
                >
                  {new Date(a.starts_at).toLocaleTimeString("hu-HU", { timeStyle: "short" })}{" "}
                  {a.jobs?.customers?.name ?? a.jobs?.job_number ?? ""}
                </Link>
              ))}

              {dayAppts.length > 3 && (
                <span className="text-[10px] text-muted-foreground pl-1">
                  +{dayAppts.length - 3} további
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

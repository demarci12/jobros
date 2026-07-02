"use client";

import Link from "next/link";
import { useMemo, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  DndContext, PointerSensor, useSensor, useSensors,
  useDroppable, useDraggable,
  type DragEndEvent,
} from "@dnd-kit/core";

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

function DroppableDay({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn(className, isOver && "bg-blue-100/50")}>
      {children}
    </div>
  );
}

function DraggableAppt({ appt }: { appt: Appointment }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: appt.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={isDragging ? "opacity-40" : ""}>
      <Link
        href={`/jobs/${appt.job_id}`}
        onClick={e => e.stopPropagation()}
        className={cn(
          "block text-[10px] leading-tight px-1 py-0.5 rounded truncate text-white font-medium hover:opacity-80 cursor-grab active:cursor-grabbing",
          KIND_COLORS[appt.kind] ?? "bg-gray-400"
        )}
        title={`${appt.jobs?.customers?.name ?? ""} — ${appt.jobs?.title ?? appt.kind}`}
      >
        {new Date(appt.starts_at).toLocaleTimeString("hu-HU", { timeStyle: "short" })}{" "}
        {appt.jobs?.customers?.name ?? appt.jobs?.job_number ?? ""}
      </Link>
    </div>
  );
}

export function MonthView({
  month,
  appointments,
  technicians,
}: {
  month: Date;
  appointments: Appointment[];
  technicians: { id: string; name: string }[];
}) {
  const [items, setItems] = useState(appointments);
  const supabaseRef = useRef(createClient());
  useMemo(() => { setItems(appointments); }, [appointments]);

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
    for (const a of items) {
      const key = a.starts_at.slice(0, 10);
      (map[key] ??= []).push(a);
    }
    return map;
  }, [items]);

  const today = isoDate(new Date());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const newDayIso = String(over.id);
    const appt = items.find(a => a.id === active.id);
    if (!appt) return;

    const oldStart = new Date(appt.starts_at);
    const oldEnd = new Date(appt.ends_at);
    const durationMs = oldEnd.getTime() - oldStart.getTime();
    const [y, m, d] = newDayIso.split("-").map(Number);
    const newStart = new Date(oldStart);
    newStart.setFullYear(y, m - 1, d);
    if (isoDate(newStart) === isoDate(oldStart)) return; // dropped on same day
    const newEnd = new Date(newStart.getTime() + durationMs);

    setItems(prev => prev.map(a => a.id === appt.id
      ? { ...a, starts_at: newStart.toISOString(), ends_at: newEnd.toISOString() }
      : a
    ));

    await supabaseRef.current.from("appointments").update({
      starts_at: newStart.toISOString(),
      ends_at: newEnd.toISOString(),
    }).eq("id", appt.id);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
        <div className="grid grid-cols-7 flex-1 auto-rows-[64px] sm:auto-rows-[90px]">
          {days.map(day => {
            const key = isoDate(day);
            const isThisMonth = day.getMonth() === month.getMonth();
            const isToday = key === today;
            const dayAppts = byDate[key] ?? [];

            return (
              <DroppableDay
                key={key}
                id={key}
                className={cn(
                  "border-b border-r p-1 flex flex-col gap-0.5 min-h-[64px] sm:min-h-[90px] transition-colors",
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
                  <DraggableAppt key={a.id} appt={a} />
                ))}

                {dayAppts.length > 3 && (
                  <span className="text-[10px] text-muted-foreground pl-1">
                    +{dayAppts.length - 3} további
                  </span>
                )}
              </DroppableDay>
            );
          })}
        </div>
      </div>
    </DndContext>
  );
}

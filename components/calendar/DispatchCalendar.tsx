"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDroppable, useDraggable,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange } from "lucide-react";
import Link from "next/link";

type Technician = { id: string; name: string };
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

const HOUR_HEIGHT = 56; // px
const DAY_START = 7;
const DAY_END = 20;
const TOTAL_HOURS = DAY_END - DAY_START;

function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d: Date) {
  const r = new Date(d); const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1)); r.setHours(0, 0, 0, 0); return r;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("hu-HU", { timeStyle: "short" });
}

function apptTop(starts_at: string, day: Date): number {
  const start = new Date(starts_at);
  const minutesSinceDayStart = (start.getHours() - DAY_START) * 60 + start.getMinutes();
  return (minutesSinceDayStart / 60) * HOUR_HEIGHT;
}

function apptHeight(starts_at: string, ends_at: string): number {
  const ms = new Date(ends_at).getTime() - new Date(starts_at).getTime();
  return (ms / 3600000) * HOUR_HEIGHT;
}

function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }

function slotTimesFromClick(e: React.MouseEvent<HTMLElement>, day: Date): { startsAt: string; endsAt: string } {
  const rect = e.currentTarget.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const totalMinutes = Math.max(0, Math.min(Math.round((y / HOUR_HEIGHT) * 60 / 15) * 15, TOTAL_HOURS * 60 - 60));
  const start = new Date(day);
  start.setHours(DAY_START + Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

export function DispatchCalendar({
  initialAppointments,
  technicians,
  companyId,
  onSlotClick,
}: {
  initialAppointments: Appointment[];
  technicians: Technician[];
  companyId: string;
  onSlotClick?: (startsAt: string, endsAt: string, technicianId: string | null) => void;
}) {
  const [viewMode, setViewMode] = useState<"day" | "week">("week");
  const [pivotDate, setPivotDate] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });

  // Default to single-day view on narrow (mobile) screens — the week grid
  // needs horizontal scroll room per technician column that a phone doesn't have.
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setViewMode("day");
    }
  }, []);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [activeAppt, setActiveAppt] = useState<Appointment | null>(null);
  // "all" or a specific technician id
  const [selectedTechId, setSelectedTechId] = useState<string>("all");

  const visibleTechs = selectedTechId === "all"
    ? (technicians.length > 0 ? technicians : [{ id: "", name: "Nincs hozzárendelve" }])
    : (technicians.find(t => t.id === selectedTechId)
        ? [technicians.find(t => t.id === selectedTechId)!]
        : [{ id: "", name: "Nincs hozzárendelve" }]);

  const supabaseRef = useRef(createClient());

  // Realtime subscription
  useEffect(() => {
    const sb = supabaseRef.current;
    const channel = sb
      .channel(`appointments:${companyId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "appointments",
        filter: `company_id=eq.${companyId}`,
      }, async (payload) => {
        if (payload.eventType === "DELETE") {
          setAppointments(prev => prev.filter(a => a.id !== payload.old.id));
        } else {
          const { data } = await sb
            .from("appointments")
            .select("id, job_id, kind, starts_at, ends_at, technician_id, status, jobs(job_number, title, customers(name))")
            .eq("id", (payload.new as any).id)
            .maybeSingle();
          if (data) {
            setAppointments(prev => {
              const idx = prev.findIndex(a => a.id === (data as any).id);
              if (idx >= 0) { const next = [...prev]; next[idx] = data as unknown as Appointment; return next; }
              return [...prev, data as unknown as Appointment];
            });
          }
        }
      })
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [companyId]);

  // Days to display
  const days = viewMode === "week"
    ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(pivotDate), i))
    : [pivotDate];

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragStart(event: DragStartEvent) {
    const appt = appointments.find(a => a.id === event.active.id);
    setActiveAppt(appt ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveAppt(null);
    const { active, over } = event;
    if (!over) return;

    // over.id = `${techId}:${dayIso}:${minutesSinceDayStart}`
    const parts = String(over.id).split(":");
    if (parts.length < 3) return;
    const [newTechId, dayIso, minutesStr] = parts;
    const newStart = new Date(dayIso);
    const minutes = parseInt(minutesStr);
    newStart.setHours(DAY_START + Math.floor(minutes / 60), minutes % 60, 0, 0);

    const appt = appointments.find(a => a.id === active.id);
    if (!appt) return;

    const durationMs = new Date(appt.ends_at).getTime() - new Date(appt.starts_at).getTime();
    const newEnd = new Date(newStart.getTime() + durationMs);

    // Optimistic update
    setAppointments(prev => prev.map(a => a.id === appt.id
      ? { ...a, starts_at: newStart.toISOString(), ends_at: newEnd.toISOString(), technician_id: newTechId || null }
      : a
    ));

    await supabaseRef.current.from("appointments").update({
      starts_at: newStart.toISOString(),
      ends_at: newEnd.toISOString(),
      technician_id: newTechId || null,
    }).eq("id", appt.id);
  }

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => DAY_START + i);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full min-h-0 select-none">
        {/* Toolbar */}
        <div className="flex items-center gap-2 pb-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setPivotDate(d => addDays(d, viewMode === "week" ? -7 : -1))}>
            <ChevronLeft size={16} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPivotDate(new Date())}>Ma</Button>
          <Button variant="ghost" size="icon" onClick={() => setPivotDate(d => addDays(d, viewMode === "week" ? 7 : 1))}>
            <ChevronRight size={16} />
          </Button>
          <span className="text-sm font-medium mx-2">
            {viewMode === "week"
              ? `${startOfWeek(pivotDate).toLocaleDateString("hu-HU", { month: "long", day: "numeric" })} – ${addDays(startOfWeek(pivotDate), 6).toLocaleDateString("hu-HU", { month: "long", day: "numeric" })}`
              : pivotDate.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })}
          </span>
          {/* Technician switcher */}
          {technicians.length > 1 && (
            <div className="flex rounded-md border overflow-hidden">
              <button
                className={`px-3 h-8 text-xs font-medium transition-colors ${selectedTechId === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                onClick={() => setSelectedTechId("all")}
              >
                Mindenki
              </button>
              {technicians.map(t => (
                <button
                  key={t.id}
                  className={`px-3 h-8 text-xs font-medium border-l transition-colors truncate max-w-[110px] ${selectedTechId === t.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  onClick={() => setSelectedTechId(t.id)}
                  title={t.name}
                >
                  {t.name.split(" ")[0]}
                </button>
              ))}
            </div>
          )}

          <div className="ml-auto flex gap-1">
            <Button variant={viewMode === "day" ? "default" : "outline"} size="sm" onClick={() => setViewMode("day")}>
              <CalendarDays size={14} className="mr-1" /> Nap
            </Button>
            <Button variant={viewMode === "week" ? "default" : "outline"} size="sm" onClick={() => setViewMode("week")}>
              <CalendarRange size={14} className="mr-1" /> Hét
            </Button>
          </div>
        </div>

        {/* Calendar grid */}
        {selectedTechId === "all" ? (
          // Mindenki nézet: egymás alatti naptárak technikusonként
          <div className="flex-1 overflow-auto space-y-6">
            {(technicians.length > 0 ? technicians : [{ id: "", name: "Nincs hozzárendelve" }]).map(tech => {
              const techAppts = appointments.filter(a =>
                a.technician_id === tech.id || (tech.id === "" && !a.technician_id)
              );
              const weekApptCount = techAppts.filter(a =>
                days.some(d => sameDay(new Date(a.starts_at), d))
              ).length;
              return (
                <div key={tech.id} className="border rounded-lg overflow-hidden">
                  {/* Tech section header */}
                  <div className="sticky top-0 z-20 bg-background border-b px-3 py-2 flex items-center gap-2">
                    <span className="text-sm font-semibold">{tech.name}</span>
                    {weekApptCount > 0 && (
                      <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                        {weekApptCount} időpont
                      </span>
                    )}
                  </div>
                  {weekApptCount === 0 ? (
                    <div
                      className={`py-8 text-center text-sm text-muted-foreground ${onSlotClick ? "cursor-pointer hover:bg-muted/30" : ""}`}
                      onClick={onSlotClick ? () => {
                        const now = new Date();
                        const start = new Date(now);
                        start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
                        const end = new Date(start.getTime() + 60 * 60 * 1000);
                        onSlotClick(start.toISOString(), end.toISOString(), tech.id || null);
                      } : undefined}
                    >
                      Ezen a héten nincs időpontja.{onSlotClick ? " Kattints új foglaláshoz." : ""}
                    </div>
                  ) : (
                    <div className="min-w-[500px]">
                      {/* Day headers */}
                      <div className="sticky top-[41px] z-10 bg-background border-b" style={{ display: "grid", gridTemplateColumns: `48px repeat(${days.length}, 1fr)` }}>
                        <div />
                        {days.map(day => {
                          const isToday = sameDay(day, new Date());
                          return (
                            <div key={day.toISOString()} className={`border-l px-1 py-1.5 text-center text-xs ${isToday ? "bg-blue-50" : ""}`}>
                              <div className={`font-medium ${isToday ? "text-blue-600" : "text-muted-foreground"}`}>
                                {day.toLocaleDateString("hu-HU", { weekday: "short", day: "numeric" })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Time rows */}
                      <div className="relative" style={{ display: "grid", gridTemplateColumns: `48px repeat(${days.length}, 1fr)` }}>
                        <div className="relative">
                          {hours.map(h => (
                            <div key={h} className="border-b text-right pr-1 text-xs text-muted-foreground" style={{ height: HOUR_HEIGHT }}>
                              {h}:00
                            </div>
                          ))}
                        </div>
                        {days.map(day => {
                          const colAppts = techAppts.filter(a => sameDay(new Date(a.starts_at), day));
                          const isToday = sameDay(day, new Date());
                          const dropId = `${tech.id}:${day.toISOString()}`;
                          return (
                            <div key={day.toISOString()}
                              className={`relative border-l ${isToday ? "bg-blue-50/30" : ""} ${onSlotClick ? "cursor-pointer" : ""}`}
                              style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
                              onClick={onSlotClick ? (e) => {
                                if ((e.target as HTMLElement).closest("a,button,[data-draggable]")) return;
                                const { startsAt, endsAt } = slotTimesFromClick(e, day);
                                onSlotClick(startsAt, endsAt, tech.id || null);
                              } : undefined}>
                              {hours.map(h => (
                                <div key={h} className="absolute w-full border-b" style={{ top: (h - DAY_START) * HOUR_HEIGHT, height: HOUR_HEIGHT }} />
                              ))}
                              {Array.from({ length: TOTAL_HOURS * 4 }, (_, i) => {
                                const mins = i * 15;
                                return (
                                  <DroppableCell key={i} id={`${dropId}:${mins}`}
                                    style={{ top: (mins / 60) * HOUR_HEIGHT, height: HOUR_HEIGHT / 4 }} />
                                );
                              })}
                              {colAppts.map(a => {
                                const top = apptTop(a.starts_at, day);
                                const height = Math.max(apptHeight(a.starts_at, a.ends_at), HOUR_HEIGHT / 4);
                                if (top < 0 || top > TOTAL_HOURS * HOUR_HEIGHT) return null;
                                return <DraggableAppt key={a.id} appt={a} top={top} height={height} />;
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // Egyedi szerelő nézet: egységes rács
          <div className="flex-1 overflow-auto border rounded-lg">
            <div className="min-w-[600px]">
              {/* Header row */}
              <div className="sticky top-0 z-20 bg-background border-b" style={{ display: "grid", gridTemplateColumns: `48px repeat(${days.length}, 1fr)` }}>
                <div />
                {days.map(day => {
                  const isToday = sameDay(day, new Date());
                  return (
                    <div key={day.toISOString()}
                      className={`border-l px-1 py-1.5 text-center text-xs ${isToday ? "bg-blue-50" : ""}`}>
                      <div className={`font-medium ${isToday ? "text-blue-600" : "text-muted-foreground"}`}>
                        {day.toLocaleDateString("hu-HU", { weekday: "short", day: "numeric" })}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Time rows */}
              <div className="relative" style={{ display: "grid", gridTemplateColumns: `48px repeat(${days.length}, 1fr)` }}>
                <div className="relative">
                  {hours.map(h => (
                    <div key={h} className="border-b text-right pr-1 text-xs text-muted-foreground" style={{ height: HOUR_HEIGHT }}>
                      {h}:00
                    </div>
                  ))}
                </div>
                {days.map(day => {
                  const tech = visibleTechs[0];
                  const colAppts = appointments.filter(a =>
                    sameDay(new Date(a.starts_at), day) &&
                    (a.technician_id === tech.id || (tech.id === "" && !a.technician_id))
                  );
                  const isToday = sameDay(day, new Date());
                  const dropId = `${tech.id}:${day.toISOString()}`;
                  return (
                    <div key={day.toISOString()}
                      className={`relative border-l ${isToday ? "bg-blue-50/30" : ""}`}
                      style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
                      {hours.map(h => (
                        <div key={h} className="absolute w-full border-b" style={{ top: (h - DAY_START) * HOUR_HEIGHT, height: HOUR_HEIGHT }} />
                      ))}
                      {Array.from({ length: TOTAL_HOURS * 4 }, (_, i) => {
                        const mins = i * 15;
                        return (
                          <DroppableCell key={i} id={`${dropId}:${mins}`}
                            style={{ top: (mins / 60) * HOUR_HEIGHT, height: HOUR_HEIGHT / 4 }} />
                        );
                      })}
                      {colAppts.map(a => {
                        const top = apptTop(a.starts_at, day);
                        const height = Math.max(apptHeight(a.starts_at, a.ends_at), HOUR_HEIGHT / 4);
                        if (top < 0 || top > TOTAL_HOURS * HOUR_HEIGHT) return null;
                        return <DraggableAppt key={a.id} appt={a} top={top} height={height} />;
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <DragOverlay>
        {activeAppt && (
          <div className="rounded bg-blue-500 text-white text-xs px-2 py-1 shadow-lg opacity-90">
            {activeAppt.jobs?.customers?.name ?? "Foglalás"}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function DroppableCell({ id, style }: { id: string; style: React.CSSProperties }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`absolute w-full ${isOver ? "bg-blue-100/50" : ""}`} style={style} />
  );
}

function DraggableAppt({ appt, top, height }: { appt: Appointment; top: number; height: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: appt.id });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={`absolute inset-x-0.5 rounded text-xs px-1.5 py-0.5 cursor-grab active:cursor-grabbing z-10 overflow-hidden ${
        isDragging ? "opacity-40" : ""
      } ${appt.kind === "felmeres" ? "bg-yellow-200 text-yellow-900" : "bg-blue-200 text-blue-900"}`}
      style={{ top, height: height - 2 }}>
      <Link href={`/jobs/${appt.job_id}`} className="block" onClick={e => e.stopPropagation()}>
        <div className="font-medium truncate">{appt.jobs?.customers?.name ?? "—"}</div>
        <div className="text-[10px] opacity-75">{formatTime(appt.starts_at)} – {formatTime(appt.ends_at)}</div>
        {appt.jobs?.title && <div className="text-[10px] truncate opacity-75">{appt.jobs.title}</div>}
      </Link>
    </div>
  );
}

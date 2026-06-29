"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Slot = { start: Date; end: Date };
type Appointment = { starts_at: string; ends_at: string; technician_id: string | null };
type Technician = { id: string; name: string };

type WorkingHours = Record<string, { open: boolean; start: string; end: string }>;

const DAY_KEYS = ["sun","mon","tue","wed","thu","fri","sat"] as const;
const HOUR_HEIGHT = 48; // px per hour

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

function startOfWeek(d: Date) {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1)); // Mon=0
  r.setHours(0, 0, 0, 0);
  return r;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("hu-HU", { weekday: "short", month: "short", day: "numeric" });
}

function slotToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function ManualSlotPicker({
  durationMin,
  existingAppointments,
  technicians,
  workingHours,
  onSelect,
  isPending = false,
}: {
  durationMin: number;
  existingAppointments: Appointment[];
  technicians: Technician[];
  workingHours: WorkingHours;
  onSelect: (slot: Slot, technicianId: string | null) => void;
  isPending?: boolean;
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedTech, setSelectedTech] = useState<string | null>(technicians[0]?.id ?? null);
  const [hoveredSlot, setHoveredSlot] = useState<{ day: Date; minutes: number } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Munkaidő - első nyitott nap
  const firstOpenDay = days.find(d => workingHours[DAY_KEYS[d.getDay()]]?.open);

  // Existing appointments for selected tech
  const techAppts = existingAppointments.filter(
    a => !selectedTech || a.technician_id === selectedTech
  );

  function getDayBounds(day: Date) {
    const key = DAY_KEYS[day.getDay()];
    const wh = workingHours[key];
    if (!wh?.open) return null;
    return { startMin: slotToMinutes(wh.start), endMin: slotToMinutes(wh.end) };
  }

  function handleDayClick(day: Date, offsetY: number, containerHeight: number) {
    const bounds = getDayBounds(day);
    if (!bounds) return;
    const totalMin = bounds.endMin - bounds.startMin;
    const clickMin = Math.floor((offsetY / containerHeight) * totalMin / 15) * 15;
    const startMin = bounds.startMin + clickMin;
    const endMin = startMin + durationMin;
    if (endMin > bounds.endMin) return;
    if (isBooked(day, startMin, endMin)) return; // ütközés tiltás
    const start = new Date(day);
    start.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
    const end = new Date(day);
    end.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
    setSelectedSlot({ start, end });
  }

  function isBooked(day: Date, startMin: number, endMin: number) {
    return techAppts.some(a => {
      const aStart = new Date(a.starts_at);
      const aEnd = new Date(a.ends_at);
      if (aStart.toDateString() !== day.toDateString()) return false;
      const aStartMin = aStart.getHours() * 60 + aStart.getMinutes();
      const aEndMin = aEnd.getHours() * 60 + aEnd.getMinutes();
      return startMin < aEndMin && endMin > aStartMin;
    });
  }

  const workStart = 6; // show from 06:00
  const workEnd = 22;  // show to 22:00
  const totalHours = workEnd - workStart;

  return (
    <div className="space-y-3">
      {/* Technikus választó */}
      {technicians.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-xs">Szerelő:</Label>
          <button onClick={() => setSelectedTech(null)}
            className={`text-xs px-2 py-0.5 rounded border ${!selectedTech ? "bg-foreground text-background" : "hover:bg-muted"}`}>
            Mind
          </button>
          {technicians.map(t => (
            <button key={t.id} onClick={() => setSelectedTech(t.id)}
              className={`text-xs px-2 py-0.5 rounded border ${selectedTech === t.id ? "bg-foreground text-background" : "hover:bg-muted"}`}>
              {t.name}
            </button>
          ))}
        </div>
      )}

      {/* Hét navigáció */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setWeekStart(d => addDays(d, -7))}>
          <ChevronLeft size={16} />
        </Button>
        <span className="text-sm font-medium">
          {weekStart.toLocaleDateString("hu-HU", { month: "long", day: "numeric" })} – {addDays(weekStart, 6).toLocaleDateString("hu-HU", { month: "long", day: "numeric" })}
        </span>
        <Button variant="ghost" size="icon" onClick={() => setWeekStart(d => addDays(d, 7))}>
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* Naptár rács */}
      <div className="border rounded-lg overflow-auto max-h-[480px]">
        <div className="grid" style={{ gridTemplateColumns: `40px repeat(7, 1fr)` }}>
          {/* Fejlécek */}
          <div className="sticky top-0 z-10 bg-background border-b" />
          {days.map((d, i) => {
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <div key={i} className={`sticky top-0 z-10 bg-background border-b border-l px-1 py-1.5 text-center text-xs ${isToday ? "text-blue-600 font-semibold" : "text-muted-foreground"}`}>
                {formatDate(d)}
              </div>
            );
          })}

          {/* Idő + nap cellák */}
          {Array.from({ length: totalHours }, (_, h) => {
            const hour = workStart + h;
            return [
              <div key={`h-${h}`} className="border-b pr-1 text-right text-xs text-muted-foreground pt-0.5" style={{ height: HOUR_HEIGHT }}>
                {hour}:00
              </div>,
              ...days.map((day, di) => {
                const bounds = getDayBounds(day);
                const inWorkHours = bounds && hour >= Math.floor(bounds.startMin / 60) && hour < Math.ceil(bounds.endMin / 60);

                return (
                  <div key={`${h}-${di}`}
                    className={`border-b border-l relative cursor-pointer ${inWorkHours ? "bg-background hover:bg-blue-50/50" : "bg-muted/30 cursor-not-allowed"}`}
                    style={{ height: HOUR_HEIGHT }}
                    onClick={e => {
                      if (!inWorkHours) return;
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const colTop = (e.currentTarget.parentElement?.getBoundingClientRect().top ?? 0);
                      // find the day column total height
                      const dayStart = bounds!.startMin / 60;
                      const dayEnd = bounds!.endMin / 60;
                      const dayHeight = (dayEnd - dayStart) * HOUR_HEIGHT;
                      const dayOffsetPx = (hour - dayStart) * HOUR_HEIGHT + (e.clientY - rect.top);
                      handleDayClick(day, dayOffsetPx, dayHeight);
                    }}>

                    {/* Foglalt sávok */}
                    {techAppts.filter(a => {
                      const aStart = new Date(a.starts_at);
                      return aStart.toDateString() === day.toDateString() && aStart.getHours() === hour;
                    }).map((a, ai) => {
                      const aStart = new Date(a.starts_at);
                      const aEnd = new Date(a.ends_at);
                      const startFrac = aStart.getMinutes() / 60;
                      const durationH = (aEnd.getTime() - aStart.getTime()) / 3600000;
                      return (
                        <div key={ai} className="absolute inset-x-0.5 rounded bg-orange-200 text-orange-800 text-xs px-1 overflow-hidden"
                          style={{ top: startFrac * HOUR_HEIGHT, height: durationH * HOUR_HEIGHT - 2 }}>
                          Foglalt
                        </div>
                      );
                    })}

                    {/* Kiválasztott sáv */}
                    {selectedSlot && selectedSlot.start.toDateString() === day.toDateString() && selectedSlot.start.getHours() === hour && (
                      <div className="absolute inset-x-0.5 rounded bg-blue-500 text-white text-xs px-1 z-10"
                        style={{
                          top: (selectedSlot.start.getMinutes() / 60) * HOUR_HEIGHT,
                          height: (durationMin / 60) * HOUR_HEIGHT - 2,
                        }}>
                        Kiválasztva
                      </div>
                    )}
                  </div>
                );
              }),
            ];
          })}
        </div>
      </div>

      {/* Kiválasztott sáv összefoglaló + megerősítés */}
      {selectedSlot && (
        <div className="rounded-lg border p-3 bg-blue-50 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm">
            <span className="font-medium">
              {selectedSlot.start.toLocaleString("hu-HU", { dateStyle: "short", timeStyle: "short" })}
            </span>
            <span className="text-muted-foreground"> – {selectedSlot.end.toLocaleTimeString("hu-HU", { timeStyle: "short" })}</span>
            {selectedTech && (
              <span className="text-muted-foreground"> · {technicians.find(t => t.id === selectedTech)?.name}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedSlot(null)} disabled={isPending}>Törlés</Button>
            <Button size="sm" onClick={() => onSelect(selectedSlot, selectedTech)} disabled={isPending}>
              {isPending ? "Foglalás…" : "Foglalás →"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { updateBookingSettings } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const DAYS = [
  { key: "mon", label: "Hétfő" },
  { key: "tue", label: "Kedd" },
  { key: "wed", label: "Szerda" },
  { key: "thu", label: "Csütörtök" },
  { key: "fri", label: "Péntek" },
  { key: "sat", label: "Szombat" },
  { key: "sun", label: "Vasárnap" },
] as const;

type DayKey = typeof DAYS[number]["key"];
type DayConfig = { open: boolean; start: string; end: string };
type WorkingHours = Record<DayKey, DayConfig>;

export function BookingSettingsClient({ initialData }: {
  initialData: {
    booking_mode: string;
    default_slot_duration_min: number;
    working_hours: WorkingHours;
  };
}) {
  const [mode, setMode] = useState<"smart" | "manual">(initialData.booking_mode as "smart" | "manual");
  const [duration, setDuration] = useState(initialData.default_slot_duration_min);
  const [hours, setHours] = useState<WorkingHours>(initialData.working_hours);
  const [isPending, startTransition] = useTransition();

  function setDay(day: DayKey, patch: Partial<DayConfig>) {
    setHours(h => ({ ...h, [day]: { ...h[day], ...patch } }));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateBookingSettings({
        booking_mode: mode,
        default_slot_duration_min: duration,
        working_hours: hours,
      });
      if (result?.error) toast.error(result.error);
      else toast.success("Foglalási beállítások mentve.");
    });
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Foglalási mód */}
      <div className="space-y-2">
        <h2 className="font-semibold text-sm">Foglalási mód</h2>
        <div className="flex gap-3">
          {(["manual", "smart"] as ("manual" | "smart")[]).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 rounded-lg border px-4 py-3 text-sm text-left transition-colors ${
                mode === m ? "border-foreground bg-muted font-semibold" : "hover:bg-muted/50"
              }`}>
              <p className="font-medium">{m === "manual" ? "Manuális" : "Smart"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {m === "manual"
                  ? "Google Calendar-szerű rács, szerelő kézi választása"
                  : "VROOM/OSRM javaslat — automatikus optimalizálás (Phase 2)"}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Alapértelmezett sáv-hossz */}
      <div className="space-y-1.5">
        <Label htmlFor="duration">Alapértelmezett sáv-hossz (perc)</Label>
        <Input id="duration" type="number" min={15} max={480} step={15}
          value={duration} onChange={e => setDuration(Number(e.target.value))}
          className="w-32" />
        <p className="text-xs text-muted-foreground">A szolgáltatáson beállított időtartam felülírja ezt.</p>
      </div>

      {/* Munkaidő-sávok */}
      <div className="space-y-2">
        <h2 className="font-semibold text-sm">Munkaidő</h2>
        <div className="space-y-2">
          {DAYS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={hours[key].open} onChange={e => setDay(key, { open: e.target.checked })} className="h-4 w-4 accent-foreground cursor-pointer" />
              <span className="w-20">{label}</span>
              <Input type="time" value={hours[key].start}
                onChange={e => setDay(key, { start: e.target.value })}
                disabled={!hours[key].open} className="w-28 h-8 text-sm" />
              <span className="text-muted-foreground">–</span>
              <Input type="time" value={hours[key].end}
                onChange={e => setDay(key, { end: e.target.value })}
                disabled={!hours[key].open} className="w-28 h-8 text-sm" />
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Mentés…" : "Mentés"}
      </Button>
    </div>
  );
}

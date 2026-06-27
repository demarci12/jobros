"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CalendarDays, CalendarRange, Map } from "lucide-react";
import { DispatchCalendar } from "./DispatchCalendar";
import { MonthView } from "./MonthView";
import dynamic from "next/dynamic";

// MapView uses mapbox-gl which requires browser APIs — lazy load
const MapView = dynamic(() => import("./MapView").then(m => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
      Térkép betöltése…
    </div>
  ),
});

type Appointment = {
  id: string;
  job_id: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  technician_id: string | null;
  status: string;
  jobs: {
    job_number: string;
    title: string | null;
    customers: { name: string } | null;
    sites?: { lat: number | null; lng: number | null; address: string | null } | null;
  } | null;
};

type View = "week" | "month" | "map";

const HU_MONTHS = [
  "Január","Február","Március","Április","Május","Június",
  "Július","Augusztus","Szeptember","Október","November","December",
];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function CalendarShell({
  initialAppointments,
  technicians,
  companyId,
  mapboxToken,
  initialView,
  initialMonth,
}: {
  initialAppointments: Appointment[];
  technicians: { id: string; name: string }[];
  companyId: string;
  mapboxToken: string;
  initialView: View;
  initialMonth?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [view, setView] = useState<View>(initialView);
  const [month, setMonth] = useState<Date>(() => {
    if (initialMonth) {
      const [y, m] = initialMonth.split("-").map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date();
  });

  function switchView(v: View) {
    setView(v);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", v);
    if (v === "month") params.set("month", monthKey(month));
    else params.delete("month");
    router.push(`${pathname}?${params.toString()}`);
  }

  function changeMonth(delta: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    setMonth(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "month");
    params.set("month", monthKey(next));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold">Naptár</h1>

        <div className="flex items-center gap-2">
          {/* Month nav — only in month view */}
          {view === "month" && (
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => changeMonth(-1)}>‹</Button>
              <span className="text-sm font-medium min-w-[130px] text-center">
                {month.getFullYear()}. {HU_MONTHS[month.getMonth()]}
              </span>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => changeMonth(1)}>›</Button>
            </div>
          )}

          {/* View switcher */}
          <div className="flex rounded-md border overflow-hidden">
            <Button
              size="sm" variant={view === "week" ? "default" : "ghost"}
              className="rounded-none border-0 h-8 px-3"
              onClick={() => switchView("week")}
            >
              <CalendarDays size={14} className="mr-1" /> Hét
            </Button>
            <Button
              size="sm" variant={view === "month" ? "default" : "ghost"}
              className="rounded-none border-0 border-x h-8 px-3"
              onClick={() => switchView("month")}
            >
              <CalendarRange size={14} className="mr-1" /> Hó
            </Button>
            <Button
              size="sm" variant={view === "map" ? "default" : "ghost"}
              className="rounded-none border-0 h-8 px-3"
              onClick={() => switchView("map")}
            >
              <Map size={14} className="mr-1" /> Térkép
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {view === "week" && (
          <DispatchCalendar
            initialAppointments={initialAppointments}
            technicians={technicians}
            companyId={companyId}
          />
        )}

        {view === "month" && (
          <div className="h-full overflow-auto rounded-lg border bg-background">
            <MonthView
              month={month}
              appointments={initialAppointments}
              technicians={technicians}
            />
          </div>
        )}

        {view === "map" && (
          <MapView
            appointments={initialAppointments as any}
            mapboxToken={mapboxToken}
          />
        )}
      </div>
    </div>
  );
}

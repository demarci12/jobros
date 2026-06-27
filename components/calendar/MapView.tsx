"use client";

import { useMemo, useState } from "react";
import Map, { Marker, Popup } from "react-map-gl/mapbox";
import Link from "next/link";
import "mapbox-gl/dist/mapbox-gl.css";

type AppointmentWithGeo = {
  id: string;
  job_id: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  technician_id: string | null;
  jobs: {
    job_number: string;
    title: string | null;
    customers: { name: string } | null;
    sites: { lat: number | null; lng: number | null; address: string | null } | null;
  } | null;
};

const KIND_COLORS: Record<string, string> = {
  felmeres: "#f59e0b",
  munka:    "#3b82f6",
  garancia: "#8b5cf6",
};

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

export function MapView({
  appointments,
  mapboxToken,
}: {
  appointments: AppointmentWithGeo[];
  mapboxToken: string;
}) {
  const [popup, setPopup] = useState<AppointmentWithGeo | null>(null);

  const today = isoDate(new Date());

  // Only today's appointments that have geo
  const todayAppts = useMemo(
    () =>
      appointments.filter(a => {
        if (a.starts_at.slice(0, 10) !== today) return false;
        const site = Array.isArray(a.jobs?.sites) ? (a.jobs?.sites as any)[0] : a.jobs?.sites;
        return site?.lat != null && site?.lng != null;
      }),
    [appointments, today]
  );

  // Center: average of today's pins, fallback Budapest
  const center = useMemo(() => {
    if (todayAppts.length === 0) return { longitude: 19.04, latitude: 47.5 };
    let sumLng = 0, sumLat = 0;
    let count = 0;
    for (const a of todayAppts) {
      const site = Array.isArray(a.jobs?.sites) ? (a.jobs?.sites as any)[0] : a.jobs?.sites;
      if (site?.lat != null && site?.lng != null) {
        sumLat += site.lat; sumLng += site.lng; count++;
      }
    }
    return { longitude: sumLng / count, latitude: sumLat / count };
  }, [todayAppts]);

  if (!mapboxToken) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        A térképhez add meg a <code className="mx-1 font-mono text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code> értékét a .env.local fájlban.
      </div>
    );
  }

  return (
    <div className="h-full rounded-lg overflow-hidden border">
      <Map
        mapboxAccessToken={mapboxToken}
        initialViewState={{ ...center, zoom: todayAppts.length > 0 ? 11 : 7 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        {todayAppts.map(a => {
          const site = Array.isArray(a.jobs?.sites) ? (a.jobs?.sites as any)[0] : a.jobs?.sites;
          const lat = site?.lat as number;
          const lng = site?.lng as number;
          const color = KIND_COLORS[a.kind] ?? "#6b7280";

          return (
            <Marker
              key={a.id}
              latitude={lat}
              longitude={lng}
              anchor="bottom"
              onClick={e => { e.originalEvent.stopPropagation(); setPopup(a); }}
            >
              <div
                className="w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-bold cursor-pointer hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                title={a.jobs?.customers?.name ?? ""}
              >
                {new Date(a.starts_at).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </Marker>
          );
        })}

        {popup && (() => {
          const site = Array.isArray(popup.jobs?.sites) ? (popup.jobs?.sites as any)[0] : popup.jobs?.sites;
          return (
            <Popup
              latitude={site?.lat as number}
              longitude={site?.lng as number}
              anchor="top"
              onClose={() => setPopup(null)}
              closeOnClick={false}
              maxWidth="220px"
            >
              <div className="p-1 space-y-1 text-sm">
                <p className="font-semibold">{popup.jobs?.customers?.name ?? "—"}</p>
                <p className="text-xs text-gray-600">{site?.address ?? ""}</p>
                <p className="text-xs">
                  {new Date(popup.starts_at).toLocaleTimeString("hu-HU", { timeStyle: "short" })}
                  {" – "}
                  {new Date(popup.ends_at).toLocaleTimeString("hu-HU", { timeStyle: "short" })}
                </p>
                <Link
                  href={`/jobs/${popup.job_id}`}
                  className="block text-xs text-blue-600 hover:underline"
                >
                  {popup.jobs?.job_number ?? "Munka megnyitása"} →
                </Link>
              </div>
            </Popup>
          );
        })()}
      </Map>

      {todayAppts.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-lg text-sm text-muted-foreground shadow">
            Ma nincs helyszínadattal rendelkező kiszállás.
          </div>
        </div>
      )}
    </div>
  );
}

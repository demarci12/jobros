import Link from "next/link";
import { MapPin, Phone, Clock, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type TechAppointment = {
  id: string;
  job_id: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  status: string;
  jobs: {
    id: string;
    job_number: string;
    title: string | null;
    customers: { name: string; phone: string | null } | null;
    sites: { address: string; city: string | null; lat: number | null; lng: number | null } | null;
  } | null;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("hu-HU", { timeStyle: "short" });
}

export function TechDayList({ appointments }: { appointments: TechAppointment[] }) {
  if (appointments.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Clock size={32} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium">Ma nincs foglalásod</p>
        <p className="text-sm">A diszpécser hamarosan rendel hozzád munkát.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {appointments.map(appt => {
        const job = appt.jobs;
        const site = job?.sites;
        const customer = job?.customers;
        const mapsUrl = site?.lat && site?.lng
          ? `https://maps.google.com/?q=${site.lat},${site.lng}`
          : site?.address
          ? `https://maps.google.com/?q=${encodeURIComponent(`${site.address} ${site.city ?? ""}`)}`
          : null;

        return (
          <li key={appt.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
            {/* Időpont sáv */}
            <div className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${
              appt.kind === "felmeres" ? "bg-yellow-50 text-yellow-800" : "bg-blue-50 text-blue-800"
            }`}>
              <Clock size={14} />
              <span>{formatTime(appt.starts_at)} – {formatTime(appt.ends_at)}</span>
              <Badge variant="outline" className="ml-auto text-xs">
                {appt.kind === "felmeres" ? "Felmérés" : "Munka"}
              </Badge>
            </div>

            {/* Tartalom */}
            <div className="px-4 py-3 space-y-2">
              {customer && (
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{customer.name}</p>
                    {job?.title && <p className="text-sm text-muted-foreground">{job.title}</p>}
                    {job?.job_number && <p className="text-xs text-muted-foreground font-mono">{job.job_number}</p>}
                  </div>
                  {customer.phone && (
                    <a href={`tel:${customer.phone}`}
                      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors shrink-0">
                      <Phone size={14} />
                      Hívás
                    </a>
                  )}
                </div>
              )}

              {site && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin size={14} className="mt-0.5 shrink-0" />
                  <span>{site.address}{site.city ? `, ${site.city}` : ""}</span>
                  {mapsUrl && (
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                      className="ml-auto text-xs underline shrink-0 hover:text-foreground">
                      Navigáció →
                    </a>
                  )}
                </div>
              )}

              {job && (
                <div className="pt-1 flex gap-2">
                  <Link href={`/jobs/${job.id}/worksheet`}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-foreground text-background py-2 text-sm font-medium hover:opacity-90 transition-opacity">
                    <Wrench size={14} />
                    Munkalap megnyitása
                  </Link>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

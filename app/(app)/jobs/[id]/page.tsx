import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { Badge } from "@/components/ui/badge";
import { User, MapPin, Wrench, Calendar } from "lucide-react";
import { type JobStatus } from "@/lib/jobs/status-machine";
import { EquipmentSelector } from "@/components/jobs/EquipmentSelector";
import { JobBookingButton } from "@/components/jobs/JobBookingButton";

const defaultHours = {
  mon: { open: true,  start: "08:00", end: "17:00" },
  tue: { open: true,  start: "08:00", end: "17:00" },
  wed: { open: true,  start: "08:00", end: "17:00" },
  thu: { open: true,  start: "08:00", end: "17:00" },
  fri: { open: true,  start: "08:00", end: "17:00" },
  sat: { open: false, start: "08:00", end: "13:00" },
  sun: { open: false, start: "08:00", end: "13:00" },
};

export default async function JobOverviewPage({ params }: { params: { id: string } }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { supabase, companyId, role } = ctx;

  const { data: job } = await supabase
    .from("jobs")
    .select(`
      id, description, created_at, equipment_id,
      customers(id, name, phone, email),
      sites(id, address, city),
      services(name)
    `)
    .eq("id", params.id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!job) notFound();

  const canEdit = ["owner", "dispatcher"].includes(role);

  const in90Days = new Date(Date.now() + 90 * 86400_000).toISOString();

  const [{ data: appointments }, { data: equipment }, { data: technicians }, { data: company }, { data: upcomingAppts }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, kind, starts_at, ends_at, status")
      .eq("job_id", params.id)
      .neq("status", "lemondva")
      .order("starts_at"),
    supabase
      .from("equipment")
      .select("id, manufacturer, model, kind, serial_number, next_service_due")
      .eq("site_id", (job as any).sites?.id ?? "")
      .is("deleted_at", null)
      .order("manufacturer"),
    supabase.from("company_users").select("user_id, profiles(id, full_name)").eq("company_id", companyId).eq("role", "technician").eq("is_active", true),
    supabase.from("companies").select("booking_mode, default_slot_duration_min, working_hours").eq("id", companyId).single(),
    supabase.from("appointments").select("starts_at, ends_at, technician_id").eq("company_id", companyId).gte("starts_at", new Date().toISOString()).lte("starts_at", in90Days).neq("status", "lemondva"),
  ]);

  const techList = (technicians ?? []).map((t: any) => ({ id: t.profiles?.id ?? t.user_id, name: t.profiles?.full_name ?? "Szerelő" }));
  const hasAppointments = (appointments ?? []).length > 0;

  return (
    <div className="space-y-5 max-w-lg">
      {/* Ügyfél + telephely */}
      <div className="space-y-3">
        {(job as any).customers && (
          <div className="flex items-start gap-3 text-sm">
            <User size={15} className="mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <Link href={`/customers/${(job as any).customers.id}`} className="font-medium hover:underline">
                {(job as any).customers.name}
              </Link>
              {(job as any).customers.phone && (
                <p className="text-muted-foreground">
                  <a href={`tel:${(job as any).customers.phone}`}>{(job as any).customers.phone}</a>
                </p>
              )}
              {(job as any).customers.email && (
                <p className="text-muted-foreground text-xs">{(job as any).customers.email}</p>
              )}
            </div>
          </div>
        )}

        {(job as any).sites && (
          <div className="flex items-start gap-3 text-sm">
            <MapPin size={15} className="mt-0.5 text-muted-foreground shrink-0" />
            <p>{(job as any).sites.address}{(job as any).sites.city ? `, ${(job as any).sites.city}` : ""}</p>
          </div>
        )}

        {(job as any).services && (
          <div className="flex items-start gap-3 text-sm">
            <Wrench size={15} className="mt-0.5 text-muted-foreground shrink-0" />
            <p>{(job as any).services.name}</p>
          </div>
        )}

        {job.description && (
          <p className="text-sm text-muted-foreground pl-7">{job.description}</p>
        )}

        {/* Equipment selector — which device is being serviced */}
        {(equipment ?? []).length > 0 && (
          <EquipmentSelector
            jobId={params.id}
            equipment={(equipment ?? []) as any}
            selectedId={(job as any).equipment_id ?? null}
            canEdit={canEdit}
          />
        )}
      </div>

      {/* Időpontok */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Időpontok</h2>
          {canEdit && (
            <JobBookingButton
              jobId={params.id}
              technicians={techList}
              existingAppointments={(upcomingAppts ?? []) as any}
              defaultSlotDurationMin={company?.default_slot_duration_min ?? 120}
              workingHours={(company?.working_hours as typeof defaultHours) ?? defaultHours}
              hasAppointments={hasAppointments}
            />
          )}
        </div>

        {hasAppointments ? (
          <ul className="space-y-1">
            {(appointments ?? []).map((a: any) => (
              <li key={a.id} className="flex items-center gap-3 text-sm border rounded-md px-3 py-2">
                <Calendar size={13} className="text-muted-foreground shrink-0" />
                <span>{a.kind === "felmeres" ? "Felmérés" : "Munka"}</span>
                <span className="text-muted-foreground">
                  {new Date(a.starts_at).toLocaleString("hu-HU", { dateStyle: "short", timeStyle: "short" })}
                </span>
                <Badge variant="outline" className="text-xs ml-auto">{a.status}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nincs ütemezett időpont ehhez a munkához.</p>
        )}
      </div>

    </div>
  );
}

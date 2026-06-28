import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { CustomerHeader } from "@/components/crm/CustomerHeader";
import { SitesList } from "@/components/crm/SitesList";
import { BookingButton } from "@/components/booking/BookingButton";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/jobs/status-machine";
import type { JobStatus } from "@/lib/jobs/status-machine";

export default async function CustomerPage({ params }: { params: { id: string } }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { supabase, companyId, role } = ctx;

  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, phone, email, tax_number, notes, is_company, deleted_at")
    .eq("id", params.id).eq("company_id", companyId).maybeSingle();
  if (!customer) notFound();

  const { data: sites } = await supabase
    .from("sites")
    .select("id, label, address, city, zip, access_notes, lat, lng")
    .eq("customer_id", params.id).eq("company_id", companyId)
    .order("created_at");

  const { data: equipment } = await supabase
    .from("equipment")
    .select("id, kind, manufacturer, model, serial_number, installed_at, warranty_until, next_service_due, notes, site_id")
    .eq("company_id", companyId)
    .in("site_id", (sites ?? []).map(s => s.id))
    .order("created_at");

  const canEdit = ["owner", "dispatcher"].includes(role);

  // Job előzmények
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, job_number, title, status, created_at, services(name)")
    .eq("customer_id", params.id)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  // Booking data
  const [{ data: services }, { data: technicians }, { data: company }, { data: upcomingAppts }] = await Promise.all([
    supabase.from("services").select("id, name, duration_min").eq("company_id", companyId).eq("is_active", true).order("sort_order"),
    supabase.from("company_users").select("user_id, profiles(id, full_name)").eq("company_id", companyId).eq("role", "technician").eq("is_active", true),
    supabase.from("companies").select("booking_mode, default_slot_duration_min, working_hours").eq("id", companyId).single(),
    supabase.from("appointments").select("starts_at, ends_at, technician_id").eq("company_id", companyId).gte("starts_at", new Date().toISOString()).neq("status", "lemondva"),
  ]);

  const techList = (technicians ?? []).map((t: any) => ({ id: t.profiles?.id ?? t.user_id, name: t.profiles?.full_name ?? "Szerelő" }));

  const defaultHours = {
    mon: { open: true,  start: "08:00", end: "17:00" },
    tue: { open: true,  start: "08:00", end: "17:00" },
    wed: { open: true,  start: "08:00", end: "17:00" },
    thu: { open: true,  start: "08:00", end: "17:00" },
    fri: { open: true,  start: "08:00", end: "17:00" },
    sat: { open: false, start: "08:00", end: "13:00" },
    sun: { open: false, start: "08:00", end: "13:00" },
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <CustomerHeader customer={customer} canEdit={canEdit} />
        {canEdit && (sites ?? []).length > 0 && (
          <BookingButton
            customerId={params.id}
            customerName={customer.name}
            sites={(sites ?? []).map(s => ({ id: s.id, address: s.address, city: s.city ?? null, zip: s.zip ?? null }))}
            services={(services ?? []).map(s => ({ id: s.id, name: s.name, duration_min: (s as any).duration_min ?? null }))}
            technicians={techList}
            equipment={(equipment ?? []).map((e: any) => ({ id: e.id, manufacturer: e.manufacturer, model: e.model ?? null, kind: e.kind, site_id: e.site_id ?? null }))}
            existingAppointments={(upcomingAppts ?? []) as any}
            bookingMode={(company?.booking_mode ?? "manual") as "smart" | "manual"}
            defaultSlotDurationMin={company?.default_slot_duration_min ?? 120}
            workingHours={(company?.working_hours as typeof defaultHours) ?? defaultHours}
          />
        )}
      </div>

      <SitesList
        customerId={params.id}
        sites={sites ?? []}
        equipment={equipment ?? []}
        canEdit={canEdit}
      />

      {/* Munka előzmények */}
      {(jobs ?? []).length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Munka előzmények</h2>
          <div className="rounded-lg border divide-y">
            {(jobs ?? []).map((job: any) => (
              <Link key={job.id} href={`/jobs/${job.id}`}
                className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-xs text-muted-foreground shrink-0">{job.job_number}</span>
                  <span className="text-sm truncate">{job.title ?? job.services?.name ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {new Date(job.created_at).toLocaleDateString("hu-HU", { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                  <Badge className={`text-xs ${STATUS_COLORS[job.status as JobStatus] ?? ""}`}>
                    {STATUS_LABELS[job.status as JobStatus] ?? job.status}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

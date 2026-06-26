import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomerHeader } from "@/components/crm/CustomerHeader";
import { SitesList } from "@/components/crm/SitesList";
import { BookingButton } from "@/components/booking/BookingButton";

export default async function CustomerPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) redirect("/onboarding");

  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, phone, email, tax_number, notes, is_company, deleted_at")
    .eq("id", params.id).eq("company_id", cu.company_id).maybeSingle();
  if (!customer) notFound();

  const { data: sites } = await supabase
    .from("sites")
    .select("id, label, address, city, zip, access_notes, lat, lng")
    .eq("customer_id", params.id).eq("company_id", cu.company_id)
    .order("created_at");

  const { data: equipment } = await supabase
    .from("equipment")
    .select("id, kind, manufacturer, model, serial_number, installed_at, warranty_until, next_service_due, notes, site_id")
    .eq("company_id", cu.company_id)
    .in("site_id", (sites ?? []).map(s => s.id))
    .order("created_at");

  const canEdit = ["owner", "dispatcher"].includes(cu.role);

  // Booking data
  const [{ data: services }, { data: technicians }, { data: company }, { data: upcomingAppts }] = await Promise.all([
    supabase.from("services").select("id, name, duration_min").eq("company_id", cu.company_id).eq("is_active", true).order("sort_order"),
    supabase.from("company_users").select("user_id, profiles(id, full_name)").eq("company_id", cu.company_id).eq("role", "technician").eq("is_active", true),
    supabase.from("companies").select("booking_mode, default_slot_duration_min, working_hours").eq("id", cu.company_id).single(),
    supabase.from("appointments").select("starts_at, ends_at, technician_id").eq("company_id", cu.company_id).gte("starts_at", new Date().toISOString()).neq("status", "lemondva"),
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
            sites={(sites ?? []).map(s => ({ id: s.id, address: s.address, city: s.city ?? null }))}
            services={(services ?? []).map(s => ({ id: s.id, name: s.name, duration_min: (s as any).duration_min ?? null }))}
            technicians={techList}
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
    </div>
  );
}

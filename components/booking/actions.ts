"use server";

import { z } from "zod";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { revalidatePath } from "next/cache";
import { checkEntitlement } from "@/lib/billing/entitlements";

const CreateBookingSchema = z.object({
  customerId: z.string().uuid(),
  siteId: z.string().uuid(),
  serviceId: z.string().uuid().nullable(),
  equipmentId: z.string().uuid().nullable(),
  title: z.string().max(255).nullable(),
  kind: z.enum(["munka", "felmeres"]),
  technicianId: z.string().uuid().nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

export async function createBooking(input: z.infer<typeof CreateBookingSchema>) {
  const parsed = CreateBookingSchema.safeParse(input);
  if (!parsed.success) return { error: "Érvénytelen adatok: " + parsed.error.issues[0]?.message };
  const { customerId, siteId, serviceId, equipmentId, kind, technicianId, startsAt, endsAt } = parsed.data;
  // Generate a fallback title so jobs are always identifiable
  const title = parsed.data.title || null;

  const ctx = await getAuthContext();
  if (!ctx || !["owner", "dispatcher"].includes(ctx.role)) return { error: "Nincs jogosultság." };
  const ent = await checkEntitlement(ctx.companyId, "technicians");
  if (!ent.allowed && ent.reason === "read_only") {
    return { error: "Az előfizetés lejárt vagy felfüggesztett — foglalás nem hozható létre." };
  }
  const { supabase, companyId, user } = ctx;
  const cu = { company_id: companyId, role: ctx.role };

  // Conflict check + job number count — run in parallel
  const year = new Date().getFullYear().toString();
  const [conflictResult] = await Promise.all([
    technicianId
      ? supabase.from("appointments").select("id")
          .eq("company_id", cu.company_id).eq("technician_id", technicianId)
          .neq("status", "lemondva").lt("starts_at", endsAt).gt("ends_at", startsAt).limit(1)
      : Promise.resolve({ data: [] as { id: string }[] }),
  ]);
  if ((conflictResult.data?.length ?? 0) > 0) return { error: "Ütközés: a szerelőnek már van foglalása ebben az időszakban." };

  async function generateJobNumber(): Promise<string> {
    const { count } = await supabase.from("jobs").select("id", { count: "exact", head: true })
      .eq("company_id", cu.company_id).like("job_number", `${year}-%`);
    return `${year}-${((count ?? 0) + 1).toString().padStart(4, "0")}`;
  }

  let jobNumber = await generateJobNumber();
  let job: { id: string } | null = null;
  let jobError: any = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_job_with_appointment', {
      p_company_id: cu.company_id,
      p_job_number: jobNumber,
      p_customer_id: customerId,
      p_site_id: siteId,
      p_service_id: serviceId ?? null,
      p_equipment_id: equipmentId ?? null,
      p_title: title,
      p_assigned_to: technicianId ?? null,
      p_created_by: user.id,
      p_status: kind === 'felmeres' ? 'felmeres' : 'tervezett',
      p_kind: kind,
      p_starts_at: startsAt,
      p_ends_at: endsAt,
    });
    if (!rpcError) {
      job = { id: (rpcResult as any).job_id };
      break;
    }
    if (rpcError.code === '23505') {
      jobNumber = await generateJobNumber();
      jobError = rpcError;
      continue;
    }
    jobError = rpcError;
    break;
  }

  if (!job) return { error: jobError?.code === '23505' ? 'Foglalási szám ütközés, próbáld újra.' : jobError?.message ?? 'Hiba.' };

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/jobs");
  revalidatePath(`/customers/${customerId}`);
  return { jobId: job!.id };
}

const AddAppointmentSchema = z.object({
  jobId: z.string().uuid(),
  kind: z.enum(["munka", "felmeres"]),
  technicianId: z.string().uuid().nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

export async function addAppointmentToJob(input: z.infer<typeof AddAppointmentSchema>) {
  const parsed = AddAppointmentSchema.safeParse(input);
  if (!parsed.success) return { error: "Érvénytelen adatok." };
  const { jobId, kind, technicianId, startsAt, endsAt } = parsed.data;

  const ctx = await getAuthContext();
  if (!ctx || !["owner", "dispatcher"].includes(ctx.role)) return { error: "Nincs jogosultság." };

  const { supabase, companyId } = ctx;

  // Verify job belongs to company
  const { data: job } = await supabase.from("jobs").select("id").eq("id", jobId).eq("company_id", companyId).maybeSingle();
  if (!job) return { error: "A munka nem található." };

  // Conflict check
  if (technicianId) {
    const { data: conflict } = await supabase.from("appointments").select("id")
      .eq("company_id", companyId).eq("technician_id", technicianId)
      .neq("status", "lemondva").lt("starts_at", endsAt).gt("ends_at", startsAt).limit(1);
    if ((conflict?.length ?? 0) > 0) return { error: "Ütközés: a szerelőnek már van foglalása ebben az időszakban." };
  }

  const { error } = await supabase.from("appointments").insert({
    company_id: companyId,
    job_id: jobId,
    kind,
    technician_id: technicianId ?? null,
    starts_at: startsAt,
    ends_at: endsAt,
    status: "tervezett",
  });

  if (error) return { error: error.message };

  revalidatePath(`/jobs/${jobId}`);
  return { success: true };
}

// Keresés az ügyfél-választóhoz (naptárból indított foglaláskor)
export async function searchCustomers(query: string) {
  const ctx = await getAuthContext();
  if (!ctx) return [];
  const { data } = await ctx.supabase
    .from("customers")
    .select("id, name, phone")
    .eq("company_id", ctx.companyId)
    .is("deleted_at", null)
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
    .order("name")
    .limit(10);
  return data ?? [];
}

// Ügyfél helyszíneinek + berendezéseinek lekérése
export async function getCustomerSitesAndEquipment(customerId: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { sites: [], equipment: [] };

  const { data: sites } = await ctx.supabase
    .from("sites")
    .select("id, address, city, zip")
    .eq("company_id", ctx.companyId)
    .eq("customer_id", customerId)
    .order("address");

  const siteIds = (sites ?? []).map(s => s.id);
  const { data: equipment } = siteIds.length > 0
    ? await ctx.supabase
        .from("equipment")
        .select("id, manufacturer, model, kind, site_id")
        .eq("company_id", ctx.companyId)
        .in("site_id", siteIds)
        .order("manufacturer")
    : { data: [] as { id: string; manufacturer: string; model: string | null; kind: string; site_id: string | null }[] };

  return { sites: sites ?? [], equipment: equipment ?? [] };
}

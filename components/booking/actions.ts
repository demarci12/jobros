"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const CreateBookingSchema = z.object({
  customerId: z.string().uuid(),
  siteId: z.string().uuid(),
  serviceId: z.string().uuid().nullable(),
  title: z.string().max(255).nullable(),
  kind: z.enum(["munka", "felmeres"]),
  technicianId: z.string().uuid().nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

export async function createBooking(input: z.infer<typeof CreateBookingSchema>) {
  const parsed = CreateBookingSchema.safeParse(input);
  if (!parsed.success) return { error: "Érvénytelen adatok: " + parsed.error.issues[0]?.message };
  const { customerId, siteId, serviceId, title, kind, technicianId, startsAt, endsAt } = parsed.data;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nincs jogosultság." };

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu || !["owner", "dispatcher"].includes(cu.role)) return { error: "Nincs jogosultság." };

  // Conflict check
  if (technicianId) {
    const { data: conflicts } = await supabase
      .from("appointments")
      .select("id")
      .eq("company_id", cu.company_id)
      .eq("technician_id", technicianId)
      .neq("status", "lemondva")
      .lt("starts_at", endsAt)
      .gt("ends_at", startsAt)
      .limit(1);
    if ((conflicts?.length ?? 0) > 0) return { error: "Ütközés: a szerelőnek már van foglalása ebben az időszakban." };
  }

  // Generate job number
  const year = new Date().getFullYear().toString();
  const { count } = await supabase
    .from("jobs").select("id", { count: "exact", head: true })
    .eq("company_id", cu.company_id)
    .like("job_number", `${year}-%`);
  const seq = ((count ?? 0) + 1).toString().padStart(4, "0");
  const jobNumber = `${year}-${seq}`;

  // Create job
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      company_id: cu.company_id,
      job_number: jobNumber,
      customer_id: customerId,
      site_id: siteId,
      service_id: serviceId,
      title,
      assigned_to: technicianId,
      created_by: user.id,
      status: kind === "felmeres" ? "felmeres" : "utemezve",
    })
    .select("id").single();

  if (jobError) return { error: jobError.message };

  // Create appointment
  const { error: apptError } = await supabase
    .from("appointments")
    .insert({
      company_id: cu.company_id,
      job_id: job.id,
      kind,
      technician_id: technicianId,
      starts_at: startsAt,
      ends_at: endsAt,
    });

  if (apptError) return { error: apptError.message };

  return { jobId: job.id };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { assertTransition, type JobStatus } from "./status-machine";

async function getJobCtx(roles = ["owner", "dispatcher", "technician"] as string[]) {
  const ctx = await getAuthContext();
  if (!ctx || !roles.includes(ctx.role)) return null;
  return { supabase: ctx.supabase, companyId: ctx.companyId, userId: ctx.user.id, role: ctx.role };
}

const createJobSchema = z.object({
  customer_id: z.string().uuid(),
  site_id: z.string().uuid(),
  service_id: z.string().uuid().optional().nullable(),
  title: z.string().optional(),
  description: z.string().optional(),
  assigned_to: z.string().uuid().optional().nullable(),
});

export async function createJob(formData: FormData) {
  const ctx = await getJobCtx(["owner", "dispatcher"]);
  if (!ctx) return { error: "Nincs jogosultság." };

  const parsed = createJobSchema.safeParse({
    customer_id: formData.get("customer_id"),
    site_id: formData.get("site_id"),
    service_id: formData.get("service_id") || null,
    title: formData.get("title") || undefined,
    description: formData.get("description") || undefined,
    assigned_to: formData.get("assigned_to") || null,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const jobNumber = await generateJobNumber(ctx.companyId, ctx.supabase);

  const { data, error } = await ctx.supabase.from("jobs").insert({
    company_id: ctx.companyId,
    job_number: jobNumber,
    created_by: ctx.userId,
    ...parsed.data,
  }).select("id").single();

  if (error) return { error: error.message };
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  revalidatePath(`/customers/${parsed.data.customer_id}`);
  return { id: data.id };
}

async function generateJobNumber(companyId: string, supabase: ReturnType<typeof createClient>) {
  const year = new Date().getFullYear().toString();
  const { count } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .like("job_number", `${year}-%`);
  const seq = ((count ?? 0) + 1).toString().padStart(4, "0");
  return `${year}-${seq}`;
}

export async function updateJob(jobId: string, formData: FormData) {
  const ctx = await getJobCtx(["owner", "dispatcher"]);
  if (!ctx) return { error: "Nincs jogosultság." };

  const parsed = createJobSchema.partial().safeParse({
    service_id: formData.get("service_id") || null,
    title: formData.get("title") || undefined,
    description: formData.get("description") || undefined,
    assigned_to: formData.get("assigned_to") || null,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { error } = await ctx.supabase.from("jobs")
    .update(parsed.data).eq("id", jobId).eq("company_id", ctx.companyId);
  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}`);
  return { success: true };
}

export async function transitionJob(jobId: string, toStatus: JobStatus) {
  const ctx = await getJobCtx();
  if (!ctx) return { error: "Nincs jogosultság." };

  const { data: job } = await ctx.supabase
    .from("jobs").select("status, assigned_to, company_id")
    .eq("id", jobId).eq("company_id", ctx.companyId).single();
  if (!job) return { error: "Munka nem található." };

  // Technikusok csak saját munkájukat státuszolhatják
  if (ctx.role === "technician" && job.assigned_to !== ctx.userId) {
    return { error: "Csak a saját munkádat változtathatod." };
  }

  try {
    assertTransition(job.status as JobStatus, toStatus);
  } catch (e: unknown) {
    return { error: (e as Error).message };
  }

  const { error } = await ctx.supabase.from("jobs")
    .update({ status: toStatus }).eq("id", jobId);
  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function softDeleteJob(jobId: string) {
  const ctx = await getJobCtx(["owner", "dispatcher"]);
  if (!ctx) return { error: "Nincs jogosultság." };

  const { error } = await ctx.supabase.from("jobs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", jobId).eq("company_id", ctx.companyId);
  if (error) return { error: error.message };
  revalidatePath("/jobs");
  return { success: true };
}

export async function createAppointment(formData: FormData) {
  const ctx = await getJobCtx(["owner", "dispatcher"]);
  if (!ctx) return { error: "Nincs jogosultság." };

  const schema = z.object({
    job_id: z.string().uuid(),
    kind: z.enum(["felmeres", "munka"]).default("munka"),
    technician_id: z.string().uuid().optional().nullable(),
    starts_at: z.string().datetime({ offset: true }),
    ends_at: z.string().datetime({ offset: true }),
    travel_buffer_min: z.coerce.number().int().min(0).default(0),
  });

  const parsed = schema.safeParse({
    job_id: formData.get("job_id"),
    kind: formData.get("kind") || "munka",
    technician_id: formData.get("technician_id") || null,
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at"),
    travel_buffer_min: formData.get("travel_buffer_min") || 0,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  // Ütközés-ellenőrzés
  const conflict = await checkConflict(ctx.supabase, ctx.companyId, parsed.data);
  if (conflict) return { error: "Ütközés: a technikusnak már van foglalása ebben az időszakban." };

  const { data, error } = await ctx.supabase.from("appointments").insert({
    company_id: ctx.companyId,
    ...parsed.data,
  }).select("id").single();

  if (error) return { error: error.message };
  revalidatePath(`/jobs/${parsed.data.job_id}`);
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  return { id: data.id };
}

async function checkConflict(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  appt: { technician_id?: string | null; starts_at: string; ends_at: string; job_id?: string }
) {
  if (!appt.technician_id) return false;
  const { data } = await supabase
    .from("appointments")
    .select("id")
    .eq("company_id", companyId)
    .eq("technician_id", appt.technician_id)
    .neq("status", "lemondva")
    .lt("starts_at", appt.ends_at)
    .gt("ends_at", appt.starts_at)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

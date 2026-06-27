"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function getCtx(jobId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) return null;
  const { data: job } = await supabase
    .from("jobs").select("id")
    .eq("id", jobId).eq("company_id", cu.company_id).maybeSingle();
  if (!job) return null;
  const canWrite = ["owner", "dispatcher", "technician"].includes(cu.role);
  const isManager = ["owner", "dispatcher"].includes(cu.role);
  return { supabase, companyId: cu.company_id as string, userId: user.id, canWrite, isManager };
}

export async function clockIn(jobId: string) {
  const ctx = await getCtx(jobId);
  if (!ctx?.canWrite) return { error: "Nincs jogosultság." };

  // Prevent two running timers for the same technician across any job
  const { data: running } = await ctx.supabase
    .from("time_entries")
    .select("id, job_id")
    .eq("company_id", ctx.companyId)
    .eq("technician_id", ctx.userId)
    .is("stopped_at", null)
    .maybeSingle();

  if (running) {
    return { error: "Már fut egy időmérő. Előbb állítsd le a jelenlegi munkát." };
  }

  const { error } = await ctx.supabase.from("time_entries").insert({
    company_id: ctx.companyId,
    job_id: jobId,
    technician_id: ctx.userId,
    started_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}/worksheet`);
  return { success: true };
}

export async function clockOut(entryId: string, jobId: string, note?: string) {
  const ctx = await getCtx(jobId);
  if (!ctx?.canWrite) return { error: "Nincs jogosultság." };

  const { error } = await ctx.supabase
    .from("time_entries")
    .update({
      stopped_at: new Date().toISOString(),
      ...(note ? { note } : {}),
    })
    .eq("id", entryId)
    .eq("technician_id", ctx.userId)  // RLS: only own entries
    .is("stopped_at", null);          // guard: only running entries

  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}/worksheet`);
  return { success: true };
}

export async function deleteTimeEntry(entryId: string, jobId: string) {
  const ctx = await getCtx(jobId);
  if (!ctx) return { error: "Nincs jogosultság." };

  // Manager can delete anyone's entry; technician only own stopped entries
  const filter = ctx.isManager
    ? ctx.supabase.from("time_entries").delete().eq("id", entryId).eq("company_id", ctx.companyId)
    : ctx.supabase.from("time_entries").delete().eq("id", entryId).eq("technician_id", ctx.userId).not("stopped_at", "is", null);

  const { error } = await filter;
  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}/worksheet`);
  return { success: true };
}

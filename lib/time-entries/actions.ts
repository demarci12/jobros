"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/supabase/auth-context";

async function getCtx(jobId: string) {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  const { supabase, companyId, role, user } = ctx;
  const { data: job } = await supabase
    .from("jobs").select("id")
    .eq("id", jobId).eq("company_id", companyId).maybeSingle();
  if (!job) return null;
  const canWrite = ["owner", "dispatcher", "technician"].includes(role);
  const isManager = ["owner", "dispatcher"].includes(role);
  return { supabase, companyId, userId: user.id, canWrite, isManager };
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

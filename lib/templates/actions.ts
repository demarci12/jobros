"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/supabase/auth-context";

// ── Sablon CRUD ──────────────────────────────────────────────────────────────

const TemplateSchema = z.object({
  name: z.string().min(1).max(100),
  activity: z.enum(["szerviz", "csere", "telepites", "felmeres", "garancia", "egyeb"]),
  items: z.array(z.object({
    label: z.string().min(1).max(255),
    is_required: z.boolean().default(false),
    sort_order: z.number().int().default(0),
  })).default([]),
});

async function getDispatcher() {
  const ctx = await getAuthContext();
  if (!ctx || !["owner", "dispatcher"].includes(ctx.role)) return null;
  return { supabase: ctx.supabase, user: ctx.user, cu: { company_id: ctx.companyId, role: ctx.role } };
}

export async function createTemplate(raw: unknown) {
  const ctx = await getDispatcher();
  if (!ctx) return { error: "Nincs jogosultság." };
  const parsed = TemplateSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { name, activity, items } = parsed.data;

  const { data: tmpl, error } = await ctx.supabase
    .from("job_templates")
    .insert({ company_id: ctx.cu.company_id, name, activity })
    .select("id").single();
  if (error) return { error: error.message };

  if (items.length > 0) {
    const { error: ie } = await ctx.supabase
      .from("checklist_items")
      .insert(items.map((it, i) => ({
        company_id: ctx.cu.company_id,
        template_id: tmpl.id,
        label: it.label,
        is_required: it.is_required,
        sort_order: it.sort_order ?? i,
      })));
    if (ie) return { error: ie.message };
  }

  revalidatePath("/settings/templates");
  return { id: tmpl.id };
}

export async function updateTemplate(id: string, raw: unknown) {
  const ctx = await getDispatcher();
  if (!ctx) return { error: "Nincs jogosultság." };
  const parsed = TemplateSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { name, activity, items } = parsed.data;

  const { error } = await ctx.supabase
    .from("job_templates")
    .update({ name, activity })
    .eq("id", id).eq("company_id", ctx.cu.company_id);
  if (error) return { error: error.message };

  // replace all items
  await ctx.supabase.from("checklist_items").delete()
    .eq("template_id", id).eq("company_id", ctx.cu.company_id);
  if (items.length > 0) {
    await ctx.supabase.from("checklist_items").insert(
      items.map((it, i) => ({
        company_id: ctx.cu.company_id,
        template_id: id,
        label: it.label,
        is_required: it.is_required,
        sort_order: it.sort_order ?? i,
      }))
    );
  }

  revalidatePath("/settings/templates");
  return { ok: true };
}

export async function deleteTemplate(id: string) {
  const ctx = await getDispatcher();
  if (!ctx) return { error: "Nincs jogosultság." };
  const { error } = await ctx.supabase
    .from("job_templates").delete()
    .eq("id", id).eq("company_id", ctx.cu.company_id);
  if (error) return { error: error.message };
  revalidatePath("/settings/templates");
  return { ok: true };
}

// ── Checklist state (job munkalap) ───────────────────────────────────────────

export async function applyTemplateToJob(jobId: string, templateId: string) {
  const ctx = await getDispatcher();
  if (!ctx) return { error: "Nincs jogosultság." };

  const { data: items } = await ctx.supabase
    .from("checklist_items").select("label, sort_order, is_required")
    .eq("template_id", templateId).eq("company_id", ctx.cu.company_id)
    .order("sort_order");
  if (!items || items.length === 0) return { ok: true };

  const { error } = await ctx.supabase.from("job_checklist_state").insert(
    items.map(it => ({
      company_id: ctx.cu.company_id,
      job_id: jobId,
      label: it.label,
      is_done: false,
    }))
  );
  if (error) return { error: error.message };

  revalidatePath(`/jobs/${jobId}/worksheet`);
  return { ok: true };
}

export async function toggleChecklistItem(itemId: string, isDone: boolean) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Nincs jogosultság." };

  const { error } = await ctx.supabase
    .from("job_checklist_state")
    .update({
      is_done: isDone,
      done_at: isDone ? new Date().toISOString() : null,
      done_by: isDone ? ctx.user.id : null,
    })
    .eq("id", itemId).eq("company_id", ctx.companyId);

  if (error) return { error: error.message };
  return { ok: true };
}

export async function addChecklistItem(jobId: string, label: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Nincs jogosultság." };

  const { data, error } = await ctx.supabase.from("job_checklist_state").insert({
    company_id: ctx.companyId,
    job_id: jobId,
    label,
    is_done: false,
  }).select("id, label, is_done, done_at, done_by").single();

  if (error) return { error: error.message };
  return { item: data };
}

export async function deleteChecklistItem(itemId: string) {
  const ctx = await getAuthContext();
  if (!ctx || !["owner", "dispatcher"].includes(ctx.role)) return { error: "Nincs jogosultság." };

  const { error } = await ctx.supabase.from("job_checklist_state")
    .delete().eq("id", itemId).eq("company_id", ctx.companyId);
  if (error) return { error: error.message };
  return { ok: true };
}

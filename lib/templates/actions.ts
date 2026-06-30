"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/supabase/auth-context";

// ── Sablon CRUD ──────────────────────────────────────────────────────────────

const LineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().default(1),
  unit: z.string().default("db"),
  unit_price: z.number().default(0),
  vat_rate: z.number().default(27),
});

const TemplateSchema = z.object({
  name: z.string().min(1).max(100),
  activity: z.enum(["szerviz", "csere", "telepites", "felmeres", "garancia", "egyeb"]),
  template_kind: z.enum(["checklist", "quote", "worksheet"]).default("checklist"),
  items: z.array(z.object({
    label: z.string().min(1).max(255),
    is_required: z.boolean().default(false),
    sort_order: z.number().int().default(0),
  })).default([]),
  default_lines: z.array(LineItemSchema).default([]),
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
  const { name, activity, template_kind, items, default_lines } = parsed.data;

  const { data: tmpl, error } = await ctx.supabase
    .from("job_templates")
    .insert({
      company_id: ctx.cu.company_id,
      name,
      activity,
      template_kind,
      default_lines: template_kind !== "checklist" ? default_lines : [],
    })
    .select("id").single();
  if (error) return { error: error.message };

  if (template_kind === "checklist" && items.length > 0) {
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
  const { name, activity, template_kind, items, default_lines } = parsed.data;

  const { error } = await ctx.supabase
    .from("job_templates")
    .update({
      name,
      activity,
      template_kind,
      default_lines: template_kind !== "checklist" ? default_lines : [],
    })
    .eq("id", id).eq("company_id", ctx.cu.company_id);
  if (error) return { error: error.message };

  if (template_kind === "checklist") {
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

// ── Apply quote template ─────────────────────────────────────────────────────

export async function applyQuoteTemplate(quoteId: string, templateId: string) {
  const ctx = await getDispatcher();
  if (!ctx) return { error: "Nincs jogosultság." };

  const { data: tmpl } = await ctx.supabase
    .from("job_templates")
    .select("default_lines, job_id:id")
    .eq("id", templateId)
    .eq("company_id", ctx.cu.company_id)
    .eq("template_kind", "quote")
    .single();
  if (!tmpl) return { error: "Sablon nem található." };

  const lines = (tmpl.default_lines ?? []) as Array<{
    description: string; quantity: number; unit: string; unit_price: number; vat_rate: number;
  }>;
  if (lines.length === 0) return { ok: true };

  // Verify quote belongs to company
  const { data: quote } = await ctx.supabase
    .from("quotes")
    .select("id, job_id")
    .eq("id", quoteId)
    .eq("company_id", ctx.cu.company_id)
    .single();
  if (!quote) return { error: "Árajánlat nem található." };

  const { error } = await ctx.supabase.from("quote_lines").insert(
    lines.map(l => ({
      company_id: ctx.cu.company_id,
      quote_id: quoteId,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      unit_price: l.unit_price,
      vat_rate: l.vat_rate,
      is_optional: false,
      is_selected: true,
    }))
  );
  if (error) return { error: error.message };

  revalidatePath(`/jobs/${quote.job_id}/quote`);
  return { ok: true };
}

// ── Apply worksheet template ─────────────────────────────────────────────────

export async function applyWorksheetTemplate(worksheetId: string, templateId: string) {
  const ctx = await getDispatcher();
  if (!ctx) return { error: "Nincs jogosultság." };

  const { data: tmpl } = await ctx.supabase
    .from("job_templates")
    .select("default_lines")
    .eq("id", templateId)
    .eq("company_id", ctx.cu.company_id)
    .eq("template_kind", "worksheet")
    .single();
  if (!tmpl) return { error: "Sablon nem található." };

  const lines = (tmpl.default_lines ?? []) as Array<{
    description: string; quantity: number; unit: string; unit_price: number; vat_rate: number;
  }>;
  if (lines.length === 0) return { ok: true };

  // Verify worksheet belongs to company and get job_id
  const { data: ws } = await ctx.supabase
    .from("worksheets")
    .select("id, job_id")
    .eq("id", worksheetId)
    .eq("company_id", ctx.cu.company_id)
    .single();
  if (!ws) return { error: "Munkalap nem található." };

  const { error } = await ctx.supabase.from("worksheet_lines").insert(
    lines.map(l => ({
      company_id: ctx.cu.company_id,
      worksheet_id: worksheetId,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      unit_price: l.unit_price,
      vat_rate: l.vat_rate,
      is_labor: false,
    }))
  );
  if (error) return { error: error.message };

  revalidatePath(`/jobs/${ws.job_id}/worksheet`);
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

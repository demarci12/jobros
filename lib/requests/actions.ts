"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { generateJobNumber } from "@/lib/jobs/job-number";

async function getDispatcher() {
  const ctx = await getAuthContext();
  if (!ctx || !["owner", "dispatcher"].includes(ctx.role)) return null;
  return { supabase: ctx.supabase, user: ctx.user, cu: { company_id: ctx.companyId, role: ctx.role } };
}

export async function updateRequestStatus(id: string, status: "new" | "contacted" | "converted" | "spam") {
  const ctx = await getDispatcher();
  if (!ctx) return { error: "Nincs jogosultság." };

  const { error } = await ctx.supabase
    .from("booking_requests")
    .update({ status })
    .eq("id", id).eq("company_id", ctx.cu.company_id);

  if (error) return { error: error.message };
  revalidatePath("/requests");
  return { ok: true };
}

const ConvertSchema = z.object({
  requestId: z.string().uuid(),
  customerId: z.string().uuid().nullable(),
  // if customerId is null, create a new customer from request data
  newCustomerName: z.string().max(200).optional(),
  newCustomerPhone: z.string().max(50).optional(),
  newCustomerEmail: z.string().email().max(200).optional().or(z.literal("")),
  siteAddress: z.string().max(500).optional(),
  serviceId: z.string().uuid().nullable(),
});

export async function convertRequestToJob(raw: unknown) {
  const ctx = await getDispatcher();
  if (!ctx) return { error: "Nincs jogosultság." };

  const parsed = ConvertSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { requestId, customerId, newCustomerName, newCustomerPhone, newCustomerEmail, siteAddress, serviceId } = parsed.data;
  const { supabase, cu, user } = ctx;

  // Verify request belongs to company
  const { data: req } = await supabase.from("booking_requests")
    .select("id, name, phone, email, address, message, status")
    .eq("id", requestId).eq("company_id", cu.company_id).maybeSingle();
  if (!req) return { error: "Kérés nem található." };
  if (req.status === "converted") return { error: "Ez a kérés már konvertálva van." };

  let resolvedCustomerId = customerId;

  // Create new customer if needed
  if (!resolvedCustomerId) {
    const name = newCustomerName ?? req.name;
    if (!name) return { error: "Ügyfél neve kötelező." };

    const { data: newCustomer, error: ce } = await supabase.from("customers").insert({
      company_id: cu.company_id,
      name,
      phone: newCustomerPhone ?? req.phone ?? null,
      email: newCustomerEmail ?? req.email ?? null,
    }).select("id").single();
    if (ce) return { error: ce.message };
    resolvedCustomerId = newCustomer.id;

    // Create site if address provided
    if (siteAddress ?? req.address) {
      await supabase.from("sites").insert({
        company_id: cu.company_id,
        customer_id: resolvedCustomerId,
        address: siteAddress ?? req.address,
      });
    }
  }

  const jobNumber = await generateJobNumber(supabase, cu.company_id);

  const { data: job, error: je } = await supabase.from("jobs").insert({
    company_id: cu.company_id,
    job_number: jobNumber,
    customer_id: resolvedCustomerId,
    service_id: serviceId ?? null,
    title: req.message?.slice(0, 100) ?? null,
    status: "uj",
    created_by: user.id,
  }).select("id").single();
  if (je) return { error: je.message };

  // Mark request as converted
  await supabase.from("booking_requests")
    .update({ status: "converted", job_id: job.id })
    .eq("id", requestId).eq("company_id", cu.company_id);

  revalidatePath("/requests");
  return { jobId: job.id };
}

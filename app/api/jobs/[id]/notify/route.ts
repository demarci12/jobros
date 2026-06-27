import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendNotification } from "@/lib/notifications/send";
import type { NotificationEvent } from "@/lib/notifications/templates";
import { z } from "zod";

const NotifySchema = z.object({
  event: z.enum([
    "technician_on_the_way",
    "quote_ready",
    "invoice_sent",
    "service_reminder",
    "appointment_confirmed",
    "appointment_cancelled",
  ]),
  channel: z.enum(["sms", "email"]).default("sms"),
  recipient: z.string().optional(), // override; otherwise taken from job customer
  vars: z.record(z.string()).default({}),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu || !["owner", "dispatcher", "technician"].includes(cu.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = NotifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: job } = await service
    .from("jobs")
    .select(`
      id, job_number, title, assigned_to,
      customers (name, phone, email)
    `)
    .eq("id", params.id)
    .eq("company_id", cu.company_id)
    .maybeSingle();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;

  // assigned_to is a FK to profiles.id
  let techName = "Szerelőnk";
  if ((job as any).assigned_to) {
    const { data: prof } = await service
      .from("profiles").select("full_name")
      .eq("id", (job as any).assigned_to).maybeSingle();
    if (prof?.full_name) techName = prof.full_name;
  }

  const { event, channel, vars } = parsed.data;

  const recipient = parsed.data.recipient
    ?? (channel === "sms" ? (customer as any)?.phone : (customer as any)?.email);

  if (!recipient) {
    return NextResponse.json({ error: "No recipient — customer is missing phone/email." }, { status: 422 });
  }

  const mergedVars: Record<string, string> = {
    customer_name: (customer as any)?.name ?? "Kedves Ügyfél",
    job_number: (job as any).job_number ?? "",
    technician_name: techName,
    ...vars,
  };

  await sendNotification({
    companyId: cu.company_id,
    jobId: params.id,
    event: event as NotificationEvent,
    recipient,
    channel,
    vars: mergedVars,
  });

  return NextResponse.json({ sent: true });
}

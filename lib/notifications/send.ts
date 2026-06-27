import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { DEFAULT_TEMPLATES, renderTemplate } from "./templates";
import type { NotificationEvent } from "./templates";

export type SendNotificationPayload = {
  companyId: string;
  jobId?: string;
  event: NotificationEvent;
  recipient: string;         // phone (E.164) or email
  channel: "sms" | "email";
  vars: Record<string, string>;
};

async function sendSms(to: string, body: string): Promise<{ externalId?: string; error?: string }> {
  const apiKey = process.env.INFOBIP_API_KEY;
  const baseUrl = process.env.INFOBIP_BASE_URL ?? "https://api.infobip.com";
  const from = process.env.INFOBIP_SENDER ?? "Jobro";

  if (!apiKey) return { error: "INFOBIP_API_KEY not configured" };

  const res = await fetch(`${baseUrl}/sms/2/text/single`, {
    method: "POST",
    headers: {
      Authorization: `App ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ from, to, text: body }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { error: err };
  }

  const data = await res.json();
  const msgId = data?.messages?.[0]?.messageId as string | undefined;
  return { externalId: msgId };
}

async function sendEmail(to: string, subject: string, body: string): Promise<{ externalId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "noreply@jobro.hu";

  if (!apiKey) return { error: "RESEND_API_KEY not configured" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text: body }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { error: err };
  }

  const data = await res.json();
  return { externalId: data?.id as string | undefined };
}

export async function sendNotification(payload: SendNotificationPayload): Promise<void> {
  const service = createServiceClient();

  // Fetch company notification settings for this event
  const { data: setting } = await service
    .from("notification_settings")
    .select("is_enabled, channels, template")
    .eq("company_id", payload.companyId)
    .eq("event", payload.event)
    .maybeSingle();

  // If setting exists and is disabled — skip
  if (setting && !setting.is_enabled) return;

  // Channel gate: if setting exists, check channel is enabled
  if (setting?.channels && !setting.channels.includes(payload.channel)) return;

  const template = setting?.template ?? DEFAULT_TEMPLATES[payload.event];
  const body = renderTemplate(template, payload.vars);
  const subject = payload.vars.subject ?? payload.event.replace(/_/g, " ");

  let externalId: string | undefined;
  let error: string | undefined;

  if (payload.channel === "sms") {
    const result = await sendSms(payload.recipient, body);
    externalId = result.externalId;
    error = result.error;
  } else {
    const result = await sendEmail(payload.recipient, subject, body);
    externalId = result.externalId;
    error = result.error;
  }

  // Log every notification attempt
  await service.from("notifications").insert({
    company_id: payload.companyId,
    job_id: payload.jobId ?? null,
    recipient: payload.recipient,
    channel: payload.channel,
    event: payload.event,
    body,
    status: error ? "failed" : "sent",
    external_id: externalId ?? null,
    error: error ?? null,
  });
}

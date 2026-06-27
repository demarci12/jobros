import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendNotification } from "@/lib/notifications/send";

// Vercel Cron: runs daily at 08:00 CET (07:00 UTC)
// Finds equipment with next_service_due within 14 days and sends SMS to the customer.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();

  const today = new Date();
  const in14 = new Date(today.getTime() + 14 * 86400_000);

  const { data: dueItems, error } = await service
    .from("equipment")
    .select(`
      id, manufacturer, model, next_service_due, company_id,
      sites (
        customer_id,
        customers (name, phone, email)
      )
    `)
    .not("next_service_due", "is", null)
    .gte("next_service_due", today.toISOString().slice(0, 10))
    .lte("next_service_due", in14.toISOString().slice(0, 10))
    .is("deleted_at", null);

  if (error) {
    console.error("[service-reminders] query error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;

  for (const item of dueItems ?? []) {
    const site = (item as any).sites;
    const customer = site?.customers;
    const phone = customer?.phone;
    const email = customer?.email;
    const recipient = phone ?? email;

    if (!recipient) { skipped++; continue; }

    const dueDate = new Date(item.next_service_due as string);
    const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / 86400_000);

    // Only send on exactly 14 or 7 or 1 day before to avoid daily spam
    if (![14, 7, 1].includes(daysLeft)) { skipped++; continue; }

    // Check if notification already sent today (idempotency)
    const { count } = await service
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("company_id", item.company_id)
      .eq("event", "service_reminder")
      .gte("created_at", today.toISOString().slice(0, 10))
      .eq("recipient", recipient);

    if ((count ?? 0) > 0) { skipped++; continue; }

    await sendNotification({
      companyId: item.company_id,
      event: "service_reminder",
      recipient,
      channel: phone ? "sms" : "email",
      vars: {
        customer_name: customer?.name ?? "Kedves Ügyfél",
        equipment_name: [item.manufacturer, item.model].filter(Boolean).join(" ") || "berendezés",
        days_left: String(daysLeft),
      },
    });
    sent++;
  }

  return NextResponse.json({ ok: true, sent, skipped });
}

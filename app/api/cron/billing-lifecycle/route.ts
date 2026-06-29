import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Vercel Cron: runs daily at 06:00 UTC
// Handles:
//   1. Trial-ending reminders (3 days before, 1 day before)
//   2. Expired trial → status = 'canceled'
//   3. past_due > 7 days → status = 'suspended'
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const now = new Date();

  const results = {
    trialReminders: 0,
    trialExpired: 0,
    suspended: 0,
    errors: [] as string[],
  };

  // ── 1. Trial reminders ──────────────────────────────────────────────────────
  const { data: trialSubs } = await service
    .from("subscriptions")
    .select("id, company_id, trial_ends_at, companies(name)")
    .eq("status", "trialing")
    .not("trial_ends_at", "is", null);

  for (const sub of trialSubs ?? []) {
    const trialEndsAt = new Date(sub.trial_ends_at as string);
    const daysLeft = Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86400_000);

    // Expired trial → cancel (paywall)
    if (daysLeft <= 0) {
      const { error } = await service
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("id", sub.id);
      if (error) results.errors.push(`trial-expire ${sub.id}: ${error.message}`);
      else {
        // Also update companies.plan cache
        await service.from("companies").update({ plan: "canceled" }).eq("id", sub.company_id);
        results.trialExpired++;
      }
      continue;
    }

    // Reminder on day 3 and day 1
    if (![3, 1].includes(daysLeft)) continue;

    // Find owner email
    const { data: owner } = await service
      .from("company_users")
      .select("profiles(email, full_name)")
      .eq("company_id", sub.company_id)
      .eq("role", "owner")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const profile = (owner as any)?.profiles;
    const email = profile?.email;
    if (!email) continue;

    // Check not already sent today
    const { count } = await service
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("company_id", sub.company_id)
      .eq("event", "trial_ending")
      .gte("created_at", now.toISOString().slice(0, 10));

    if ((count ?? 0) > 0) continue;

    const { sendNotification } = await import("@/lib/notifications/send");
    await sendNotification({
      companyId: sub.company_id,
      event: "trial_ending",
      recipient: email,
      channel: "email",
      vars: {
        customer_name: profile?.full_name ?? "Kedves Felhasználó",
        days_left: String(daysLeft),
        trial_ends_at: trialEndsAt.toLocaleDateString("hu-HU"),
      },
    });
    results.trialReminders++;
  }

  // ── 2. Dunning: past_due > 7 days → suspended ──────────────────────────────
  const GRACE_DAYS = 7;
  const { data: pastDueSubs } = await service
    .from("subscriptions")
    .select("id, company_id, past_due_since")
    .eq("status", "past_due")
    .not("past_due_since", "is", null);

  for (const sub of pastDueSubs ?? []) {
    const pastDueSince = new Date(sub.past_due_since as string);
    const daysPastDue = Math.floor((now.getTime() - pastDueSince.getTime()) / 86400_000);

    if (daysPastDue < GRACE_DAYS) continue;

    const { error } = await service
      .from("subscriptions")
      .update({ status: "suspended" })
      .eq("id", sub.id);

    if (error) results.errors.push(`suspend ${sub.id}: ${error.message}`);
    else {
      await service.from("companies").update({ plan: "suspended" }).eq("id", sub.company_id);
      results.suspended++;
    }
  }

  console.log("[billing-lifecycle]", results);
  return NextResponse.json({ ok: true, ...results });
}

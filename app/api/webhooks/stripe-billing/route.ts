import { NextResponse } from "next/server";
import { stripe } from "@/lib/billing/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveConnector } from "@/lib/apps/registry";
import type { InvoicingProvider } from "@/lib/apps/types";
import type Stripe from "stripe";

const WEBHOOK_SECRET = process.env.STRIPE_BILLING_WEBHOOK_SECRET ?? "";

// Stripe subscription status → our subscription_status enum
function mapStatus(stripeStatus: Stripe.Subscription["status"]): string {
  const map: Record<string, string> = {
    trialing: "trialing",
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "past_due",
    paused: "suspended",
    incomplete: "past_due",
    incomplete_expired: "canceled",
  };
  return map[stripeStatus] ?? "past_due";
}

// plan slug from Stripe price → our plan slug via plan_definitions.stripe_price_id
async function getPlanSlug(service: ReturnType<typeof createServiceClient>, priceId: string): Promise<string | null> {
  const { data } = await service
    .from("plan_definitions")
    .select("slug")
    .eq("stripe_price_id", priceId)
    .maybeSingle();
  return data?.slug ?? null;
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const service = createServiceClient();

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const companyId = sub.metadata?.company_id;
      if (!companyId) break;

      const priceId = sub.items.data[0]?.price.id;
      const planSlug = priceId ? await getPlanSlug(service, priceId) : null;
      const status = mapStatus(sub.status);
      // current_period_end was removed in Stripe API 2026-06-24; extract from raw object
      const rawSub = sub as unknown as Record<string, unknown>;
      const periodEndTs = typeof rawSub["current_period_end"] === "number"
        ? new Date(rawSub["current_period_end"] * 1000).toISOString()
        : null;

      await service
        .from("subscriptions")
        .update({
          status,
          stripe_subscription_id: sub.id,
          ...(periodEndTs ? { current_period_end: periodEndTs } : {}),
          cancel_at_period_end: sub.cancel_at_period_end,
          ...(planSlug ? { plan_slug: planSlug } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId);

      if (planSlug) {
        await service
          .from("companies")
          .update({ plan: planSlug })
          .eq("id", companyId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const companyId = sub.metadata?.company_id;
      if (!companyId) break;

      await service
        .from("subscriptions")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("company_id", companyId);

      await service
        .from("companies")
        .update({ plan: "trial" })
        .eq("id", companyId);
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const companyId = (invoice as { metadata?: Record<string, string> }).metadata?.company_id
        ?? (invoice as unknown as { subscription_details?: { metadata?: Record<string, string> } }).subscription_details?.metadata?.company_id;

      if (!companyId) break;

      // Saját NAV-számla kiállítása a Billingo connectorral (dogfooding)
      const invoicingProvider = await resolveConnector<InvoicingProvider>(
        process.env.JOBRO_OWN_COMPANY_ID ?? "",
        "invoicing"
      );

      if (invoicingProvider && invoice.amount_paid > 0) {
        const { data: sub } = await service
          .from("subscriptions")
          .select("plan_slug, plan_definitions(name, price_monthly)")
          .eq("company_id", companyId)
          .maybeSingle();

        const { data: company } = await service
          .from("companies")
          .select("name, tax_number, email")
          .eq("id", companyId)
          .maybeSingle();

        const planName = (sub?.plan_definitions as { name?: string } | null)?.name ?? sub?.plan_slug ?? "Előfizetés";

        try {
          const result = await invoicingProvider.issueInvoice({
            idempotencyKey: `stripe-invoice:${invoice.id}`,
            customerName: company?.name ?? "Ismeretlen",
            customerTaxNumber: company?.tax_number ?? undefined,
            customerEmail: company?.email ?? undefined,
            items: [
              {
                description: `Jobro ${planName} előfizetés`,
                quantity: 1,
                unitPrice: invoice.amount_paid / 100,
                vatRate: 27,
              },
            ],
            issuerCompanyId: process.env.JOBRO_OWN_COMPANY_ID ?? "",
          });

          await service
            .from("subscriptions")
            .update({ last_invoice_id: result.externalId })
            .eq("company_id", companyId);
        } catch {
          // Számlakiállítás hiba nem blokkolja a webhook választ
        }
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}

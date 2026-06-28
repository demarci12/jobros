"use server";

import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { createServiceClient } from "@/lib/supabase/service";
import {
  stripe,
  getOrCreateStripeCustomer,
  createCheckoutSession,
  createBillingPortalSession,
} from "@/lib/billing/stripe";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function getCompanyAndSub() {
  const ctx = await getAuthContext();
  if (!ctx) return null;

  const service = createServiceClient();
  const { data: company } = await service
    .from("companies")
    .select("id, name, email")
    .eq("id", ctx.companyId)
    .single();

  const { data: sub } = await service
    .from("subscriptions")
    .select("*")
    .eq("company_id", ctx.companyId)
    .maybeSingle();

  return { company, sub, role: ctx.role };
}

export async function startCheckout(planSlug: string) {
  const ctx = await getCompanyAndSub();
  if (!ctx?.company) return { error: "Nincs bejelentkezve." };
  if (ctx.role !== "owner") return { error: "Csak az owner indíthat Checkout-ot." };

  const service = createServiceClient();
  const { data: plan } = await service
    .from("plan_definitions")
    .select("stripe_price_id, name")
    .eq("slug", planSlug)
    .single();

  if (!plan?.stripe_price_id) {
    return { error: "Ehhez a csomaghoz nincs Stripe ár beállítva." };
  }

  const customerId = await getOrCreateStripeCustomer(
    ctx.company.id,
    ctx.company.email,
    ctx.company.name
  );

  await service
    .from("subscriptions")
    .update({ stripe_customer_id: customerId })
    .eq("company_id", ctx.company.id);

  const checkoutUrl = await createCheckoutSession({
    companyId: ctx.company.id,
    customerId,
    priceId: plan.stripe_price_id,
    successUrl: `${SITE_URL}/settings/subscription?success=1`,
    cancelUrl: `${SITE_URL}/settings/subscription?canceled=1`,
  });

  redirect(checkoutUrl);
}

export async function openBillingPortal() {
  const ctx = await getCompanyAndSub();
  if (!ctx?.company) return { error: "Nincs bejelentkezve." };
  if (ctx.role !== "owner") return { error: "Csak az owner nyithatja meg a számlázási portált." };
  if (!ctx.sub?.stripe_customer_id) return { error: "Nincs Stripe előfizetés." };

  const portalUrl = await createBillingPortalSession(
    ctx.sub.stripe_customer_id,
    `${SITE_URL}/settings/subscription`
  );

  redirect(portalUrl);
}

export async function cancelSubscription() {
  const ctx = await getCompanyAndSub();
  if (!ctx?.company) return { error: "Nincs bejelentkezve." };
  if (ctx.role !== "owner") return { error: "Csak az owner mondhatja le az előfizetést." };
  if (!ctx.sub?.stripe_subscription_id) return { error: "Nincs aktív Stripe előfizetés." };

  await stripe.subscriptions.update(ctx.sub.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  const service = createServiceClient();
  await service
    .from("subscriptions")
    .update({ cancel_at_period_end: true })
    .eq("company_id", ctx.company.id);

  return { success: true };
}

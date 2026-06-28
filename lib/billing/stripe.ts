import "server-only";
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_BILLING_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2026-06-24.dahlia",
});

export async function getOrCreateStripeCustomer(
  companyId: string,
  email: string | null,
  name: string
): Promise<string> {
  const existing = await stripe.customers.search({
    query: `metadata["company_id"]:"${companyId}"`,
    limit: 1,
  });

  if (existing.data.length > 0) return existing.data[0].id;

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    name,
    metadata: { company_id: companyId },
  });

  return customer.id;
}

export async function createCheckoutSession({
  companyId,
  customerId,
  priceId,
  successUrl,
  cancelUrl,
}: {
  companyId: string;
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { company_id: companyId },
    subscription_data: { metadata: { company_id: companyId } },
    allow_promotion_codes: true,
  });

  return session.url!;
}

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

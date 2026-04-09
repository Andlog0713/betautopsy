import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_PRICE_ID);
}

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in environment variables.');
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
      typescript: true,
    });
  }
  return _stripe;
}

// Re-export as `stripe` getter for convenience
export { getStripe as stripe };

export function tierFromPriceId(priceId: string): 'pro' | null {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID || priceId === process.env.STRIPE_PRO_ANNUAL_PRICE_ID) return 'pro';
  return null;
}

export async function getOrCreateCustomer(
  email: string,
  userId: string,
  existingCustomerId: string | null
): Promise<string> {
  if (existingCustomerId) {
    return existingCustomerId;
  }

  const customer = await getStripe().customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });

  return customer.id;
}

// Pro subscription checkout ($19.99/mo or $149.99/yr)
export async function createSubscriptionCheckoutSession(
  customerId: string,
  userId: string,
  interval: 'monthly' | 'annual' = 'monthly'
): Promise<string> {
  const priceId = interval === 'annual'
    ? process.env.STRIPE_PRO_ANNUAL_PRICE_ID!
    : process.env.STRIPE_PRO_PRICE_ID!;

  if (!priceId) throw new Error(`No price ID configured for Pro ${interval}`);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${appUrl}/dashboard?upgraded=true`,
    cancel_url: `${appUrl}/pricing`,
    metadata: { supabase_user_id: userId, tier: 'pro' },
  });

  return session.url!;
}

// One-time report purchase ($9.99 or $4.99 for Pro extras)
export async function createReportCheckoutSession(
  customerId: string,
  userId: string,
  snapshotReportId: string,
  isExtraReport: boolean = false
): Promise<string> {
  const priceId = isExtraReport
    ? process.env.STRIPE_EXTRA_REPORT_PRICE_ID!
    : process.env.STRIPE_REPORT_PRICE_ID!;

  if (!priceId) throw new Error(`No price ID configured for ${isExtraReport ? 'extra' : 'single'} report`);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${appUrl}/reports?id=${snapshotReportId}&unlocked=true`,
    cancel_url: `${appUrl}/reports?id=${snapshotReportId}`,
    metadata: {
      supabase_user_id: userId,
      report_id: snapshotReportId,
      type: 'report_purchase',
    },
  });

  return session.url!;
}

// Keep backward compat for existing code that calls createCheckoutSession
export async function createCheckoutSession(
  customerId: string,
  tier: 'pro',
  userId: string,
  interval: 'monthly' | 'annual' = 'monthly'
): Promise<string> {
  return createSubscriptionCheckoutSession(customerId, userId, interval);
}

export async function createCustomerPortalSession(customerId: string): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/pricing`,
  });

  return session.url;
}

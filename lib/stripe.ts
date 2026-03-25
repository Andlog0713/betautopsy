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

export function tierFromPriceId(priceId: string): 'pro' | 'sharp' | null {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID || priceId === process.env.STRIPE_PRO_ANNUAL_PRICE_ID) return 'pro';
  if (priceId === process.env.STRIPE_SHARP_PRICE_ID || priceId === process.env.STRIPE_SHARP_ANNUAL_PRICE_ID) return 'sharp';
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

export async function createCheckoutSession(
  customerId: string,
  tier: 'pro' | 'sharp',
  userId: string,
  interval: 'monthly' | 'annual' = 'monthly'
): Promise<string> {
  let priceId: string;

  if (interval === 'annual') {
    priceId = tier === 'pro'
      ? process.env.STRIPE_PRO_ANNUAL_PRICE_ID!
      : process.env.STRIPE_SHARP_ANNUAL_PRICE_ID!;
  } else {
    priceId = tier === 'pro'
      ? process.env.STRIPE_PRO_PRICE_ID!
      : process.env.STRIPE_SHARP_PRICE_ID!;
  }

  if (!priceId) throw new Error(`No price ID configured for tier: ${tier}, interval: ${interval}`);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?upgraded=true`,
    cancel_url: `${appUrl}/pricing`,
    metadata: { supabase_user_id: userId, tier },
  });

  return session.url!;
}

export async function createCustomerPortalSession(customerId: string): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/pricing`,
  });

  return session.url;
}

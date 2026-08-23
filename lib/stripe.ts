import Stripe from 'stripe';

let _stripe: Stripe | null = null;

// No discount/promo mechanism exists (removed 2026-08-17: the AUTOPSY50
// coupon was deleted from Stripe and STRIPE_LAUNCH_PROMO removed from
// Vercel env, per Andrew's D1 pricing decision - single report purchase
// at the STRIPE_REPORT_PRICE_ID price, no discount, nothing else marketed
// on web). Checkout sessions are created at exactly the price the
// customer was shown; if a discount mechanism is ever reintroduced, keep
// that invariant - a checkout must never complete at a price different
// from the one displayed (see the deleted createSessionWithDiscountFallback
// wrapper in git history, PR #81, for the failure mode that produces).

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

/**
 * Resolve a Stripe customer ID for the given Supabase user.
 *
 * `created` is true when this call had to mint a fresh Stripe
 * customer — the caller MUST persist the new ID to
 * `profiles.stripe_customer_id`, otherwise the next checkout
 * attempt will hit the same stale-ID problem we just recovered
 * from.
 *
 * Why not just trust `existingCustomerId`: a stored ID can be
 * invalid for several reasons in the live environment —
 *
 *   - **Test→live key cutover.** A customer created against
 *     `sk_test_...` is invisible to a `sk_live_...` request
 *     and Stripe responds with `resource_missing` + a hint
 *     about test/live separation. We saw this in production
 *     on 2026-05-06 (req_oeokpchVEwYg7b).
 *   - **Manual deletion in the Stripe dashboard** for cleanup.
 *   - **Stripe account swap** (rare, but possible across
 *     ownership changes).
 *
 * In all three cases the right move is to mint a fresh customer
 * in the *current* mode and overwrite the stale row. We don't
 * try to migrate / merge subscription history because there's
 * nothing to migrate — a stale ID means there were no live
 * payments associated anyway.
 */
export async function getOrCreateCustomer(
  email: string,
  userId: string,
  existingCustomerId: string | null
): Promise<{ customerId: string; created: boolean }> {
  if (existingCustomerId) {
    try {
      const customer = await getStripe().customers.retrieve(existingCustomerId);
      // Stripe's `retrieve` returns a `DeletedCustomer` shape (with
      // `deleted: true`) when the customer was soft-deleted. Treat
      // that as missing too — `customers.create` will mint a fresh
      // active one.
      if (!('deleted' in customer) || !customer.deleted) {
        return { customerId: existingCustomerId, created: false };
      }
    } catch (err) {
      // `code === 'resource_missing'` covers test/live mismatch and
      // hard-deleted customers. Any other Stripe error (auth, rate
      // limit, transient network) we re-throw so the route's catch
      // block surfaces it to the user.
      const isMissing =
        err !== null &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code?: unknown }).code === 'resource_missing';
      if (!isMissing) throw err;
    }
  }

  const customer = await getStripe().customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });

  return { customerId: customer.id, created: true };
}

// Pro subscription checkout ($39.99/mo or $299.99/yr). Not marketed on web
// (2026-08-17, D1) - existing Pro subscribers keep working (manage/cancel
// via createCustomerPortalSession below), but this is no longer reachable
// from any public-facing CTA. Left in place rather than deleted in case a
// subscription is ever started manually; do not wire a new public entry
// point to it without a deliberate pricing decision.
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
    success_url: `${appUrl}/dashboard?upgraded=true`,
    cancel_url: `${appUrl}/pricing`,
    metadata: { supabase_user_id: userId, tier: 'pro' },
  });

  return session.url!;
}

// One-time report purchase (STRIPE_REPORT_PRICE_ID, $19.99 flat - the only
// thing marketed on web; STRIPE_EXTRA_REPORT_PRICE_ID for existing Pro
// subscribers exceeding their monthly allocation, unchanged, backend-only)
export async function createReportCheckoutSession(
  customerId: string,
  userId: string,
  snapshotReportId: string,
  isExtraReport: boolean = false,
  priorCheckoutSessionId: string | null = null,
): Promise<{ id: string; url: string }> {
  const priceId = isExtraReport
    ? process.env.STRIPE_EXTRA_REPORT_PRICE_ID!
    : process.env.STRIPE_REPORT_PRICE_ID!;

  if (!priceId) throw new Error(`No price ID configured for ${isExtraReport ? 'extra' : 'single'} report`);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const session = await getStripe().checkout.sessions.create(
    {
      customer: customerId,
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/reports?id=${snapshotReportId}&unlocked=true`,
      cancel_url: `${appUrl}/reports?id=${snapshotReportId}`,
      metadata: {
        supabase_user_id: userId,
        report_id: snapshotReportId,
        type: 'report_purchase',
      },
    },
    {
      // Concurrent or retried route calls for the same checkout generation
      // receive one Stripe Session. When an unpaid session expires, its id
      // becomes the stable anchor for exactly one replacement generation.
      idempotencyKey: `report:${snapshotReportId}:${priorCheckoutSessionId ?? 'initial'}`,
    },
  );

  if (!session.url) throw new Error('Stripe report checkout returned no URL');

  return { id: session.id, url: session.url };
}

export async function retrieveReportCheckoutSession(
  sessionId: string,
): Promise<{
  id: string;
  url: string | null;
  status: Stripe.Checkout.Session.Status | null;
  paymentStatus: Stripe.Checkout.Session.PaymentStatus;
} | null> {
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    return {
      id: session.id,
      url: session.url,
      status: session.status,
      paymentStatus: session.payment_status,
    };
  } catch (error) {
    const missing = error !== null
      && typeof error === 'object'
      && 'code' in error
      && (error as { code?: unknown }).code === 'resource_missing';
    if (missing) return null;
    throw error;
  }
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

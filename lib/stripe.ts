import Stripe from 'stripe';

let _stripe: Stripe | null = null;

// Launch promo: auto-applied at checkout so users see the strikethrough price.
// Set STRIPE_LAUNCH_PROMO=promo_xxx (the promotion code API ID). Remove to disable.
const LAUNCH_PROMO = process.env.STRIPE_LAUNCH_PROMO || null;

// When a promo is active, we use `discounts` instead of `allow_promotion_codes`
// because Stripe doesn't allow both on the same checkout session.
function checkoutDiscountParams(): { discounts: { promotion_code: string }[] } | { allow_promotion_codes: true } {
  if (LAUNCH_PROMO) {
    return { discounts: [{ promotion_code: LAUNCH_PROMO }] };
  }
  return { allow_promotion_codes: true };
}

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

// Pro subscription checkout ($19.99/mo or $149.99/yr)
export async function createSubscriptionCheckoutSession(
  customerId: string,
  userId: string,
  interval: 'monthly' | 'annual' = 'monthly',
  /**
   * Optional Stripe promotion code ID (e.g. 'promo_1Abc...') to auto-apply
   * to this session. When provided, overrides checkoutDiscountParams() and
   * the user sees the discount already applied on Stripe's hosted page.
   * Callers are expected to have already resolved slug -> ID server-side
   * (e.g. via PROMO_CODE_MAP in /api/checkout) so untrusted client input
   * never reaches this function directly.
   */
  promoCodeId?: string
): Promise<string> {
  const priceId = interval === 'annual'
    ? process.env.STRIPE_PRO_ANNUAL_PRICE_ID!
    : process.env.STRIPE_PRO_PRICE_ID!;

  if (!priceId) throw new Error(`No price ID configured for Pro ${interval}`);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // If a specific promo code was resolved for this session, use it.
  // Otherwise fall back to the global launch promo / allow_promotion_codes.
  const discountParams = promoCodeId
    ? { discounts: [{ promotion_code: promoCodeId }] }
    : checkoutDiscountParams();

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    ...discountParams,
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
    ...checkoutDiscountParams(),
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

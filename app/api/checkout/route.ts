import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import { getOrCreateCustomer, createSubscriptionCheckoutSession, createReportCheckoutSession, isStripeConfigured } from '@/lib/stripe';
import type { Profile } from '@/types';
import { logErrorServer } from '@/lib/log-error-server';

/**
 * Map of public-facing promo slugs to their Stripe promotion code IDs.
 *
 * The slug is what appears in URLs like /pricing?promo=producthunt — we
 * deliberately never accept a raw Stripe ID from the client so untrusted
 * input can't target arbitrary coupons.
 *
 * To add a new promo:
 *   1. Create the coupon + promotion code in the Stripe dashboard
 *   2. Copy the promotion code ID (starts with "promo_")
 *   3. Set STRIPE_PROMO_<SLUG>_ID in Vercel env vars
 *   4. Add an entry here mapping the URL slug to the env var
 */
const PROMO_CODE_MAP: Record<string, string | undefined> = {
  producthunt: process.env.STRIPE_PROMO_PRODUCTHUNT_ID,
};

function resolvePromoSlug(slug: unknown): string | undefined {
  if (typeof slug !== 'string' || !slug) return undefined;
  const normalized = slug.toLowerCase().trim();
  const id = PROMO_CODE_MAP[normalized];
  return id || undefined;
}

export async function POST(request: Request) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'Payments are not configured yet.' }, { status: 503 });
    }
    const { supabase, user, error: authError } = await getAuthenticatedClient(request);

    if (authError || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, interval, snapshotReportId, promoSlug } = body;

    if (type !== 'subscription' && type !== 'report') {
      return NextResponse.json({ error: 'Invalid checkout type. Must be "subscription" or "report".' }, { status: 400 });
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const typedProfile = profile as Profile;

    // Get or create Stripe customer.
    //
    // `created: true` covers two cases — the user had no stored ID,
    // OR the stored ID failed `customers.retrieve` because it lived
    // in test mode while we now run with a live key (or the customer
    // was deleted in the dashboard). In both cases we just minted a
    // fresh live-mode customer and need to overwrite the stale row,
    // otherwise the very next click hits the same error.
    const { customerId, created } = await getOrCreateCustomer(
      typedProfile.email,
      user.id,
      typedProfile.stripe_customer_id
    );

    if (created) {
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    let url: string;

    if (type === 'subscription') {
      const subInterval = interval || 'monthly';
      // Resolve the promo slug to a Stripe promotion code ID. Promo codes
      // are explicitly scoped to monthly plans per the backlog spec — annual
      // plan framing stays "4.5 months free" and doesn't double-dip with
      // additional discounts.
      const promoCodeId =
        subInterval === 'monthly' ? resolvePromoSlug(promoSlug) : undefined;
      url = await createSubscriptionCheckoutSession(
        customerId,
        user.id,
        subInterval,
        promoCodeId
      );
    } else {
      // Report purchase
      if (!snapshotReportId) {
        return NextResponse.json({ error: 'snapshotReportId is required for report purchases' }, { status: 400 });
      }

      // Verify the snapshot belongs to this user
      const { data: report } = await supabase
        .from('autopsy_reports')
        .select('id, user_id, report_type, is_paid')
        .eq('id', snapshotReportId)
        .eq('user_id', user.id)
        .single();

      if (!report) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }

      if (report.is_paid) {
        return NextResponse.json({ error: 'This report has already been unlocked' }, { status: 400 });
      }

      // Pro users buying extra reports get the $4.99 price
      const isExtraReport = typedProfile.subscription_tier === 'pro';
      url = await createReportCheckoutSession(customerId, user.id, snapshotReportId, isExtraReport);
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Checkout error:', error);
    logErrorServer(error, { path: '/api/checkout' });

    // Friendlier server-side error messages. Card declined and session
    // expired both happen on Stripe-hosted checkout (not in this route),
    // but Stripe API / network failures DO hit here and we want the
    // user to see something better than a raw error string.
    const rawMessage = error instanceof Error ? error.message : String(error);
    const lower = rawMessage.toLowerCase();
    // Duck-type Stripe SDK errors. `instanceof Stripe.errors.StripeError`
    // would be cleaner but pulls the SDK's class hierarchy into this
    // route bundle for one check; the `type: 'Stripe…'` shape is part
    // of Stripe's stable error contract and matches every error class
    // they throw (StripeInvalidRequestError, StripeAPIError,
    // StripeAuthenticationError, etc.).
    const stripeType =
      error !== null && typeof error === 'object' && 'type' in error
        ? (error as { type?: unknown }).type
        : undefined;
    const isStripeError =
      typeof stripeType === 'string' && stripeType.startsWith('Stripe');
    let userMessage: string;
    let status = 500;

    if (
      lower.includes('econnrefused') ||
      lower.includes('econnreset') ||
      lower.includes('etimedout') ||
      lower.includes('network') ||
      lower.includes('fetch failed')
    ) {
      userMessage = 'Payment service is temporarily unreachable. Please try again in a moment.';
      status = 503;
    } else if (isStripeError || lower.includes('stripe')) {
      // Stripe API error from our side (misconfigured key, missing
      // price/customer, etc.). Logged in full above for support
      // triage; user just sees the soft message.
      userMessage = "We couldn't start checkout right now. Please try again or contact support if the problem persists.";
    } else {
      userMessage = 'Checkout failed. Please try again or contact support if the problem persists.';
    }

    return NextResponse.json({ error: userMessage }, { status });
  }
}

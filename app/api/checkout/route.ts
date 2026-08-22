import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import {
  getOrCreateCustomer,
  createSubscriptionCheckoutSession,
  createReportCheckoutSession,
  retrieveReportCheckoutSession,
  isStripeConfigured,
} from '@/lib/stripe';
import type { Profile } from '@/types';
import { logErrorServer } from '@/lib/log-error-server';
import { createServiceRoleClient } from '@/lib/supabase-server';

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
    const { type, interval, snapshotReportId } = body;

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
      const serviceRole = createServiceRoleClient();
      const { error: customerPersistError } = await serviceRole
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
      if (customerPersistError) {
        throw new Error(`Failed to save Stripe customer: ${customerPersistError.message}`);
      }
    }

    let url: string;

    if (type === 'subscription') {
      const subInterval = interval || 'monthly';
      url = await createSubscriptionCheckoutSession(
        customerId,
        user.id,
        subInterval
      );
    } else {
      // Report purchase
      if (!snapshotReportId) {
        return NextResponse.json({ error: 'snapshotReportId is required for report purchases' }, { status: 400 });
      }

      // Verify the snapshot belongs to this user
      const { data: report } = await supabase
        .from('autopsy_reports')
        .select('id, user_id, report_type, is_paid, analyzed_bet_ids, analyzed_bets_snapshot, analyzed_upload_ids')
        .eq('id', snapshotReportId)
        .eq('user_id', user.id)
        .single();

      if (!report) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }

      if (report.report_type !== 'snapshot') {
        return NextResponse.json({ error: 'Only snapshot reports can be unlocked.' }, { status: 400 });
      }

      const exactBetIds = report.analyzed_bet_ids as string[] | null;
      const frozenBets = report.analyzed_bets_snapshot as unknown[] | null;
      const legacyUploadIds = report.analyzed_upload_ids as string[] | null;
      if (
        (!Array.isArray(frozenBets) || frozenBets.length === 0)
        &&
        (!Array.isArray(exactBetIds) || exactBetIds.length === 0)
        && (!Array.isArray(legacyUploadIds) || legacyUploadIds.length === 0)
      ) {
        return NextResponse.json(
          { error: 'This older snapshot cannot be unlocked safely. Run a new free snapshot first.' },
          { status: 409 },
        );
      }

      const { count: existingChildCount } = await supabase
        .from('autopsy_reports')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('upgraded_from_snapshot_id', snapshotReportId);

      if (report.is_paid || (existingChildCount ?? 0) > 0) {
        return NextResponse.json({ error: 'This report has already been unlocked' }, { status: 400 });
      }

      const { data: fulfillment, error: fulfillmentError } = await supabase
        .from('report_fulfillments')
        .select('status, paid_at, checkout_session_id')
        .eq('snapshot_report_id', snapshotReportId)
        .maybeSingle();
      if (fulfillmentError) {
        throw new Error(`Failed to read report checkout state: ${fulfillmentError.message}`);
      }
      if (!fulfillment) {
        return NextResponse.json(
          { error: 'This snapshot is not ready for checkout. Run a new free snapshot first.' },
          { status: 409 },
        );
      }
      if (fulfillment.paid_at || fulfillment.status !== 'unpaid') {
        return NextResponse.json(
          { error: 'Payment was already received for this report.' },
          { status: 409 },
        );
      }

      const priorCheckoutSessionId = typeof fulfillment.checkout_session_id === 'string'
        ? fulfillment.checkout_session_id
        : null;
      if (priorCheckoutSessionId) {
        const priorSession = await retrieveReportCheckoutSession(priorCheckoutSessionId);
        if (priorSession?.paymentStatus === 'paid' || priorSession?.status === 'complete') {
          return NextResponse.json(
            { error: 'Payment was received and your report is being prepared.' },
            { status: 409 },
          );
        }
        if (priorSession?.status === 'open' && priorSession.url) {
          return NextResponse.json({ url: priorSession.url });
        }
      }

      // Pro users buying extra reports get the $4.99 price
      const isExtraReport = typedProfile.subscription_tier === 'pro';
      const checkout = await createReportCheckoutSession(
        customerId,
        user.id,
        snapshotReportId,
        isExtraReport,
        priorCheckoutSessionId,
      );

      const serviceRole = createServiceRoleClient();
      const { error: persistCheckoutError } = await serviceRole
        .from('report_fulfillments')
        .update({ checkout_session_id: checkout.id, updated_at: new Date().toISOString() })
        .eq('snapshot_report_id', snapshotReportId)
        .eq('status', 'unpaid')
        .is('paid_at', null);
      if (persistCheckoutError) {
        throw new Error(`Failed to persist report checkout: ${persistCheckoutError.message}`);
      }
      url = checkout.url;
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

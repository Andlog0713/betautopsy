import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getOrCreateCustomer, createSubscriptionCheckoutSession, createReportCheckoutSession, isStripeConfigured } from '@/lib/stripe';
import type { Profile } from '@/types';
import { logErrorServer } from '@/lib/log-error-server';

export async function POST(request: Request) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'Payments are not configured yet.' }, { status: 503 });
    }
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
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

    // Get or create Stripe customer
    const customerId = await getOrCreateCustomer(
      typedProfile.email,
      user.id,
      typedProfile.stripe_customer_id
    );

    // Save customer ID if new
    if (!typedProfile.stripe_customer_id) {
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    let url: string;

    if (type === 'subscription') {
      url = await createSubscriptionCheckoutSession(customerId, user.id, interval || 'monthly');
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
    } else if (lower.includes('stripe')) {
      // Stripe API error from our side (misconfigured key, missing price, etc.)
      userMessage = "We couldn't start checkout right now. Please try again or contact support if the problem persists.";
    } else {
      userMessage = 'Checkout failed. Please try again or contact support if the problem persists.';
    }

    return NextResponse.json({ error: userMessage }, { status });
  }
}

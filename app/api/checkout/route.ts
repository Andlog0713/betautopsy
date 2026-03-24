import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getOrCreateCustomer, createCheckoutSession, isStripeConfigured } from '@/lib/stripe';
import type { Profile } from '@/types';

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

    const { tier } = await request.json();

    if (tier !== 'pro' && tier !== 'sharp') {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
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

    // Create checkout session
    const url = await createCheckoutSession(customerId, tier, user.id);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Checkout error:', error);
    const message = error instanceof Error ? error.message : 'Checkout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import { createCustomerPortalSession } from '@/lib/stripe';
import { logErrorServer } from '@/lib/log-error-server';
import type { Profile } from '@/types';

export async function POST(request: Request) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedClient(request);

    if (authError || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const typedProfile = profile as Profile;

    if (!typedProfile.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 400 });
    }

    const url = await createCustomerPortalSession(typedProfile.stripe_customer_id);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Billing portal error:', error);
    logErrorServer(error, { path: '/api/billing' });
    const message = error instanceof Error ? error.message : 'Billing portal failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import * as Sentry from "@sentry/nextjs";
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import { validateOutcomeRequest } from '@/lib/check-in-scorer';

// Phase 3 outcome endpoint. iOS Phase 3 POSTs the user's actual decision
// (placed_anyway / waited / placed_bet) after a /api/check-in response.
// RLS makes "doesn't exist" and "belongs to a different user"
// indistinguishable at the SQL level — both surface as count === 0, which
// we map to 404 to avoid information leakage about row ownership.

export async function POST(request: Request) {
  let authResult;
  try {
    authResult = await getAuthenticatedClient(request);
  } catch (err) {
    console.error('[check-in/outcome] auth failed:', err);
    Sentry.captureException(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
  const { supabase, user, error: authError } = authResult;
  if (authError || !user || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validated = validateOutcomeRequest(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  Sentry.addBreadcrumb({
    category: 'db',
    level: 'info',
    message: 'pre_bet_checkins UPDATE attempt',
    data: {
      user_id: user.id,
      check_in_id: validated.value.checkInId,
      outcome: validated.value.outcome,
    },
  });

  try {
    const { error: updateError, count } = await supabase
      .from('pre_bet_checkins')
      .update(
        { outcome: validated.value.outcome, outcome_at: new Date().toISOString() },
        { count: 'exact' },
      )
      .eq('id', validated.value.checkInId);

    if (updateError) {
      console.error('[check-in/outcome] UPDATE failed:', updateError);
      Sentry.captureException(updateError);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    if (count === 0) {
      return NextResponse.json({ error: 'Check-in not found' }, { status: 404 });
    }

    return NextResponse.json({}, { status: 200 });
  } catch (err) {
    console.error('[check-in/outcome] UPDATE threw:', err);
    Sentry.captureException(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

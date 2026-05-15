import { NextResponse } from 'next/server';
import * as Sentry from "@sentry/nextjs";
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import { scoreCheckIn, validateCheckInRequest } from '@/lib/check-in-scorer';

// Pure compute. Sub-second response. Reads from Supabase, no writes Phase 1.
// Wire format is locked by iOS PreBetCheckInModels.swift — do not rename
// fields. Phase 2 of the iOS prebet feature swaps its MockedPreBetScorer
// for this endpoint.

export async function POST(request: Request) {
  let authResult;
  try {
    authResult = await getAuthenticatedClient(request);
  } catch (err) {
    console.error('[check-in] auth failed:', err);
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

  const validated = validateCheckInRequest(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const response = await scoreCheckIn(validated.value, user.id, supabase);

    Sentry.addBreadcrumb({
      category: 'db',
      level: 'info',
      message: 'pre_bet_checkins INSERT attempt',
      data: {
        user_id: user.id,
        score: response.betQualityScore,
        flag_count: response.flags.length,
        recommendation: response.recommendation,
      },
    });

    const { data: inserted, error: insertError } = await supabase
      .from('pre_bet_checkins')
      .insert({
        user_id: user.id,
        sport: validated.value.sport,
        stake: validated.value.stake,
        odds: validated.value.odds,
        bet_type: validated.value.betType,
        placed_at: validated.value.placedAt,
        local_hour: validated.value.localHour ?? null,
        bet_quality_score: response.betQualityScore,
        flag_count: response.flags.length,
        recommendation: response.recommendation,
        flags: response.flags,
        summary: response.summary,
      })
      .select('id')
      .single();

    if (insertError || !inserted) {
      console.error('[check-in] INSERT failed:', insertError);
      Sentry.captureException(insertError ?? new Error('pre_bet_checkins INSERT returned no row'));
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    return NextResponse.json({ checkInId: inserted.id, ...response });
  } catch (err) {
    console.error('[check-in] scorer failed:', err);
    Sentry.captureException(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

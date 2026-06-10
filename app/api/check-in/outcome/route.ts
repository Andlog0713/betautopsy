import { NextResponse } from 'next/server';
import * as Sentry from "@sentry/nextjs";
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import { validateOutcomeRequest } from '@/lib/check-in-scorer';
import type { RiskEvent } from '@/types';

// Outcome endpoint. iOS/web POST the user's actual decision
// (placed_anyway / waited / placed_bet) after a /api/check-in response.
// We select the updated row back so override handling can inspect the saved
// decision context without doing a second round-trip.

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
    const { data: updatedRow, error: updateError } = await supabase
      .from('pre_bet_checkins')
      .update(
        {
          outcome: validated.value.outcome,
          outcome_at: new Date().toISOString(),
          override_reason: validated.value.overrideReason ?? null,
        },
      )
      .eq('id', validated.value.checkInId)
      .select('id, context')
      .maybeSingle();

    if (updateError) {
      console.error('[check-in/outcome] UPDATE failed:', updateError);
      Sentry.captureException(updateError);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    if (!updatedRow) {
      return NextResponse.json({ error: 'Check-in not found' }, { status: 404 });
    }

    if (validated.value.outcome === 'placed_anyway') {
      try {
        const context = (updatedRow.context && typeof updatedRow.context === 'object')
          ? updatedRow.context as Record<string, unknown>
          : {};
        const cooldownContext = (context.cooldown && typeof context.cooldown === 'object')
          ? context.cooldown as Record<string, unknown>
          : null;
        const actionGate = typeof context.actionGate === 'string' ? context.actionGate : null;

        if (actionGate === 'blocked' || cooldownContext?.active === true) {
          const { data: recentOverrideRows } = await supabase
            .from('risk_events')
            .select('*')
            .eq('user_id', user.id)
            .eq('event_type', 'cooldown_override')
            .order('event_at', { ascending: false })
            .limit(10);

          const recurrenceCount = ((recentOverrideRows ?? []) as RiskEvent[]).filter(
            (event) => Date.now() - new Date(event.event_at).getTime() <= 14 * 24 * 60 * 60 * 1000,
          ).length + 1;

          const { error: riskInsertError } = await supabase
            .from('risk_events')
            .insert({
              user_id: user.id,
              check_in_id: validated.value.checkInId,
              event_type: 'cooldown_override',
              severity: recurrenceCount >= 2 ? 'critical' : 'high',
              summary: 'Cooldown override',
              detail: validated.value.overrideReason
                ? `User placed anyway: ${validated.value.overrideReason}`
                : 'User placed anyway during a blocked check-in.',
              recurrence_count: recurrenceCount,
              window_days: 14,
              metadata: { actionGate, overrideReason: validated.value.overrideReason ?? null },
            });
          if (riskInsertError) {
            Sentry.captureException(riskInsertError);
          }

          if (typeof cooldownContext?.cooldownId === 'string') {
            const { error: cooldownUpdateError } = await supabase
              .from('cooldowns')
              .update({
                status: 'broken',
                broken_at: new Date().toISOString(),
                override_reason: validated.value.overrideReason ?? null,
              })
              .eq('id', cooldownContext.cooldownId);
            if (cooldownUpdateError) {
              Sentry.captureException(cooldownUpdateError);
            }
          }
        }
      } catch (secondaryError) {
        Sentry.captureException(secondaryError);
      }
    }

    return NextResponse.json({}, { status: 200 });
  } catch (err) {
    console.error('[check-in/outcome] UPDATE threw:', err);
    Sentry.captureException(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import * as Sentry from "@sentry/nextjs";
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import { scoreCheckIn, validateCheckInRequest } from '@/lib/check-in-scorer';
import {
  buildCooldownDraftFromEvaluation,
  buildRiskEventDraftsFromCheckIn,
} from '@/lib/control-system';
import type { RiskEvent } from '@/types';

type ErrorLike = { code?: string; message?: string };

function isErrorLike(value: unknown): value is ErrorLike {
  return Boolean(value) && typeof value === 'object';
}

function isMissingPreBetCheckinsColumnError(error: unknown, column: string): boolean {
  if (!isErrorLike(error)) return false;
  const code = typeof error.code === 'string' ? error.code : '';
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  const normalizedColumn = column.toLowerCase();

  return code === '42703' && message.includes(normalizedColumn)
    || message.includes(`pre_bet_checkins.${normalizedColumn}`)
    || message.includes(`column "${normalizedColumn}"`)
    || message.includes(`${normalizedColumn} does not exist`);
}

// Deterministic pre-bet gate. Reads the latest report + live control-system
// state, writes a persisted check-in record, and logs follow-on risk context
// when the user is entering a risky window. Existing iOS clients rely on the
// original fields, so changes here are additive only.

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
    const evaluation = {
      actionGate: response.actionGate ?? 'clear',
      ruleViolations: response.ruleViolations ?? [],
      cooldown: response.cooldown ?? null,
      recentRiskContext: response.recentRiskContext ?? [],
      planContext: response.planContext ?? null,
      reflectionPrompts: response.reflectionPrompts ?? [],
      overrideRequired: response.overrideRequired ?? false,
    };

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

    const insertPayload = {
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
    };
    const contextPayload = {
      actionGate: response.actionGate ?? null,
      ruleViolations: response.ruleViolations ?? [],
      cooldown: response.cooldown ?? null,
      recentRiskContext: response.recentRiskContext ?? [],
      planContext: response.planContext ?? null,
      reflectionPrompts: response.reflectionPrompts ?? [],
      overrideRequired: response.overrideRequired ?? false,
      reflection: validated.value.reflection ?? null,
    };

    let insertResult = await supabase
      .from('pre_bet_checkins')
      .insert({
        ...insertPayload,
        context: contextPayload,
      })
      .select('id')
      .single();

    if (isMissingPreBetCheckinsColumnError(insertResult.error, 'context')) {
      insertResult = await supabase
        .from('pre_bet_checkins')
        .insert(insertPayload)
        .select('id')
        .single();
    }

    const { data: inserted, error: insertError } = insertResult;

    if (insertError || !inserted) {
      console.error('[check-in] INSERT failed:', insertError);
      Sentry.captureException(insertError ?? new Error('pre_bet_checkins INSERT returned no row'));
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    try {
      const { data: recentRiskRows } = await supabase
        .from('risk_events')
        .select('*')
        .eq('user_id', user.id)
        .order('event_at', { ascending: false })
        .limit(20);

      const drafts = buildRiskEventDraftsFromCheckIn({
        flags: response.flags,
        evaluation,
        riskEvents: ((recentRiskRows ?? []) as RiskEvent[]),
      });

      if (drafts.length > 0) {
        const { error: riskInsertError } = await supabase
          .from('risk_events')
          .insert(drafts.map((draft) => ({
            user_id: user.id,
            check_in_id: inserted.id,
            event_type: draft.event_type,
            severity: draft.severity,
            summary: draft.summary,
            detail: draft.detail,
            recurrence_count: draft.recurrence_count,
            window_days: draft.window_days,
            rule_id: draft.rule_id ?? null,
            metadata: draft.metadata ?? {},
          })));
        if (riskInsertError) {
          Sentry.captureException(riskInsertError);
        }
      }

      const cooldownDraft = buildCooldownDraftFromEvaluation(evaluation, validated.value);
      if (cooldownDraft) {
        const { error: cooldownInsertError } = await supabase
          .from('cooldowns')
          .insert({
            user_id: user.id,
            rule_id: cooldownDraft.rule_id ?? null,
            trigger_type: cooldownDraft.trigger_type,
            trigger_reason: cooldownDraft.trigger_reason,
            user_explanation: cooldownDraft.user_explanation,
            expires_at: cooldownDraft.expires_at,
            status: 'active',
          });
        if (cooldownInsertError) {
          Sentry.captureException(cooldownInsertError);
        }
      }
    } catch (secondaryError) {
      Sentry.captureException(secondaryError);
    }

    return NextResponse.json({ checkInId: inserted.id, ...response });
  } catch (err) {
    console.error('[check-in] scorer failed:', err);
    Sentry.captureException(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

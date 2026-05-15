import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import {
  CHECK_IN_SPORTS,
  CHECK_IN_BET_TYPES,
  type PreBetCheckInRequest,
  type PreBetCheckInResponse,
} from '@/types';

// Pure compute. Sub-second response. Reads from Supabase, no writes Phase 1.
// Wire format is locked by iOS PreBetCheckInModels.swift — do not rename
// fields. Phase 2 of the iOS prebet feature swaps its MockedPreBetScorer
// for this endpoint.

const SPORT_SET: ReadonlySet<string> = new Set(CHECK_IN_SPORTS);
const BET_TYPE_SET: ReadonlySet<string> = new Set(CHECK_IN_BET_TYPES);

type ValidationOk = { ok: true; value: PreBetCheckInRequest };
type ValidationErr = { ok: false; error: string };

function validateRequest(raw: unknown): ValidationOk | ValidationErr {
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, error: 'Body must be a JSON object' };
  }
  const r = raw as Record<string, unknown>;

  const sport = r.sport;
  if (typeof sport !== 'string' || !SPORT_SET.has(sport)) {
    return { ok: false, error: 'sport must be one of: ' + CHECK_IN_SPORTS.join(', ') };
  }

  const stake = r.stake;
  if (typeof stake !== 'number' || !Number.isFinite(stake) || stake <= 0) {
    return { ok: false, error: 'stake must be a positive number' };
  }

  const odds = r.odds;
  if (typeof odds !== 'number' || !Number.isInteger(odds) || odds === 0) {
    return { ok: false, error: 'odds must be a non-zero integer (American odds)' };
  }

  const betType = r.betType;
  if (typeof betType !== 'string' || !BET_TYPE_SET.has(betType)) {
    return { ok: false, error: 'betType must be one of: ' + CHECK_IN_BET_TYPES.join(', ') };
  }

  const placedAt = r.placedAt;
  if (typeof placedAt !== 'string' || Number.isNaN(Date.parse(placedAt))) {
    return { ok: false, error: 'placedAt must be an ISO 8601 datetime string' };
  }

  return {
    ok: true,
    value: { sport, stake, odds, betType, placedAt },
  };
}

export async function POST(request: Request) {
  let authResult;
  try {
    authResult = await getAuthenticatedClient(request);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
  const { user, error: authError } = authResult;
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validated = validateRequest(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  // Stub response for Commit 1. Commit 2 wires lib/check-in-scorer.ts.
  const response: PreBetCheckInResponse = {
    betQualityScore: 60,
    flags: [],
    recommendation: 'place_bet',
    summary: 'Baseline response. Scorer wiring lands in commit 2.',
  };

  return NextResponse.json(response);
}

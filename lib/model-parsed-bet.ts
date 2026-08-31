import type { ParsedBet } from '@/types';
import {
  parsedBetValidationError,
} from '@/lib/parsed-bet-validation';
import { parseSourcedTimestamp } from '@/lib/temporal-provenance';

const RESULT_ALIASES: Record<string, ParsedBet['result']> = {
  win: 'win',
  won: 'win',
  w: 'win',
  hit: 'win',
  cashed: 'win',
  loss: 'loss',
  lost: 'loss',
  l: 'loss',
  miss: 'loss',
  missed: 'loss',
  push: 'push',
  tie: 'push',
  draw: 'push',
  refund: 'push',
  void: 'void',
  voided: 'void',
  cancelled: 'void',
  canceled: 'void',
  'no action': 'void',
  pending: 'pending',
  open: 'pending',
  unsettled: 'pending',
};

export interface NormalizeExtractedBetOptions {
  sportsbookHint?: string;
}

export type NormalizeExtractedBetResult =
  | { bet: ParsedBet; error: null }
  | { bet: null; error: string };

function nonemptyString(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  return value.trim();
}

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeOdds(value: unknown): number | null {
  const raw = finiteNumber(value);
  if (raw === null || raw === 0) return null;
  if (raw > 1 && raw < 100 && !Number.isInteger(raw)) {
    return raw >= 2
      ? Math.round((raw - 1) * 100)
      : Math.round(-100 / (raw - 1));
  }
  return Number.isInteger(raw) ? raw : null;
}

function normalizeResult(value: unknown): ParsedBet['result'] | null {
  const raw = nonemptyString(value);
  return raw ? RESULT_ALIASES[raw.toLowerCase()] ?? null : null;
}

function optionalString(value: unknown): string | undefined {
  return nonemptyString(value) ?? undefined;
}

/**
 * Convert model-extracted source fields without inventing missing facts.
 * Required unknowns reject the row with a visible note. Payout is the only
 * derived value: it follows exactly from explicit stake, result, and profit.
 */
export function normalizeExtractedBet(
  value: unknown,
  options: NormalizeExtractedBetOptions = {},
): NormalizeExtractedBetResult {
  if (!value || typeof value !== 'object') return { bet: null, error: 'bet is not an object' };
  const raw = value as Record<string, unknown>;

  const timestamp = parseSourcedTimestamp(raw.placed_at ?? raw.date);
  if (!timestamp.value) return { bet: null, error: timestamp.error };

  const sport = nonemptyString(raw.sport);
  if (!sport) return { bet: null, error: 'sport is missing or unknown' };
  const betType = nonemptyString(raw.bet_type);
  if (!betType) return { bet: null, error: 'bet type is missing or unknown' };
  const description = nonemptyString(raw.description);
  if (!description) return { bet: null, error: 'description is missing or unknown' };

  const odds = normalizeOdds(raw.odds);
  if (odds === null) return { bet: null, error: 'odds are missing or invalid' };
  const stake = finiteNumber(raw.stake);
  if (stake === null || stake <= 0) return { bet: null, error: 'stake is missing or invalid' };
  const result = normalizeResult(raw.result);
  if (!result) return { bet: null, error: 'result is missing or unknown' };
  const profit = finiteNumber(raw.profit);
  if (profit === null) return { bet: null, error: 'profit is missing or invalid' };
  if ((result === 'push' || result === 'void') && profit !== 0) {
    return { bet: null, error: `${result} result has nonzero profit` };
  }
  if (typeof raw.is_bonus_bet !== 'boolean') {
    return { bet: null, error: 'bonus-bet status is missing or unknown' };
  }

  const explicitPayout = finiteNumber(raw.payout);
  const deterministicPayout = result === 'win'
    ? stake + profit
    : result === 'push' || result === 'void'
      ? stake
      : result === 'loss'
        ? 0
        : null;
  if (result === 'pending' && explicitPayout === null) {
    return { bet: null, error: 'pending payout is missing or unknown' };
  }
  if (
    explicitPayout !== null
    && deterministicPayout !== null
    && Math.abs(explicitPayout - deterministicPayout) > 0.01
  ) {
    return { bet: null, error: 'explicit payout conflicts with settlement values' };
  }
  const payout = explicitPayout ?? deterministicPayout;
  if (payout === null) {
    return { bet: null, error: 'payout is missing or unknown' };
  }
  if (!Number.isFinite(payout) || payout < 0) {
    return { bet: null, error: 'explicit settlement values produce an invalid payout' };
  }

  const parlayLegsValue = finiteNumber(raw.parlay_legs);
  const parlayLegs = parlayLegsValue !== null && Number.isInteger(parlayLegsValue) && parlayLegsValue > 0
    ? parlayLegsValue
    : undefined;
  const sportsbook = optionalString(raw.sportsbook) ?? optionalString(options.sportsbookHint);

  const bet: ParsedBet = {
    ...timestamp.value,
    sport,
    league: optionalString(raw.league),
    bet_type: betType.toLowerCase(),
    description: description.slice(0, 500),
    odds,
    stake: Math.round(stake * 100) / 100,
    result,
    payout: Math.round(payout * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    sportsbook,
    is_bonus_bet: raw.is_bonus_bet,
    parlay_legs: parlayLegs,
    tags: Array.isArray(raw.tags)
      ? raw.tags.map(optionalString).filter((tag): tag is string => !!tag)
      : undefined,
    notes: optionalString(raw.notes),
    settlement_type: raw.settlement_type === 'cash_out' ? 'cash_out' : undefined,
  };

  const validationError = parsedBetValidationError(bet);
  return validationError
    ? { bet: null, error: validationError }
    : { bet, error: null };
}

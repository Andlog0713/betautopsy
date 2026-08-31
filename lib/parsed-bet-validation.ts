import type { ParsedBet } from '@/types';
import { parseSourcedTimestamp, temporalFieldsAgree } from '@/lib/temporal-provenance';

const RESULTS = new Set<ParsedBet['result']>(['win', 'loss', 'push', 'void', 'pending']);

export interface ExplicitTimestampResult {
  value: string | null;
  error: string;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Parse only timestamps whose clock time and timezone are both sourced. */
export function parseExplicitTimestamp(raw: unknown): ExplicitTimestampResult {
  const parsed = parseSourcedTimestamp(raw);
  if (!parsed.value) return { value: null, error: parsed.error };
  if (parsed.value.timestamp_quality === 'date_only') {
    return { value: null, error: `Date "${parsed.value.source_placed_at}" has no clock time` };
  }
  if (parsed.value.timestamp_quality === 'local_datetime') {
    return {
      value: null,
      error: `Timestamp "${parsed.value.source_placed_at}" has no timezone or UTC offset`,
    };
  }
  return { value: parsed.value.placed_at, error: '' };
}

/**
 * Validate a client-parsed bet without inventing values for required fields.
 * The caller can disclose and skip invalid rows, but must not normalize them
 * to database defaults because those defaults would become analytical facts.
 */
export function parsedBetValidationError(value: unknown): string | null {
  if (!value || typeof value !== 'object') return 'bet must be an object';

  const bet = value as Record<string, unknown>;
  const parsedTimestamp = parseSourcedTimestamp(bet.source_placed_at ?? bet.placed_at);
  if (!parsedTimestamp.value) return parsedTimestamp.error;
  if (!temporalFieldsAgree(bet, parsedTimestamp.value)) {
    return 'temporal provenance fields conflict with the source timestamp';
  }
  if (!isNonEmptyString(bet.sport)) return 'sport is required';
  if (!isNonEmptyString(bet.bet_type)) return 'bet_type is required';
  if (!isNonEmptyString(bet.description)) return 'description is required';
  if (typeof bet.odds !== 'number' || !Number.isInteger(bet.odds) || bet.odds === 0) {
    return 'odds must be finite nonzero American odds';
  }
  if (typeof bet.stake !== 'number' || !Number.isFinite(bet.stake) || bet.stake <= 0) {
    return 'stake must be a finite positive number';
  }
  if (!RESULTS.has(bet.result as ParsedBet['result'])) return 'result is invalid';
  if (typeof bet.payout !== 'number' || !Number.isFinite(bet.payout) || bet.payout < 0) {
    return 'payout must be a finite nonnegative number';
  }
  if (typeof bet.profit !== 'number' || !Number.isFinite(bet.profit)) {
    return 'profit must be a finite number';
  }
  if (typeof bet.is_bonus_bet !== 'boolean') return 'is_bonus_bet must be boolean';

  if (bet.league !== undefined && !isNonEmptyString(bet.league)) return 'league must be a nonempty string';
  if (bet.sportsbook !== undefined && !isNonEmptyString(bet.sportsbook)) {
    return 'sportsbook must be a nonempty string';
  }
  if (
    bet.parlay_legs !== undefined &&
    (!Number.isInteger(bet.parlay_legs) || (bet.parlay_legs as number) <= 0)
  ) {
    return 'parlay_legs must be a positive integer';
  }
  if (bet.tags !== undefined && (!Array.isArray(bet.tags) || !bet.tags.every(isNonEmptyString))) {
    return 'tags must contain only nonempty strings';
  }
  if (bet.notes !== undefined && typeof bet.notes !== 'string') return 'notes must be a string';
  if (
    bet.settlement_type !== undefined &&
    bet.settlement_type !== null &&
    bet.settlement_type !== 'cash_out'
  ) {
    return 'settlement_type is invalid';
  }

  if ((bet.result === 'push' || bet.result === 'void') && bet.profit !== 0) {
    return `${bet.result} result must have zero profit`;
  }

  return null;
}

export function isValidParsedBet(value: unknown): value is ParsedBet {
  return parsedBetValidationError(value) === null;
}

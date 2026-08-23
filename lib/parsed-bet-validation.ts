import type { ParsedBet } from '@/types';

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
  if (!isNonEmptyString(raw)) return { value: null, error: 'placed_at must be a valid timestamp' };

  const value = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { value: null, error: `Date "${value}" has no clock time` };
  }
  if (!/[T\s]\d{2}:\d{2}/.test(value)) {
    return { value: null, error: `Timestamp "${value}" has no valid clock time` };
  }
  if (!/(?:Z|[+-]\d{2}(?::?\d{2})?|UTC|GMT)$/i.test(value)) {
    return { value: null, error: `Timestamp "${value}" has no timezone or UTC offset` };
  }

  const calendarDate = /^(\d{4})-(\d{2})-(\d{2})[T\s]/.exec(value);
  if (calendarDate) {
    const year = Number(calendarDate[1]);
    const month = Number(calendarDate[2]);
    const day = Number(calendarDate[3]);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth) {
      return { value: null, error: `Timestamp "${value}" has an invalid calendar date` };
    }
  }

  const clockTime = /[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?/.exec(value);
  if (
    !clockTime ||
    Number(clockTime[1]) > 23 ||
    Number(clockTime[2]) > 59 ||
    Number(clockTime[3] ?? 0) > 59
  ) {
    return { value: null, error: `Timestamp "${value}" has an invalid clock time` };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { value: null, error: `Could not parse timestamp "${value}"` };
  }
  return { value: parsed.toISOString(), error: '' };
}

/**
 * Validate a client-parsed bet without inventing values for required fields.
 * The caller can disclose and skip invalid rows, but must not normalize them
 * to database defaults because those defaults would become analytical facts.
 */
export function parsedBetValidationError(value: unknown): string | null {
  if (!value || typeof value !== 'object') return 'bet must be an object';

  const bet = value as Record<string, unknown>;
  const parsedTimestamp = parseExplicitTimestamp(bet.placed_at);
  if (!parsedTimestamp.value) return parsedTimestamp.error;
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

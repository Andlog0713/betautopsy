import { describe, expect, it } from 'vitest';
import type { ParsedBet } from '@/types';
import { isValidParsedBet, parsedBetValidationError } from '@/lib/parsed-bet-validation';

function validBet(overrides: Partial<ParsedBet> = {}): ParsedBet {
  return {
    placed_at: '2026-01-01T12:00:00.000Z',
    sport: 'NFL',
    bet_type: 'spread',
    description: 'Chiefs -3.5',
    odds: -110,
    stake: 100,
    result: 'loss',
    payout: 0,
    profit: -100,
    is_bonus_bet: false,
    ...overrides,
  };
}

describe('client-parsed bet validation', () => {
  it('accepts an explicit zero instead of treating it as missing', () => {
    const bet = validBet({ result: 'push', profit: 0, payout: 100 });
    expect(isValidParsedBet(bet)).toBe(true);
  });

  it.each([
    ['placed_at', ''],
    ['placed_at', 'not-a-date'],
    ['placed_at', '2026-02-10'],
    ['placed_at', '2026-02-10T12:30:00'],
    ['sport', ''],
    ['bet_type', ''],
    ['description', ''],
    ['odds', 0],
    ['odds', Number.NaN],
    ['stake', Number.NaN],
    ['result', 'unknown'],
    ['payout', Number.NaN],
    ['profit', Number.NaN],
    ['is_bonus_bet', undefined],
  ])('rejects unknown or invalid %s instead of relying on a database default', (field, value) => {
    const bet = { ...validBet(), [field]: value };
    expect(isValidParsedBet(bet)).toBe(false);
    expect(parsedBetValidationError(bet)).toBeTruthy();
  });

  it('rejects a nonzero push profit instead of silently force-zeroing it', () => {
    const bet = validBet({ result: 'push', profit: 15, payout: 100 });
    expect(parsedBetValidationError(bet)).toContain('zero profit');
  });
});

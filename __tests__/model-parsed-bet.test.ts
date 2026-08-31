import { describe, expect, it } from 'vitest';
import { normalizeExtractedBet } from '@/lib/model-parsed-bet';

function validSource() {
  return {
    placed_at: '2026-08-22T19:15:00-04:00',
    sport: 'NFL',
    bet_type: 'spread',
    description: 'Chiefs -3.5',
    odds: -110,
    stake: 100,
    result: 'loss',
    profit: -100,
    sportsbook: 'DraftKings',
    is_bonus_bet: false,
  };
}

describe('normalizeExtractedBet', () => {
  it('accepts explicit source facts and derives only payout', () => {
    const normalized = normalizeExtractedBet(validSource());
    expect(normalized.error).toBeNull();
    expect(normalized.bet).toMatchObject({
      placed_at: '2026-08-22T23:15:00.000Z',
      odds: -110,
      stake: 100,
      result: 'loss',
      payout: 0,
      profit: -100,
    });
  });

  it.each([
    ['unknown odds', { odds: undefined }],
    ['unknown result', { result: 'maybe' }],
    ['unknown profit', { profit: undefined }],
    ['unknown sport', { sport: undefined }],
    ['unknown bet type', { bet_type: undefined }],
  ])('rejects %s instead of supplying a default', (_label, overrides) => {
    const normalized = normalizeExtractedBet({ ...validSource(), ...overrides });
    expect(normalized.bet).toBeNull();
    expect(normalized.error).toBeTruthy();
  });

  it('preserves a model-extracted date without adding a clock', () => {
    const normalized = normalizeExtractedBet({ ...validSource(), placed_at: '2026-08-22' });
    expect(normalized.error).toBeNull();
    expect(normalized.bet).toMatchObject({
      placed_at: null,
      source_placed_at: '2026-08-22',
      placed_date: '2026-08-22',
      placed_time: null,
      source_timezone: null,
      timestamp_quality: 'date_only',
    });
  });

  it('preserves a model-extracted local clock without adding a timezone', () => {
    const normalized = normalizeExtractedBet({ ...validSource(), placed_at: '2026-08-22T19:15:00' });
    expect(normalized.error).toBeNull();
    expect(normalized.bet).toMatchObject({
      placed_at: null,
      source_placed_at: '2026-08-22T19:15:00',
      placed_time: '19:15:00',
      source_timezone: null,
      timestamp_quality: 'local_datetime',
    });
  });

  it('rejects an explicit pending result when its payout is unknown', () => {
    const normalized = normalizeExtractedBet({
      ...validSource(),
      result: 'pending',
      profit: 0,
    });
    expect(normalized.bet).toBeNull();
    expect(normalized.error).toContain('payout is missing');
  });

  it('accepts an explicit pending payout without converting it to zero', () => {
    const normalized = normalizeExtractedBet({
      ...validSource(),
      result: 'pending',
      profit: 0,
      payout: 100,
    });
    expect(normalized.error).toBeNull();
    expect(normalized.bet?.payout).toBe(100);
  });

  it('rejects a payout that conflicts with the explicit settlement facts', () => {
    const normalized = normalizeExtractedBet({
      ...validSource(),
      payout: 50,
    });
    expect(normalized.bet).toBeNull();
    expect(normalized.error).toContain('conflicts');
  });
});

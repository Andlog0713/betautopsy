import { describe, it, expect } from 'vitest';
import { calculateMetrics } from '@/lib/autopsy-engine';
import type { Bet } from '@/types';
import { markFixtureTimestampAsSourced } from './helpers/known-instant';

// Guards the timing_analysis wire contract, distinct from
// late-night-gating.test.ts (which covers the qualitative late-night BIAS
// detector, a separate code path PR #80 already fixed). This covers
// calculateTiming()'s has_time_data gate and the three fields it must
// control: best_window, worst_window, and source_clock_window_stats.
//
// Two bugs fixed together here:
//   1. At least 95% of settled bets must have sourced clock data. Date-only
//      and legacy rows stay out of the numerator without using midnight as a
//      proxy for missing time.
//   2. Compute-then-hide: best_window/worst_window/source-clock stats used
//      to ship fully computed even when has_time_data was false, relying
//      entirely on a client-side `&&` check to keep them off screen. They
//      must now be null in the engine's own return value whenever the
//      gate fails - not just correctly hidden by one caller.
// A genuine sourced midnight is valid clock data and remains in hour 0.

function makeBet(overrides: Partial<Bet> = {}): Bet {
  return markFixtureTimestampAsSourced({
    id: `b-${Math.random().toString(36).slice(2, 10)}`,
    user_id: 'user-test',
    placed_at: '2025-03-15T14:00:00Z',
    sport: 'NFL',
    league: 'NFL',
    bet_type: 'spread',
    description: 'test bet',
    odds: -110,
    stake: 100,
    result: 'loss',
    payout: 0,
    profit: -100,
    sportsbook: 'DraftKings',
    is_bonus_bet: false,
    parlay_legs: null,
    tags: null,
    notes: null,
    upload_id: 'upload-test',
    created_at: '2025-03-15T14:00:00Z',
    ...overrides,
  });
}

function betAt(day: number, hour: number, minute = 0, result: 'win' | 'loss' = 'loss'): Bet {
  const d = new Date(Date.UTC(2024, 0, 1 + day, hour, minute, 0));
  return makeBet({
    placed_at: d.toISOString(),
    source_placed_at: d.toISOString(),
    placed_date: d.toISOString().slice(0, 10),
    placed_time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
    source_timezone: 'Z',
    timestamp_quality: 'instant',
    created_at: d.toISOString(),
    result,
    profit: result === 'win' ? 90 : -100,
  });
}

function dateOnlyBet(day: number): Bet {
  const date = new Date(Date.UTC(2024, 0, 1 + day)).toISOString().slice(0, 10);
  return makeBet({
    placed_at: null,
    source_placed_at: date,
    placed_date: date,
    placed_time: null,
    source_timezone: null,
    timestamp_quality: 'date_only',
  });
}

describe('timing_analysis has_time_data gate', () => {
  it('is false at the population-average midnight rate (65.9%) - the old 0.8 threshold would have passed this', () => {
    const midnightBets = Array.from({ length: 66 }, (_, i) => dateOnlyBet(i));
    const realBets = Array.from({ length: 34 }, (_, i) => betAt(i + 100, 14, 30));
    const metrics = calculateMetrics([...midnightBets, ...realBets]);

    expect(metrics.timing.has_time_data).toBe(false);
  });

  it('is true only once real-timestamp coverage clears 95%', () => {
    const midnightBets = Array.from({ length: 4 }, (_, i) => dateOnlyBet(i));
    const realBets = Array.from({ length: 96 }, (_, i) => betAt(i + 10, 14, 30));
    const metrics = calculateMetrics([...midnightBets, ...realBets]);

    expect(metrics.timing.has_time_data).toBe(true);
  });

  it('nulls best_window, worst_window, and late_night_stats at the engine level when the gate fails, not just relying on a caller to hide them', () => {
    const midnightBets = Array.from({ length: 66 }, (_, i) => dateOnlyBet(i));
    const realBets = Array.from({ length: 34 }, (_, i) => betAt(i + 100, 14, 30));
    const metrics = calculateMetrics([...midnightBets, ...realBets]);

    expect(metrics.timing.has_time_data).toBe(false);
    expect(metrics.timing.best_window).toBeNull();
    expect(metrics.timing.worst_window).toBeNull();
    expect(metrics.timing.late_night_stats).toBeNull();
    expect(metrics.timing.source_clock_window_stats).toBeNull();
  });

  it('counts a genuine sourced midnight as real source-clock data', () => {
    const midnightLosers = Array.from({ length: 4 }, (_, i) => betAt(i, 0, 0, 'loss'));
    const realBets = Array.from({ length: 96 }, (_, i) => betAt(i + 10, 14, 30, 'win'));
    const metrics = calculateMetrics([...midnightLosers, ...realBets]);

    expect(metrics.timing.has_time_data).toBe(true);
    expect(metrics.timing.late_night_stats).toBeNull();
    expect(metrics.timing.source_clock_window_stats?.count).toBe(4);
  });

  it('discloses a source-clock window without claiming it is local time', () => {
    const lateBets = Array.from({ length: 20 }, (_, i) => betAt(i, 2, 15, 'loss'));
    const dayBets = Array.from({ length: 80 }, (_, i) => betAt(i + 30, 14, 30, 'win'));
    const metrics = calculateMetrics([...lateBets, ...dayBets]);

    expect(metrics.timing.has_time_data).toBe(true);
    expect(metrics.timing.local_time_confirmed).toBe(false);
    expect(metrics.timing.late_night_stats).toBeNull();
    expect(metrics.timing.source_clock_window_stats?.count).toBeGreaterThanOrEqual(3);
  });
});

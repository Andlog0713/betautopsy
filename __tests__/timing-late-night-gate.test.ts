import { describe, it, expect } from 'vitest';
import { calculateMetrics } from '@/lib/autopsy-engine';
import type { Bet } from '@/types';

// Guards the timing_analysis wire contract, distinct from
// late-night-gating.test.ts (which covers the qualitative late-night BIAS
// detector, a separate code path PR #80 already fixed). This covers
// calculateTiming()'s has_time_data gate and the three fields it must
// control: best_window, worst_window, late_night_stats.
//
// Two bugs fixed together here:
//   1. Threshold direction/tightness: was `< 0.8` (allowed up to 80%
//      midnight-artifact rows to still pass as "has time data"), which the
//      population average (65.9% midnight) cleared easily. Tightened to
//      `<= 0.05`.
//   2. Compute-then-hide: best_window/worst_window/late_night_stats used
//      to ship fully computed even when has_time_data was false, relying
//      entirely on a client-side `&&` check to keep them off screen. They
//      must now be null in the engine's own return value whenever the
//      gate fails - not just correctly hidden by one caller.
// Also: hour 0 (exact midnight) is excluded from the late-night hour set,
// mirroring the tradeoff PR #80 already accepted for the bias detector.

function makeBet(overrides: Partial<Bet> = {}): Bet {
  return {
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
  };
}

function betAt(day: number, hour: number, minute = 0, result: 'win' | 'loss' = 'loss'): Bet {
  const d = new Date(2024, 0, 1 + day, hour, minute, 0);
  return makeBet({
    placed_at: d.toISOString(),
    created_at: d.toISOString(),
    result,
    profit: result === 'win' ? 90 : -100,
  });
}

describe('timing_analysis has_time_data gate', () => {
  it('is false at the population-average midnight rate (65.9%) - the old 0.8 threshold would have passed this', () => {
    const midnightBets = Array.from({ length: 66 }, (_, i) => betAt(i, 0, 0));
    const realBets = Array.from({ length: 34 }, (_, i) => betAt(i + 100, 14, 30));
    const metrics = calculateMetrics([...midnightBets, ...realBets]);

    expect(metrics.timing.has_time_data).toBe(false);
  });

  it('is true only once real-timestamp coverage clears 95%', () => {
    const midnightBets = Array.from({ length: 4 }, (_, i) => betAt(i, 0, 0));
    const realBets = Array.from({ length: 96 }, (_, i) => betAt(i + 10, 14, 30));
    const metrics = calculateMetrics([...midnightBets, ...realBets]);

    expect(metrics.timing.has_time_data).toBe(true);
  });

  it('nulls best_window, worst_window, and late_night_stats at the engine level when the gate fails, not just relying on a caller to hide them', () => {
    const midnightBets = Array.from({ length: 66 }, (_, i) => betAt(i, 0, 0));
    const realBets = Array.from({ length: 34 }, (_, i) => betAt(i + 100, 14, 30));
    const metrics = calculateMetrics([...midnightBets, ...realBets]);

    expect(metrics.timing.has_time_data).toBe(false);
    expect(metrics.timing.best_window).toBeNull();
    expect(metrics.timing.worst_window).toBeNull();
    expect(metrics.timing.late_night_stats).toBeNull();
  });

  it('does NOT count midnight (hour 0) bets as late night, even when has_time_data is true', () => {
    // 96 real-timestamped bets, 4 of them at exact midnight (4% - clears
    // the 95% real-timestamp gate) all losing heavily. If hour 0 were
    // still in the late-night set, these would dominate late_night_stats.
    const midnightLosers = Array.from({ length: 4 }, (_, i) => betAt(i, 0, 0, 'loss'));
    const realBets = Array.from({ length: 96 }, (_, i) => betAt(i + 10, 14, 30, 'win'));
    const metrics = calculateMetrics([...midnightLosers, ...realBets]);

    expect(metrics.timing.has_time_data).toBe(true);
    // late_night_stats only populates from hours [23,1,2,3,4] - none of
    // these bets are in that set, so it must be null (< 3 count floor),
    // not a contaminated block built from the midnight losers.
    expect(metrics.timing.late_night_stats).toBeNull();
  });

  it('still fires a real late-night finding on genuine non-midnight late-night timestamps', () => {
    const lateBets = Array.from({ length: 20 }, (_, i) => betAt(i, 2, 15, 'loss'));
    const dayBets = Array.from({ length: 80 }, (_, i) => betAt(i + 30, 14, 30, 'win'));
    const metrics = calculateMetrics([...lateBets, ...dayBets]);

    expect(metrics.timing.has_time_data).toBe(true);
    expect(metrics.timing.late_night_stats).not.toBeNull();
    expect(metrics.timing.late_night_stats?.count).toBeGreaterThanOrEqual(3);
  });
});

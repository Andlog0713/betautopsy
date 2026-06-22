import { describe, it, expect } from 'vitest';
import { calculateMetrics } from '@/lib/autopsy-engine';
import type { Bet } from '@/types';

// Integrity guard for the midnight-UTC late-night suppression. Date-only CSV
// values parse to exact midnight; on the UTC runtime getHours() is 0, which
// would land inside the 11pm-5am window artificially. These tests lock in that:
//   1. No late-night finding fires on a date-only (midnight) history.
//   2. The late_night annotation signal never appears on a date-only history.
//   3. A genuine late-night history (real 2am clock times) still fires,
//      proving the guard suppresses the date-only artifact, not late-night
//      per se.

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

// One deeply-negative bet per day. `hour` selects the LOCAL clock hour so the
// timing detection is timezone-agnostic on any test runner (mirrors the
// convention in bias-depth.test.ts).
function dailyBetsAtHour(count: number, hour: number, minute = 0): Bet[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(2024, 0, 1 + i, hour, minute, 0);
    return makeBet({ placed_at: d.toISOString(), created_at: d.toISOString() });
  });
}

const isLateNightBias = (name: string) => /late.night/i.test(name);

describe('late-night gating on date-only (midnight) timestamps', () => {
  it('fires NO late-night finding on a 600-bet date-only history', () => {
    // Exact local midnight = the shape a date-only CSV value parses to.
    const bets = dailyBetsAtHour(600, 0, 0);
    const metrics = calculateMetrics(bets);

    const lateNightBiases = metrics.biases_detected.filter((b) => isLateNightBias(b.bias_name));
    expect(lateNightBiases).toHaveLength(0);
  });

  it('emits no late_night annotation signal on a date-only history', () => {
    const bets = dailyBetsAtHour(600, 0, 0);
    const metrics = calculateMetrics(bets);

    const annotations = metrics.annotations?.annotations ?? [];
    const hasLateNight = annotations.some((a) => a.signals.some((s) => s.name === 'late_night'));
    expect(hasLateNight).toBe(false);
  });

  it('STILL fires on a genuine 2am late-night history', () => {
    // Real clock times (2am), not midnight: the guard must let this through.
    const bets = dailyBetsAtHour(600, 2, 0);
    const metrics = calculateMetrics(bets);

    const lateNightBiases = metrics.biases_detected.filter((b) => isLateNightBias(b.bias_name));
    expect(lateNightBiases.length).toBeGreaterThanOrEqual(1);
  });
});

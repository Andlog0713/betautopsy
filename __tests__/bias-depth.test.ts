import { describe, it, expect } from 'vitest';
import { calculateMetrics } from '@/lib/autopsy-engine';
import type { Bet } from '@/types';

// ── Fixture helpers (mirror autopsy-engine.test.ts conventions) ──

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
    stake: 50,
    result: 'loss',
    payout: 0,
    profit: -50,
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

// Spread N bets across a date range with daytime hours so timing analysis
// doesn't dismiss them as midnight-only.
function spreadBets(count: number, overrides: (i: number) => Partial<Bet>): Bet[] {
  const base = new Date('2024-01-01T12:00:00Z').getTime();
  return Array.from({ length: count }, (_, i) => {
    const dt = new Date(base + i * 86400000 + (i % 4) * 3600000);
    return makeBet({
      placed_at: dt.toISOString(),
      created_at: dt.toISOString(),
      ...overrides(i),
    });
  });
}

describe('Phase 4 additive detectors (volume floor)', () => {
  it('does NOT fire High-Volume Category Leak on a 100-bet small user', () => {
    // 100 bets, half in a deeply negative category. Under the 500 volume floor.
    const bets = spreadBets(100, (i) => ({
      sport: i < 50 ? 'NBA' : 'NFL',
      bet_type: 'moneyline',
      result: i < 50 ? 'loss' : 'win',
      profit: i < 50 ? -50 : 45,
      payout: i < 50 ? 0 : 95,
    }));
    const metrics = calculateMetrics(bets);
    const fired = metrics.biases_detected.find((b) => b.bias_name === 'High-Volume Category Leak');
    expect(fired).toBeUndefined();
  });

  it('does NOT fire Sustained Late-Night Concentration on a 100-bet user with late-night bets', () => {
    // 100 bets all at 2am LOCAL time. Note: ISO strings with Z are UTC; we
    // construct Date with local-time components so getHours() returns 2
    // regardless of the test runner's timezone.
    const bets = Array.from({ length: 100 }, (_, i) => {
      const d = new Date(2024, 0, 1 + i, 2, 30, 0);
      return makeBet({
        placed_at: d.toISOString(),
        created_at: d.toISOString(),
        result: 'loss',
        profit: -50,
      });
    });
    const metrics = calculateMetrics(bets);
    const fired = metrics.biases_detected.find(
      (b) => b.bias_name === 'Sustained Late-Night Concentration'
    );
    expect(fired).toBeUndefined();
  });

  it('does NOT fire Chronic Emotional Drag on a small 100-bet sample', () => {
    const bets = spreadBets(100, (i) => ({
      stake: 50 + (i % 5) * 50, // some variation
      result: i % 3 === 0 ? 'win' : 'loss',
      profit: i % 3 === 0 ? 45 : -50,
      payout: i % 3 === 0 ? 95 : 0,
    }));
    const metrics = calculateMetrics(bets);
    const fired = metrics.biases_detected.find((b) => b.bias_name === 'Chronic Emotional Drag');
    expect(fired).toBeUndefined();
  });

  it('FIRES High-Volume Category Leak on a 600-bet user with 150 bets at -15% ROI in one category', () => {
    // 600 total bets. 150 NBA moneyline at -15% ROI (loss-heavy). Rest neutral.
    const bets = spreadBets(600, (i) => {
      if (i < 150) {
        return {
          sport: 'NBA',
          bet_type: 'moneyline',
          stake: 100,
          // 7 losses out of 10 → 30% win rate, deeply negative ROI
          result: i % 10 < 7 ? 'loss' : 'win',
          profit: i % 10 < 7 ? -100 : 91,
          payout: i % 10 < 7 ? 0 : 191,
        };
      }
      return {
        sport: 'NFL',
        bet_type: 'spread',
        stake: 50,
        result: i % 2 === 0 ? 'win' : 'loss',
        profit: i % 2 === 0 ? 45 : -50,
        payout: i % 2 === 0 ? 95 : 0,
      };
    });
    const metrics = calculateMetrics(bets);
    const fired = metrics.biases_detected.find((b) => b.bias_name === 'High-Volume Category Leak');
    expect(fired).toBeDefined();
    expect(fired?.data).toMatch(/\$/);
    expect(fired?.data).toMatch(/\d+\s*bets/);
  });

  it('FIRES Sustained Late-Night Concentration on a 600-bet user with 150 deeply negative late-night bets', () => {
    const bets = spreadBets(600, (i) => {
      if (i < 150) {
        // Late-night LOCAL hour (2am) so timing detection is timezone-agnostic.
        const d = new Date(2024, 0, 1 + i, 2, 0, 0);
        return {
          placed_at: d.toISOString(),
          created_at: d.toISOString(),
          stake: 100,
          result: 'loss' as const,
          profit: -100,
          payout: 0,
        };
      }
      return {
        result: i % 2 === 0 ? ('win' as const) : ('loss' as const),
        profit: i % 2 === 0 ? 45 : -50,
        payout: i % 2 === 0 ? 95 : 0,
      };
    });
    const metrics = calculateMetrics(bets);
    // Report-trust dedup: Late-Night Betting (25%+ share) and Sustained
    // Late-Night Concentration (100+ bets) both fire on this cohort and
    // measure the same window, so exactly ONE late-night impact survives
    // (tie on severity -> the established detector wins). The signal the
    // additive detector exists to catch is still surfaced.
    const lateNightBiases = metrics.biases_detected.filter(
      (b) => b.bias_name === 'Sustained Late-Night Concentration' || b.bias_name === 'Late-Night Betting'
    );
    expect(lateNightBiases).toHaveLength(1);
    expect(lateNightBiases[0].data).toMatch(/\$/);
  });

  it('FIRES Chronic Emotional Drag on a 600-bet user with dense loss-chasing bursts', () => {
    // Build 60 sessions of 10 bets each, 5 minutes apart, each session
    // composed of losses with escalating stakes after each loss. Tight
    // intra-session spacing + sustained chase pattern is what the
    // annotator looks for to classify bets as chasing/emotional.
    const bets: Bet[] = [];
    for (let s = 0; s < 60; s++) {
      const sessionStart = new Date(2024, 0, 1 + s, 14, 0, 0);
      for (let b = 0; b < 10; b++) {
        const t = new Date(sessionStart.getTime() + b * 5 * 60_000);
        // Escalate stakes within session: $50, $100, $150, ...
        const stake = 50 + b * 25;
        // Most lose to trigger chasing pattern
        const isLoss = b !== 9;
        bets.push(
          makeBet({
            placed_at: t.toISOString(),
            created_at: t.toISOString(),
            stake,
            result: isLoss ? 'loss' : 'win',
            profit: isLoss ? -stake : Math.round(stake * 0.91),
            payout: isLoss ? 0 : stake + Math.round(stake * 0.91),
          })
        );
      }
    }
    const metrics = calculateMetrics(bets);
    const fired = metrics.biases_detected.find((b) => b.bias_name === 'Chronic Emotional Drag');
    expect(fired).toBeDefined();
    expect(fired?.data).toMatch(/\$/);
    expect(fired?.data).toMatch(/%/);
  });
});

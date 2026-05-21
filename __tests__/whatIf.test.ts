/**
 * ENGINE-WHATIF — what_if_scenarios regression test
 *
 * Locks buildWhatIfScenarios (lib/engine/whatIf.ts), which transforms the
 * engine's internal metrics.what_ifs into the wire array, and its wiring:
 *   - pure transform: 1-3 scenarios, web-style conditional inclusion, exact
 *     label strings, values taken straight from metrics.what_ifs
 *   - scenario 3 dual guard: mixed-profitability partition AND hypothetical != actual
 *   - runAutopsy (full report) ships what_if_scenarios
 *   - runSnapshot (separate path) does NOT ship it
 */

import { describe, it, expect, vi } from 'vitest';
import { buildWhatIfScenarios, type MetricsWhatIfsShape } from '@/lib/engine/whatIf';
import { runAutopsy, runSnapshot } from '@/lib/autopsy-engine';
import type { Bet } from '@/types';

// ── Anthropic SDK mock ─────────────────────────────────────────────────
// runAutopsy dynamically imports @anthropic-ai/sdk; runSnapshot is pure-compute.
// (Mirrors the pattern in autopsy-engine.redaction.test.ts.)
vi.mock('@anthropic-ai/sdk', () => {
  const mockResponse = {
    biases_detected: [],
    strategic_leaks: [],
    behavioral_patterns: [],
    recommendations: [],
    executive_diagnosis: 'Canned diagnosis for test.',
  };
  class MockAnthropic {
    messages = {
      create: async () => ({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
        usage: { input_tokens: 10, output_tokens: 20 },
      }),
    };
  }
  return { default: MockAnthropic };
});

// ── Fixture helpers ────────────────────────────────────────────────────
let seq = 0;
function makeBet(overrides: Partial<Bet> = {}): Bet {
  seq++;
  return {
    id: `wi-${seq}`,
    user_id: 'test-user',
    placed_at: '2026-04-15T14:00:00Z',
    sport: 'NBA',
    league: null,
    bet_type: 'spread',
    description: 'fixture bet',
    odds: 100,
    stake: 100,
    result: 'win',
    payout: 200,
    profit: 100,
    sportsbook: null,
    is_bonus_bet: false,
    parlay_legs: null,
    tags: null,
    notes: null,
    upload_id: null,
    created_at: '2026-04-15T14:00:00Z',
    ...overrides,
  };
}

function makeWhatIfs(overrides: Partial<MetricsWhatIfsShape> = {}): MetricsWhatIfsShape {
  return {
    flat_stake: { median_stake: 100, hypothetical_profit: 0 },
    no_long_parlays: { hypothetical_profit: 0 },
    profitable_only: { hypothetical_profit: 0 },
    actual_profit: 0,
    ...overrides,
  };
}

describe('buildWhatIfScenarios (metrics.what_ifs transform)', () => {
  it('always includes scenario 1 with rounded median stake + engine numbers verbatim', () => {
    const result = buildWhatIfScenarios(
      makeWhatIfs({ flat_stake: { median_stake: 50.7, hypothetical_profit: 1200 }, actual_profit: -300 }),
      [makeBet({ result: 'win', stake: 50, parlay_legs: 1, sport: 'NFL', bet_type: 'spread', profit: 45 })],
    );
    expect(result[0]).toEqual({ label: 'Flat-staked at $51 on every bet', actual: -300, hypothetical: 1200 });
  });

  it('omits scenario 2 when no parlays over 3 legs', () => {
    const result = buildWhatIfScenarios(makeWhatIfs(), [
      makeBet({ parlay_legs: 2, result: 'win' }),
      makeBet({ parlay_legs: 3, result: 'loss', profit: -100 }),
    ]);
    expect(result.some((s) => s.label === 'Eliminated all parlays over 3 legs')).toBe(false);
  });

  it('includes scenario 2 (with engine number) when any settled bet has >3 parlay legs', () => {
    const result = buildWhatIfScenarios(
      makeWhatIfs({ no_long_parlays: { hypothetical_profit: 800 }, actual_profit: -200 }),
      [makeBet({ parlay_legs: 5, result: 'loss', profit: -100 }), makeBet({ parlay_legs: 1, result: 'win' })],
    );
    const s2 = result.find((s) => s.label === 'Eliminated all parlays over 3 legs');
    expect(s2).toEqual({ label: 'Eliminated all parlays over 3 legs', actual: -200, hypothetical: 800 });
  });

  it('omits scenario 3 when all categories are uniformly profitable', () => {
    const result = buildWhatIfScenarios(makeWhatIfs({ profitable_only: { hypothetical_profit: 130 }, actual_profit: 130 }), [
      makeBet({ sport: 'NFL', bet_type: 'spread', stake: 100, profit: 50, result: 'win' }),
      makeBet({ sport: 'NBA', bet_type: 'ml', stake: 100, profit: 80, result: 'win' }),
    ]);
    expect(result.some((s) => s.label === 'Only bet your profitable sports/types')).toBe(false);
  });

  it('omits scenario 3 when all categories are uniformly unprofitable', () => {
    const result = buildWhatIfScenarios(makeWhatIfs({ profitable_only: { hypothetical_profit: 0 }, actual_profit: -190 }), [
      makeBet({ sport: 'NFL', bet_type: 'spread', stake: 100, profit: -90, result: 'loss' }),
      makeBet({ sport: 'NBA', bet_type: 'ml', stake: 100, profit: -100, result: 'loss' }),
    ]);
    expect(result.some((s) => s.label === 'Only bet your profitable sports/types')).toBe(false);
  });

  it('includes scenario 3 with mixed profitability AND meaningful hypothetical diff', () => {
    const result = buildWhatIfScenarios(
      makeWhatIfs({ profitable_only: { hypothetical_profit: 50 }, actual_profit: -40 }),
      [
        makeBet({ sport: 'NFL', bet_type: 'spread', stake: 100, profit: 50, result: 'win' }),
        makeBet({ sport: 'NBA', bet_type: 'ml', stake: 100, profit: -90, result: 'loss' }),
      ],
    );
    const s3 = result.find((s) => s.label === 'Only bet your profitable sports/types');
    expect(s3).toEqual({ label: 'Only bet your profitable sports/types', actual: -40, hypothetical: 50 });
  });

  it('omits scenario 3 when partition is mixed but hypothetical equals actual (dual guard)', () => {
    const result = buildWhatIfScenarios(
      makeWhatIfs({ profitable_only: { hypothetical_profit: -40 }, actual_profit: -40 }),
      [
        makeBet({ sport: 'NFL', bet_type: 'spread', stake: 100, profit: 50, result: 'win' }),
        makeBet({ sport: 'NBA', bet_type: 'ml', stake: 100, profit: -90, result: 'loss' }),
      ],
    );
    expect(result.some((s) => s.label === 'Only bet your profitable sports/types')).toBe(false);
  });

  it('returns between 1 and 3 scenarios', () => {
    const result = buildWhatIfScenarios(makeWhatIfs(), [makeBet({ result: 'win' })]);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.length).toBeLessThanOrEqual(3);
  });
});

describe('what_if_scenarios wiring', () => {
  it('runAutopsy ships what_if_scenarios on the full-report output', async () => {
    const bets = [
      makeBet({ sport: 'NBA', bet_type: 'spread', result: 'win', profit: 100, stake: 100 }),
      makeBet({ sport: 'NFL', bet_type: 'ml', result: 'loss', profit: -100, stake: 100 }),
      makeBet({ sport: 'MLB', bet_type: 'parlay', result: 'loss', profit: -50, stake: 50, parlay_legs: 4 }),
    ];
    const { analysis } = await runAutopsy(bets);
    expect(Array.isArray(analysis.what_if_scenarios)).toBe(true);
    expect(analysis.what_if_scenarios!.length).toBeGreaterThanOrEqual(1);
    analysis.what_if_scenarios!.forEach((s) => {
      expect(typeof s.label).toBe('string');
      expect(typeof s.actual).toBe('number');
      expect(typeof s.hypothetical).toBe('number');
    });
  });

  it('runSnapshot does NOT ship what_if_scenarios', async () => {
    const { analysis } = await runSnapshot([makeBet({ result: 'win' })]);
    expect('what_if_scenarios' in analysis).toBe(false);
    expect(analysis.what_if_scenarios).toBeUndefined();
  });
});

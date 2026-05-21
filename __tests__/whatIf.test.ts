/**
 * ENGINE-WHATIF — what_if_scenarios regression test
 *
 * Locks the verbatim port of web's buildWhatIfs (lib/engine/whatIf.ts, from
 * components/AutopsyReport.tsx 195-237) and its wiring into the AutopsyAnalysis
 * output:
 *   - pure-function behavior: 1-3 scenarios, conditional inclusion, exact
 *     label strings, exact actual/hypothetical values
 *   - runAutopsy (full report) ships what_if_scenarios
 *   - runSnapshot (separate path) does NOT ship it
 */

import { describe, it, expect, vi } from 'vitest';
import { buildWhatIfs } from '@/lib/engine/whatIf';
import { runAutopsy, runSnapshot } from '@/lib/autopsy-engine';
import type { Bet } from '@/types';

// ── Anthropic SDK mock ─────────────────────────────────────────────────
// runAutopsy dynamically imports @anthropic-ai/sdk and calls .messages.create;
// runSnapshot is pure-compute and never touches it. Canned response lets
// runAutopsy assemble a full payload without a network call. (Mirrors the
// pattern in autopsy-engine.redaction.test.ts.)
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

// ── Fixture helper ─────────────────────────────────────────────────────
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

// Fixture that triggers all three scenarios.
// Categories: NBA-spread (profitable +200), NFL-moneyline (unprofitable -100),
// MLB-parlay (unprofitable -50, parlay_legs 4 -> triggers scenario 2).
// stakes [50,100,100,100] -> median 100. actualPnL = 100+100-100-50 = 50.
function makeAllThreeFixture(): Bet[] {
  return [
    makeBet({ sport: 'NBA', bet_type: 'spread', result: 'win', odds: 100, stake: 100, profit: 100 }),
    makeBet({ sport: 'NBA', bet_type: 'spread', result: 'win', odds: 100, stake: 100, profit: 100 }),
    makeBet({ sport: 'NFL', bet_type: 'moneyline', result: 'loss', odds: -110, stake: 100, profit: -100 }),
    makeBet({ sport: 'MLB', bet_type: 'parlay', result: 'loss', odds: 400, stake: 50, profit: -50, parlay_legs: 4 }),
  ];
}

describe('buildWhatIfs (verbatim port)', () => {
  it('returns exactly 3 scenarios with exact labels + values when all conditions met', () => {
    const result = buildWhatIfs(makeAllThreeFixture());
    expect(result).toHaveLength(3);

    // 1. flat stake at median ($100): wins +100 each, losses -100 each -> 0
    expect(result[0]).toEqual({ label: 'Flat-staked at $100 on every bet', actual: 50, hypothetical: 0 });
    // 2. drop the 4-leg parlay: 100+100-100 = 100
    expect(result[1]).toEqual({ label: 'Eliminated all parlays over 3 legs', actual: 50, hypothetical: 100 });
    // 3. only NBA-spread (profitable): 100+100 = 200
    expect(result[2]).toEqual({ label: 'Only bet your profitable sports/types', actual: 50, hypothetical: 200 });
  });

  it('omits scenario 2 when no parlays over 3 legs exist', () => {
    // No long parlays; mixed profitability keeps scenario 3 in.
    const bets = [
      makeBet({ sport: 'NBA', bet_type: 'spread', result: 'win', profit: 100, stake: 100 }),
      makeBet({ sport: 'NFL', bet_type: 'moneyline', result: 'loss', profit: -100, stake: 100 }),
      makeBet({ sport: 'NBA', bet_type: 'spread', result: 'win', profit: 100, stake: 100, parlay_legs: 3 }),
    ];
    const result = buildWhatIfs(bets);
    expect(result.some((s) => s.label === 'Eliminated all parlays over 3 legs')).toBe(false);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('omits scenario 3 when profitability is uniform (all profitable)', () => {
    // Single profitable category, no long parlays -> only scenario 1.
    const bets = [
      makeBet({ sport: 'NBA', bet_type: 'spread', result: 'win', profit: 100, stake: 100 }),
      makeBet({ sport: 'NBA', bet_type: 'spread', result: 'win', profit: 100, stake: 100 }),
    ];
    const result = buildWhatIfs(bets);
    expect(result.some((s) => s.label === 'Only bet your profitable sports/types')).toBe(false);
    expect(result).toHaveLength(1);
    expect(result[0].label).toMatch(/^Flat-staked at \$\d+ on every bet$/);
  });

  it('always returns scenario 1 for a simple settled set', () => {
    const result = buildWhatIfs([makeBet({ result: 'win', profit: 100, stake: 100 })]);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].label).toMatch(/^Flat-staked at/);
    expect(typeof result[0].actual).toBe('number');
    expect(typeof result[0].hypothetical).toBe('number');
  });

  it('returns [] when no settled bets (inherited web behavior, no NaN)', () => {
    const result = buildWhatIfs([makeBet({ result: 'pending', profit: 0 })]);
    expect(result).toEqual([]);
  });
});

describe('what_if_scenarios wiring', () => {
  it('runAutopsy ships what_if_scenarios on the full-report output', async () => {
    const { analysis } = await runAutopsy(makeAllThreeFixture());
    expect(Array.isArray(analysis.what_if_scenarios)).toBe(true);
    expect(analysis.what_if_scenarios!.length).toBeGreaterThanOrEqual(1);
    analysis.what_if_scenarios!.forEach((s) => {
      expect(typeof s.label).toBe('string');
      expect(typeof s.actual).toBe('number');
      expect(typeof s.hypothetical).toBe('number');
    });
  });

  it('runSnapshot does NOT ship what_if_scenarios', async () => {
    const { analysis } = await runSnapshot(makeAllThreeFixture());
    expect(analysis.what_if_scenarios).toBeUndefined();
  });
});

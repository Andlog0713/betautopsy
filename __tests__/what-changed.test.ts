import { describe, it, expect } from 'vitest';
import { computeWhatChanged, type WhatChangedInput } from '@/lib/what-changed';
import type {
  AutopsyAnalysis,
  AutopsySummary,
  BiasDetected,
  BetIQResult,
} from '@/types';

// ── Fixtures ──
//
// AutopsyAnalysis has many required fields; computeWhatChanged only reads
// betting_archetype, betiq, and biases_detected. The factory builds a
// minimally-valid AutopsyAnalysis with sensible defaults so tests can
// override just the fields they exercise.

function makeSummary(overrides: Partial<AutopsySummary> = {}): AutopsySummary {
  return {
    total_bets: 100,
    record: '50-45-5',
    total_profit: 0,
    roi_percent: 0,
    avg_stake: 25,
    date_range: '2026-01-01 to 2026-03-01',
    overall_grade: null,
    ...overrides,
  };
}

function makeBias(overrides: Partial<BiasDetected>): BiasDetected {
  return {
    bias_name: overrides.bias_name ?? 'Unnamed Bias',
    severity: overrides.severity ?? 'medium',
    description: overrides.description ?? '',
    evidence: overrides.evidence ?? '',
    estimated_cost: overrides.estimated_cost ?? 0,
    fix: overrides.fix ?? '',
    evidence_bet_ids: overrides.evidence_bet_ids,
  };
}

function makeBetIQ(score: number): BetIQResult {
  return {
    score,
    components: {
      timing: 0, confidence: 0, line_value: 0,
      calibration: 0, sophistication: 0, specialization: 0,
    },
    percentile: 50,
    interpretation: 'test',
    insufficient_data: false,
  };
}

function makeAnalysis(overrides: Partial<AutopsyAnalysis> = {}): AutopsyAnalysis {
  return {
    summary: makeSummary(),
    biases_detected: [],
    strategic_leaks: [],
    behavioral_patterns: [],
    recommendations: [],
    emotion_score: 50,
    bankroll_health: 'healthy',
    ...overrides,
  };
}

function makeInput(
  analysis: AutopsyAnalysis,
  opts: { createdAt?: string; betCountAnalyzed?: number } = {},
): WhatChangedInput {
  return {
    analysis,
    createdAt: opts.createdAt ?? '2026-04-15T12:00:00Z',
    betCountAnalyzed: opts.betCountAnalyzed ?? 150,
  };
}

// ── Cases ──

describe('computeWhatChanged', () => {
  describe('W1 — no usable previous', () => {
    it('returns undefined when previous.createdAt is invalid', () => {
      const prev = makeInput(makeAnalysis(), { createdAt: 'not-a-date' });
      const curr = makeInput(makeAnalysis());
      expect(computeWhatChanged(prev, curr)).toBeUndefined();
    });

    it('omits archetypeChange when previous has no betting_archetype', () => {
      const prev = makeInput(makeAnalysis());
      const curr = makeInput(makeAnalysis({
        betting_archetype: { name: 'The Sharp', description: '' },
        betiq: makeBetIQ(60),
        biases_detected: [makeBias({ bias_name: 'X', estimated_cost: 1000 })],
      }));
      // Add a previous betIQ + bias to provoke other deltas so the function
      // returns a non-undefined object we can inspect.
      const prevWithBetIQ = makeInput(makeAnalysis({
        betiq: makeBetIQ(50),
        biases_detected: [makeBias({ bias_name: 'X', estimated_cost: 100 })],
      }));
      const result = computeWhatChanged(prevWithBetIQ, curr);
      expect(result).toBeDefined();
      expect(result?.archetypeChange).toBeUndefined();
    });
  });

  describe('W2 — full delta payload', () => {
    it('emits archetypeChange + betIQDelta + topImpactDeltas with confidence=high', () => {
      const prev = makeInput(
        makeAnalysis({
          betting_archetype: { name: 'The Chaser', description: 'old' },
          betiq: makeBetIQ(42),
          biases_detected: [
            makeBias({ bias_name: 'Post-Loss Escalation', estimated_cost: 3200 }),
          ],
        }),
        { createdAt: '2026-04-15T12:00:00Z', betCountAnalyzed: 200 },
      );
      const curr = makeInput(
        makeAnalysis({
          betting_archetype: { name: 'The Sharp', description: 'new' },
          betiq: makeBetIQ(51),
          biases_detected: [
            makeBias({ bias_name: 'Post-Loss Escalation', estimated_cost: 1800 }),
          ],
        }),
        { createdAt: '2026-05-16T12:00:00Z', betCountAnalyzed: 250 },
      );

      const result = computeWhatChanged(prev, curr);
      expect(result).toBeDefined();
      expect(result?.previousReportDate).toBe('2026-04-15');
      expect(result?.daysSincePrevious).toBe(31);
      expect(result?.archetypeChange).toEqual({ from: 'The Chaser', to: 'The Sharp' });
      expect(result?.betIQDelta).toEqual({ from: 42, to: 51, direction: 'improved' });
      expect(result?.topImpactDeltas).toHaveLength(1);
      expect(result?.topImpactDeltas?.[0]).toMatchObject({
        biasName: 'Post-Loss Escalation',
        previousImpact: 3200,
        currentImpact: 1800,
        deltaPercent: -44,
        confidence: 'high',
      });
    });
  });

  describe('W3 — small betIQ delta + same archetype', () => {
    it('omits archetypeChange and betIQDelta, returns undefined when no impact delta either', () => {
      const prev = makeInput(makeAnalysis({
        betting_archetype: { name: 'The Sharp', description: '' },
        betiq: makeBetIQ(50),
      }));
      const curr = makeInput(makeAnalysis({
        betting_archetype: { name: 'The Sharp', description: '' },
        betiq: makeBetIQ(52),  // delta = 2, below threshold of 3
      }));
      // No biases on either → topImpactDeltas empty → archetype absent →
      // betIQ absent → the whole field collapses to undefined.
      expect(computeWhatChanged(prev, curr)).toBeUndefined();
    });
  });

  describe('W4 — large impact change passes thresholds', () => {
    it('includes the bias in topImpactDeltas', () => {
      const prev = makeInput(makeAnalysis({
        biases_detected: [makeBias({ bias_name: 'Heavy Parlay Tendency', estimated_cost: 3200 })],
      }), { betCountAnalyzed: 80 });
      const curr = makeInput(makeAnalysis({
        biases_detected: [makeBias({ bias_name: 'Heavy Parlay Tendency', estimated_cost: 1800 })],
      }), { betCountAnalyzed: 90 });

      const result = computeWhatChanged(prev, curr);
      expect(result?.topImpactDeltas).toHaveLength(1);
      expect(result?.topImpactDeltas?.[0].biasName).toBe('Heavy Parlay Tendency');
      // 80 + 90 < 100 each → medium tier
      expect(result?.topImpactDeltas?.[0].confidence).toBe('medium');
    });
  });

  describe('W5 — tiny impact change filtered out', () => {
    it('omits the bias and returns undefined when no other deltas survive', () => {
      // $3200 → $3100 = $100 absolute (under $500), 3.1% relative (under 20%)
      const prev = makeInput(makeAnalysis({
        biases_detected: [makeBias({ bias_name: 'X', estimated_cost: 3200 })],
      }));
      const curr = makeInput(makeAnalysis({
        biases_detected: [makeBias({ bias_name: 'X', estimated_cost: 3100 })],
      }));
      expect(computeWhatChanged(prev, curr)).toBeUndefined();
    });
  });

  describe('W6 — graceful skip on missing estimated_cost', () => {
    it('does not throw when previous biases lack estimated_cost', () => {
      const prev = makeInput(makeAnalysis({
        biases_detected: [{
          bias_name: 'Stake Volatility',
          severity: 'medium',
          // estimated_cost intentionally undefined — simulates older LLM
          // output where the field is missing.
        } as unknown as BiasDetected],
        betiq: makeBetIQ(50),
      }));
      const curr = makeInput(makeAnalysis({
        biases_detected: [makeBias({ bias_name: 'Stake Volatility', estimated_cost: 2000 })],
        betiq: makeBetIQ(55),  // delta = 5 ≥ 3 so betIQDelta carries the result
      }));

      const result = computeWhatChanged(prev, curr);
      expect(result).toBeDefined();
      expect(result?.topImpactDeltas).toBeUndefined();
      expect(result?.betIQDelta).toEqual({ from: 50, to: 55, direction: 'improved' });
    });
  });

  describe('W7 — confidence thresholds', () => {
    function withBetCounts(prevCount: number, currCount: number) {
      const prev = makeInput(makeAnalysis({
        biases_detected: [makeBias({ bias_name: 'Y', estimated_cost: 1000 })],
      }), { betCountAnalyzed: prevCount });
      const curr = makeInput(makeAnalysis({
        biases_detected: [makeBias({ bias_name: 'Y', estimated_cost: 300 })],
      }), { betCountAnalyzed: currCount });
      return computeWhatChanged(prev, curr);
    }

    it('high when both >= 100', () => {
      expect(withBetCounts(100, 100)?.topImpactDeltas?.[0].confidence).toBe('high');
    });
    it('medium when both >= 30 but at least one < 100', () => {
      expect(withBetCounts(30, 30)?.topImpactDeltas?.[0].confidence).toBe('medium');
      expect(withBetCounts(100, 30)?.topImpactDeltas?.[0].confidence).toBe('medium');
    });
    it('low when at least one < 30', () => {
      expect(withBetCounts(29, 100)?.topImpactDeltas?.[0].confidence).toBe('low');
      expect(withBetCounts(0, 0)?.topImpactDeltas?.[0].confidence).toBe('low');
    });
  });

  describe('sort + cap', () => {
    it('sorts topImpactDeltas by absolute dollar move and caps at 3', () => {
      const prev = makeInput(makeAnalysis({
        biases_detected: [
          makeBias({ bias_name: 'A', estimated_cost: 1000 }),
          makeBias({ bias_name: 'B', estimated_cost: 5000 }),
          makeBias({ bias_name: 'C', estimated_cost: 2000 }),
          makeBias({ bias_name: 'D', estimated_cost: 800 }),
        ],
      }));
      const curr = makeInput(makeAnalysis({
        biases_detected: [
          makeBias({ bias_name: 'A', estimated_cost: 100 }),    // |Δ| = 900
          makeBias({ bias_name: 'B', estimated_cost: 1000 }),   // |Δ| = 4000
          makeBias({ bias_name: 'C', estimated_cost: 100 }),    // |Δ| = 1900
          makeBias({ bias_name: 'D', estimated_cost: 100 }),    // |Δ| = 700
        ],
      }));
      const result = computeWhatChanged(prev, curr);
      expect(result?.topImpactDeltas).toHaveLength(3);
      const names = result?.topImpactDeltas?.map(d => d.biasName);
      expect(names).toEqual(['B', 'C', 'A']);
    });
  });
});

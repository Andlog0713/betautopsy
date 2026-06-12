import { describe, it, expect } from 'vitest';
import { compareReports } from '@/lib/report-comparison';
import type { AutopsyAnalysis, BiasDetected } from '@/types';

function makeBias(overrides: Partial<BiasDetected>): BiasDetected {
  return {
    bias_name: overrides.bias_name ?? 'Unnamed Bias',
    severity: overrides.severity ?? 'medium',
    description: '',
    evidence: '',
    estimated_cost: 0,
    fix: '',
    ...overrides,
  };
}

function makeAnalysis(overrides: Partial<AutopsyAnalysis> = {}): AutopsyAnalysis {
  return {
    summary: {
      total_bets: 100,
      record: '50-45-5',
      total_profit: 0,
      roi_percent: 0,
      avg_stake: 25,
      date_range: '2026-01-01 to 2026-03-01',
      overall_grade: null,
    },
    biases_detected: [],
    strategic_leaks: [],
    behavioral_patterns: [],
    recommendations: [],
    emotion_score: 50,
    bankroll_health: 'healthy',
    ...overrides,
  };
}

describe('compareReports cross-version resolved suppression', () => {
  const dupPair = [
    makeBias({ bias_name: 'Category Concentration Leak', severity: 'high' }),
    makeBias({ bias_name: 'High-Volume Category Leak', severity: 'high' }),
  ];

  it('same-version: a disappeared bias still reports as resolved', () => {
    const previous = makeAnalysis({ schema_version: 3, biases_detected: dupPair });
    const current = makeAnalysis({
      schema_version: 3,
      biases_detected: [makeBias({ bias_name: 'Category Concentration Leak', severity: 'high' })],
    });
    const result = compareReports(current, previous);
    const resolved = result.biasChanges.filter((b) => b.direction === 'resolved');
    expect(resolved).toHaveLength(1);
    expect(resolved[0].name).toBe('High-Volume Category Leak');
    expect(result.topImprovement).toContain('resolved');
  });

  it('cross-version (v2 prior vs v3 current): the dedup-collapsed bias is NOT claimed resolved', () => {
    const previous = makeAnalysis({ schema_version: 2, biases_detected: dupPair });
    const current = makeAnalysis({
      schema_version: 3,
      biases_detected: [makeBias({ bias_name: 'Category Concentration Leak', severity: 'high' })],
    });
    const result = compareReports(current, previous);
    expect(result.biasChanges.filter((b) => b.direction === 'resolved')).toHaveLength(0);
    expect(result.topImprovement ?? '').not.toContain('resolved');
  });

  it('cross-version with a pre-versioned prior (absent schema_version = 1) also suppresses', () => {
    const previous = makeAnalysis({ biases_detected: dupPair }); // no schema_version
    const current = makeAnalysis({
      schema_version: 3,
      biases_detected: [makeBias({ bias_name: 'Category Concentration Leak', severity: 'high' })],
    });
    const result = compareReports(current, previous);
    expect(result.biasChanges.filter((b) => b.direction === 'resolved')).toHaveLength(0);
  });

  it('both pre-versioned (legacy vs legacy) still reports resolved — same version on both sides', () => {
    const previous = makeAnalysis({ biases_detected: dupPair });
    const current = makeAnalysis({
      biases_detected: [makeBias({ bias_name: 'Category Concentration Leak', severity: 'high' })],
    });
    const result = compareReports(current, previous);
    expect(result.biasChanges.filter((b) => b.direction === 'resolved')).toHaveLength(1);
  });

  it('cross-version keeps same-named severity comparisons (improved/worsened/new)', () => {
    const previous = makeAnalysis({
      schema_version: 2,
      biases_detected: [makeBias({ bias_name: 'Post-Loss Escalation', severity: 'critical' })],
    });
    const current = makeAnalysis({
      schema_version: 3,
      biases_detected: [
        makeBias({ bias_name: 'Post-Loss Escalation', severity: 'medium' }),
        makeBias({ bias_name: 'Stake Volatility', severity: 'low' }),
      ],
    });
    const result = compareReports(current, previous);
    const directions = result.biasChanges.map((b) => b.direction).sort();
    expect(directions).toEqual(['improved', 'new']);
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  attachCanonicalControlRules,
  buildSuggestedRulesFromAnalysis,
  findCanonicalRuleSuggestion,
} from '@/lib/control-system';
import { runAutopsy } from '@/lib/autopsy-engine';
import type { AutopsyAnalysis, Bet, PersonalRule, WhatIfScenario } from '@/types';

let modelResponse: Record<string, unknown> = {};

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = {
      create: async () => ({
        content: [{ type: 'text', text: JSON.stringify(modelResponse) }],
        usage: { input_tokens: 10, output_tokens: 20 },
      }),
    };
  }
  return { default: MockAnthropic };
});

function analysisWith({
  personalRules = [],
  whatIfScenarios = [],
}: {
  personalRules?: PersonalRule[];
  whatIfScenarios?: WhatIfScenario[];
} = {}): AutopsyAnalysis {
  return {
    summary: {
      total_bets: 200,
      record: '100W-100L-0P',
      total_profit: 500,
      roi_percent: 2.5,
      avg_stake: 100,
      date_range: '2026-01-01 to 2026-06-30',
      overall_grade: null,
    },
    biases_detected: [],
    strategic_leaks: [],
    behavioral_patterns: [],
    recommendations: [],
    emotion_score: 20,
    bankroll_health: 'healthy',
    personal_rules: personalRules,
    timing_analysis: {
      by_hour: [],
      by_day: [],
      best_window: null,
      worst_window: null,
      late_night_stats: null,
      has_time_data: false,
    },
    odds_analysis: {
      buckets: [],
      sweet_spot: null,
      worst_range: null,
    },
    what_if_scenarios: whatIfScenarios,
    sufficiency: {
      settledBets: 200,
      tier: 'full',
      gated: [],
    },
  } as unknown as AutopsyAnalysis;
}

describe('control rule integrity', () => {
  it('does not turn a model-authored rule into an adoptable control rule', () => {
    const analysis = analysisWith({
      personalRules: [{
        rule: 'No parlays with more than 3 legs, ever.',
        reason: 'The model says this is safer.',
        based_on: 'Model-authored interpretation',
      }],
      whatIfScenarios: [{
        label: 'Eliminated all parlays over 3 legs',
        actual: 500,
        hypothetical: 46,
      }],
    });

    expect(
      buildSuggestedRulesFromAnalysis(analysis)
        .some((rule) => rule.rule_type === 'ban_category' && rule.trigger.category === 'parlay'),
    ).toBe(false);
  });

  it('emits a long-parlay rule only when the matching counterfactual improves the same cohort', () => {
    const analysis = analysisWith({
      whatIfScenarios: [{
        label: 'Eliminated all parlays over 3 legs',
        actual: -500,
        hypothetical: 250,
        affectedBets: 20,
      }],
    });

    const rule = buildSuggestedRulesFromAnalysis(analysis)
      .find((candidate) => candidate.candidateId === 'no_long_parlays');

    expect(rule).toMatchObject({
      rule_type: 'ban_category',
      scope: 'bet_type',
      scope_value: 'parlay',
      trigger: { category: 'parlay' },
      evidence: {
        actualProfit: -500,
        hypotheticalProfit: 250,
        deltaProfit: 750,
        sampleSize: 20,
      },
      sufficiency: {
        status: 'sufficient',
        observed: 20,
      },
    });
  });

  it('replaces historical model rules on every rendered rule surface', () => {
    const canonical = attachCanonicalControlRules(analysisWith({
      personalRules: [{
        rule: 'No parlays with more than 3 legs, ever.',
        reason: 'The model says this is safer.',
        based_on: 'Model-authored interpretation',
      }],
      whatIfScenarios: [{
        label: 'Eliminated all parlays over 3 legs',
        actual: 500,
        hypothetical: 46,
        affectedBets: 20,
      }],
    }));

    expect(canonical.personal_rules).toEqual([]);
    expect(canonical.control_system?.hardRules).toEqual([]);
    expect(canonical.control_system?.softRules).toEqual([]);
  });

  it('lets the API resolve only a canonical engine suggestion from the source report', () => {
    const analysis = analysisWith({
      whatIfScenarios: [{
        label: 'Eliminated all parlays over 3 legs',
        actual: -500,
        hypothetical: 250,
        affectedBets: 20,
      }],
    });

    expect(findCanonicalRuleSuggestion(analysis, 'Limit parlays to 3 legs', 'ban_category'))
      .toMatchObject({ candidateId: 'no_long_parlays', trigger: { maxParlayLegs: 3 } });
    expect(findCanonicalRuleSuggestion(analysis, 'Never place parlays again', 'ban_category'))
      .toBeUndefined();
  });

  it('ignores a losing model rule during full report assembly', async () => {
    modelResponse = {
      biases_detected: [],
      strategic_leaks: [],
      behavioral_patterns: [],
      recommendations: [],
      personal_rules: [{
        rule: 'No parlays with more than 3 legs, ever.',
        reason: 'The model says this is safer.',
        based_on: 'Model-authored interpretation',
      }],
      executive_diagnosis: 'Test diagnosis.',
    };
    const bets: Bet[] = Array.from({ length: 100 }, (_, index) => {
      const longParlay = index < 20;
      return {
        id: `integrity-${index}`,
        user_id: 'test-user',
        placed_at: new Date(Date.UTC(2026, 0, 1, 12 + (index % 10), index)).toISOString(),
        sport: 'NFL',
        league: null,
        bet_type: longParlay ? 'parlay' : 'spread',
        description: `Integrity fixture ${index}`,
        odds: 100,
        stake: 100,
        result: longParlay ? 'win' : 'loss',
        payout: longParlay ? 200 : 0,
        profit: longParlay ? 100 : -100,
        sportsbook: null,
        is_bonus_bet: false,
        parlay_legs: longParlay ? 5 : null,
        tags: null,
        notes: null,
        upload_id: null,
        created_at: '2026-01-01T00:00:00.000Z',
      };
    });

    const { analysis } = await runAutopsy(bets);
    const counterfactual = analysis.what_if_scenarios?.find(
      (scenario) => scenario.label === 'Eliminated all parlays over 3 legs',
    );

    expect(counterfactual).toMatchObject({
      actual: -6000,
      hypothetical: -8000,
      affectedBets: 20,
    });
    expect(analysis.personal_rules?.some((rule) => rule.rule.includes('parlay'))).toBe(false);
    expect(analysis.control_system?.hardRules.some((rule) => rule.candidateId === 'no_long_parlays'))
      .toBe(false);
  });
});

/**
 * Full-mode recommendations.expected_improvement (C) — regression test.
 *
 * Claude's prompt used to ask for "estimated $ or % impact" directly in
 * expected_improvement prose - the model invented the number, same
 * wire-provenance violation as session_analysis/edge_profile/
 * strategic_leaks. The prompt now asks for a behavioral description only
 * (no numbers) plus tied_to_finding (which bias this addresses); the
 * engine appends the dollar itself from that bias's already-bounded
 * estimated_cost. This locks that composition, and that a miss (no tie,
 * unmatched tie, or a $0 bias) leaves Claude's text untouched rather than
 * fabricating a figure.
 */

import { describe, it, expect, vi } from 'vitest';
import { runAutopsy } from '@/lib/autopsy-engine';
import type { Bet } from '@/types';

let mockResponse: Record<string, unknown>;

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = {
      create: async () => ({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
        usage: { input_tokens: 100, output_tokens: 200 },
      }),
    };
  }
  return { default: MockAnthropic };
});

// 120 settled bets (12 cycles of 10), engineered so "Post-Loss Escalation"
// reliably fires with a genuinely negative net result for the "bets
// following a loss" sub-split, not just a raised stake ratio: 6 wins @$70
// (confidence), 1 kickoff loss @$70, then 3 chase bets @$150 that also
// lose. estimatedCostBound needs a real net loss on the full after-loss
// split, not merely a stake-ratio signal, to produce a nonzero bound.
function makeFixtureBets(): Bet[] {
  const bets: Bet[] = [];
  const baseDate = Date.parse('2026-04-15T20:00:00Z');
  for (let cycle = 0; cycle < 12; cycle++) {
    for (let pos = 0; pos < 10; pos++) {
      const i = cycle * 10 + pos;
      let isWin: boolean;
      let stake: number;
      if (pos < 6) { isWin = true; stake = 70; }
      else if (pos === 6) { isWin = false; stake = 70; }
      else { isWin = false; stake = 150; }
      bets.push({
        id: `bet-${i}`,
        user_id: 'test-user',
        placed_at: new Date(baseDate - (120 - i) * 3_600_000).toISOString(),
        sport: 'NFL',
        league: null,
        bet_type: 'spread',
        description: `NFL spread #${i}`,
        odds: -110,
        stake,
        result: isWin ? 'win' : 'loss',
        payout: isWin ? Math.round(stake * 1.91) : 0,
        profit: isWin ? Math.round(stake * 0.91) : -stake,
        sportsbook: 'DraftKings',
        is_bonus_bet: false,
        parlay_legs: null,
        tags: null,
        notes: null,
        upload_id: null,
        created_at: new Date().toISOString(),
      });
    }
  }
  return bets;
}

describe('full-mode recommendations.expected_improvement', () => {
  it('appends the engine-computed dollar when tied_to_finding matches a real, costed bias', async () => {
    mockResponse = {
      biases_detected: [
        {
          bias_name: 'Post-Loss Escalation',
          description: 'You bet bigger after losses.',
          evidence: 'Stake roughly doubles after a loss.',
          estimated_cost: 999999, // deliberately absurd - must be BOUNDED, never trusted raw
          fix: 'Cap your bet size.',
        },
      ],
      strategic_leaks: [],
      behavioral_patterns: [],
      recommendations: [
        {
          priority: 1,
          title: 'Cap your stake after a loss',
          description: 'Lock your bet size regardless of the prior result.',
          expected_improvement: 'You stay in control of your bankroll instead of letting one bad beat set your next stake.',
          difficulty: 'easy',
          tied_to_finding: 'Post-Loss Escalation',
        },
      ],
      executive_diagnosis: 'Test diagnosis.',
    };

    const { analysis } = await runAutopsy(makeFixtureBets(), null);
    const rec = analysis.recommendations[0];

    expect(rec.expected_improvement).toContain(
      'You stay in control of your bankroll instead of letting one bad beat set your next stake.'
    );
    // No fabricated period on the figure - estimated_cost is a total over
    // whatever was actually analyzed, not a verified quarterly rate.
    expect(rec.expected_improvement).toMatch(/Save ~\$[\d,]+\.$/);
    expect(rec.expected_improvement).not.toContain('/quarter');
    // Never the raw, unbounded Claude figure - estimatedCostBound caps it.
    expect(rec.expected_improvement).not.toContain('999,999');
    expect(rec.tied_to_finding).toBe('Post-Loss Escalation');
  });

  it('leaves the text untouched when tied_to_finding does not match any detected bias', async () => {
    mockResponse = {
      biases_detected: [
        {
          bias_name: 'Post-Loss Escalation',
          description: 'You bet bigger after losses.',
          evidence: 'Stake roughly doubles after a loss.',
          estimated_cost: 400,
          fix: 'Cap your bet size.',
        },
      ],
      strategic_leaks: [],
      behavioral_patterns: [],
      recommendations: [
        {
          priority: 1,
          title: 'Cap your stake after a loss',
          description: 'desc',
          expected_improvement: 'Plain behavioral description with no dollar figure.',
          difficulty: 'easy',
          tied_to_finding: 'Some Bias That Was Never Detected',
        },
      ],
      executive_diagnosis: 'Test diagnosis.',
    };

    const { analysis } = await runAutopsy(makeFixtureBets(), null);
    const rec = analysis.recommendations[0];

    expect(rec.expected_improvement).toBe('Plain behavioral description with no dollar figure.');
    expect(rec.tied_to_finding).toBeUndefined();
  });

  it('leaves the text untouched when tied_to_finding is absent entirely', async () => {
    mockResponse = {
      biases_detected: [],
      strategic_leaks: [],
      behavioral_patterns: [],
      recommendations: [
        {
          priority: 1,
          title: 'General advice',
          description: 'desc',
          expected_improvement: 'No specific finding backs this one.',
          difficulty: 'medium',
        },
      ],
      executive_diagnosis: 'Test diagnosis.',
    };

    const { analysis } = await runAutopsy(makeFixtureBets(), null);
    const rec = analysis.recommendations[0];

    expect(rec.expected_improvement).toBe('No specific finding backs this one.');
    expect(rec.tied_to_finding).toBeUndefined();
  });

  it('does not fabricate a dollar clause for a matched bias with zero estimated cost', async () => {
    mockResponse = {
      biases_detected: [
        {
          bias_name: 'Post-Loss Escalation',
          description: 'You bet bigger after losses.',
          evidence: 'Stake roughly doubles after a loss.',
          estimated_cost: 0,
          fix: 'Cap your bet size.',
        },
      ],
      strategic_leaks: [],
      behavioral_patterns: [],
      recommendations: [
        {
          priority: 1,
          title: 'Cap your stake after a loss',
          description: 'desc',
          expected_improvement: 'Behavioral description only.',
          difficulty: 'easy',
          tied_to_finding: 'Post-Loss Escalation',
        },
      ],
      executive_diagnosis: 'Test diagnosis.',
    };

    const { analysis } = await runAutopsy(makeFixtureBets(), null);
    const rec = analysis.recommendations[0];

    expect(rec.expected_improvement).toBe('Behavioral description only.');
  });
});

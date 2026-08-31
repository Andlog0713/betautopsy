/**
 * Full-mode recommendations.expected_improvement (C) — regression test.
 *
 * Claude's prompt used to ask for "estimated $ or % impact" directly in
 * expected_improvement prose - the model invented the number, same
 * wire-provenance violation as session_analysis/edge_profile/
 * strategic_leaks. The prompt now asks for a behavioral description only
 * (no numbers) plus tied_to_finding (which bias this addresses); the
 * engine appends the dollar itself from that bias's deterministic historical
 * counterfactual. This locks that composition, and that a miss (no tie,
 * unmatched tie, or a $0 bias) leaves Claude's text untouched rather than
 * fabricating a figure.
 */

import { describe, it, expect, vi } from 'vitest';
import { runAutopsy } from '@/lib/autopsy-engine';
import type { Bet } from '@/types';
import { markFixtureTimestampAsSourced } from './helpers/known-instant';

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
  return bets.map(markFixtureTimestampAsSourced);
}

function makeDailySessionBets(): Bet[] {
  return makeFixtureBets().map((bet, index) => {
    const timestamp = new Date(Date.UTC(
      2026,
      0,
      1 + Math.floor(index / 10),
      14,
      (index % 10) * 5,
    )).toISOString();
    return {
      ...bet,
      placed_at: timestamp,
      source_placed_at: timestamp,
      placed_date: timestamp.slice(0, 10),
      placed_time: timestamp.slice(11, 19),
      source_timezone: 'Z',
      timestamp_quality: 'instant',
    };
  });
}

describe('full-mode recommendations.expected_improvement', () => {
  it('appends the engine-computed dollar when tied_to_finding matches a real, costed bias', async () => {
    mockResponse = {
      biases_detected: [
        {
          bias_name: 'Post-Loss Escalation',
          description: 'You bet bigger after losses.',
          evidence: 'Stake roughly doubles after a loss.',
          estimated_cost: 999999, // deliberately absurd; the engine must ignore it
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

    expect(rec.title).toBe('Stop the chase window');
    expect(analysis.biases_detected[0].description).not.toMatch(/after losses?/i);
    expect(rec.expected_improvement).not.toContain('one bad beat');
    // No fabricated period on the figure. The engine names the exact
    // deterministic historical counterfactual behind the amount.
    expect(rec.expected_improvement).not.toContain('/quarter');
    // Never the raw Claude figure. The engine owns the counterfactual.
    expect(rec.expected_improvement).not.toContain('999,999');
    expect(rec.expected_improvement).toMatch(
      /Excluding the flagged cohort improves historical P&L by ~\$[\d,]+\.$/
    );
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
          title: 'Keep stakes consistent',
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
          expected_improvement: 'No specific finding backs this advice.',
          difficulty: 'medium',
        },
      ],
      executive_diagnosis: 'Test diagnosis.',
    };

    const { analysis } = await runAutopsy(makeFixtureBets(), null);
    const rec = analysis.recommendations[0];

    expect(rec.expected_improvement).toBe('No specific finding backs this advice.');
    expect(rec.tied_to_finding).toBeUndefined();
  });

  it('does not let a model-written zero suppress a deterministic counterfactual', async () => {
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

    expect(rec.expected_improvement).toMatch(
      /^Behavioral description only\. Excluding the flagged cohort improves historical P&L by ~\$[\d,]+\.$/
    );
  });

  it('mechanically removes model-written local-time behavior claims when the local clock is unconfirmed', async () => {
    mockResponse = {
      biases_detected: [],
      strategic_leaks: [],
      behavioral_patterns: [{
        pattern_name: 'Late-night losses',
        description: 'Late-night bets underperformed.',
        frequency: 'Often',
        impact: 'negative',
        data_points: 'After 11pm',
      }],
      recommendations: [{
        priority: 1,
        title: 'Set an 11pm cutoff',
        description: 'Stop betting after 11pm.',
        expected_improvement: 'Avoid overnight losses.',
        difficulty: 'easy',
      }],
      session_analysis: {
        worst_session: { description: 'This session was costly. It continued after midnight.' },
        best_session: { description: 'This session stayed controlled. It ended before 10pm.' },
      },
      edge_profile: {
        profitable_areas: [],
        unprofitable_areas: [],
        reallocation_advice: 'Concentrate on proven categories. Stop after 11pm.',
      },
      executive_diagnosis: 'Your sizing is uneven. Late-night losses dominate.',
    };

    const { analysis } = await runAutopsy(makeDailySessionBets(), null);

    expect(analysis.timing_analysis?.local_time_confirmed).toBe(false);
    expect(analysis.behavioral_patterns).toEqual([]);
    expect(analysis.recommendations).toEqual([]);
    expect(analysis.executive_diagnosis).toBe('Your sizing is uneven.');
    expect(analysis.executiveDiagnosis?.insightFull).toBe('Your sizing is uneven.');
    expect(analysis.edge_profile?.reallocation_advice).toBe('Concentrate on proven categories.');
    expect(analysis.session_analysis?.worst_session.description).toBe('This session was costly.');
    expect(analysis.session_analysis?.best_session.description).toBe('This session stayed controlled.');
    expect(analysis.pertinent_negatives?.some((item) => item.pattern === 'Late Night Bias')).toBe(false);
  });

  it('ignores model-authored bias cost and recommendation priority numbers', async () => {
    const response = (estimatedCost: number, priority: number) => ({
      biases_detected: [{
        bias_name: 'Post-Loss Escalation',
        description: 'Stakes rise within the sequence.',
        evidence: 'Model evidence is not authoritative.',
        estimated_cost: estimatedCost,
        fix: 'Keep stake sizing steady.',
      }],
      strategic_leaks: [],
      behavioral_patterns: [],
      recommendations: [{
        priority,
        title: 'Keep stakes steady',
        description: 'Choose the stake before the session.',
        expected_improvement: 'This keeps the process consistent.',
        difficulty: 'easy',
        tied_to_finding: 'Post-Loss Escalation',
      }],
      executive_diagnosis: 'Stake sizing needs more consistency.',
    });

    mockResponse = response(1, 99);
    const first = await runAutopsy(makeFixtureBets(), null);
    mockResponse = response(999999, -50);
    const second = await runAutopsy(makeFixtureBets(), null);

    expect(first.analysis.biases_detected[0].estimated_cost).toBeGreaterThan(0);
    expect(second.analysis.biases_detected[0].estimated_cost)
      .toBe(first.analysis.biases_detected[0].estimated_cost);
    expect(first.analysis.recommendations[0].priority).toBe(1);
    expect(second.analysis.recommendations[0].priority).toBe(1);
  });

  it('drops a model recommendation that contains an unverified numeric threshold', async () => {
    mockResponse = {
      biases_detected: [],
      strategic_leaks: [],
      behavioral_patterns: [],
      recommendations: [
        {
          priority: 7,
          title: 'Stop at two legs',
          description: 'Use a two-leg cap.',
          expected_improvement: 'This reduces variance.',
          difficulty: 'easy',
        },
        {
          priority: 99,
          title: 'Keep a written plan',
          description: 'Choose the approach before opening the app.',
          expected_improvement: 'This keeps decisions consistent.',
          difficulty: 'easy',
        },
      ],
      executive_diagnosis: 'Stake sizing needs more consistency.',
    };

    const { analysis } = await runAutopsy(makeFixtureBets(), null);
    expect(analysis.recommendations).toHaveLength(1);
    expect(analysis.recommendations[0]).toMatchObject({
      priority: 1,
      title: 'Keep a written plan',
    });
  });
});

/**
 * Drop-site instrumentation (A) — regression test.
 *
 * lib/autopsy-engine.ts's strategic_leaks and edge_profile assembly both
 * silently drop a Claude-selected category when the deterministic
 * category_roi verification fails (no matching category, or a sign
 * mismatch for edge_profile specifically) - "unknown is a valid value"
 * rather than trusting an unverified number. Correct, but previously
 * invisible: nothing logged which category dropped, why, or for which
 * report. This locks that each drop site actually logs.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runAutopsy } from '@/lib/autopsy-engine';
import type { Bet } from '@/types';

// ── Anthropic SDK mock ─────────────────────────────────────────────────
// Deliberately includes categories designed NOT to survive verification:
//  - edge_profile.unprofitable_areas: "MLB Totals" - a sport/bet_type
//    combo absent from the fixture entirely (no_match).
//  - edge_profile.profitable_areas: "NFL spread" - present in the real
//    category_roi, but the fixture makes it a net LOSER, so claiming it
//    as profitable is a sign_mismatch.
//  - strategic_leaks: "NHL Moneyline" - also absent from the fixture
//    (no_match).
vi.mock('@anthropic-ai/sdk', () => {
  const mockResponse = {
    biases_detected: [],
    strategic_leaks: [
      { category: 'NHL Moneyline', detail: 'made up', suggestion: 'made up' },
    ],
    edge_profile: {
      profitable_areas: [{ category: 'NFL spread' }],
      unprofitable_areas: [{ category: 'MLB Totals' }],
      reallocation_advice: 'n/a',
    },
    behavioral_patterns: [],
    recommendations: [],
    executive_diagnosis: 'Test diagnosis for drop-instrumentation coverage.',
  };
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

// 120 settled NFL spread bets, mostly losses, so category_roi has a real
// "NFL spread" entry with roi < 0 - clears the 100-bet strategic_leaks
// floor and sets up the sign-mismatch case above.
function makeFixtureBets(): Bet[] {
  const bets: Bet[] = [];
  const baseDate = Date.parse('2026-04-15T20:00:00Z');
  for (let i = 0; i < 120; i++) {
    const isWin = i % 5 === 0; // mostly losses -> net-negative category
    bets.push({
      id: `bet-${i}`,
      user_id: 'test-user',
      placed_at: new Date(baseDate - (120 - i) * 86400000).toISOString(),
      sport: 'NFL',
      league: null,
      bet_type: 'spread',
      description: `NFL spread #${i}`,
      odds: -110,
      stake: 100,
      result: isWin ? 'win' : 'loss',
      payout: isWin ? 191 : 0,
      profit: isWin ? 91 : -100,
      sportsbook: 'DraftKings',
      is_bonus_bet: false,
      parlay_legs: null,
      tags: null,
      notes: null,
      upload_id: null,
      created_at: new Date().toISOString(),
    });
  }
  return bets;
}

describe('drop-site instrumentation', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('logs the strategic_leaks drop with category, categoryRoiExists, and the report id', async () => {
    await runAutopsy(makeFixtureBets(), null, 'test-report-id');

    const call = logSpy.mock.calls.find(
      (c: unknown[]) => c[0] === '[autopsy-engine] strategic_leaks drop'
    );
    expect(call).toBeDefined();
    expect(call?.[1]).toMatchObject({
      reportId: 'test-report-id',
      category: 'NHL Moneyline',
      categoryRoiExists: false,
    });
  });

  it('logs the edge_profile drop for a category with no category_roi match', async () => {
    await runAutopsy(makeFixtureBets(), null, 'test-report-id');

    const call = logSpy.mock.calls.find(
      (c: unknown[]) => c[0] === '[autopsy-engine] edge_profile drop' &&
        (c[1] as Record<string, unknown>)?.category === 'MLB Totals'
    );
    expect(call).toBeDefined();
    expect(call?.[1]).toMatchObject({
      reportId: 'test-report-id',
      kind: 'unprofitable',
      category: 'MLB Totals',
      categoryRoiExists: false,
      reason: 'no_match',
    });
  });

  it('logs the edge_profile drop for a sign mismatch (real category, wrong bucket)', async () => {
    await runAutopsy(makeFixtureBets(), null, 'test-report-id');

    const call = logSpy.mock.calls.find(
      (c: unknown[]) => c[0] === '[autopsy-engine] edge_profile drop' &&
        (c[1] as Record<string, unknown>)?.category === 'NFL spread'
    );
    expect(call).toBeDefined();
    expect(call?.[1]).toMatchObject({
      reportId: 'test-report-id',
      kind: 'profitable',
      category: 'NFL spread',
      categoryRoiExists: true,
      reason: 'sign_mismatch',
    });
  });

  it('omits reportId (undefined) when the caller does not supply one', async () => {
    await runAutopsy(makeFixtureBets(), null);

    const call = logSpy.mock.calls.find(
      (c: unknown[]) => c[0] === '[autopsy-engine] strategic_leaks drop'
    );
    expect(call).toBeDefined();
    expect((call?.[1] as Record<string, unknown>)?.reportId).toBeUndefined();
  });
});

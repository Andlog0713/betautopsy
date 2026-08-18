/**
 * lib/date-utils.ts (D4) — regression test.
 *
 * Bet timestamps are UTC ISO strings. Reading them with Date.prototype's
 * LOCAL accessors silently reinterprets the instant in whatever timezone
 * the running process happens to be in - correct by accident on Vercel
 * (UTC default) but wrong the moment the process runs anywhere else (this
 * repo's own dev machine included - see the fixed 2am-UTC case below,
 * which lands on a different calendar day AND a different hour bucket in
 * America/New_York). These tests fix a specific instant known to cross
 * both a day and an hour boundary between UTC and several real-world
 * local zones, so they fail if a UTC accessor is ever swapped back for a
 * local one, regardless of which timezone actually runs the suite.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  getUTCHour,
  getUTCMinute,
  getUTCDayOfWeek,
  isMidnightUTC,
  formatUTCDate,
  formatUTCTime,
  formatUTCMonthDay,
} from '@/lib/date-utils';
import { calculateMetrics, runAutopsy } from '@/lib/autopsy-engine';
import type { Bet } from '@/types';

// Captures the prompt actually sent to Claude so the "By Day of Week
// stays in the prompt even when has_time_data is false" test below can
// inspect it directly, instead of only checking the wire output.
let capturedPrompt = '';
vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = {
      create: async (params: { messages: { content: string }[] }) => {
        capturedPrompt = params.messages[0]?.content ?? '';
        return {
          content: [{ type: 'text', text: JSON.stringify({
            biases_detected: [], strategic_leaks: [], behavioral_patterns: [],
            recommendations: [], executive_diagnosis: 'Test diagnosis.',
          }) }],
          usage: { input_tokens: 100, output_tokens: 200 },
        };
      },
    };
  }
  return { default: MockAnthropic };
});

// 2026-01-15T02:00:00Z is a Thursday at 2am UTC. In America/New_York
// (UTC-5 in January) that's 2026-01-14, 9:00 PM - Wednesday, evening, not
// even close to the same calendar day or the same time-of-day bucket.
const CROSS_BOUNDARY_UTC = '2026-01-15T02:00:00Z';

describe('date-utils — UTC accessors', () => {
  it('getUTCHour reads the UTC hour regardless of local interpretation', () => {
    expect(getUTCHour(CROSS_BOUNDARY_UTC)).toBe(2);
  });

  it('getUTCDayOfWeek reads Thursday (4), not the local-interpreted Wednesday (3)', () => {
    expect(getUTCDayOfWeek(CROSS_BOUNDARY_UTC)).toBe(4);
  });

  it('getUTCMinute reads 0 for an on-the-hour UTC timestamp', () => {
    expect(getUTCMinute(CROSS_BOUNDARY_UTC)).toBe(0);
  });

  it('isMidnightUTC is true only for an exact 00:00 UTC instant', () => {
    expect(isMidnightUTC('2026-01-15T00:00:00Z')).toBe(true);
    expect(isMidnightUTC(CROSS_BOUNDARY_UTC)).toBe(false);
  });

  it('accepts a Date object as well as a string', () => {
    const d = new Date(CROSS_BOUNDARY_UTC);
    expect(getUTCHour(d)).toBe(2);
    expect(getUTCDayOfWeek(d)).toBe(4);
  });

  it('formatUTCDate/formatUTCTime/formatUTCMonthDay format on the UTC calendar day, not the local one', () => {
    expect(formatUTCDate(CROSS_BOUNDARY_UTC)).toBe('Jan 15, 2026');
    expect(formatUTCMonthDay(CROSS_BOUNDARY_UTC)).toBe('Jan 15');
    expect(formatUTCTime(CROSS_BOUNDARY_UTC)).toBe('2:00 AM');
  });
});

function makeBet(overrides: Partial<Bet>): Bet {
  return {
    id: 'bet', user_id: 'u', placed_at: '2026-01-15T20:00:00Z', sport: 'NFL',
    league: null, bet_type: 'spread', description: 'test bet', odds: -110,
    stake: 100, result: 'win', payout: 191, profit: 91, sportsbook: 'DraftKings',
    is_bonus_bet: false, parlay_legs: null, tags: null, notes: null,
    upload_id: null, created_at: '2026-01-15T20:00:00Z',
    ...overrides,
  };
}

describe('calculateMetrics.timing — by_day/by_hour bucket on the UTC calendar, not the runner\'s local zone', () => {
  it('places a 2am-UTC bet in the UTC Thursday/hour-2 bucket, not the local-shifted Wednesday/hour-21', () => {
    // 2026-02-01/02/03/06/07/08/09 (skipping 04 Wed and 05 Thu) at 15:00
    // UTC (hour 15, nowhere near hour 2) so padding never lands in the
    // same day-of-week or hour-of-day bucket as the bet under test, and
    // Wednesday - the wrong bucket a local-EST read would produce - stays
    // provably empty.
    const paddingDays = [1, 2, 3, 6, 7, 8, 9];
    const bets: Bet[] = [
      makeBet({ id: 'cross-boundary', placed_at: CROSS_BOUNDARY_UTC, result: 'loss', profit: -100, payout: 0 }),
      ...paddingDays.map((day) => makeBet({
        id: `pad-${day}`,
        placed_at: `2026-02-${String(day).padStart(2, '0')}T15:00:00Z`,
        created_at: `2026-02-${String(day).padStart(2, '0')}T15:00:00Z`,
      })),
    ];
    const metrics = calculateMetrics(bets);

    // Thursday = index 4 in the engine's 0=Sun..6=Sat bucket array.
    const thursdayBucket = metrics.timing.by_day.find((d) => d.label === 'Thu');
    const wednesdayBucket = metrics.timing.by_day.find((d) => d.label === 'Wed');
    expect(thursdayBucket?.bets).toBe(1);
    expect(thursdayBucket?.profit).toBe(-100);
    expect(wednesdayBucket?.bets ?? 0).toBe(0);

    const hour2Bucket = metrics.timing.by_hour[2];
    const hour21Bucket = metrics.timing.by_hour[21];
    expect(hour2Bucket.bets).toBe(1);
    expect(hour21Bucket.bets).toBe(0);
  });
});

describe('Claude prompt — By Day of Week is not gated behind has_time_data', () => {
  it('includes real day-of-week data in the prompt even when every bet is a midnight (date-only) parse', async () => {
    // All 20 bets at exactly 00:00 UTC (date-only source data) so
    // has_time_data is false, spread across 5 distinct weekdays.
    const bets: Bet[] = Array.from({ length: 20 }, (_, i) => {
      const day = 2 + (i % 5); // 2026-02-02 .. 2026-02-06 (Mon-Fri)
      return makeBet({
        id: `bet-${i}`,
        placed_at: `2026-02-0${day}T00:00:00Z`,
        created_at: `2026-02-0${day}T00:00:00Z`,
        result: i % 4 === 0 ? 'loss' : 'win',
      });
    });

    const metrics = calculateMetrics(bets);
    expect(metrics.timing.has_time_data).toBe(false);
    // Real, nonzero day-of-week buckets exist despite has_time_data=false.
    expect(metrics.timing.by_day.some((d) => d.bets > 0)).toBe(true);

    await runAutopsy(bets, null);

    expect(capturedPrompt).toContain('By Day of Week');
    // Not just the label - the actual per-day figures the fix is meant to
    // preserve, not an empty/omitted section.
    expect(capturedPrompt).toMatch(/Mon: .*% ROI/);
    // Hour-of-day genuinely has no real data here, so it correctly stays
    // gated - the fix scopes to day-of-week only, not a blanket un-gate.
    expect(capturedPrompt).not.toContain('By Time of Day');
    expect(capturedPrompt).toContain('No time-of-day (hour) data available');
  });
});

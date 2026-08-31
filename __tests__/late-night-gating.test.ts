import { describe, it, expect } from 'vitest';
import { calculateMetrics } from '@/lib/autopsy-engine';
import { attachCanonicalControlRules } from '@/lib/control-system';
import type { AutopsyAnalysis, Bet } from '@/types';
import { markFixtureTimestampAsSourced } from './helpers/known-instant';

// Integrity guard for temporal-provenance source-clock handling. Date-only
// values have no clock, and a source clock is not assumed to be local time.
// The engine may disclose the source-clock window as an observation, but it
// must not turn that window into a behavioral bias or annotation signal.

function makeBet(overrides: Partial<Bet> = {}): Bet {
  return markFixtureTimestampAsSourced({
    id: `b-${Math.random().toString(36).slice(2, 10)}`,
    user_id: 'user-test',
    placed_at: '2025-03-15T14:00:00Z',
    sport: 'NFL',
    league: 'NFL',
    bet_type: 'spread',
    description: 'test bet',
    odds: -110,
    stake: 100,
    result: 'loss',
    payout: 0,
    profit: -100,
    sportsbook: 'DraftKings',
    is_bonus_bet: false,
    parlay_legs: null,
    tags: null,
    notes: null,
    upload_id: 'upload-test',
    created_at: '2025-03-15T14:00:00Z',
    ...overrides,
  });
}

// One deeply-negative bet per day. `hour` selects the LOCAL clock hour so the
// timing detection is timezone-agnostic on any test runner (mirrors the
// convention in bias-depth.test.ts).
function dailyBetsAtHour(count: number, hour: number, minute = 0): Bet[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(2024, 0, 1 + i, hour, minute, 0));
    return makeBet({
      placed_at: d.toISOString(),
      source_placed_at: d.toISOString(),
      placed_date: d.toISOString().slice(0, 10),
      placed_time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
      source_timezone: 'Z',
      timestamp_quality: 'instant',
      created_at: d.toISOString(),
    });
  });
}

function dateOnlyBets(count: number): Bet[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10);
    return makeBet({
      placed_at: null,
      source_placed_at: date,
      placed_date: date,
      placed_time: null,
      source_timezone: null,
      timestamp_quality: 'date_only',
    });
  });
}

const isLateNightBias = (name: string) => /late.night/i.test(name);

describe('late-night gating on date-only timestamps', () => {
  it('fires NO late-night finding on a 600-bet date-only history', () => {
    const bets = dateOnlyBets(600);
    const metrics = calculateMetrics(bets);

    const lateNightBiases = metrics.biases_detected.filter((b) => isLateNightBias(b.bias_name));
    expect(lateNightBiases).toHaveLength(0);
  });

  it('emits no late_night annotation signal on a date-only history', () => {
    const bets = dateOnlyBets(600);
    const metrics = calculateMetrics(bets);

    const annotations = metrics.annotations?.annotations ?? [];
    const hasLateNight = annotations.some((a) => a.signals.some((s) => s.name === 'late_night'));
    expect(hasLateNight).toBe(false);
  });

  it('does not generalize a late-night finding from a low-coverage clock subset', () => {
    const bets = [
      ...dateOnlyBets(95),
      ...dailyBetsAtHour(5, 2, 0),
    ];
    const metrics = calculateMetrics(bets);

    const lateNightBiases = metrics.biases_detected.filter((bias) => isLateNightBias(bias.bias_name));
    expect(metrics.timing.time_bearing_bets).toBe(5);
    expect(metrics.timing.has_time_data).toBe(false);
    expect(lateNightBiases).toHaveLength(0);
  });

  it('discloses a genuine 2am source-clock cohort without calling it a behavioral bias', () => {
    const bets = dailyBetsAtHour(600, 2, 0);
    const metrics = calculateMetrics(bets);

    const lateNightBiases = metrics.biases_detected.filter((b) => isLateNightBias(b.bias_name));
    const hasLateNightSignal = metrics.annotations?.annotations.some(
      (annotation) => annotation.signals.some((signal) => signal.name === 'late_night'),
    );
    expect(metrics.timing.local_time_confirmed).toBe(false);
    expect(metrics.timing.late_night_stats).toBeNull();
    expect(metrics.timing.source_clock_window_stats?.count).toBe(600);
    expect(lateNightBiases).toHaveLength(0);
    expect(hasLateNightSignal).toBe(false);
  });

  it('does not list source-clock windows as a relapse trigger', () => {
    const metrics = calculateMetrics(dailyBetsAtHour(600, 2, 0));
    const analysis = attachCanonicalControlRules({
      summary: {
        total_bets: metrics.summary.total_bets,
        record: metrics.summary.record,
        total_profit: metrics.summary.total_profit,
        roi_percent: metrics.summary.roi_percent,
        avg_stake: metrics.summary.avg_stake,
        date_range: metrics.summary.date_range,
        overall_grade: null,
      },
      biases_detected: [],
      strategic_leaks: [],
      behavioral_patterns: [],
      recommendations: [],
      emotion_score: metrics.emotion_score,
      bankroll_health: metrics.bankroll_health,
      timing_analysis: metrics.timing,
    } as AutopsyAnalysis);

    expect(analysis.control_system?.relapseTriggers).not.toContain('Late-night betting windows');
  });
});

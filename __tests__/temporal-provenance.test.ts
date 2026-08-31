import { describe, expect, it } from 'vitest';
import { calculateMetrics } from '@/lib/autopsy-engine';
import { parseCSV } from '@/lib/csv-parser';
import {
  comparableBetSequences,
  containsLocalTimeBehaviorClaim,
  compareBetsByRecordedTime,
  formatCalendarDate,
  manualDateTemporalFields,
  sanitizeUnconfirmedLocalTimeClaims,
  stripLocalTimeBehaviorSentences,
  stripUnprovableResultSequenceSentences,
} from '@/lib/temporal-provenance';
import type { AutopsyAnalysis, Bet } from '@/types';

function csvRow(timestamp: string): string {
  return [
    'date,sport,bet_type,description,odds,stake,result,profit,sportsbook',
    `${timestamp},NFL,spread,Chiefs -3.5,-110,100,win,91,DraftKings`,
  ].join('\n');
}

function timedBets(params: {
  sourceHour: number;
  utcHour: number;
  sourceTimezone: string;
}): Bet[] {
  return Array.from({ length: 100 }, (_, index) => {
    const day = String((index % 27) + 1).padStart(2, '0');
    const sourceHour = String(params.sourceHour).padStart(2, '0');
    const utcHour = String(params.utcHour).padStart(2, '0');
    return {
      id: `timed-${index}`,
      user_id: 'user-1',
      placed_at: `2026-01-${day}T${utcHour}:30:00.000Z`,
      source_placed_at: `2026-01-${day}T${sourceHour}:30:00${params.sourceTimezone}`,
      placed_date: `2026-01-${day}`,
      placed_time: `${sourceHour}:30:00`,
      source_timezone: params.sourceTimezone,
      timestamp_quality: 'instant',
      sport: 'NFL',
      league: null,
      bet_type: 'spread',
      description: `Timed bet ${index}`,
      odds: -110,
      stake: 100,
      result: index % 2 === 0 ? 'win' : 'loss',
      payout: index % 2 === 0 ? 191 : 0,
      profit: index % 2 === 0 ? 91 : -100,
      sportsbook: 'DraftKings',
      is_bonus_bet: false,
      parlay_legs: null,
      tags: null,
      notes: null,
      upload_id: 'upload-1',
      created_at: '2026-02-01T00:00:00.000Z',
    } as Bet;
  });
}

describe('temporal provenance', () => {
  it('formats a source calendar date without a browser timezone shift', () => {
    expect(formatCalendarDate('2026-01-05')).toBe('Jan 5, 2026');
    expect(formatCalendarDate('not-a-date')).toBe('Date unknown');
  });

  it('preserves a date-only CSV value without manufacturing an instant', () => {
    const result = parseCSV(csvRow('2026-01-05'));

    expect(result.bets).toHaveLength(1);
    expect(result.bets[0]).toMatchObject({
      placed_at: null,
      source_placed_at: '2026-01-05',
      placed_date: '2026-01-05',
      placed_time: null,
      source_timezone: null,
      timestamp_quality: 'date_only',
    });
  });

  it('preserves a timezone-naive clock without inventing an offset', () => {
    const result = parseCSV(csvRow('2026-01-05T14:30:00'));

    expect(result.bets).toHaveLength(1);
    expect(result.bets[0]).toMatchObject({
      placed_at: null,
      source_placed_at: '2026-01-05T14:30:00',
      placed_date: '2026-01-05',
      placed_time: '14:30:00',
      source_timezone: null,
      timestamp_quality: 'local_datetime',
    });
  });

  it('normalizes a sourced AM/PM clock without inventing a timezone', () => {
    const result = parseCSV(csvRow('2/10/2026 7:30 PM'));

    expect(result.bets).toHaveLength(1);
    expect(result.bets[0]).toMatchObject({
      placed_at: null,
      source_placed_at: '2/10/2026 7:30 PM',
      placed_date: '2026-02-10',
      placed_time: '19:30:00',
      source_timezone: null,
      timestamp_quality: 'local_datetime',
    });
  });

  it('accepts an ISO calendar date with an AM/PM clock', () => {
    const result = parseCSV(csvRow('2026-02-10 7:30 PM'));

    expect(result.bets[0]).toMatchObject({
      placed_at: null,
      placed_date: '2026-02-10',
      placed_time: '19:30:00',
      source_timezone: null,
      timestamp_quality: 'local_datetime',
    });
  });

  it('preserves fractional source seconds on a local clock', () => {
    const result = parseCSV(csvRow('2026-02-10T19:30:00.123456'));

    expect(result.bets[0]).toMatchObject({
      placed_at: null,
      placed_date: '2026-02-10',
      placed_time: '19:30:00.123456',
      source_timezone: null,
      timestamp_quality: 'local_datetime',
    });
  });

  it('uses the same date-only contract for manual entry', () => {
    expect(manualDateTemporalFields('2026-02-10')).toEqual({
      placed_at: null,
      source_placed_at: '2026-02-10',
      placed_date: '2026-02-10',
      placed_time: null,
      source_timezone: null,
      timestamp_quality: 'date_only',
    });
  });

  it('retains the source clock and timezone beside a qualified instant', () => {
    const result = parseCSV(csvRow('2026-01-05T23:30:00-05:00'));

    expect(result.bets).toHaveLength(1);
    expect(result.bets[0]).toMatchObject({
      placed_at: '2026-01-06T04:30:00.000Z',
      source_placed_at: '2026-01-05T23:30:00-05:00',
      placed_date: '2026-01-05',
      placed_time: '23:30:00',
      source_timezone: '-05:00',
      timestamp_quality: 'instant',
    });
  });

  it('buckets a qualified timestamp by its sourced clock, not normalized UTC', () => {
    const metrics = calculateMetrics(timedBets({
      sourceHour: 23,
      utcHour: 4,
      sourceTimezone: '-05:00',
    }));

    expect(metrics.timing.by_hour[23].bets).toBe(100);
    expect(metrics.timing.by_hour[4].bets).toBe(0);
    expect(metrics.timing.late_night_stats).toBeNull();
    expect(metrics.timing.source_clock_window_stats?.count).toBe(100);
  });

  it('orders qualified timestamps by their real instant across source offsets', () => {
    const later = parseCSV(csvRow('2026-01-01T23:30:00-05:00')).bets[0];
    const earlier = parseCSV(csvRow('2026-01-02T03:00:00Z')).bets[0];
    const laterBet = { id: 'later', ...later } as unknown as Bet;
    const earlierBet = { id: 'earlier', ...earlier } as unknown as Bet;

    expect([laterBet, earlierBet].sort(compareBetsByRecordedTime).map((bet) => bet.id))
      .toEqual(['earlier', 'later']);
    expect(calculateMetrics([laterBet, earlierBet]).summary.date_range)
      .toBe('2026-01-01 to 2026-01-02');
  });

  it('keeps presentation ordering transitive across mixed timestamp qualities', () => {
    const exact = parseCSV(csvRow('2026-01-05T12:00:00Z')).bets[0];
    const local = parseCSV(csvRow('2026-01-05T13:00:00')).bets[0];
    const dateOnly = parseCSV(csvRow('2026-01-05')).bets[0];
    const mixed = [
      { id: 'date', ...dateOnly },
      { id: 'local', ...local },
      { id: 'exact', ...exact },
    ] as unknown as Bet[];

    expect(mixed.sort(compareBetsByRecordedTime).map((bet) => bet.id))
      .toEqual(['exact', 'local', 'date']);
  });

  it('does not sequence timezone-naive clocks across sportsbooks', () => {
    const draftKings = parseCSV(csvRow('2026-01-05T14:30:00')).bets[0];
    const fanDuel = parseCSV(csvRow('2026-01-05T14:31:00')).bets[0];
    const bets = [
      { id: 'dk', upload_id: 'upload-1', ...draftKings, sportsbook: 'DraftKings' },
      { id: 'fd', upload_id: 'upload-1', ...fanDuel, sportsbook: 'FanDuel' },
    ] as unknown as Bet[];

    expect(comparableBetSequences(bets).map((sequence) => sequence.map((bet) => bet.id)))
      .toEqual([['dk'], ['fd']]);
  });

  it('keeps a genuine sourced midnight as real clock data', () => {
    const metrics = calculateMetrics(timedBets({
      sourceHour: 0,
      utcHour: 0,
      sourceTimezone: 'Z',
    }));

    expect(metrics.timing.has_time_data).toBe(true);
    expect(metrics.timing.by_hour[0].bets).toBe(100);
    expect(metrics.timing.late_night_stats).toBeNull();
    expect(metrics.timing.source_clock_window_stats?.count).toBe(100);
  });

  it('does not reinterpret a legacy midnight instant as sourced clock data', () => {
    const legacyBets = timedBets({
      sourceHour: 0,
      utcHour: 0,
      sourceTimezone: 'Z',
    }).map((bet) => ({
      ...bet,
      source_placed_at: null,
      placed_date: null,
      placed_time: null,
      source_timezone: null,
      timestamp_quality: 'legacy_unknown' as const,
    }));

    const metrics = calculateMetrics(legacyBets);
    expect(metrics.timing.has_time_data).toBe(false);
    expect(metrics.timing.by_hour[0].bets).toBe(0);
    expect(metrics.timing.late_night_stats).toBeNull();
  });

  it('treats a pre-provenance row with no quality marker as legacy unknown', () => {
    const legacyBets = timedBets({
      sourceHour: 0,
      utcHour: 0,
      sourceTimezone: 'Z',
    }).map((bet) => ({
      ...bet,
      source_placed_at: undefined,
      placed_date: undefined,
      placed_time: undefined,
      source_timezone: undefined,
      timestamp_quality: undefined,
    }));

    const metrics = calculateMetrics(legacyBets);
    expect(metrics.timing.has_time_data).toBe(false);
    expect(metrics.timing.legacy_unknown_bets).toBe(100);
    expect(metrics.timing.by_hour[0].bets).toBe(0);
  });

  it('detects and removes model-authored local-time behavior claims', () => {
    expect(containsLocalTimeBehaviorClaim('Stop betting after 11pm.')).toBe(true);
    expect(containsLocalTimeBehaviorClaim({ title: 'Late-night losses' })).toBe(true);
    expect(containsLocalTimeBehaviorClaim('The source clock is preserved exactly.')).toBe(false);
    expect(stripLocalTimeBehaviorSentences(
      'Stake sizing was uneven. Your losses after 11pm were severe. Parlays also underperformed.',
    )).toBe('Stake sizing was uneven. Parlays also underperformed.');
  });

  it('removes model-authored claims that require missing settlement timestamps', () => {
    expect(stripUnprovableResultSequenceSentences(
      'Stakes jumped after losses. Parlays also underperformed.',
    )).toBe('Parlays also underperformed.');
    expect(stripUnprovableResultSequenceSentences(
      'Stakes rose on bets following rows later settled as losses. Settlement timing is unavailable.',
    )).toBe('Stakes rose on bets following rows later settled as losses. Settlement timing is unavailable.');
  });

  it('suppresses unverified temporal sections and claims on a historical saved report', () => {
    const historical = {
      summary: {
        total_bets: 100,
        record: '50W-50L-0P',
        total_profit: -100,
        roi_percent: -1,
        avg_stake: 100,
        date_range: '2026-01-01 to 2026-02-01',
        overall_grade: null,
      },
      biases_detected: [{
        bias_name: 'Late Night Bias',
        severity: 'high',
        description: 'Late-night losses were severe.',
        evidence: 'Most losses came after midnight.',
        estimated_cost: 100,
        fix: 'Stop at 11pm.',
      }, {
        bias_name: 'Post-Loss Escalation',
        severity: 'medium',
        description: 'Stakes jumped after losses. Stake sizing also varied widely.',
        evidence: 'A losing result triggered the next increase. The source rows show uneven stakes.',
        estimated_cost: 50,
        fix: 'Keep stakes consistent.',
      }],
      strategic_leaks: [],
      behavioral_patterns: [{
        pattern_name: 'Overnight decline',
        description: 'Late-night bets lost.',
        frequency: 'Often',
        impact: 'negative',
        data_points: 'After 11pm',
      }],
      recommendations: [{
        priority: 1,
        title: 'Set an 11pm cutoff',
        description: 'Stop at 11pm.',
        expected_improvement: 'Avoid overnight losses.',
        difficulty: 'easy',
      }],
      emotion_score: 50,
      bankroll_health: 'caution',
      timing_analysis: {
        by_hour: [],
        by_day: [],
        best_window: null,
        worst_window: null,
        late_night_stats: { count: 20, roi: -10, pct_of_total: 20 },
        has_time_data: true,
      },
      session_analysis: {
        total_sessions: 2,
        avg_bets_per_winning_session: 2,
        avg_bets_per_losing_session: 3,
        worst_session: { date: '2026-01-01', bets: 3, duration: '11:00 PM - 1:00 AM', starting_stake: 100, ending_stake: 100, net: -300, description: 'After midnight.' },
        best_session: { date: '2026-01-02', bets: 2, duration: '2:00 PM - 3:00 PM', starting_stake: 100, ending_stake: 100, net: 182, description: 'Afternoon control.' },
        insight: 'Late-night sessions lost.',
      },
      executive_diagnosis: 'Your sizing is uneven. Late-night bets hurt.',
      betiq: {
        score: 40,
        components: { line_value: 10, calibration: 5, sophistication: 5, specialization: 5, timing: 10, confidence: 5 },
        percentile: null,
        interpretation: 'Old interpretation.',
        insufficient_data: false,
      },
      contradictions: [{
        title: 'Legacy annual projection',
        insight: 'NBA was the highest-volume losing category. Reallocating volume could recover $4,000/year.',
        volumeLabel: 'YOUR VOLUME',
        volumeData: 'NBA: 40 bets',
        edgeLabel: 'YOUR EDGE',
        edgeData: 'NFL: 20 bets',
        annualCost: 4000,
      }],
    } as AutopsyAnalysis;

    const sanitized = sanitizeUnconfirmedLocalTimeClaims(historical);
    expect(sanitized.biases_detected).toHaveLength(1);
    expect(sanitized.biases_detected[0]).toMatchObject({
      bias_name: 'Post-Loss Escalation',
      description: 'Stake sizing also varied widely.',
      evidence: 'The source rows show uneven stakes.',
    });
    expect(sanitized.behavioral_patterns).toEqual([]);
    expect(sanitized.recommendations).toEqual([]);
    expect(sanitized.executive_diagnosis).toBe('Your sizing is uneven.');
    expect(sanitized.timing_analysis).toBeUndefined();
    expect(sanitized.session_analysis).toBeUndefined();
    expect(sanitized.betiq?.components.timing).toBe(5);
    expect(sanitized.betiq?.score).toBe(35);
    expect(sanitized.contradictions?.[0]).toMatchObject({
      insight: 'NBA was the highest-volume losing category.',
    });
    expect(sanitized.contradictions?.[0].annualCost).toBeUndefined();
  });
});

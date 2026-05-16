import { describe, it, expect } from 'vitest';
import {
  normalizeSessionDate,
  composeRefId,
  isSessionFresh,
  buildHeatedCopy,
  pickHeatedSessionForPush,
} from '@/lib/push-heated';
import type { AutopsyAnalysis, DetectedSession } from '@/types';

function makeSession(overrides: Partial<DetectedSession> = {}): DetectedSession {
  return {
    id: 'SESSION-001',
    date: '2026-05-12',
    dayOfWeek: 'Tuesday',
    startTime: '7:30 PM',
    endTime: '11:45 PM',
    durationMinutes: 255,
    bets: 6,
    wins: 2,
    losses: 4,
    pushes: 0,
    staked: 300,
    profit: -180,
    roi: -60,
    avgStake: 50,
    startingStake: 25,
    endingStake: 100,
    stakeEscalation: 4,
    maxStake: 100,
    minStake: 25,
    stakeCv: 0.5,
    betsPerHour: 1.4,
    longestLossStreak: 3,
    chasedAfterLoss: true,
    chaseCount: 2,
    lateNight: true,
    grade: 'F',
    gradeReasons: [],
    isHeated: true,
    heatSignals: [],
    betIndices: [0, 1, 2, 3, 4, 5],
    ...overrides,
  };
}

function makeAnalysis(sessions: DetectedSession[]): AutopsyAnalysis {
  return {
    summary: {
      total_bets: 100,
      record: '50-45-5',
      total_profit: 0,
      roi_percent: 0,
      avg_stake: 25,
      date_range: '',
      overall_grade: null,
    },
    biases_detected: [],
    strategic_leaks: [],
    behavioral_patterns: [],
    recommendations: [],
    emotion_score: 0,
    bankroll_health: 'healthy',
    session_detection: {
      sessions,
      totalSessions: sessions.length,
      avgSessionLength: 0,
      avgSessionDuration: 0,
      sessionGradeDistribution: [],
      heatedSessionCount: sessions.filter(s => s.isHeated).length,
      heatedSessionPercent: 0,
      avgGradedROI: {},
      bestSession: null,
      worstSession: null,
      insight: '',
    },
  } as AutopsyAnalysis;
}

describe('normalizeSessionDate', () => {
  it('accepts ISO format', () => {
    expect(normalizeSessionDate('2025-11-03')).toBe('2025-11-03');
  });
  it('accepts ISO with time suffix', () => {
    expect(normalizeSessionDate('2025-11-03T12:30:00Z')).toBe('2025-11-03');
  });
  it('accepts human format from production', () => {
    expect(normalizeSessionDate('Nov 26, 2023')).toBe('2023-11-26');
  });
  it('handles month/day boundary correctly', () => {
    expect(normalizeSessionDate('Jan 1, 2026')).toBe('2026-01-01');
    expect(normalizeSessionDate('Dec 31, 2025')).toBe('2025-12-31');
  });
  it('returns null on garbage', () => {
    expect(normalizeSessionDate('')).toBeNull();
    expect(normalizeSessionDate(null)).toBeNull();
    expect(normalizeSessionDate(undefined)).toBeNull();
    expect(normalizeSessionDate('not a date')).toBeNull();
  });
});

describe('composeRefId', () => {
  it('builds normalized_date:startTime', () => {
    const s = makeSession({ date: 'Nov 26, 2023', startTime: '7:14 PM' });
    expect(composeRefId(s)).toBe('2023-11-26:7:14 PM');
  });
  it('returns null when date unparseable', () => {
    const s = makeSession({ date: 'gibberish', startTime: '7:14 PM' });
    expect(composeRefId(s)).toBeNull();
  });
  it('returns null when startTime missing', () => {
    const s = makeSession({ startTime: '' });
    expect(composeRefId(s)).toBeNull();
  });
});

describe('isSessionFresh', () => {
  const NOW = Date.parse('2026-05-16T12:00:00Z');
  it('accepts a session inside the 14-day window', () => {
    const s = makeSession({ date: '2026-05-10' });
    expect(isSessionFresh(s, NOW)).toBe(true);
  });
  it('rejects a session older than 14 days', () => {
    const s = makeSession({ date: '2026-04-30' });
    expect(isSessionFresh(s, NOW)).toBe(false);
  });
  it('rejects ancient sessions even after re-analysis', () => {
    const s = makeSession({ date: 'Nov 26, 2023' });
    expect(isSessionFresh(s, NOW)).toBe(false);
  });
  it('rejects unparseable dates', () => {
    const s = makeSession({ date: 'garbage' });
    expect(isSessionFresh(s, NOW)).toBe(false);
  });
});

describe('buildHeatedCopy', () => {
  it('uses late-night phrasing when lateNight=true', () => {
    const s = makeSession({
      dayOfWeek: 'Sunday',
      lateNight: true,
      bets: 7,
      durationMinutes: 420,
    });
    expect(buildHeatedCopy(s)).toEqual({
      title: 'Heated session detected',
      body: 'We caught a heated session. Sunday night, 7 bets in 7h. Tap to see the autopsy.',
    });
  });
  it('drops night suffix when lateNight=false', () => {
    const s = makeSession({
      dayOfWeek: 'Saturday',
      lateNight: false,
      bets: 4,
      durationMinutes: 90,
    });
    expect(buildHeatedCopy(s).body).toContain('Saturday, 4 bets');
    expect(buildHeatedCopy(s).body).not.toContain('Saturday night');
  });
  it('clamps durationHours to at least 1h', () => {
    const s = makeSession({ durationMinutes: 5 });
    expect(buildHeatedCopy(s).body).toContain('in 1h');
  });
  it('falls back to Recent when dayOfWeek empty', () => {
    const s = makeSession({ dayOfWeek: '', lateNight: false });
    expect(buildHeatedCopy(s).body).toContain('Recent,');
  });
});

describe('pickHeatedSessionForPush', () => {
  const NOW = Date.parse('2026-05-16T12:00:00Z');

  it('returns null when no sessions exist', () => {
    const a = makeAnalysis([]);
    expect(pickHeatedSessionForPush(a, NOW)).toBeNull();
  });
  it('returns null when no sessions are heated', () => {
    const a = makeAnalysis([makeSession({ isHeated: false })]);
    expect(pickHeatedSessionForPush(a, NOW)).toBeNull();
  });
  it('returns null when heated sessions are all stale', () => {
    const a = makeAnalysis([
      makeSession({ isHeated: true, date: 'Nov 26, 2023' }),
    ]);
    expect(pickHeatedSessionForPush(a, NOW)).toBeNull();
  });
  it('picks the most recent fresh heated session', () => {
    const a = makeAnalysis([
      makeSession({ id: 'A', date: '2026-05-04', isHeated: true }),
      makeSession({ id: 'B', date: '2026-05-12', isHeated: true }),
      makeSession({ id: 'C', date: '2026-05-08', isHeated: true }),
    ]);
    expect(pickHeatedSessionForPush(a, NOW)?.id).toBe('B');
  });
  it('breaks date ties by later startTime', () => {
    const a = makeAnalysis([
      makeSession({ id: 'EARLY', date: '2026-05-12', startTime: '2:00 PM', isHeated: true }),
      makeSession({ id: 'LATE',  date: '2026-05-12', startTime: '9:30 PM', isHeated: true }),
    ]);
    expect(pickHeatedSessionForPush(a, NOW)?.id).toBe('LATE');
  });
  it('ignores stale heated and picks fresh non-heated as null', () => {
    const a = makeAnalysis([
      makeSession({ id: 'STALE', date: '2026-04-01', isHeated: true }),
      makeSession({ id: 'COOL',  date: '2026-05-12', isHeated: false }),
    ]);
    expect(pickHeatedSessionForPush(a, NOW)).toBeNull();
  });
});

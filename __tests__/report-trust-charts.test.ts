import { describe, it, expect } from 'vitest';
import {
  selectHeroSession,
  buildHeroSessionTimeline,
  buildSessionTimelineSilhouette,
  buildReportCharts,
} from '@/lib/engine/charts';
import { calculateMetrics, detectAndGradeSessions, runSnapshot } from '@/lib/autopsy-engine';
import type { Bet, DetectedSession, SessionDetectionResult } from '@/types';

// ── helpers ──────────────────────────────────────────────────────────

let betSeq = 0;
function makeBet(overrides: Partial<Bet> = {}): Bet {
  betSeq++;
  return {
    id: `bet-${betSeq}`,
    user_id: 'user-1',
    placed_at: '2026-02-01T17:00:00.000Z',
    sport: 'NBA',
    league: null,
    bet_type: 'spread',
    description: `Test bet ${betSeq}`,
    odds: -110,
    stake: 50,
    result: 'loss',
    payout: 0,
    profit: -50,
    sportsbook: null,
    is_bonus_bet: false,
    parlay_legs: null,
    tags: null,
    notes: null,
    upload_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeSession(overrides: Partial<DetectedSession> = {}): DetectedSession {
  return {
    id: 'SESSION-001',
    date: 'Feb 1, 2026',
    dayOfWeek: 'Sunday',
    startTime: '5:00 PM',
    endTime: '7:00 PM',
    durationMinutes: 120,
    bets: 6,
    wins: 2,
    losses: 4,
    pushes: 0,
    staked: 300,
    profit: -200,
    roi: -66,
    avgStake: 50,
    startingStake: 50,
    endingStake: 50,
    stakeEscalation: 1,
    maxStake: 50,
    minStake: 50,
    stakeCv: 0,
    betsPerHour: 3,
    longestLossStreak: 3,
    chasedAfterLoss: false,
    chaseCount: 0,
    lateNight: false,
    grade: 'C',
    gradeReasons: [],
    isHeated: false,
    heatSignals: [],
    betIndices: [],
    ...overrides,
  };
}

function makeDetection(sessions: DetectedSession[]): SessionDetectionResult {
  return {
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
  };
}

// A chase-heavy losing session: 12 bets 10 minutes apart, stakes escalating
// after losses. Grade F by construction (marathon + rapid + escalation +
// chases + loss streak + heavy ROI) -> heated.
function heatedSessionBets(dayOffset: number): Bet[] {
  const base = new Date('2026-02-01T17:00:00.000Z').getTime() + dayOffset * 86400000;
  const stakes = [50, 70, 95, 120, 150, 60, 85, 115, 145, 180, 220, 260];
  return stakes.map((stake, i) => {
    const win = i === 5; // single mid-session win, everything else chases
    return makeBet({
      placed_at: new Date(base + i * 10 * 60000).toISOString(),
      stake,
      result: win ? 'win' : 'loss',
      profit: win ? Math.round(stake * 0.91) : -stake,
      payout: win ? stake + Math.round(stake * 0.91) : 0,
    });
  });
}

// Calm filler: one small daytime bet per day, mixed results.
function calmBets(count: number, startDay: number): Bet[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date('2026-02-01T12:00:00.000Z').getTime() + (startDay + i) * 86400000;
    return makeBet({
      placed_at: new Date(d).toISOString(),
      result: i % 2 === 0 ? 'win' : 'loss',
      profit: i % 2 === 0 ? 45 : -50,
      payout: i % 2 === 0 ? 95 : 0,
    });
  });
}

// ── selectHeroSession ────────────────────────────────────────────────

describe('selectHeroSession', () => {
  it('prefers the losing heated session', () => {
    const hero = selectHeroSession(makeDetection([
      makeSession({ id: 'S-CALM', isHeated: false, profit: -900, wins: 3, losses: 5 }),
      makeSession({ id: 'S-WINRISKY', isHeated: true, framing: 'win-but-risky', profit: 3174, wins: 6, losses: 4 }),
      makeSession({ id: 'S-LOSINGHEAT', isHeated: true, framing: 'loss', profit: -400, wins: 1, losses: 7 }),
    ]));
    expect(hero?.id).toBe('S-LOSINGHEAT');
  });

  it('falls back to a win-but-risky heated session when every heated session won', () => {
    const hero = selectHeroSession(makeDetection([
      makeSession({ id: 'S-CALM', isHeated: false, profit: -900, wins: 3, losses: 5 }),
      makeSession({ id: 'S-WINRISKY', isHeated: true, framing: 'win-but-risky', profit: 3174, wins: 6, losses: 4 }),
    ]));
    expect(hero?.id).toBe('S-WINRISKY');
  });

  it('skips sessions with fewer than 4 settled bets (no meaningful curve)', () => {
    const hero = selectHeroSession(makeDetection([
      makeSession({ id: 'S-THIN', isHeated: true, framing: 'loss', profit: -800, wins: 0, losses: 3 }),
      makeSession({ id: 'S-NEXT', isHeated: true, framing: 'loss', profit: -300, wins: 2, losses: 4 }),
    ]));
    expect(hero?.id).toBe('S-NEXT');
  });

  it('returns null when no session can form a curve', () => {
    const hero = selectHeroSession(makeDetection([
      makeSession({ id: 'S-THIN', isHeated: true, profit: -800, wins: 1, losses: 2 }),
    ]));
    expect(hero).toBeNull();
    expect(selectHeroSession(null)).toBeNull();
  });
});

// ── buildHeroSessionTimeline ─────────────────────────────────────────

describe('buildHeroSessionTimeline', () => {
  it('emits offsets, outcomes, and chase markers matching the engine chase rule', () => {
    betSeq = 0;
    const bets = heatedSessionBets(0);
    const detection = detectAndGradeSessions(bets);
    const session = detection.sessions[0];
    expect(session.isHeated).toBe(true);

    const timeline = buildHeroSessionTimeline(session, bets);
    expect(timeline).toHaveLength(12); // all settled
    expect(timeline[0].tOffsetMin).toBe(0);
    expect(timeline[1].tOffsetMin).toBe(10);
    expect(timeline[11].tOffsetMin).toBe(110);
    // marker count matches the session's chaseCount (all bets settled)
    expect(timeline.filter(p => p.isChaseMarker)).toHaveLength(session.chaseCount);
    // the bet after the lone win is never a chase marker
    expect(timeline[6].isChaseMarker).toBe(false);
    for (const p of timeline) {
      expect(['win', 'loss']).toContain(p.outcome);
      expect(typeof p.stakeUSD).toBe('number');
    }
  });

  it('drops push/void/pending bets from the curve', () => {
    betSeq = 0;
    const bets = heatedSessionBets(0);
    bets[3] = { ...bets[3], result: 'push', profit: 0, payout: bets[3].stake };
    const detection = detectAndGradeSessions(bets);
    const timeline = buildHeroSessionTimeline(detection.sessions[0], bets);
    expect(timeline).toHaveLength(11);
    expect(timeline.every(p => p.outcome === 'win' || p.outcome === 'loss')).toBe(true);
  });
});

// ── silhouette ───────────────────────────────────────────────────────

describe('buildSessionTimelineSilhouette', () => {
  it('normalizes the stake curve to 0..1 with no dollar fields', () => {
    betSeq = 0;
    const bets = [...heatedSessionBets(0), ...calmBets(10, 2)];
    const metrics = calculateMetrics(bets);
    const result = buildSessionTimelineSilhouette(metrics.sessionDetection, bets);
    expect(result).not.toBeNull();
    expect(result!.worstSessionDate).toBeTruthy();
    expect(result!.silhouette.length).toBeGreaterThanOrEqual(4);
    const norms = result!.silhouette.map(p => p.stakeNorm);
    expect(Math.max(...norms)).toBe(1);
    for (const p of result!.silhouette) {
      expect(p.stakeNorm).toBeGreaterThanOrEqual(0);
      expect(p.stakeNorm).toBeLessThanOrEqual(1);
      expect(Object.keys(p).sort()).toEqual(['stakeNorm', 'tOffsetMin']);
    }
  });
});

// ── framing + worst session ──────────────────────────────────────────

describe('session framing', () => {
  it('marks a winning heated session win-but-risky and a losing one loss', () => {
    betSeq = 0;
    // Losing heated session on day 0
    const losing = heatedSessionBets(0);
    const detection = detectAndGradeSessions(losing);
    const heated = detection.sessions.find(s => s.isHeated);
    expect(heated?.framing).toBe('loss');

    // Same shape but the big late bets win -> positive session, still heated
    betSeq = 0;
    const winning = heatedSessionBets(0).map((b, i) =>
      i >= 9 ? { ...b, odds: 200, result: 'win' as const, profit: Number(b.stake) * 2, payout: Number(b.stake) * 3 } : b
    );
    const d2 = detectAndGradeSessions(winning);
    const heated2 = d2.sessions.find(s => s.isHeated);
    expect(heated2).toBeDefined();
    expect(heated2!.profit).toBeGreaterThan(0);
    expect(heated2!.framing).toBe('win-but-risky');
  });

  it('does not set framing on calm sessions', () => {
    betSeq = 0;
    const detection = detectAndGradeSessions(calmBets(10, 0));
    for (const s of detection.sessions) {
      expect(s.framing).toBeUndefined();
    }
  });
});

// ── buildReportCharts ────────────────────────────────────────────────

describe('buildReportCharts', () => {
  it('produces raw, fixed-shape arrays', () => {
    betSeq = 0;
    const bets = [
      ...heatedSessionBets(0),
      ...calmBets(20, 2),
      makeBet({ placed_at: '2026-03-10T15:00:00.000Z', bet_type: 'parlay', parlay_legs: 4, result: 'loss', profit: -50 }),
      makeBet({ placed_at: '2026-03-11T15:00:00.000Z', bet_type: 'moneyline', result: 'win', profit: 45, payout: 95 }),
    ];
    const metrics = calculateMetrics(bets);
    const charts = buildReportCharts(metrics.timing, metrics.odds, metrics.annotations, metrics.sessionDetection, bets);

    expect(charts.timeOfDayPnl).toHaveLength(24);
    charts.timeOfDayPnl.forEach((row, i) => expect(row.hour).toBe(i));

    expect(charts.dayOfWeekPnl).toHaveLength(7);
    expect(charts.dayOfWeekPnl.map(r => r.day)).toEqual([0, 1, 2, 3, 4, 5, 6]);

    expect(charts.oddsBuckets).toHaveLength(7);
    for (const b of charts.oddsBuckets) {
      expect(typeof b.roiPct).toBe('number');
      expect(typeof b.edgePP).toBe('number');
    }

    const pctSum = charts.betTypeMix.reduce((s, m) => s + m.pct, 0);
    expect(pctSum).toBeGreaterThan(99);
    expect(pctSum).toBeLessThan(101);
    expect(charts.betTypeMix.find(m => m.class === 'parlay')?.count).toBe(1);

    // hero timeline populated from the heated session
    expect(charts.heroSession).not.toBeNull();
    expect(charts.heroSession!.framing).toBe('loss');
    expect(charts.sessionTimeline.length).toBeGreaterThanOrEqual(4);
    expect(charts.heroSession!.sessionId).toBeTruthy();

    // total-bets sanity: hour buckets cover every settled bet
    const hourBets = charts.timeOfDayPnl.reduce((s, r) => s + r.bets, 0);
    const settled = bets.filter(b => b.result === 'win' || b.result === 'loss').length;
    expect(hourBets).toBe(settled);
  });

  it('ships stakeByStreak null when annotations are absent', () => {
    betSeq = 0;
    const bets = calmBets(6, 0);
    const metrics = calculateMetrics(bets);
    const charts = buildReportCharts(metrics.timing, metrics.odds, null, metrics.sessionDetection, bets);
    expect(charts.stakeByStreak).toBeNull();
  });
});

// ── snapshot wire contract ───────────────────────────────────────────

describe('runSnapshot teaser handoff', () => {
  it('never attaches charts; ships worstSessionDate + redacted silhouette in the teaser', async () => {
    betSeq = 0;
    const bets = [...heatedSessionBets(0), ...calmBets(15, 2)];
    const { analysis } = await runSnapshot(bets);

    expect(analysis.charts).toBeUndefined();

    const teaser = analysis._snapshot_teaser;
    expect(teaser?.worstSessionDate).toBeTruthy();
    expect(teaser?.sessionTimelineSilhouette?.length).toBeGreaterThanOrEqual(4);
    for (const p of teaser!.sessionTimelineSilhouette!) {
      expect(p.stakeNorm).toBeGreaterThanOrEqual(0);
      expect(p.stakeNorm).toBeLessThanOrEqual(1);
      // redaction: the silhouette must carry no dollar keys
      expect(p).not.toHaveProperty('stakeUSD');
      expect(p).not.toHaveProperty('netUSD');
      expect(p).not.toHaveProperty('outcome');
    }
  });
});

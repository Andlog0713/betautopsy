import type {
  Bet,
  ReportCharts,
  SessionTimelinePoint,
  DetectedSession,
  SessionDetectionResult,
  TimingAnalysis,
  OddsAnalysis,
  AnnotationSummary,
} from '@/types';
import { BET_COUNT_THRESHOLDS } from '@/lib/engine/constants/thresholds';

/**
 * Chart-ready typed arrays (report-trust, schema_version 3). Everything here
 * is a pure transform of metrics the deterministic engine already computes —
 * raw numbers only, no formatting, no LLM. Full reports only; the snapshot
 * gets just the redacted silhouette via buildSessionTimelineSilhouette.
 *
 * The hero-session timeline is the iOS hero chart's entire data source, so
 * its contract is deliberate (see SessionTimelinePoint in types/index.ts):
 *  (a) it is built from the worst/heated session specifically — selection
 *      prefers LOSING heated sessions, then win-but-risky heated ones, then
 *      any session, always ranked by profit ascending;
 *  (b) isChaseMarker reuses the engine's exact session chase rule
 *      (previous bet in the original session sequence was a loss AND this
 *      stake exceeds it — detectAndGradeSessions' chaseCount rule);
 *  (c) sessions with < heroTimelineMinBets (4) settled bets can't form a
 *      meaningful curve and are skipped; if none qualify, sessionTimeline
 *      is [] and heroSession is null.
 */

// Engine display order in timing.by_day is Mon..Sun; map back to JS getDay
// numbering (0 = Sunday) for the wire contract.
const BY_DAY_TO_JS_DAY = [1, 2, 3, 4, 5, 6, 0];

const KNOWN_BET_CLASSES = new Set(['moneyline', 'spread', 'total', 'prop', 'futures']);

function sortBetsLikeEngine(bets: Bet[]): Bet[] {
  return [...bets].sort(
    (a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime(),
  );
}

/**
 * Picks the session the hero chart renders. Shared by the full report's
 * charts.sessionTimeline and the snapshot's sessionTimelineSilhouette so
 * the paid hero timeline is the literal reveal of the teased shape.
 */
export function selectHeroSession(
  detection: SessionDetectionResult | null | undefined,
): DetectedSession | null {
  if (!detection || detection.sessions.length === 0) return null;
  const minBets = BET_COUNT_THRESHOLDS.heroTimelineMinBets;
  const enough = (s: DetectedSession) => s.wins + s.losses >= minBets;
  const byProfitAsc = (a: DetectedSession, b: DetectedSession) => a.profit - b.profit;

  const heated = detection.sessions.filter((s) => s.isHeated);
  const candidates = [
    ...heated.filter((s) => s.profit < 0).sort(byProfitAsc),
    ...heated.filter((s) => s.profit >= 0).sort(byProfitAsc),
    ...detection.sessions.filter((s) => !s.isHeated).sort(byProfitAsc),
  ];
  return candidates.find(enough) ?? null;
}

/**
 * Per-bet stake curve for the hero session. `sortedBets` MUST be the same
 * placed_at-ascending ordering session.betIndices were computed against.
 */
export function buildHeroSessionTimeline(
  session: DetectedSession,
  sortedBets: Bet[],
): SessionTimelinePoint[] {
  const sessionBets = session.betIndices
    .map((idx) => sortedBets[idx])
    .filter((b): b is Bet => b != null);
  if (sessionBets.length === 0) return [];

  const t0 = new Date(sessionBets[0].placed_at).getTime();
  const points: SessionTimelinePoint[] = [];
  for (let i = 0; i < sessionBets.length; i++) {
    const bet = sessionBets[i];
    if (bet.result !== 'win' && bet.result !== 'loss') continue; // settled only
    const prev = i > 0 ? sessionBets[i - 1] : null;
    // Exact engine chase rule (detectAndGradeSessions): previous bet in the
    // ORIGINAL session sequence was a loss and this stake exceeds it.
    const isChaseMarker =
      prev != null && prev.result === 'loss' && Number(bet.stake) > Number(prev.stake);
    points.push({
      tOffsetMin: Math.max(0, Math.round((new Date(bet.placed_at).getTime() - t0) / 60000)),
      stakeUSD: Number(bet.stake),
      outcome: bet.result,
      isChaseMarker,
    });
  }
  return points;
}

/**
 * Snapshot-side redacted shape of the hero timeline: the stake curve
 * normalized to the session max (0..1). No dollars, no outcomes, no chase
 * flags — just the silhouette the paid report reveals.
 */
export function buildSessionTimelineSilhouette(
  detection: SessionDetectionResult | null | undefined,
  bets: Bet[],
): { worstSessionDate: string; silhouette: { tOffsetMin: number; stakeNorm: number }[] } | null {
  const hero = selectHeroSession(detection);
  if (!hero) return null;
  const timeline = buildHeroSessionTimeline(hero, sortBetsLikeEngine(bets));
  if (timeline.length === 0) return null;
  const maxStake = Math.max(...timeline.map((p) => p.stakeUSD));
  if (maxStake <= 0) return null;
  return {
    worstSessionDate: hero.date,
    silhouette: timeline.map((p) => ({
      tOffsetMin: p.tOffsetMin,
      stakeNorm: Math.round((p.stakeUSD / maxStake) * 1000) / 1000,
    })),
  };
}

export function buildReportCharts(
  timing: TimingAnalysis,
  odds: OddsAnalysis,
  annotations: AnnotationSummary | null,
  detection: SessionDetectionResult | null,
  bets: Bet[],
): ReportCharts {
  const sortedBets = sortBetsLikeEngine(bets);

  const timeOfDayPnl = timing.by_hour.map((b, hour) => ({
    hour,
    netUSD: b.profit,
    bets: b.bets,
  }));

  const dayOfWeekPnl = timing.by_day
    .map((b, i) => ({ day: BY_DAY_TO_JS_DAY[i], netUSD: b.profit, bets: b.bets }))
    .sort((a, b) => a.day - b.day);

  const oddsBuckets = odds.buckets.map((b) => ({
    bucket: b.label,
    roiPct: b.roi,
    bets: b.bets,
    winPct: b.win_rate,
    edgePP: b.edge,
  }));

  const stakeByStreak = annotations
    ? {
        after3WinsUSD: annotations.streakInfluence.avgStakeAfterWinStreak3,
        neutralUSD: annotations.streakInfluence.avgStakeNeutral,
        after3LossesUSD: annotations.streakInfluence.avgStakeAfterLossStreak3,
      }
    : null;

  const hero = selectHeroSession(detection);
  const sessionTimeline = hero ? buildHeroSessionTimeline(hero, sortedBets) : [];
  const heroSession = hero
    ? {
        sessionId: hero.id,
        date: hero.date,
        framing: hero.framing ?? (hero.profit < 0 ? ('loss' as const) : ('win-but-risky' as const)),
        bets: hero.bets,
      }
    : null;

  const classCounts = new Map<string, number>();
  for (const b of bets) {
    const isParlay = b.bet_type === 'parlay' || (b.parlay_legs != null && b.parlay_legs > 1);
    const cls = isParlay
      ? 'parlay'
      : KNOWN_BET_CLASSES.has((b.bet_type ?? '').toLowerCase())
        ? (b.bet_type ?? '').toLowerCase()
        : 'other';
    classCounts.set(cls, (classCounts.get(cls) ?? 0) + 1);
  }
  const total = bets.length;
  const betTypeMix = [...classCounts.entries()]
    .map(([cls, count]) => ({
      class: cls,
      count,
      pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return { timeOfDayPnl, dayOfWeekPnl, oddsBuckets, stakeByStreak, sessionTimeline, heroSession, betTypeMix };
}

import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  CHECK_IN_SPORTS,
  CHECK_IN_BET_TYPES,
  type AutopsyAnalysis,
  type BiasDetected,
  type CheckInRecommendation,
  type CheckInSeverity,
  type PreBetCheckInFlag,
  type PreBetCheckInRequest,
  type PreBetCheckInResponse,
} from '@/types';

const SPORT_SET: ReadonlySet<string> = new Set(CHECK_IN_SPORTS);
const BET_TYPE_SET: ReadonlySet<string> = new Set(CHECK_IN_BET_TYPES);

export type ValidationOk = { ok: true; value: PreBetCheckInRequest };
export type ValidationErr = { ok: false; error: string };

export function validateCheckInRequest(raw: unknown): ValidationOk | ValidationErr {
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, error: 'Body must be a JSON object' };
  }
  const r = raw as Record<string, unknown>;

  const sport = r.sport;
  if (typeof sport !== 'string' || !SPORT_SET.has(sport)) {
    return { ok: false, error: 'sport must be one of: ' + CHECK_IN_SPORTS.join(', ') };
  }

  const stake = r.stake;
  if (typeof stake !== 'number' || !Number.isFinite(stake) || stake <= 0) {
    return { ok: false, error: 'stake must be a positive number' };
  }

  const odds = r.odds;
  if (typeof odds !== 'number' || !Number.isInteger(odds) || odds === 0) {
    return { ok: false, error: 'odds must be a non-zero integer (American odds)' };
  }

  const betType = r.betType;
  if (typeof betType !== 'string' || !BET_TYPE_SET.has(betType)) {
    return { ok: false, error: 'betType must be one of: ' + CHECK_IN_BET_TYPES.join(', ') };
  }

  const placedAt = r.placedAt;
  if (typeof placedAt !== 'string' || Number.isNaN(Date.parse(placedAt))) {
    return { ok: false, error: 'placedAt must be an ISO 8601 datetime string' };
  }

  return {
    ok: true,
    value: { sport, stake, odds, betType, placedAt },
  };
}

// Deterministic pre-bet scorer. No LLM, no DB writes Phase 1. Reads the
// user's latest autopsy report + last 30 bets and emits flags + a
// behavioral quality score. Wire format is locked by iOS — see
// PreBetCheckInModels.swift and types/index.ts.

type RecentBet = {
  id: string;
  placed_at: string;
  stake: number;
  profit: number | null;
  result: string;
  sport: string;
  bet_type: string;
};

const HIGH_PENALTY = 25;
const MEDIUM_PENALTY = 12;
const LOW_PENALTY = 5;
const STAKE_MULTIPLIER_THRESHOLD = 1.5;
const RECENT_LOSS_WINDOW_MIN = 60;
const MIN_BETS_FOR_STAKE_MEDIAN = 10;
const MIN_PARLAYS_FOR_ROI_FLAG = 5;

function flag(severity: CheckInSeverity, title: string, detail: string): PreBetCheckInFlag {
  return { id: randomUUID(), severity, title, detail };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function isSettled(result: string): boolean {
  return result === 'win' || result === 'loss' || result === 'push' || result === 'void';
}

function isLateNightHour(hourUtc: number): boolean {
  return hourUtc >= 23 || hourUtc < 4;
}

function severityRank(s: BiasDetected['severity']): number {
  switch (s) {
    case 'low': return 1;
    case 'medium': return 2;
    case 'high': return 3;
    case 'critical': return 4;
    default: return 0;
  }
}

function findBias(report: AutopsyAnalysis | null, name: string): BiasDetected | undefined {
  return report?.biases_detected?.find(b => b.bias_name === name);
}

function computeScore(flags: PreBetCheckInFlag[]): number {
  let score = 80;
  for (const f of flags) {
    if (f.severity === 'high') score -= HIGH_PENALTY;
    else if (f.severity === 'medium') score -= MEDIUM_PENALTY;
    else if (f.severity === 'low') score -= LOW_PENALTY;
  }
  return Math.max(0, Math.min(100, score));
}

function computeRecommendation(flags: PreBetCheckInFlag[], score: number): CheckInRecommendation {
  if (flags.length === 0 && score >= 70) return 'place_bet';
  return 'wait_thirty';
}

function computeSummary(flags: PreBetCheckInFlag[], noHistory: boolean): string {
  if (noHistory) {
    return flags.length === 0
      ? 'No flags fire from this request alone. Upload your bet history for personalized analysis.'
      : 'Flags reference general patterns. Upload your bet history for personalized analysis.';
  }
  if (flags.length === 0) return 'No risk flags. Behavioral state looks clean.';
  if (flags.length === 1) return 'One risk flag. Worth a pause.';
  return `${flags.length} risk flags. Waiting 30 minutes is the smart play.`;
}

export async function scoreCheckIn(
  request: PreBetCheckInRequest,
  userId: string,
  supabase: SupabaseClient,
): Promise<PreBetCheckInResponse> {
  const { data: reportRow } = await supabase
    .from('autopsy_reports')
    .select('report_json')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const report: AutopsyAnalysis | null =
    (reportRow as { report_json: AutopsyAnalysis } | null)?.report_json ?? null;

  const { data: recentBetsRaw } = await supabase
    .from('bets')
    .select('id, placed_at, stake, profit, result, sport, bet_type')
    .eq('user_id', userId)
    .order('placed_at', { ascending: false })
    .limit(30);

  const recentBets: RecentBet[] = ((recentBetsRaw ?? []) as RecentBet[]).map(b => ({
    ...b,
    stake: Number(b.stake),
    profit: b.profit === null ? null : Number(b.profit),
  }));

  const noHistory = !report && recentBets.length === 0;
  const flags: PreBetCheckInFlag[] = [];

  // ── Flag (a): Late-night betting ──
  const placedAt = new Date(request.placedAt);
  const hour = placedAt.getUTCHours();
  if (isLateNightHour(hour)) {
    const lateStats = report?.timing_analysis?.late_night_stats ?? null;
    let detail: string;
    if (lateStats && typeof lateStats.roi === 'number' && Math.abs(lateStats.roi) <= 100) {
      detail = `Your ROI between 11pm and 4am is ${Math.round(lateStats.roi)}% across ${lateStats.count} bets.`;
    } else if (lateStats && typeof lateStats.count === 'number') {
      detail = `Your late-night sessions have been deeply unprofitable across ${lateStats.count} bets.`;
    } else {
      detail = 'Late-night betting tends to correlate with worse outcomes. Real engine analysis kicks in after your first autopsy.';
    }
    flags.push(flag('high', 'Late-night betting', detail));
  }

  // ── Flag (b): Above usual stake ──
  const settledStakes = recentBets.filter(b => isSettled(b.result)).map(b => b.stake);
  let aboveStakeFires = false;
  let stakeMedian = 0;
  if (settledStakes.length >= MIN_BETS_FOR_STAKE_MEDIAN) {
    stakeMedian = median(settledStakes);
    if (stakeMedian > 0 && request.stake > STAKE_MULTIPLIER_THRESHOLD * stakeMedian) {
      aboveStakeFires = true;
      const multiplier = (request.stake / stakeMedian).toFixed(1);
      flags.push(flag(
        'medium',
        'Above usual stake',
        `This stake is ${multiplier}x your rolling median of $${stakeMedian.toFixed(0)}.`,
      ));
    }
  }

  // ── Flag (c): Recent loss within 60 min ──
  // Severity HIGH if (b) also fires (escalation context), MEDIUM otherwise.
  const lastSettled = recentBets.find(b => isSettled(b.result));
  let recentLossFires = false;
  if (lastSettled && lastSettled.result === 'loss') {
    const minutesSince = (placedAt.getTime() - new Date(lastSettled.placed_at).getTime()) / 60000;
    if (minutesSince >= 0 && minutesSince <= RECENT_LOSS_WINDOW_MIN) {
      recentLossFires = true;
      const lossAmount = Math.abs(lastSettled.profit ?? lastSettled.stake);
      const severity: CheckInSeverity = aboveStakeFires ? 'high' : 'medium';
      flags.push(flag(
        severity,
        'Recent loss',
        `Your last bet was a $${lossAmount.toFixed(0)} loss ${Math.round(minutesSince)} minutes ago.`,
      ));
    }
  }

  // ── Flag (d): Post-Loss Escalation composite ──
  const escalationBias = findBias(report, 'Post-Loss Escalation');
  const escalationActive = !!escalationBias && severityRank(escalationBias.severity) >= severityRank('medium');
  if (recentLossFires && aboveStakeFires && escalationActive) {
    flags.push(flag(
      'high',
      'Post-loss escalation pattern',
      'Bet size escalation after a recent loss. Your report flagged this as an active bias.',
    ));
  }

  // ── Flag (e): Parlay in parlay-bad context ──
  if (request.betType === 'parlay') {
    const parlayBets = recentBets.filter(b => b.bet_type === 'parlay' && isSettled(b.result));
    let parlayRoi: number | null = null;
    if (parlayBets.length >= MIN_PARLAYS_FOR_ROI_FLAG) {
      const totalStake = parlayBets.reduce((s, b) => s + b.stake, 0);
      const totalProfit = parlayBets.reduce((s, b) => s + (b.profit ?? 0), 0);
      if (totalStake > 0) parlayRoi = totalProfit / totalStake;
    }
    const parlayRoiBad = parlayRoi !== null && parlayRoi < -0.10;

    if (parlayRoiBad || escalationActive) {
      let detail: string | null = null;
      if (parlayRoi !== null) {
        const parlayRoiPct = (parlayRoi * 100).toFixed(0);
        const straightBets = recentBets.filter(
          b => b.bet_type !== 'parlay' && isSettled(b.result) && b.sport === request.sport,
        );
        const straightStake = straightBets.reduce((s, b) => s + b.stake, 0);
        const straightProfit = straightBets.reduce((s, b) => s + (b.profit ?? 0), 0);
        if (straightStake > 0 && straightBets.length > 0) {
          const straightRoiPct = ((straightProfit / straightStake) * 100).toFixed(0);
          detail = `Your parlay ROI is ${parlayRoiPct}% across ${parlayBets.length} bets. Straight bets in ${request.sport} are ${straightRoiPct}%.`;
        } else {
          detail = `Your parlay ROI is ${parlayRoiPct}% across ${parlayBets.length} bets.`;
        }
      } else if (escalationActive) {
        detail = 'Parlays compound risk. Your report shows an active Post-Loss Escalation bias.';
      }
      if (detail) {
        flags.push(flag('medium', 'Parlay in tough context', detail));
      }
    }
  }

  const score = computeScore(flags);
  return {
    betQualityScore: score,
    flags,
    recommendation: computeRecommendation(flags, score),
    summary: computeSummary(flags, noHistory),
  };
}

import * as Sentry from '@sentry/nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  calculateBetIQ,
  calculateDisciplineScore,
  calculateEnhancedTilt,
  calculateMetrics,
  detectSportSpecificPatterns,
  estimatePercentile,
  runAutopsy,
} from './autopsy-engine';
import { BET_COUNT_THRESHOLDS } from './engine/constants/thresholds';
import { buildReportSummary } from './report-summary';
import { computeWhatChanged } from './what-changed';
import type { AutopsyAnalysis, Bet, ProgressSnapshot } from '@/types';
import {
  betRecordedDate,
  betTimestampQuality,
  sanitizeUnconfirmedLocalTimeClaims,
} from './temporal-provenance';

// Promo-era rows can carry report_type='snapshot' even though runAutopsy made
// full content. The promo is disabled, but retaining the additive union keeps
// the canonical pipeline wire-compatible with existing interactive behavior.
type FullReportType = 'snapshot' | 'full' | 'weekly' | 'quick';

export interface FullReportProfileContext {
  email: string | null;
  bankroll: number | null;
  streak_count: number;
  streak_last_date: string | null;
  streak_best: number;
  streak_freezes: number;
}

export interface PersistedFullReport {
  id: string;
  report_json: AutopsyAnalysis;
  report_markdown: string;
  [key: string]: unknown;
}

export interface FullReportPipelineResult {
  report: PersistedFullReport;
  analysis: AutopsyAnalysis;
  markdown: string;
  tokensUsed: number;
  model: string;
  reusedExisting: boolean;
}

export interface FullReportPipelineArgs {
  supabase: SupabaseClient;
  persistenceClient: SupabaseClient;
  userId: string;
  profile: FullReportProfileContext;
  bets: Bet[];
  reportType: FullReportType;
  analyzedUploadIds: string[];
  analyzedSportsbook: string | null;
  reportCount: number;
  recentUploadCount: number;
  previousSnapshot: ProgressSnapshot | null;
  upgradedFromSnapshotId?: string | null;
  reportId?: string;
  dropLogPath?: string;
  deferBackground?: (promise: Promise<void>) => void;
  beforePersist?: () => Promise<void>;
  returnExistingUpgradeOnConflict?: boolean;
}

export class FullReportPersistenceError extends Error {
  readonly persistenceError: unknown;

  constructor(error: unknown) {
    super('Report generated but failed to save. Please try again.');
    this.name = 'FullReportPersistenceError';
    this.persistenceError = error;
  }
}

function previousSnapshotInput(previousSnapshot: ProgressSnapshot | null) {
  return previousSnapshot ? {
    tilt_score: previousSnapshot.tilt_score,
    emotion_score: undefined,
    stake_cv: undefined,
    parlay_percent: previousSnapshot.parlay_percent,
    loss_chase_ratio: previousSnapshot.loss_chase_ratio,
  } : null;
}

async function addQuizArchetype(
  supabase: SupabaseClient,
  email: string | null,
  analysis: AutopsyAnalysis,
): Promise<void> {
  if (!email) return;

  try {
    const { data: quizLead } = await supabase
      .from('quiz_leads')
      .select('archetype')
      .eq('email', email)
      .maybeSingle();
    if (quizLead?.archetype) analysis.quiz_archetype = quizLead.archetype as string;
  } catch {
    // Quiz context is optional and must never block a paid report.
  }
}

async function addWhatChanged(
  supabase: SupabaseClient,
  userId: string,
  analysis: AutopsyAnalysis,
  betCount: number,
): Promise<void> {
  try {
    const { data: priorRow } = await supabase
      .from('autopsy_reports')
      .select('report_json, created_at, bet_count_analyzed')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (priorRow?.report_json && priorRow.created_at) {
      const whatChanged = computeWhatChanged(
        {
          analysis: sanitizeUnconfirmedLocalTimeClaims(
            priorRow.report_json as AutopsyAnalysis,
          ),
          createdAt: priorRow.created_at as string,
          betCountAnalyzed: (priorRow.bet_count_analyzed as number | null) ?? 0,
        },
        {
          analysis,
          createdAt: new Date().toISOString(),
          betCountAnalyzed: betCount,
        },
      );
      if (whatChanged) analysis.whatChanged = whatChanged;
    } else {
      analysis.whatChanged = null;
    }
  } catch (error) {
    console.error('[full-report-pipeline] whatChanged computation failed:', error);
    Sentry.captureException(error);
  }
}

async function persistEngineDrops(
  persistenceClient: SupabaseClient,
  userId: string,
  path: string,
  drops: Awaited<ReturnType<typeof runAutopsy>>['drops'],
): Promise<void> {
  if (drops.length === 0) return;

  try {
    const { error } = await persistenceClient
      .from('error_logs')
      .insert(drops.map((drop) => ({
        user_id: userId,
        source: 'autopsy-engine-drop',
        message: `${drop.site} drop: ${drop.category ?? '(no category)'} (${drop.reason})`,
        path,
        metadata: {
          reportId: drop.reportId,
          site: drop.site,
          kind: drop.kind ?? null,
          category: drop.category,
          categoryRoiExists: drop.categoryRoiExists,
          reason: drop.reason,
        },
      })));
    if (error) console.error('Failed to persist engine drops:', error);
  } catch (error) {
    console.error('Failed to persist engine drops:', error);
  }
}

async function persistLongitudinalState(
  supabase: SupabaseClient,
  userId: string,
  profile: FullReportProfileContext,
  reportId: string,
  bets: Bet[],
  metrics: ReturnType<typeof calculateMetrics>,
  disciplineResult: ReturnType<typeof calculateDisciplineScore>,
): Promise<void> {
  if (!disciplineResult.insufficient_data) {
    try {
      const { error } = await supabase.from('discipline_scores').insert({
        user_id: userId,
        score: disciplineResult.total,
        components: {
          tracking: disciplineResult.tracking,
          sizing: disciplineResult.sizing,
          control: disciplineResult.control,
          strategy: disciplineResult.strategy,
        },
        report_id: reportId,
      });
      if (error) console.error('Failed to save discipline score:', error);
    } catch (error) {
      console.error('Failed to save discipline score:', error);
    }
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    let newStreak = profile.streak_count ?? 0;
    let freezes = profile.streak_freezes ?? 1;
    const lastDate = profile.streak_last_date;
    const daysSince = lastDate
      ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000)
      : null;

    if (daysSince === null) {
      newStreak = 1;
    } else if (daysSince >= 5 && daysSince <= 21) {
      newStreak += 1;
    } else if (daysSince > 21) {
      if (freezes > 0) freezes -= 1;
      else newStreak = 1;
    }

    const newBest = Math.max(newStreak, profile.streak_best ?? 0);
    const { error } = await supabase.from('profiles').update({
      streak_count: newStreak,
      streak_last_date: today,
      streak_best: newBest,
      streak_freezes: freezes,
    }).eq('id', userId);
    if (error) console.error('Failed to update streak:', error);
  } catch (error) {
    console.error('Failed to update streak:', error);
  }

  try {
    const { error } = await supabase.from('progress_snapshots').upsert({
      user_id: userId,
      snapshot_date: new Date().toISOString().split('T')[0],
      total_bets: bets.length,
      total_profit: metrics.summary.total_profit,
      roi_percent: metrics.summary.roi_percent,
      win_rate: metrics.summary.win_rate,
      tilt_score: metrics.emotion_score,
      avg_stake: metrics.summary.avg_stake,
      parlay_percent: metrics.parlay_stats.parlay_percent,
      loss_chase_ratio: metrics.loss_chase_ratio,
      bankroll_health: metrics.bankroll_health,
      overall_grade: metrics.summary.overall_grade,
      discipline_score: disciplineResult.total,
    }, { onConflict: 'user_id,snapshot_date' });
    if (error) console.error('Failed to save snapshot:', error);
  } catch (error) {
    console.error('Failed to save snapshot:', error);
  }
}

export async function generateAndPersistFullReport(
  args: FullReportPipelineArgs,
): Promise<FullReportPipelineResult> {
  const reportId = args.reportId ?? crypto.randomUUID();
  const bankroll = args.profile.bankroll;
  const { analysis, markdown, tokensUsed, model, drops } = await runAutopsy(
    args.bets,
    bankroll,
    reportId,
  );

  const metrics = calculateMetrics(args.bets, bankroll);
  const disciplineResult = calculateDisciplineScore(metrics, {
    hasBankroll: !!bankroll,
    reportCount: args.reportCount + 1,
    streakCount: args.profile.streak_count ?? 0,
    uploadedRecently: args.recentUploadCount > 0,
    prevSnapshot: previousSnapshotInput(args.previousSnapshot),
  });
  const settledCount = metrics.summary.wins + metrics.summary.losses;
  const emotionInsufficient = settledCount < BET_COUNT_THRESHOLDS.emotionScore;

  analysis.discipline_score = disciplineResult.insufficient_data
    ? { ...disciplineResult }
    : {
        ...disciplineResult,
        percentile: estimatePercentile('discipline_score', disciplineResult.total),
      };
  analysis.betiq = calculateBetIQ(metrics, args.bets);
  analysis.emotion_percentile = emotionInsufficient
    ? null
    : estimatePercentile('emotion_score', analysis.emotion_score, true);
  analysis.emotion_score_insufficient_data = emotionInsufficient;
  analysis.tilt_score_insufficient_data = emotionInsufficient;
  analysis.enhanced_tilt = calculateEnhancedTilt(metrics, args.bets);

  const sportFindings = detectSportSpecificPatterns(metrics, args.bets);
  if (sportFindings.length > 0) analysis.sport_specific_findings = sportFindings;

  await addQuizArchetype(args.supabase, args.profile.email, analysis);
  analysis.schema_version = 4;
  await addWhatChanged(args.supabase, args.userId, analysis, args.bets.length);
  await args.beforePersist?.();

  const instantBets = args.bets
    .filter((bet): bet is Bet & { placed_at: string } => (
      betTimestampQuality(bet) === 'instant' && Boolean(bet.placed_at)
    ))
    .sort((a, b) => a.placed_at.localeCompare(b.placed_at));
  const dateStart = instantBets[0]?.placed_at ?? null;
  const dateEnd = instantBets[instantBets.length - 1]?.placed_at ?? null;
  const recordedDates = args.bets
    .map(betRecordedDate)
    .filter((date): date is string => Boolean(date))
    .sort();
  const dateStartDate = recordedDates[0] ?? null;
  const dateEndDate = recordedDates[recordedDates.length - 1] ?? null;
  const { data: savedReport, error: insertError } = await args.persistenceClient
    .from('autopsy_reports')
    .insert({
      id: reportId,
      user_id: args.userId,
      report_type: args.reportType,
      bet_count_analyzed: args.bets.length,
      date_range_start: dateStart,
      date_range_end: dateEnd,
      date_range_start_date: dateStartDate,
      date_range_end_date: dateEndDate,
      report_json: analysis,
      report_summary: buildReportSummary(analysis),
      report_markdown: markdown,
      model_used: model,
      tokens_used: tokensUsed,
      cost_cents: Math.ceil(tokensUsed * 0.001),
      is_paid: true,
      analyzed_upload_ids: args.analyzedUploadIds,
      analyzed_sportsbook: args.analyzedSportsbook,
      analyzed_bet_ids: args.bets.map((bet) => bet.id),
      ...(args.upgradedFromSnapshotId
        ? { upgraded_from_snapshot_id: args.upgradedFromSnapshotId }
        : {}),
    })
    .select()
    .single();

  if (
    insertError?.code === '23505'
    && args.returnExistingUpgradeOnConflict
    && args.upgradedFromSnapshotId
  ) {
    const { data: concurrentReport, error: concurrentError } = await args.persistenceClient
      .from('autopsy_reports')
      .select('*')
      .eq('upgraded_from_snapshot_id', args.upgradedFromSnapshotId)
      .eq('user_id', args.userId)
      .maybeSingle();

    if (concurrentReport?.id) {
      return {
        report: concurrentReport as PersistedFullReport,
        analysis: (concurrentReport.report_json as AutopsyAnalysis | null) ?? analysis,
        markdown: (concurrentReport.report_markdown as string | null) ?? markdown,
        tokensUsed,
        model,
        reusedExisting: true,
      };
    }
    throw new FullReportPersistenceError(concurrentError ?? insertError);
  }

  if (insertError || !savedReport) {
    throw new FullReportPersistenceError(insertError ?? new Error('autopsy_reports insert returned no row'));
  }

  const dropPromise = persistEngineDrops(
    args.persistenceClient,
    args.userId,
    args.dropLogPath ?? '/api/analyze',
    drops,
  );
  if (args.deferBackground) args.deferBackground(dropPromise);
  else await dropPromise;

  await persistLongitudinalState(
    args.supabase,
    args.userId,
    args.profile,
    savedReport.id as string,
    args.bets,
    metrics,
    disciplineResult,
  );

  return {
    report: savedReport as PersistedFullReport,
    analysis,
    markdown,
    tokensUsed,
    model,
    reusedExisting: false,
  };
}

import { createServiceRoleClient } from './supabase-server';
import { logErrorServer } from './log-error-server';
import {
  runAutopsy,
  calculateMetrics,
  calculateDisciplineScore,
  calculateBetIQ,
  estimatePercentile,
  calculateEnhancedTilt,
  detectSportSpecificPatterns,
} from './autopsy-engine';
import type { Bet, ProgressSnapshot } from '@/types';

export interface ProcessUpgradeArgs {
  snapshotId: string;
  userId: string;
  transactionId: string;
}

const BETS_PAGE_SIZE = 1000;

// Re-run the autopsy engine on the snapshot's bet cohort and insert a
// CHILD autopsy_reports row (report_type='full', is_paid=true,
// upgraded_from_snapshot_id=snapshotId). Mirrors the /api/analyze
// paid_snapshot_id upgrade path — including the analysis-enrichment
// fields (discipline_score, betiq, percentile, enhanced_tilt,
// sport_specific_findings, schema_version) so an iOS-paid full report
// renders identically to a web-paid one.
//
// Idempotency contract: the iap_transactions row for transactionId is
// already inserted by the route handler BEFORE waitUntil fires. If this
// background work fails or never completes, that row is the durable
// handle for re-driving the upgrade manually (or via a future recovery
// job). Defense-in-depth guard at the top of this function bails if a
// child full row already exists for the snapshot.
//
// Never re-throws — the route handler already returned 200 to
// RevenueCat. Failures go to error_logs / Sentry via logErrorServer.
export async function processUpgrade(args: ProcessUpgradeArgs): Promise<void> {
  const { snapshotId, userId, transactionId } = args;
  const supabase = createServiceRoleClient();

  try {
    // 1. Defense-in-depth: bail if a paid full child row already exists.
    // The route handler checks this too, but waitUntil work runs after
    // response close — a second concurrent webhook delivery for a
    // different transaction_id (e.g. user re-purchased after a perceived
    // failure) could otherwise produce duplicate child rows.
    const { data: existingFull } = await supabase
      .from('autopsy_reports')
      .select('id')
      .eq('upgraded_from_snapshot_id', snapshotId)
      .eq('user_id', userId)
      .eq('is_paid', true)
      .maybeSingle();

    if (existingFull) {
      console.log('[iap-upgrade] already upgraded, skipping engine re-run', {
        snapshotId, transactionId, existingFullId: existingFull.id,
      });
      return;
    }

    // 2. Fetch snapshot for the cohort lock (analyzed_upload_ids + sportsbook).
    const { data: snapshot, error: snapErr } = await supabase
      .from('autopsy_reports')
      .select('id, user_id, analyzed_upload_ids, analyzed_sportsbook')
      .eq('id', snapshotId)
      .eq('user_id', userId)
      .single();

    if (snapErr || !snapshot) {
      throw new Error(`snapshot not found: ${snapshotId} (${snapErr?.message ?? 'no row'})`);
    }

    const analyzedUploadIds = (snapshot.analyzed_upload_ids as string[] | null) ?? [];
    const analyzedSportsbook = (snapshot.analyzed_sportsbook as string | null) ?? null;

    // Legacy pre-migration snapshots have NULL analyzed_upload_ids. The
    // /api/analyze upgrade path falls through to "all current bets" for
    // those, but that contract is shaky for paid IAP — the user paid for
    // a specific snapshot's cohort, and "current" can drift. Bail loudly
    // so the iap_transactions row stays as a manual-recovery handle.
    if (analyzedUploadIds.length === 0) {
      throw new Error(`snapshot ${snapshotId} has empty analyzed_upload_ids (legacy row?) — manual recovery required`);
    }

    // 3. Fetch the locked bet cohort — paginated, mirrors /api/analyze:215-254.
    const bets: Bet[] = [];
    let offset = 0;
    while (true) {
      let query = supabase
        .from('bets')
        .select('*')
        .eq('user_id', userId)
        .in('upload_id', analyzedUploadIds)
        .order('placed_at', { ascending: true })
        .range(offset, offset + BETS_PAGE_SIZE - 1);

      if (analyzedSportsbook) {
        query = query.eq('sportsbook', analyzedSportsbook);
      }

      const { data: page, error: betsErr } = await query;
      if (betsErr) throw betsErr;
      if (!page || page.length === 0) break;
      bets.push(...(page as Bet[]));
      if (page.length < BETS_PAGE_SIZE) break;
      offset += BETS_PAGE_SIZE;
    }

    if (bets.length === 0) {
      throw new Error(`no bets found for snapshot ${snapshotId} cohort (uploads=${analyzedUploadIds.length}, sportsbook=${analyzedSportsbook ?? 'any'})`);
    }

    // 4. Profile fields needed for engine + discipline context.
    const { data: profile } = await supabase
      .from('profiles')
      .select('bankroll, streak_count')
      .eq('id', userId)
      .maybeSingle();
    const bankroll = (profile?.bankroll as number | null) ?? null;
    const streakCount = (profile?.streak_count as number | null) ?? 0;

    // 5. Discipline context inputs — mirror /api/analyze:309-345.
    const [{ count: rptCount }, { count: recentUploadCount }, { data: prevSnaps }] =
      await Promise.all([
        supabase
          .from('autopsy_reports')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('bets')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', new Date(Date.now() - 14 * 86400000).toISOString()),
        supabase
          .from('progress_snapshots')
          .select('*')
          .eq('user_id', userId)
          .order('snapshot_date', { ascending: false })
          .limit(1),
      ]);
    const prevSnap = (prevSnaps && prevSnaps.length > 0) ? prevSnaps[0] as ProgressSnapshot : null;

    // 6. Run the engine — Sonnet, full report.
    const { analysis, markdown, tokensUsed, model } = await runAutopsy(bets, bankroll);
    const costCents = Math.ceil(tokensUsed * 0.001);

    // 7. Analysis enrichments — mirror /api/analyze:381-402,417. Required for
    // iOS to render the same UI for an IAP-paid full report as a web-paid
    // one (discipline ring, betiq, percentile bars, enhanced tilt, sport
    // findings, schema gate).
    const metricsForDiscipline = calculateMetrics(bets, bankroll);
    const disciplineResult = calculateDisciplineScore(metricsForDiscipline, {
      hasBankroll: !!bankroll,
      reportCount: (rptCount ?? 0) + 1,
      streakCount,
      uploadedRecently: (recentUploadCount ?? 0) > 0,
      prevSnapshot: prevSnap ? {
        tilt_score: prevSnap.tilt_score,
        emotion_score: undefined,
        stake_cv: undefined,
        parlay_percent: prevSnap.parlay_percent,
        loss_chase_ratio: prevSnap.loss_chase_ratio,
      } : null,
    });
    analysis.discipline_score = {
      ...disciplineResult,
      percentile: estimatePercentile('discipline_score', disciplineResult.total),
    };
    analysis.betiq = calculateBetIQ(metricsForDiscipline, bets);
    analysis.emotion_percentile = estimatePercentile('emotion_score', analysis.emotion_score, true);
    analysis.enhanced_tilt = calculateEnhancedTilt(metricsForDiscipline, bets);
    const sportFindings = detectSportSpecificPatterns(metricsForDiscipline, bets);
    if (sportFindings.length > 0) analysis.sport_specific_findings = sportFindings;
    analysis.schema_version = 1;

    // 8. Insert the child full-report row. Mirrors /api/analyze:472-496
    // field-for-field except the hardcodes for our case: report_type,
    // is_paid, upgraded_from_snapshot_id.
    const dateStart = bets[0]?.placed_at ?? null;
    const dateEnd = bets[bets.length - 1]?.placed_at ?? null;

    const { data: newReport, error: insertErr } = await supabase
      .from('autopsy_reports')
      .insert({
        user_id: userId,
        report_type: 'full',
        is_paid: true,
        upgraded_from_snapshot_id: snapshotId,
        analyzed_upload_ids: analyzedUploadIds,
        analyzed_sportsbook: analyzedSportsbook,
        report_json: analysis,
        report_markdown: markdown,
        model_used: model,
        tokens_used: tokensUsed,
        cost_cents: costCents,
        bet_count_analyzed: bets.length,
        date_range_start: dateStart,
        date_range_end: dateEnd,
      })
      .select('id')
      .single();

    if (insertErr || !newReport) {
      throw insertErr ?? new Error('autopsy_reports insert returned no row');
    }

    // 9. Discipline scores ledger — mirror /api/analyze:528-544. Best-effort:
    // the report itself is durable, this is just the longitudinal track.
    try {
      await supabase.from('discipline_scores').insert({
        user_id: userId,
        score: disciplineResult.total,
        components: {
          tracking: disciplineResult.tracking,
          sizing: disciplineResult.sizing,
          control: disciplineResult.control,
          strategy: disciplineResult.strategy,
        },
        report_id: newReport.id,
      });
    } catch (discErr) {
      await logErrorServer(discErr, {
        path: 'lib/iap-upgrade.processUpgrade',
        userId,
        metadata: {
          stage: 'discipline_scores_insert',
          newReportId: newReport.id,
          snapshotId,
          transactionId,
        },
      });
    }

    console.log('[iap-upgrade] upgrade complete', {
      snapshotId, transactionId, newReportId: newReport.id, bets: bets.length, tokensUsed,
    });
  } catch (err) {
    await logErrorServer(err instanceof Error ? err : new Error(String(err)), {
      path: 'lib/iap-upgrade.processUpgrade',
      userId,
      metadata: { stage: 'processUpgrade', snapshotId, transactionId },
    });
    // No re-throw. Route handler returned 200 to RC; the iap_transactions
    // row is the manual-recovery artifact.
  }
}

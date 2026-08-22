import { createServiceRoleClient } from './supabase-server';
import { logErrorServer } from './log-error-server';
import { maybeSendReportReadyPush } from './push-report-ready';
import {
  FullReportPersistenceError,
  generateAndPersistFullReport,
  type FullReportProfileContext,
} from './full-report-pipeline';
import { resolveBetsForReportScope } from './report-cohort';
import type { Bet, ProgressSnapshot } from '@/types';

export interface ProcessUpgradeArgs {
  snapshotId: string;
  userId: string;
  transactionId: string;
}

// Per-report bet cap. Mirrors ABSOLUTE_MAX_BETS in /api/analyze:289. The
// snapshot applied this cap when it ran, so the full re-run must apply the
// same cap or a >5000-bet account would receive a larger cohort than it saw.
const ABSOLUTE_MAX_BETS = 5000;

function exactIdMatch(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length
    && actual.every((id, index) => id === expected[index]);
}

export function validateFrozenBetCohort(args: {
  snapshotId: string;
  userId: string;
  frozenValue: unknown;
  analyzedBetIds: string[] | null;
  betCountAnalyzed: number;
}): Bet[] | null {
  if (args.frozenValue === null || args.frozenValue === undefined) return null;
  if (!Array.isArray(args.frozenValue)) {
    throw new Error(`frozen_scope_invalid: snapshot ${args.snapshotId} payload is not an array`);
  }
  if (
    !Number.isInteger(args.betCountAnalyzed)
    || args.frozenValue.length !== args.betCountAnalyzed
  ) {
    throw new Error(
      `frozen_scope_invalid: snapshot ${args.snapshotId} count ${args.frozenValue.length} does not match ${args.betCountAnalyzed}`,
    );
  }
  if (!Array.isArray(args.analyzedBetIds)) {
    throw new Error(`frozen_scope_invalid: snapshot ${args.snapshotId} is missing analyzed bet ids`);
  }

  const ids: string[] = [];
  for (const value of args.frozenValue) {
    if (!value || typeof value !== 'object') {
      throw new Error(`frozen_scope_invalid: snapshot ${args.snapshotId} contains a non-object bet`);
    }
    const row = value as Record<string, unknown>;
    if (
      typeof row.id !== 'string'
      || row.id.length === 0
      || row.user_id !== args.userId
      || typeof row.placed_at !== 'string'
    ) {
      throw new Error(`frozen_scope_invalid: snapshot ${args.snapshotId} contains an invalid bet identity`);
    }
    ids.push(row.id);
  }

  if (new Set(ids).size !== ids.length || !exactIdMatch(ids, args.analyzedBetIds)) {
    throw new Error(`frozen_scope_invalid: snapshot ${args.snapshotId} bet ids do not match`);
  }

  return args.frozenValue as Bet[];
}

// Re-run the autopsy engine on the snapshot's bet cohort and insert a
// CHILD autopsy_reports row (report_type='full', is_paid=true,
// upgraded_from_snapshot_id=snapshotId). Mirrors the /api/analyze
// paid_snapshot_id upgrade path - including the analysis-enrichment
// fields (discipline_score, betiq, percentile, enhanced_tilt,
// sport_specific_findings, schema_version) so an iOS-paid full report
// renders identically to a web-paid one.
//
// This is the canonical paid snapshot-to-full generator used by both Stripe
// and RevenueCat fulfillment workers. It throws on failure so the durable
// fulfillment state machine can persist a retry and reclaim the job later.
export async function generateFullReportFromSnapshot(
  args: ProcessUpgradeArgs,
): Promise<string> {
  const { snapshotId, userId, transactionId } = args;
  const supabase = createServiceRoleClient();

  try {
    // 1. Defense-in-depth: bail if a paid full child row already exists.
    // The route handler checks this too, but waitUntil work runs after
    // response close - a second concurrent webhook delivery for a
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
      return existingFull.id as string;
    }

    // 2. Fetch the snapshot's frozen inputs and legacy cohort locks.
    const { data: snapshot, error: snapErr } = await supabase
      .from('autopsy_reports')
      .select('id, user_id, bet_count_analyzed, analyzed_upload_ids, analyzed_bet_ids, analyzed_sportsbook, analyzed_bets_snapshot')
      .eq('id', snapshotId)
      .eq('user_id', userId)
      .single();

    if (snapErr || !snapshot) {
      throw new Error(`snapshot not found: ${snapshotId} (${snapErr?.message ?? 'no row'})`);
    }

    const analyzedUploadIds = (snapshot.analyzed_upload_ids as string[] | null) ?? [];
    const analyzedBetIds = (snapshot.analyzed_bet_ids as string[] | null | undefined) ?? null;
    const analyzedSportsbook = (snapshot.analyzed_sportsbook as string | null) ?? null;
    const betCountAnalyzed = snapshot.bet_count_analyzed as number;
    const frozenBets = validateFrozenBetCohort({
      snapshotId,
      userId,
      frozenValue: snapshot.analyzed_bets_snapshot,
      analyzedBetIds,
      betCountAnalyzed,
    });

    if (!frozenBets && analyzedBetIds === null && analyzedUploadIds.length === 0) {
      throw new Error(
        `scope_unrecoverable: snapshot ${snapshotId} has no immutable bet cohort or upload lock`,
      );
    }

    // 3. New snapshots use the immutable raw input copy. Legacy rows can
    // resolve exact IDs or a logical upload lock, but partial recovery fails
    // closed instead of silently generating on a smaller cohort.
    const bets = frozenBets ?? await resolveBetsForReportScope(supabase, {
      userId,
      analyzedBetIds,
      uploadIds: analyzedUploadIds,
      sportsbook: analyzedSportsbook,
      maxBets: ABSOLUTE_MAX_BETS,
    });

    if (bets.length === 0) {
      throw new Error(`no bets found for snapshot ${snapshotId} cohort (exact=${analyzedBetIds?.length ?? 'legacy'}, uploads=${analyzedUploadIds.length}, sportsbook=${analyzedSportsbook ?? 'any'})`);
    }
    if (!frozenBets) {
      const expectedIds = analyzedBetIds ?? [];
      const actualIds = bets.map((bet) => bet.id);
      const countMatches = Number.isInteger(betCountAnalyzed)
        && bets.length === betCountAnalyzed;
      const idsMatch = analyzedBetIds === null || exactIdMatch(actualIds, expectedIds);
      if (!countMatches || !idsMatch) {
        throw new Error(
          `scope_incomplete: snapshot ${snapshotId} expected ${betCountAnalyzed} bets but resolved ${bets.length}`,
        );
      }
    }

    // 4. Profile fields needed by the canonical full-report pipeline.
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, bankroll, streak_count, streak_last_date, streak_best, streak_freezes')
      .eq('id', userId)
      .maybeSingle();
    const profileContext: FullReportProfileContext = {
      email: (profile?.email as string | null) ?? null,
      bankroll: (profile?.bankroll as number | null) ?? null,
      streak_count: (profile?.streak_count as number | null) ?? 0,
      streak_last_date: (profile?.streak_last_date as string | null) ?? null,
      streak_best: (profile?.streak_best as number | null) ?? 0,
      streak_freezes: (profile?.streak_freezes as number | null) ?? 1,
    };

    // 5. Discipline context inputs - mirror /api/analyze:309-345.
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

    // 6. Run and persist through the same canonical full-report pipeline used
    // by the interactive route. Cohort resolution and provider idempotency
    // remain caller concerns; report assembly and longitudinal writes do not.
    const result = await generateAndPersistFullReport({
      supabase,
      persistenceClient: supabase,
      userId,
      profile: profileContext,
      bets,
      reportType: 'full',
      analyzedUploadIds,
      analyzedSportsbook,
      reportCount: rptCount ?? 0,
      recentUploadCount: recentUploadCount ?? 0,
      previousSnapshot: prevSnap,
      upgradedFromSnapshotId: snapshotId,
      dropLogPath: 'lib/iap-upgrade.generateFullReportFromSnapshot',
      returnExistingUpgradeOnConflict: true,
    });

    // Caller-specific notification stays outside the canonical generator.
    // A concurrent loser returns the winner's row without duplicating push or
    // longitudinal side effects.
    if (!result.reusedExisting) {
      await maybeSendReportReadyPush(userId, result.report.id);
    }

    console.log('[iap-upgrade] upgrade complete', {
      snapshotId,
      transactionId,
      newReportId: result.report.id,
      bets: bets.length,
      tokensUsed: result.tokensUsed,
    });
    return result.report.id;
  } catch (err) {
    const persistenceCause = err instanceof FullReportPersistenceError
      ? err.persistenceError
      : err;
    const loggedError = persistenceCause instanceof Error
      ? persistenceCause
      : new Error(
          typeof persistenceCause === 'object'
            && persistenceCause !== null
            && 'message' in persistenceCause
            ? String(persistenceCause.message)
            : String(persistenceCause),
        );
    await logErrorServer(loggedError, {
      path: 'lib/iap-upgrade.generateFullReportFromSnapshot',
      userId,
      metadata: { stage: 'generate_full_report', snapshotId, transactionId },
    });
    throw err;
  }
}

// Compatibility entry point for callers outside the durable provider routes.
// Provider webhooks call the fulfillment worker directly so failures are
// persisted before they acknowledge payment events.
export async function processUpgrade(args: ProcessUpgradeArgs): Promise<void> {
  try {
    await generateFullReportFromSnapshot(args);
  } catch {
    // generateFullReportFromSnapshot already recorded the detailed failure.
  }
}

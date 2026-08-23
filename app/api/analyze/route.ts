import { NextResponse } from 'next/server';
import * as Sentry from "@sentry/nextjs";
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { runSnapshot, calculateMetrics, calculateMetricsOnly, calculateDisciplineScore } from '@/lib/autopsy-engine';
import { computeWhatChanged } from '@/lib/what-changed';
import { maybeSendHeatedPush } from '@/lib/push-heated-send';
import { waitUntil } from '@vercel/functions';
import { checkRateLimit } from '@/lib/rate-limit';
import { TIER_LIMITS, userQualifiesForPromo } from '@/types';
import { logErrorServer } from '@/lib/log-error-server';
import { parseCSV } from '@/lib/csv-parser';
import { importBets } from '@/lib/import-bets';
import {
  FullReportPersistenceError,
  generateAndPersistFullReport,
  type FullReportProfileContext,
} from '@/lib/full-report-pipeline';
import { resolveBetsForReportScope } from '@/lib/report-cohort';
import { buildReportSummary } from '@/lib/report-summary';
import type { AutopsyAnalysis, Bet, Profile, SubscriptionTier, ProgressSnapshot } from '@/types';

// 5-minute Vercel function timeout. Default (10s edge / 60s serverless on
// hobby, 300s on pro) is too short for full-report LLM analyses on the
// max-cap 5000-bet dataset — observed in production 2026-05-06 when a
// paying user's full-report runAutopsy stalled mid-LLM-stream around the
// 60s mark, the function got killed, no autopsy_reports row was committed
// and the user was left with is_paid=true but no full report row to
// render. Vercel caps this at the plan max (300s on pro), so this is a
// no-op on hobby — but on pro it's the difference between completion and
// silent timeout for large analyses.
export const maxDuration = 300;

export async function POST(request: Request) {
  // ── Pre-stream validation (returns JSON errors) ──
  // Resolve session via cookie (web) or Bearer token (mobile). Any
  // failure path — thrown cookie error, missing header, invalid
  // token, no user — collapses to a 401.
  let authResult;
  try {
    authResult = await getAuthenticatedClient(request);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
  const { supabase, user, error: authError } = authResult;
  if (authError || !user || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit: 5 reports per hour
  if (!(await checkRateLimit(user.id, 5, 60 * 60 * 1000, user.email))) {
    return NextResponse.json({ error: "You've hit the hourly analysis limit. Try again in a few minutes." }, { status: 429 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const tier = (profile as Profile).subscription_tier as SubscriptionTier;
  const limits = TIER_LIMITS[tier];



  // Parse optional body
  let reportType: 'snapshot' | 'full' | 'weekly' | 'quick' = 'snapshot';
  let dateFrom: string | null = null;
  let dateTo: string | null = null;
  let uploadIds: string[] = [];
  let analyzedBetIds: string[] | null | undefined;
  let sportsbook: string | null = null;
  let filterLabel = '';
  let paidSnapshotId: string | null = null;

  // iOS posts multipart/form-data (file + report_type). Web posts JSON.
  // The multipart branch parses + inserts bets, then falls through to the
  // shared analysis flow below; the JSON branch is unchanged.
  const contentType = request.headers.get('content-type') ?? '';
  const isMultipart = contentType.toLowerCase().startsWith('multipart/form-data');

  if (isMultipart) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (err) {
      logErrorServer(err, { path: '/api/analyze', metadata: { stage: 'formdata-parse' } });
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    const csvFile = file as File;

    const rt = formData.get('report_type');
    if (typeof rt === 'string' && (rt === 'snapshot' || rt === 'full' || rt === 'weekly' || rt === 'quick')) {
      reportType = rt;
    }

    // Same validation as /api/upload — .csv suffix or text/csv MIME, 10MB cap.
    if (!csvFile.name.endsWith('.csv') && csvFile.type !== 'text/csv') {
      return NextResponse.json({ error: 'Only CSV files are accepted.' }, { status: 400 });
    }
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (csvFile.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 413 });
    }

    const text = await csvFile.text();
    const { bets: parsedBets, errors: parseErrors } = parseCSV(text);

    if (parsedBets.length === 0) {
      const firstSpecificError = parseErrors.find((e) => e && e.length > 0);
      const detail = firstSpecificError ?? "We couldn't read any bets from this file.";
      return NextResponse.json({ error: detail, errors: parseErrors }, { status: 400 });
    }

    try {
      const importResult = await importBets(supabase, user.id, parsedBets, csvFile.name);
      // bets_imported === 0 && duplicates_skipped > 0 is the silent-dedup path —
      // user re-uploaded the same CSV; fall through to analysis on existing bets.
      // bets_imported === 0 && duplicates_skipped === 0 means nothing landed AND
      // nothing was deduped — real failure, return a pre-stream 400.
      if (importResult.bets_imported === 0 && importResult.duplicates_skipped === 0) {
        return NextResponse.json(
          { error: 'Failed to import bets.', errors: importResult.errors },
          { status: 400 }
        );
      }
      // Pin the autopsy_reports row to this upload's bets so iOS IAP upgrade
      // can re-run the engine on the exact cohort the user paid for. Without
      // this, every iOS-originated snapshot ships with analyzed_upload_ids=[]
      // and the upgrade handler treats that as manual-recovery. Dedup path
      // (upload_id=null) is covered by lib/iap-upgrade.ts fallback.
      if (importResult.upload_id) {
        uploadIds = [importResult.upload_id];
      }
    } catch (err) {
      logErrorServer(err, { path: '/api/analyze', metadata: { stage: 'import-bets' } });
      return NextResponse.json({ error: 'Failed to import bets.' }, { status: 500 });
    }
  } else {
    try {
      const body = await request.json();
      if (body.report_type) reportType = body.report_type;
      if (body.date_from) dateFrom = body.date_from;
      if (body.date_to) dateTo = body.date_to;
      if (body.upload_id) uploadIds = [body.upload_id];
      if (body.upload_ids && Array.isArray(body.upload_ids)) uploadIds = body.upload_ids;
      if (body.sportsbook) sportsbook = body.sportsbook;
      if (body.paid_snapshot_id) paidSnapshotId = body.paid_snapshot_id;
    } catch {
      // No body or invalid JSON is fine
    }
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Paid fulfillment is server-owned. Browsers and stale native clients may
  // observe status here, but they never get to start the paid LLM run.
  if (tier === 'free' && reportType === 'full' && paidSnapshotId) {
    if (!uuidRegex.test(paidSnapshotId)) {
      return NextResponse.json({ error: 'Payment required for full report.' }, { status: 402 });
    }
    const { data: paidReport, error: paidReportError } = await supabase
      .from('autopsy_reports')
      .select('id, report_type')
      .eq('id', paidSnapshotId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (paidReportError) {
      logErrorServer(paidReportError, {
        path: '/api/analyze',
        userId: user.id,
        metadata: { stage: 'paid-snapshot-lookup', paidSnapshotId },
      });
      return NextResponse.json({ error: 'Failed to verify paid report.' }, { status: 500 });
    }
    if (!paidReport || paidReport.report_type !== 'snapshot') {
      return NextResponse.json({ error: 'Payment required for full report.' }, { status: 402 });
    }

    const { data: fulfillment, error: fulfillmentError } = await supabase
      .from('report_fulfillments')
      .select('status, completed_report_id, paid_at')
      .eq('snapshot_report_id', paidSnapshotId)
      .maybeSingle();
    if (fulfillmentError) {
      logErrorServer(fulfillmentError, {
        path: '/api/analyze',
        userId: user.id,
        metadata: { stage: 'paid-fulfillment-lookup', paidSnapshotId },
      });
      return NextResponse.json({ error: 'Failed to verify paid report.' }, { status: 500 });
    }
    if (!fulfillment?.paid_at) {
      return NextResponse.json({ error: 'Payment required for full report.' }, { status: 402 });
    }
    if (fulfillment.status === 'completed' || fulfillment.completed_report_id) {
      return NextResponse.json({ error: 'This report has already been unlocked. View it in your report history.' }, { status: 400 });
    }

    return NextResponse.json(
      {
        status: fulfillment.status,
        message: 'Paid report fulfillment is already owned by the server.',
      },
      { status: 202 },
    );
  } else if (tier === 'free' && reportType === 'full') {
    // Free user requesting full without a paid snapshot — downgrade to snapshot
    reportType = 'snapshot';
  }

  // Input validation
  const dateRegex = /^\d{4}-\d{2}-\d{2}/;
  if (dateFrom && (!dateRegex.test(dateFrom) || isNaN(Date.parse(dateFrom)))) {
    return NextResponse.json({ error: 'Invalid start date format.' }, { status: 400 });
  }
  if (dateTo && (!dateRegex.test(dateTo) || isNaN(Date.parse(dateTo)))) {
    return NextResponse.json({ error: 'Invalid end date format.' }, { status: 400 });
  }
  for (const uid of uploadIds) {
    if (!uuidRegex.test(uid)) {
      return NextResponse.json({ error: 'Invalid upload ID.' }, { status: 400 });
    }
  }

  if (uploadIds.length === 1) filterLabel = 'upload';
  else if (uploadIds.length > 1) filterLabel = 'uploads';
  if (sportsbook) filterLabel = filterLabel || 'sportsbook';

  let bets: Bet[];
  try {
    bets = await resolveBetsForReportScope(supabase, {
      userId: user.id,
      analyzedBetIds,
      uploadIds,
      sportsbook,
      dateFrom,
      dateTo,
    });
  } catch (error) {
    logErrorServer(error, { path: '/api/analyze', userId: user.id, metadata: { stage: 'resolve-cohort' } });
    return NextResponse.json({ error: 'Failed to fetch bets' }, { status: 500 });
  }

  const betList = (bets ?? []) as Bet[];

  if (betList.length === 0) {
    const rangeMsg = dateFrom || dateTo ? ' in the selected date range' : '';
    return NextResponse.json({ error: `No bets found${rangeMsg}. Upload some bets first.` }, { status: 400 });
  }

  if (betList.length < 10) {
    return NextResponse.json({ error: `You need at least 10 bets to generate a report (you have ${betList.length}). For best results, we recommend 50+ bets. Upload more and try again.` }, { status: 400 });
  }

  // Require at least some settled bets (wins or losses) for meaningful analysis
  const settledCount = betList.filter((b) => b.result === 'win' || b.result === 'loss').length;
  if (settledCount < 5) {
    return NextResponse.json({ error: `Not enough settled bets to analyze (${settledCount} settled out of ${betList.length} total). Need at least 5 wins or losses.` }, { status: 400 });
  }

  // Enforce per-report bet limit (5000 for all tiers)
  const ABSOLUTE_MAX_BETS = 5000;
  const totalBetCount = betList.length;
  let betsToAnalyze = betList;
  let tierLimited = false;
  const effectiveLimit = limits.maxBetsPerReport ?? ABSOLUTE_MAX_BETS;

  if (betList.length > effectiveLimit) {
    const sorted = [...betList].sort(
      (a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime()
    );
    betsToAnalyze = sorted.slice(0, effectiveLimit).reverse();
    tierLimited = true;
  }

  const userBankroll = (profile as Profile).bankroll;
  const typedProfile = profile as Profile;

  // ── SSE Stream ──
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(type: string, data: unknown) {
        const payload = JSON.stringify({ type, data });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      }

      try {
        // ── Phase 1: Send JS metrics immediately ──
        // Fetch previous snapshot for discipline score
        const { data: prevSnaps } = await supabase
          .from('progress_snapshots')
          .select('*')
          .eq('user_id', user.id)
          .order('snapshot_date', { ascending: false })
          .limit(1);
        const prevSnap = (prevSnaps && prevSnaps.length > 0) ? prevSnaps[0] as ProgressSnapshot : null;

        const { count: rptCount } = await supabase
          .from('autopsy_reports')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
        const { count: recentUploadCount } = await supabase
          .from('bets')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', twoWeeksAgo);

        const { partialAnalysis } = calculateMetricsOnly(betsToAnalyze, userBankroll, {
          hasBankroll: !!typedProfile.bankroll,
          reportCount: (rptCount ?? 0) + 1,
          streakCount: typedProfile.streak_count ?? 0,
          uploadedRecently: (recentUploadCount ?? 0) > 0,
          prevSnapshot: prevSnap ? {
            tilt_score: prevSnap.tilt_score,
            emotion_score: undefined,
            stake_cv: undefined,
            parlay_percent: prevSnap.parlay_percent,
            loss_chase_ratio: prevSnap.loss_chase_ratio,
          } : null,
        });

        sendEvent('metrics', {
          partial_analysis: partialAnalysis,
          tier_limited: tierLimited,
          total_bets: totalBetCount,
          analyzed_bets: betsToAnalyze,
        });

        // ── Phase 2: Run analysis ──
        // Check launch promo: first full report free for new signups
        const hasUsedPromo = (rptCount ?? 0) > 0 && await (async () => {
          const { count } = await supabase
            .from('autopsy_reports')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('report_type', 'full');
          return (count ?? 0) > 0;
        })();
        const promoEligible = tier === 'free'
          && userQualifiesForPromo(typedProfile.created_at)
          && !hasUsedPromo;

        // Free users get snapshots; full reports require Pro or the disabled
        // legacy promo. Paid snapshot upgrades are owned by the worker above.
        const isSnapshot = promoEligible
          ? false
          : reportType === 'snapshot' || (tier === 'free' && reportType !== 'full');
        const effectiveReportType = isSnapshot ? 'snapshot' : reportType;

        // Pre-generated so the strategic_leaks/edge_profile drop records
        // returned from runAutopsy (lib/autopsy-engine.ts) can tag each
        // drop with the report id it belongs to, and so that id matches
        // the actual saved row below (explicit `id:` on the insert)
        // instead of being a throwaway correlation value with nothing to
        // look up.
        const reportId = crypto.randomUUID();

        if (!isSnapshot) {
          const profileContext: FullReportProfileContext = {
            email: typedProfile.email ?? user.email ?? null,
            bankroll: userBankroll ?? null,
            streak_count: typedProfile.streak_count ?? 0,
            streak_last_date: typedProfile.streak_last_date ?? null,
            streak_best: typedProfile.streak_best ?? 0,
            streak_freezes: typedProfile.streak_freezes ?? 1,
          };
          const persistenceClient = createServiceRoleClient();

          try {
            const fullResult = await generateAndPersistFullReport({
              supabase,
              persistenceClient,
              userId: user.id,
              profile: profileContext,
              bets: betsToAnalyze,
              reportType: effectiveReportType,
              analyzedUploadIds: uploadIds,
              analyzedSportsbook: sportsbook,
              reportCount: rptCount ?? 0,
              recentUploadCount: recentUploadCount ?? 0,
              previousSnapshot: prevSnap,
              upgradedFromSnapshotId: paidSnapshotId,
              reportId,
              dropLogPath: '/api/analyze',
              deferBackground: (promise) => waitUntil(promise),
              beforePersist: tier === 'pro'
                ? async () => {
                    const { error: usageError } = await persistenceClient
                      .from('profiles')
                      .update({
                        reports_used_this_period: (typedProfile.reports_used_this_period ?? 0) + 1,
                        updated_at: new Date().toISOString(),
                      })
                      .eq('id', user.id);
                    if (usageError) {
                      throw new Error(`Failed to record report usage: ${usageError.message}`);
                    }
                  }
                : undefined,
            });

            sendEvent('report_started', { report_id: fullResult.report.id });
            waitUntil(maybeSendHeatedPush(user.id, fullResult.report.id, fullResult.analysis));
            sendEvent('complete', {
              report: fullResult.report,
              tier_limited: tierLimited,
              total_bets: totalBetCount,
              analyzed_bets: betsToAnalyze,
              filter: filterLabel || null,
            });
            return;
          } catch (error) {
            if (error instanceof FullReportPersistenceError) {
              console.error('Failed to save report:', error.persistenceError);
              sendEvent('error', { error: error.message });
              return;
            }
            throw error;
          }
        }

        const { analysis, markdown, tokensUsed, model, drops } = await runSnapshot(
          betsToAnalyze,
          userBankroll,
        );

        const costCents = Math.ceil(tokensUsed * 0.001);
        const dateStart = betsToAnalyze[0]?.placed_at ?? null;
        const dateEnd = betsToAnalyze[betsToAnalyze.length - 1]?.placed_at ?? null;

        // Discipline score for full analysis
        const metricsForDiscipline = calculateMetrics(betsToAnalyze, userBankroll);
        const disciplineResult = calculateDisciplineScore(metricsForDiscipline, {
          hasBankroll: !!typedProfile.bankroll,
          reportCount: (rptCount ?? 0) + 1,
          streakCount: typedProfile.streak_count ?? 0,
          uploadedRecently: (recentUploadCount ?? 0) > 0,
          prevSnapshot: prevSnap ? {
            tilt_score: prevSnap.tilt_score,
            emotion_score: undefined,
            stake_cv: undefined,
            parlay_percent: prevSnap.parlay_percent,
            loss_chase_ratio: prevSnap.loss_chase_ratio,
          } : null,
        });
        // Check if user took the quiz — store quiz archetype for comparison
        try {
          const { data: quizLead } = await supabase
            .from('quiz_leads')
            .select('archetype')
            .eq('email', user.email ?? '')
            .maybeSingle();
          if (quizLead?.archetype) {
            analysis.quiz_archetype = quizLead.archetype as string;
          }
        } catch { /* quiz lookup is best-effort */ }

        // Stamp the saved-report schema version. v4 = SNAPSHOT-LOOSEN
        // (small-sample bias tier + sufficiency state); v3 = report-trust
        // shape (recovery, charts, framing, per-finding metadata, dedup).
        // Programmatic readers: computeWhatChanged's crossSchemaVersion
        // annotation and compareReports' cross-version suppression of
        // resolved/new bias claims; every other consumer tolerates old
        // shapes via optional fields, not version gates.
        analysis.schema_version = 4;

        // Longitudinal-memory deltas. Pull the most recent prior report for
        // this user, feed it + the just-computed analysis into the pure
        // computeWhatChanged. The pre-INSERT SELECT naturally excludes the
        // row we are about to write. Any failure here is non-blocking.
        //
        // Wire contract:
        //   - No prior row (first report)          -> whatChanged: null
        //   - Prior row, no qualifying deltas      -> key omitted (no-op)
        //   - Prior row, deltas qualify thresholds -> whatChanged: { ... }
        // iOS Codable decodes both null and missing-key to nil so the
        // Chapter 1 "What Changed" card hides cleanly on first reports.
        // The explicit null on no-prior is shipped instead of key omission
        // so the wire shape is unambiguous in Supabase queries and easier
        // to assert against from tests or downstream consumers.
        try {
          const { data: priorRow } = await supabase
            .from('autopsy_reports')
            .select('report_json, created_at, bet_count_analyzed')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (priorRow?.report_json && priorRow.created_at) {
            const whatChanged = computeWhatChanged(
              {
                analysis: priorRow.report_json as AutopsyAnalysis,
                createdAt: priorRow.created_at as string,
                betCountAnalyzed: (priorRow.bet_count_analyzed as number | null) ?? 0,
              },
              {
                analysis,
                createdAt: new Date().toISOString(),
                betCountAnalyzed: betsToAnalyze.length,
              },
            );
            if (whatChanged) analysis.whatChanged = whatChanged;
          } else {
            analysis.whatChanged = null;
          }
        } catch (err) {
          console.error('[analyze] whatChanged computation failed:', err);
          Sentry.captureException(err);
        }

        // Save report. Use the service-role client specifically for this
        // INSERT: report_json is a multi-hundred-KB JSON blob, and the
        // anon role's 3s statement_timeout cancels it (Postgres 57014)
        // even though the INSERT itself completes in <500ms on a role
        // without that timeout. service_role inherits the 120s default.
        // Every other call in this route stays on the user-scoped
        // `supabase` client so RLS policies remain in effect.
        const serviceRole = createServiceRoleClient();
        const { data: savedReport, error: insertError } = await serviceRole
          .from('autopsy_reports')
          .insert({
            id: reportId,
            user_id: user.id,
            report_type: effectiveReportType,
            bet_count_analyzed: betsToAnalyze.length,
            date_range_start: dateStart,
            date_range_end: dateEnd,
            report_json: analysis,
            report_markdown: markdown,
            model_used: model,
            tokens_used: tokensUsed,
            cost_cents: costCents,
            is_paid: !isSnapshot,
            // Persist the filter that produced this report so /api/analyze
            // can lock to the exact dataset on a paid_snapshot_id unlock.
            // analyzed_upload_ids = [] means "no upload filter" — distinct
            // from NULL which means "legacy row, no lock data persisted."
            // analyzed_sportsbook is null when no sportsbook filter applied.
            analyzed_upload_ids: uploadIds,
            analyzed_sportsbook: sportsbook,
            analyzed_bet_ids: betsToAnalyze.map((bet) => bet.id),
            // Freeze the exact raw inputs alongside their IDs. Paid
            // fulfillment prefers this immutable copy so account edits or
            // deletions cannot change the report the customer purchased.
            analyzed_bets_snapshot: betsToAnalyze,
            report_summary: buildReportSummary(analysis),
            ...(paidSnapshotId ? { upgraded_from_snapshot_id: paidSnapshotId } : {}),
          })
          .select()
          .single();

        if (insertError) {
          console.error('Failed to save report:', insertError);
          sendEvent('error', { error: 'Report generated but failed to save. Please try again.' });
          controller.close();
          return;
        }

        // A: persist strategic_leaks/edge_profile drop records to
        // error_logs instead of just console.log - Vercel runtime log
        // retention is limited and drops are rare, so a console-only
        // version ages out before enough accumulate to compute a real
        // miss rate, which is the whole point of this instrumentation.
        // waitUntil, not a bare unwaited .then(): the whole point of this
        // instrumentation is accumulating a reliable count, and a bare
        // Promise gets reaped along with the instance once the SSE
        // response closes - the exact failure mode maybeSendHeatedPush
        // below hit in prod (killed mid-flight before its write landed).
        if (drops.length > 0) {
          // Promise.resolve(...) wraps the Supabase query builder's
          // thenable (not a real Promise - it lazily builds the request
          // on .then()) so waitUntil, which is typed for a real Promise,
          // accepts it.
          const dropsInsert = Promise.resolve(
            serviceRole
              .from('error_logs')
              .insert(drops.map((d) => ({
                user_id: user.id,
                source: 'autopsy-engine-drop',
                message: `${d.site} drop: ${d.category ?? '(no category)'} (${d.reason})`,
                path: '/api/analyze',
                metadata: {
                  reportId: d.reportId,
                  site: d.site,
                  kind: d.kind ?? null,
                  category: d.category,
                  categoryRoiExists: d.categoryRoiExists,
                  reason: d.reason,
                },
              })))
          );
          waitUntil(dropsInsert.then(({ error }) => {
            if (error) console.error('Failed to persist engine drops:', error);
          }));
        }

        // Emit a durable handle for the new report row before any further SSE
        // event. iOS doesn't consume `report_started` yet (iOS-PR-V0.5), but
        // the contract has to exist now so the client can adopt it without a
        // server change — and so a dropped/timed-out stream still leaves the
        // client with a report_id it can poll the v1.1 Trigger.dev recovery
        // endpoint with.
        if (savedReport?.id) {
          sendEvent('report_started', { report_id: savedReport.id });
          // Fire-and-forget heated-session push. Internally wrapped in
          // try/catch + Sentry; never throws and never blocks the SSE
          // stream. One push per analyze run by construction
          // (pickHeatedSessionForPush returns at most one session).
          //
          // waitUntil keeps the Vercel function alive past SSE close
          // until the Promise resolves. A bare `void` Promise gets
          // reaped along with the instance when the response stream
          // closes, which on the first prod run killed the in-flight
          // http2 request to APNs before the response arrived and
          // notifications_sent was never written.
          waitUntil(maybeSendHeatedPush(user.id, savedReport.id, analysis));
        }

        // Save discipline score with component breakdown. Skip the ledger row
        // entirely when the score is insufficient_data (all-zero components):
        // writing it would show "0 discipline today" in the streak feed, which
        // is wrong UX. The autopsy report itself still carries the gated
        // placeholder; only the longitudinal track is suppressed.
        if (disciplineResult && !disciplineResult.insufficient_data && savedReport?.id) {
          try {
            await supabase.from('discipline_scores').insert({
              user_id: user.id,
              score: disciplineResult.total,
              components: {
                tracking: disciplineResult.tracking,
                sizing: disciplineResult.sizing,
                control: disciplineResult.control,
                strategy: disciplineResult.strategy,
              },
              report_id: savedReport.id,
            });
          } catch (dsErr) {
            console.error('Failed to save discipline score:', dsErr);
          }
        }

        // Streak logic
        try {
          const today = new Date().toISOString().split('T')[0];
          let newStreak = typedProfile.streak_count ?? 0;
          let freezes = typedProfile.streak_freezes ?? 1;
          const lastDate = typedProfile.streak_last_date;
          const daysSince = lastDate ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000) : null;

          if (daysSince === null) {
            newStreak = 1;
          } else if (daysSince >= 5 && daysSince <= 21) {
            newStreak += 1;
          } else if (daysSince > 21) {
            // Streak would break — check for freeze
            if (freezes > 0) {
              // Use a freeze: keep streak, don't increment
              freezes -= 1;
            } else {
              newStreak = 1;
            }
          }
          // daysSince < 5: don't increment, too soon

          const newBest = Math.max(newStreak, typedProfile.streak_best ?? 0);
          await supabase.from('profiles').update({
            streak_count: newStreak,
            streak_last_date: today,
            streak_best: newBest,
            streak_freezes: freezes,
          }).eq('id', user.id);
        } catch (streakErr) {
          console.error('Failed to update streak:', streakErr);
        }

        // Save progress snapshot. Restored 2026-06-10 (hardening): the
        // 2026-05-11 diagnostic that disabled this blamed it for a per-function
        // timeout; the real cause was later found to be the iOS HTTP/3 hang and
        // the bogus `updated_at` LIST_COLUMNS entry, both since fixed. Without
        // this write the dashboard ProgressChart and the report "vs. Last
        // Report" strip go stale for every user who joined after 2026-05-11.
        try {
          await supabase.from('progress_snapshots').upsert({
            user_id: user.id,
            snapshot_date: new Date().toISOString().split('T')[0],
            total_bets: betsToAnalyze.length,
            total_profit: metricsForDiscipline.summary.total_profit,
            roi_percent: metricsForDiscipline.summary.roi_percent,
            win_rate: metricsForDiscipline.summary.win_rate,
            tilt_score: metricsForDiscipline.emotion_score,
            avg_stake: metricsForDiscipline.summary.avg_stake,
            parlay_percent: metricsForDiscipline.parlay_stats.parlay_percent,
            loss_chase_ratio: metricsForDiscipline.loss_chase_ratio,
            bankroll_health: metricsForDiscipline.bankroll_health,
            overall_grade: metricsForDiscipline.summary.overall_grade,
            discipline_score: disciplineResult?.total ?? null,
          }, { onConflict: 'user_id,snapshot_date' });
        } catch (snapErr) {
          console.error('Failed to save snapshot:', snapErr);
        }

        // Send complete event
        const report = savedReport ?? { report_json: analysis, report_markdown: markdown };
        sendEvent('complete', {
          report,
          tier_limited: tierLimited,
          total_bets: totalBetCount,
          analyzed_bets: betsToAnalyze,
          filter: filterLabel || null,
        });
      } catch (err) {
        Sentry.captureException(err, {
          tags: { route: 'analyze', report_type: reportType },
          extra: { bet_count: betsToAnalyze.length, tier },
        });
        logErrorServer(err, { path: '/api/analyze' });
        const rawMessage = err instanceof Error ? err.message : String(err);
        const lower = rawMessage.toLowerCase();
        let userMessage: string;
        if (lower.includes('overloaded') || lower.includes('529')) {
          userMessage = 'Our analysis engine is busy right now. Try again in about 30 seconds.';
        } else if (
          lower.includes('timeout') ||
          lower.includes('timed out') ||
          lower.includes('etimedout')
        ) {
          userMessage = 'Analysis is taking longer than expected. Please try again in a moment.';
        } else if (lower.includes('rate limit') || lower.includes('429')) {
          userMessage = "You've hit the rate limit on analyses. Please wait a minute and try again.";
        } else {
          userMessage = rawMessage || 'Analysis failed. Please try again or contact support if the problem persists.';
        }
        sendEvent('error', { error: userMessage });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

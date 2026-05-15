import { NextResponse } from 'next/server';
import * as Sentry from "@sentry/nextjs";
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { runAutopsy, runSnapshot, calculateMetrics, calculateMetricsOnly, calculateDisciplineScore, calculateBetIQ, estimatePercentile, calculateEnhancedTilt, detectSportSpecificPatterns } from '@/lib/autopsy-engine';
import { computeWhatChanged } from '@/lib/what-changed';
import { checkRateLimit } from '@/lib/rate-limit';
import { TIER_LIMITS, userQualifiesForPromo } from '@/types';
import { logErrorServer } from '@/lib/log-error-server';
import { parseCSV } from '@/lib/csv-parser';
import { importBets } from '@/lib/import-bets';
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

  // Verify paid report: free users requesting 'full' must have a paid snapshot
  // that hasn't already been used to generate a full report
  if (tier === 'free' && reportType === 'full' && paidSnapshotId) {
    const { data: paidReport } = await supabase
      .from('autopsy_reports')
      .select('id, is_paid, analyzed_upload_ids, analyzed_sportsbook')
      .eq('id', paidSnapshotId)
      .eq('user_id', user.id)
      .eq('is_paid', true)
      .single();
    if (!paidReport) {
      return NextResponse.json({ error: 'Payment required for full report.' }, { status: 402 });
    }
    // Lock the full-report run to the EXACT upload-and-sportsbook scope the
    // snapshot was produced from. The user paid for a deep dive on that
    // snapshot's bets — not a fresh analysis of whatever's in their account
    // now. If they uploaded new bets between snapshot and purchase, those
    // are NOT included; if they deleted some, those are still missing too.
    // Either way, the contract is what they saw on the Buy CTA.
    //
    // Note: we don't override dateFrom/dateTo here. The snapshot's
    // date_range_start/end are the *observed* range of analyzed bets, not
    // the user-supplied filter — locking to them would be imperfect
    // (backfilled bets in the same range still slip through) AND requires
    // converting timestamptz → YYYY-MM-DD to satisfy the date-format
    // regex above. Upload + sportsbook locks cover the realistic
    // post-payment data-drift cases without that complexity.
    //
    // Legacy snapshots (analyzed_upload_ids === NULL — pre-migration rows)
    // fall through to the body filter, preserving the old "analyze all
    // current bets" behavior so existing rows keep working.
    const typedPaid = paidReport as {
      analyzed_upload_ids: string[] | null;
      analyzed_sportsbook: string | null;
    };
    if (typedPaid.analyzed_upload_ids !== null) {
      uploadIds = typedPaid.analyzed_upload_ids;
      sportsbook = typedPaid.analyzed_sportsbook;
    }
    // Check if this paid snapshot was already used to generate a full report
    const { count: existingFull } = await supabase
      .from('autopsy_reports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('upgraded_from_snapshot_id', paidSnapshotId);
    if ((existingFull ?? 0) > 0) {
      return NextResponse.json({ error: 'This report has already been unlocked. View it in your report history.' }, { status: 400 });
    }
  } else if (tier === 'free' && reportType === 'full') {
    // Free user requesting full without a paid snapshot — downgrade to snapshot
    reportType = 'snapshot';
  }

  // Input validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

  // Fetch bets
  let query = supabase
    .from('bets')
    .select('*')
    .eq('user_id', user.id)
    .order('placed_at', { ascending: true });

  if (uploadIds.length === 1) {
    query = query.eq('upload_id', uploadIds[0]);
    filterLabel = 'upload';
  } else if (uploadIds.length > 1) {
    query = query.in('upload_id', uploadIds);
    filterLabel = 'uploads';
  }
  if (sportsbook) {
    query = query.eq('sportsbook', sportsbook);
    filterLabel = filterLabel || 'sportsbook';
  }
  if (dateFrom) {
    query = query.gte('placed_at', new Date(dateFrom).toISOString());
  }
  if (dateTo) {
    const endDate = new Date(dateTo);
    endDate.setDate(endDate.getDate() + 1);
    query = query.lt('placed_at', endDate.toISOString());
  }

  // Paginate to avoid Supabase default row limits
  const allBets: Bet[] = [];
  let fetchStart = 0;
  const FETCH_PAGE = 1000;
  let betsError: unknown = null;
  while (true) {
    const { data: page, error } = await query.range(fetchStart, fetchStart + FETCH_PAGE - 1);
    if (error) { betsError = error; break; }
    if (!page || page.length === 0) break;
    allBets.push(...(page as Bet[]));
    if (page.length < FETCH_PAGE) break;
    fetchStart += FETCH_PAGE;
  }

  if (betsError) {
    return NextResponse.json({ error: 'Failed to fetch bets' }, { status: 500 });
  }

  const bets = allBets;

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

        // Free users get snapshots; full reports require Pro, payment, or promo
        const hasPaidForFull = tier === 'free' && reportType === 'full' && !!paidSnapshotId;
        const isSnapshot = promoEligible || hasPaidForFull
          ? false // promo or paid users get a full report
          : reportType === 'snapshot' || (tier === 'free' && reportType !== 'full');
        const effectiveReportType = isSnapshot ? 'snapshot' : reportType;

        const { analysis, markdown, tokensUsed, model } = isSnapshot
          ? await runSnapshot(betsToAnalyze, userBankroll)
          : await runAutopsy(betsToAnalyze, userBankroll);

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
        analysis.discipline_score = disciplineResult
          ? { ...disciplineResult, percentile: estimatePercentile('discipline_score', disciplineResult.total) }
          : undefined;
        analysis.betiq = calculateBetIQ(metricsForDiscipline, betsToAnalyze);
        analysis.emotion_percentile = estimatePercentile('emotion_score', analysis.emotion_score, true);
        analysis.enhanced_tilt = calculateEnhancedTilt(metricsForDiscipline, betsToAnalyze);
        const sportFindings = detectSportSpecificPatterns(metricsForDiscipline, betsToAnalyze);
        if (sportFindings.length > 0) analysis.sport_specific_findings = sportFindings;

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

        // Stamp the current saved-report schema version so future readers can branch on shape.
        analysis.schema_version = 1;

        // Longitudinal-memory deltas. Pull the most recent prior report for
        // this user, feed it + the just-computed analysis into the pure
        // computeWhatChanged. The pre-INSERT SELECT naturally excludes the
        // row we are about to write. whatChanged is optional on the wire —
        // any failure here is non-blocking.
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
          }
        } catch (err) {
          console.error('[analyze] whatChanged computation failed:', err);
          Sentry.captureException(err);
        }

        // For Pro users running full reports, track usage
        if (!isSnapshot && tier === 'pro') {
          await supabase
            .from('profiles')
            .update({
              reports_used_this_period: (typedProfile.reports_used_this_period ?? 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);
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

        // Emit a durable handle for the new report row before any further SSE
        // event. iOS doesn't consume `report_started` yet (iOS-PR-V0.5), but
        // the contract has to exist now so the client can adopt it without a
        // server change — and so a dropped/timed-out stream still leaves the
        // client with a report_id it can poll the v1.1 Trigger.dev recovery
        // endpoint with.
        if (savedReport?.id) {
          sendEvent('report_started', { report_id: savedReport.id });
        }

        // Save discipline score with component breakdown
        if (disciplineResult && savedReport?.id) {
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

        // Save progress snapshot
        // DIAGNOSTIC 2026-05-11: commented out to test whether this upsert is
        // the source of the per-function timeout after Postgres statement-timeout
        // was raised to 120s. Restore after confirming.
        // try {
        //   await supabase.from('progress_snapshots').upsert({
        //     user_id: user.id,
        //     snapshot_date: new Date().toISOString().split('T')[0],
        //     total_bets: betsToAnalyze.length,
        //     total_profit: metricsForDiscipline.summary.total_profit,
        //     roi_percent: metricsForDiscipline.summary.roi_percent,
        //     win_rate: metricsForDiscipline.summary.win_rate,
        //     tilt_score: metricsForDiscipline.emotion_score,
        //     avg_stake: metricsForDiscipline.summary.avg_stake,
        //     parlay_percent: metricsForDiscipline.parlay_stats.parlay_percent,
        //     loss_chase_ratio: metricsForDiscipline.loss_chase_ratio,
        //     bankroll_health: metricsForDiscipline.bankroll_health,
        //     overall_grade: metricsForDiscipline.summary.overall_grade,
        //     discipline_score: disciplineResult?.total ?? null,
        //   }, { onConflict: 'user_id,snapshot_date' });
        // } catch (snapErr) {
        //   console.error('Failed to save snapshot:', snapErr);
        // }

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

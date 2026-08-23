'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { useUser } from '@/hooks/useUser';
import { useReports } from '@/hooks/useReports';
import { useSnapshots } from '@/hooks/useSnapshots';
import { useUploads } from '@/hooks/useUploads';
import { apiGet, apiPost } from '@/lib/api-client';
import dynamic from 'next/dynamic';
import OnboardingSteps from '@/components/OnboardingSteps';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const AutopsyReport = dynamic(() => import('@/components/AutopsyReport'), {
  loading: () => <div className="h-96 bg-surface-1 rounded-sm animate-pulse" />,
});
import type {
  AutopsyReport as AutopsyReportType,
  AutopsyReportListItem,
  AutopsyAnalysis,
  Bet,
  ReportComparison,
  ReportFulfillmentStatus,
} from '@/types';
import { compareReports } from '@/lib/report-comparison';
import { PRICING_ENABLED, getEffectiveTier } from '@/lib/feature-flags';
import { trackPurchase as trackPurchaseMeta } from '@/lib/meta-events';
import { FlaskConical, Upload as UploadIcon, Brain, Lock } from 'lucide-react';
import { isReportValueVisible } from '@/components/RedactedValue';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const { profile } = useUser();
  const { reports: cachedReports, mutate: mutateReports } = useReports();
  const { snapshots: latestTwoSnapshots } = useSnapshots({ ascending: false, limit: 2 });
  const { uploads } = useUploads();

  // Local summary rows mirror the SWR cache so a newly completed free
  // snapshot can appear immediately without retaining every full payload.
  const [reports, setReports] = useState<AutopsyReportListItem[]>([]);
  useEffect(() => { setReports(cachedReports); }, [cachedReports]);

  const tier = profile?.subscription_tier ?? 'free';
  const prevSnapshot = latestTwoSnapshots.length >= 2 ? latestTwoSnapshots[1] : null;

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [activeReport, setActiveReport] = useState<AutopsyReportType | null>(null);
  const [reportComparison, setReportComparison] = useState<ReportComparison | null>(null);
  const [openingReportId, setOpeningReportId] = useState<string | null>(null);
  const openingReportRef = useRef<string | null>(null);
  const [analyzedBets, setAnalyzedBets] = useState<Bet[]>([]);
  const [tierLimited, setTierLimited] = useState(false);
  const [totalBetsAll, setTotalBetsAll] = useState(0);
  const [totalBetCount, setTotalBetCount] = useState(0);
  const [firstInsight, setFirstInsight] = useState<{ biasName: string; cost: number } | null>(null);
  const autoRunTriggered = useRef(false);

  // Filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [analyzeScope, setAnalyzeScope] = useState('all');
  const [sportsbooks, setSportsbooks] = useState<string[]>([]);
  const [newBetsSinceReport, setNewBetsSinceReport] = useState(0);
  const [lastReportDate, setLastReportDate] = useState<string | null>(null);
  const [paidSnapshotId, setPaidSnapshotId] = useState<string | null>(null);
  const [fulfillmentStatus, setFulfillmentStatus] = useState<ReportFulfillmentStatus | null>(null);
  const [filteredCount, setFilteredCount] = useState<number | null>(null);

  useEffect(() => {
    loadReports();
    // Set scope from query params
    const qUploadId = searchParams.get('upload_id');
    const qUploadIds = searchParams.get('upload_ids');
    const qSportsbook = searchParams.get('sportsbook');
    if (qUploadId) setAnalyzeScope(`upload:${qUploadId}`);
    else if (qUploadIds) setAnalyzeScope(`uploads:${qUploadIds}`);
    else if (qSportsbook) setAnalyzeScope(`book:${qSportsbook}`);

    // The success redirect is analytics and status display only. Verified
    // payment fulfillment is owned by the server and survives this tab.
    if (typeof window !== 'undefined' && searchParams.get('unlocked') === 'true') {
      window.gtag?.('event', 'purchase', { value: 19.99, currency: 'USD' });
      trackPurchaseMeta('report', 19.99);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // A checkout return starts polling only. Free deep links can still start
  // snapshot analysis after bets have loaded.
  useEffect(() => {
    const isUnlock = searchParams.get('unlocked') === 'true';
    if (isUnlock && !autoRunTriggered.current && !loading) {
      autoRunTriggered.current = true;
      const paidId = searchParams.get('id');
      if (paidId) setPaidSnapshotId(paidId);
      window.history.replaceState({}, '', '/reports');
      return;
    }

    const shouldAutoRun = searchParams.get('run') === 'true' || searchParams.get('upload_id');
    if (shouldAutoRun && !autoRunTriggered.current && !loading && totalBetCount > 0) {
      autoRunTriggered.current = true;
      window.history.replaceState({}, '', '/reports');
      void runAutopsy();
    }
  }, [searchParams, loading, totalBetCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Open ordinary report deep links without treating them as analysis or
  // checkout triggers.
  useEffect(() => {
    const reportId = searchParams.get('id');
    if (
      !reportId ||
      searchParams.get('unlocked') === 'true' ||
      loading ||
      cachedReports.length === 0 ||
      autoRunTriggered.current
    ) return;
    autoRunTriggered.current = true;
    window.history.replaceState({}, '', '/reports');
    void openReportById(reportId, cachedReports);
  }, [searchParams, loading, cachedReports]); // eslint-disable-line react-hooks/exhaustive-deps

  // Payment fulfillment is durable and server-owned. Poll the compact list
  // until its snapshot points at the completed child, then lazy-load detail.
  useEffect(() => {
    if (!paidSnapshotId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const refreshed = await mutateReports();
        if (cancelled) return;
        const current = refreshed ?? reports;
        const snapshot = current.find((report) => report.id === paidSnapshotId);
        const completedId = snapshot?.completed_report_id
          ?? current.find((report) => report.upgraded_from_snapshot_id === paidSnapshotId)?.id
          ?? null;

        setFulfillmentStatus(snapshot?.fulfillment_status ?? null);
        if (completedId) {
          setFulfillmentStatus('completed');
          setPaidSnapshotId(null);
          await openReportById(completedId, current);
          return;
        }
      } catch {
        // Keep the last known state and try again. Never expose provider or
        // worker internals on the customer-facing page.
      }
      if (!cancelled) timer = setTimeout(poll, 2500);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [paidSnapshotId, mutateReports]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch filtered bet count when date range changes
  const fetchFilteredCount = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from('bets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (dateFrom) {
      query = query.gte('placed_at', new Date(dateFrom).toISOString());
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt('placed_at', endDate.toISOString());
    }

    const { count } = await query;
    setFilteredCount(count ?? 0);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (!loading) fetchFilteredCount();
  }, [dateFrom, dateTo, loading, fetchFilteredCount]);

  // What useReports/useUser/useSnapshots/useUploads don't cover:
  //   - bets count (head:true) — used as totalBetCount
  //   - distinct sportsbook list — projection-only over bets
  //   - bets-since-last-report count — needs the latest report date
  // All three are bets-table queries that aren't worth a dedicated hook
  // (count-only would be a wasteful useBets() of full rows). Keep inline.
  async function loadReports() {
    const supabase = createBrowserSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [betsRes, sportsbooksRes] = await Promise.all([
      supabase.from('bets').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('bets').select('sportsbook').eq('user_id', user.id).not('sportsbook', 'is', null),
    ]);

    const books = new Set<string>();
    (sportsbooksRes.data ?? []).forEach((b: { sportsbook: string | null }) => { if (b.sportsbook) books.add(b.sportsbook); });
    setSportsbooks(Array.from(books).sort());
    const count = betsRes.count ?? 0;
    setTotalBetCount(count);
    setFilteredCount(count);

    // Bets-since-last-report — depends on the cached reports list. Read
    // directly off the SWR cache instead of refetching.
    if (cachedReports.length > 0) {
      const lastDate = cachedReports[0].created_at;
      setLastReportDate(lastDate);
      const { count: newCount } = await supabase
        .from('bets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gt('created_at', lastDate);
      setNewBetsSinceReport(newCount ?? 0);
    }
    setLoading(false);
  }

  async function deleteReport(reportId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this report?')) return;
    const supabase = createBrowserSupabaseClient();
    await supabase.from('autopsy_reports').delete().eq('id', reportId);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    mutateReports();
  }

  async function deleteAllReports() {
    if (!confirm('Delete all reports? This cannot be undone.')) return;
    const supabase = createBrowserSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('autopsy_reports').delete().eq('user_id', user.id);
    setReports([]);
    mutateReports();
  }

  async function runAutopsy() {
    setRunning(true);
    setError('');
    setActiveReport(null);
    window.gtag?.('event', 'analysis_started');

    try {
      const body: Record<string, string | string[]> = {
        report_type: getEffectiveTier(tier) === 'pro' ? 'full' : 'snapshot',
      };
      if (dateFrom) body.date_from = dateFrom;
      if (dateTo) body.date_to = dateTo;
      if (analyzeScope.startsWith('uploads:')) body.upload_ids = analyzeScope.replace('uploads:', '').split(',');
      else if (analyzeScope.startsWith('upload:')) body.upload_id = analyzeScope.replace('upload:', '');
      else if (analyzeScope.startsWith('book:')) body.sportsbook = analyzeScope.replace('book:', '');
      else if (analyzeScope === 'since_last' && lastReportDate) body.date_from = lastReportDate;

      // `apiPost` returns the raw `Response` so the SSE stream
      // reader below works unchanged — it just handles the
      // cross-origin base URL + Bearer token on mobile for us.
      const res = await apiPost('/api/analyze', body);

      // If JSON error response (pre-stream validation failures)
      if (!res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setError(data.error || 'Analysis failed');
        setRunning(false);
        return;
      }

      if (!res.ok) {
        setError('Analysis failed');
        setRunning(false);
        return;
      }

      // Read SSE stream
      const reader = res.body?.getReader();
      if (!reader) {
        setError('Stream unavailable');
        setRunning(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let streamComplete = false;
      let metricsTimer: ReturnType<typeof setTimeout> | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6);

          try {
            const event = JSON.parse(json);

            if (event.type === 'metrics') {
              const d = event.data;
              // Store data immediately but delay showing the report for 5-7s
              // to create a premium "analyzing" feel
              metricsTimer = setTimeout(() => {
                setTierLimited(d.tier_limited ?? false);
                setTotalBetsAll(d.total_bets ?? 0);
                setAnalyzedBets((d.analyzed_bets ?? []) as Bet[]);

                // Create a temporary report so an explicitly initiated analysis can
                // render partial results. Paid fulfillment never enters this stream.
                const tempReport: AutopsyReportType = {
                  id: 'loading',
                  user_id: '',
                  report_type: getEffectiveTier(tier) === 'pro' ? 'full' : 'snapshot',
                  bet_count_analyzed: d.partial_analysis.summary.total_bets,
                  date_range_start: null,
                  date_range_end: null,
                  report_json: d.partial_analysis,
                  report_markdown: '',
                  model_used: null,
                  tokens_used: null,
                  cost_cents: null,
                  is_paid: tier === 'pro',
                  stripe_payment_intent_id: null,
                  upgraded_from_snapshot_id: null,
                  created_at: new Date().toISOString(),
                };
                setActiveReport(tempReport);
              }, 6000); // 6 second delay
              // setRunning stays true — signals Claude sections still loading
            }

            if (event.type === 'complete') {
              // Cancel the delayed metrics timer so it doesn't overwrite the final report
              if (metricsTimer) { clearTimeout(metricsTimer); metricsTimer = null; }
              const d = event.data;
              const report = d.report as AutopsyReportType;
              setTierLimited(d.tier_limited ?? false);
              setTotalBetsAll(d.total_bets ?? 0);
              setAnalyzedBets((d.analyzed_bets ?? []) as Bet[]);

              // First-report celebration: surface the top bias before showing results.
              const isFirstReport = reports.length === 0;
              const analysis = report.report_json as AutopsyAnalysis | null;
              const topBias = analysis?.biases_detected?.[0];
              if (isFirstReport && topBias?.bias_name && topBias.estimated_cost > 0) {
                setFirstInsight({
                  biasName: topBias.bias_name,
                  cost: Math.round(topBias.estimated_cost),
                });
              }

              setActiveReport(report);
              const listItem: AutopsyReportListItem = {
                id: report.id,
                report_type: report.report_type,
                bet_count_analyzed: report.bet_count_analyzed,
                date_range_start: report.date_range_start,
                date_range_end: report.date_range_end,
                report_json: report.report_summary ?? report.report_json,
                is_paid: report.is_paid,
                upgraded_from_snapshot_id: report.upgraded_from_snapshot_id,
                created_at: report.created_at,
                analyzed_upload_ids: report.analyzed_upload_ids,
                analyzed_sportsbook: report.analyzed_sportsbook,
                analyzed_bet_ids: report.analyzed_bet_ids,
                report_summary: report.report_summary,
                fulfillment_status: report.fulfillment_status,
                completed_report_id: report.completed_report_id,
                fulfillment_next_attempt_at: report.fulfillment_next_attempt_at,
                card_biases: report.report_json.biases_detected?.slice(0, 3).map((bias) => ({
                  bias_name: bias.bias_name,
                  severity: bias.severity,
                })),
              };
              setReports((prev) => [listItem, ...prev.filter((item) => item.id !== report.id)]);
              mutateReports();
              setRunning(false);
              streamComplete = true;
              window.gtag?.('event', 'analysis_completed', {
                bet_count: (d.analyzed_bets as Bet[] | undefined)?.length,
              });
            }

            if (event.type === 'error') {
              if (metricsTimer) { clearTimeout(metricsTimer); metricsTimer = null; }
              setError(event.data.error || 'Analysis failed');
              setRunning(false);
              streamComplete = true;
            }
          } catch {
            // JSON parse error on chunk — skip
          }
        }
      }

      // If stream ended without a 'complete' event
      if (!streamComplete) {
        setRunning(false);
      }
    } catch {
      setError('Analysis failed. Please try again.');
      setRunning(false);
    }
  }

  async function openReportById(
    reportId: string,
    list: AutopsyReportListItem[] = reports,
  ) {
    if (openingReportRef.current === reportId) return;
    openingReportRef.current = reportId;
    setOpeningReportId(reportId);
    setError('');

    try {
      const activeIndex = list.findIndex((report) => report.id === reportId);
      const previousId = activeIndex >= 0 && activeIndex < list.length - 1
        ? list[activeIndex + 1].id
        : null;
      const [detailResponse, previousResponse] = await Promise.all([
        apiGet(`/api/reports/${encodeURIComponent(reportId)}`),
        previousId
          ? apiGet(`/api/reports/${encodeURIComponent(previousId)}`)
          : Promise.resolve(null),
      ]);

      if (!detailResponse.ok) throw new Error('detail unavailable');
      const detailPayload = await detailResponse.json() as { report?: AutopsyReportType };
      if (!detailPayload.report) throw new Error('detail missing');
      const report = detailPayload.report;

      let comparison: ReportComparison | null = null;
      if (previousResponse?.ok) {
        const previousPayload = await previousResponse.json() as { report?: AutopsyReportType };
        if (previousPayload.report?.report_json) {
          try {
            const currentAnalysis = typeof report.report_json === 'string'
              ? JSON.parse(report.report_json) as AutopsyAnalysis
              : report.report_json;
            const previousAnalysis = typeof previousPayload.report.report_json === 'string'
              ? JSON.parse(previousPayload.report.report_json) as AutopsyAnalysis
              : previousPayload.report.report_json;
            comparison = compareReports(currentAnalysis, previousAnalysis);
          } catch {
            comparison = null;
          }
        }
      }

      setReportComparison(comparison);
      setTierLimited(report.report_type === 'snapshot');
      setActiveReport(report);

      // Fetch the exact frozen cohort when available. Legacy rows fall back
      // to their date range so existing What-If tools keep working.
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (report.analyzed_bet_ids?.length) {
        const chunks: string[][] = [];
        for (let index = 0; index < report.analyzed_bet_ids.length; index += 200) {
          chunks.push(report.analyzed_bet_ids.slice(index, index + 200));
        }
        const results = await Promise.all(chunks.map((ids) =>
          supabase
            .from('bets')
            .select('*')
            .eq('user_id', user.id)
            .in('id', ids)
        ));
        if (results.some((result) => result.error)) {
          setAnalyzedBets([]);
        } else {
          const exactBets = results
            .flatMap((result) => (result.data ?? []) as Bet[])
            .sort((a, b) => a.placed_at.localeCompare(b.placed_at));
          setAnalyzedBets(exactBets);
        }
      } else {
        let query = supabase
          .from('bets')
          .select('*')
          .eq('user_id', user.id)
          .order('placed_at', { ascending: true });
        if (report.date_range_start) query = query.gte('placed_at', report.date_range_start);
        if (report.date_range_end) query = query.lte('placed_at', report.date_range_end);
        const { data: betsData } = await query;
        setAnalyzedBets((betsData ?? []) as Bet[]);
      }
    } catch {
      setError('This report could not be opened. Please try again.');
    } finally {
      openingReportRef.current = null;
      setOpeningReportId(null);
    }
  }

  async function openReport(report: AutopsyReportListItem) {
    await openReportById(report.id);
  }

  function setQuickRange(days: number | null) {
    if (days === null) {
      setDateFrom('');
      setDateTo('');
    } else {
      setDateFrom(daysAgo(days));
      setDateTo(new Date().toISOString().split('T')[0]);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-surface-1 rounded" />
        <div className="h-40 bg-surface-1 rounded-sm" />
      </div>
    );
  }

  const isFirstReport = reports.length <= 1 && activeReport !== null;

  // Viewing a specific report
  if (activeReport) {
    let analysis: AutopsyAnalysis | null = null;
    try {
      analysis =
        typeof activeReport.report_json === 'string'
          ? JSON.parse(activeReport.report_json)
          : activeReport.report_json;
    } catch {
      // Corrupted report JSON — show error instead of crashing
    }

    if (!analysis) {
      return (
        <div className="space-y-6 animate-fade-in">
          <button onClick={() => setActiveReport(null)} className="text-fg-muted text-sm hover:text-fg">&larr; Back to reports</button>
          <div className="card p-8 text-center">
            <p className="text-loss font-medium">This report&apos;s data appears to be corrupted.</p>
            <p className="text-fg-muted text-sm mt-2">Try running a new analysis.</p>
          </div>
        </div>
      );
    }

    const paidSnapshot = activeReport.report_type === 'snapshot'
      && (
        activeReport.is_paid
        || activeReport.fulfillment_status === 'paid_queued'
        || activeReport.fulfillment_status === 'generating'
        || activeReport.fulfillment_status === 'retryable_failure'
        || activeReport.fulfillment_status === 'completed'
      );

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Onboarding step 3 */}
        {isFirstReport && (
          <OnboardingSteps active={3} completed={[1, 2]} />
        )}
        <button
          onClick={() => { setActiveReport(null); setAnalyzedBets([]); setReportComparison(null); }}
          className="text-sm text-fg-muted hover:text-fg transition-colors"
        >
          ← Back to Reports
        </button>
        {PRICING_ENABLED && tierLimited && !paidSnapshot && (
          <div className="card border-scalpel/20 bg-scalpel-muted p-5">
            <p className="text-fg-bright text-sm">
              This is a snapshot. The full report unlocks all 5 chapters
              with dollar costs, strategic leaks, and a personalized action plan.
            </p>
            <a href="/pricing" className="btn-primary inline-block mt-3 text-sm">
              Get Full Report: $19.99
            </a>
          </div>
        )}
        {paidSnapshot && (
          <div className="card border-scalpel/20 bg-scalpel-muted p-5" role="status">
            <p className="text-fg-bright text-sm font-medium">
              {activeReport.completed_report_id
                ? 'Your full report is ready.'
                : activeReport.fulfillment_status === 'retryable_failure'
                ? 'Payment received. Report generation will retry automatically.'
                : activeReport.fulfillment_status === 'generating'
                ? 'Payment received. Your full report is being generated.'
                : 'Payment received. Your full report is queued.'}
            </p>
            <p className="text-fg-muted text-xs mt-1">
              You will not be charged again for this snapshot.
            </p>
            {activeReport.completed_report_id && (
              <button
                type="button"
                className="btn-primary mt-3 text-sm"
                onClick={() => void openReportById(activeReport.completed_report_id!)}
              >
                Open Full Report
              </button>
            )}
          </div>
        )}
        {/* Compact progress bar while Claude is still analyzing */}
        {running && <AnalyzingProgress betCount={activeReport.bet_count_analyzed} />}

        {/* First-insight celebration — surfaces top bias before the full report */}
        {firstInsight && (
          <button
            onClick={() => setFirstInsight(null)}
            className="w-full text-left mb-6 animate-fade-in"
          >
            <div className="border-2 border-scalpel/40 bg-scalpel/[0.06] rounded-sm p-6 space-y-2">
              <div className="font-mono text-[10px] text-scalpel tracking-[3px] uppercase">YOUR FIRST AUTOPSY FOUND</div>
              <p className="font-bold text-xl text-fg-bright">
                {firstInsight.biasName} has an estimated cost of ~${firstInsight.cost.toLocaleString()} in this report.
              </p>
              <p className="text-fg-muted text-sm">Tap to see the full report.</p>
            </div>
          </button>
        )}

        {/* Wraps AutopsyReport + dependent UI (post-first-report prompt) so
            a render-time exception inside AutopsyReport (recharts,
            hook-order issues, etc.) renders a recoverable fallback instead
            of unmounting the page and tripping React #310. The back
            button + snapshot-upgrade card above the boundary stay
            accessible so the user can always escape. */}
        <ErrorBoundary>
          <AutopsyReport analysis={analysis} bets={analyzedBets} previousSnapshot={prevSnapshot} reportId={activeReport.id} tier={tier as 'free' | 'pro'} isSnapshot={activeReport.report_type === 'snapshot'} purchaseAvailable={!paidSnapshot} comparison={reportComparison} recoveryModeActive={profile?.manual_recovery_mode ?? false} />
          {/* Post-first-report prompt */}
          {isFirstReport && (
            <div className="card p-5 text-center space-y-2">
              <p className="text-fg-muted text-sm">
                Want more accurate results? Set your bankroll and review your betting goals.
              </p>
              <Link href="/dashboard" className="text-sm text-scalpel hover:underline">
                Go to Dashboard →
              </Link>
            </div>
          )}
        </ErrorBoundary>
      </div>
    );
  }

  const activeRange = !dateFrom && !dateTo ? 'all' : null;
  const scopedCount = (() => {
    if (analyzeScope.startsWith('upload:')) {
      const id = analyzeScope.replace('upload:', '');
      const u = uploads.find((up) => up.id === id);
      return u?.bet_count ?? filteredCount ?? totalBetCount;
    }
    if (analyzeScope.startsWith('uploads:')) {
      const ids = analyzeScope.replace('uploads:', '').split(',');
      return uploads.filter((u) => ids.includes(u.id)).reduce((s, u) => s + u.bet_count, 0);
    }
    if (analyzeScope === 'since_last') return newBetsSinceReport;
    return filteredCount ?? totalBetCount;
  })();
  const betCountForRun = scopedCount;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg-bright">Reports</h1>
        <p className="text-sm text-fg-muted mt-1">Run analysis and view past reports</p>
        <p className="text-xs text-fg-muted mt-0.5">
          {reports.length} report{reports.length !== 1 ? 's' : ''} generated
        </p>
      </div>

      {paidSnapshotId && (
        <div className="card border-scalpel/20 bg-scalpel-muted p-5" role="status" aria-live="polite">
          <p className="font-medium text-fg-bright">
            {fulfillmentStatus === 'paid_queued'
              ? 'Payment received. Your full report is queued.'
              : fulfillmentStatus === 'generating'
              ? 'Your full report is being generated.'
              : fulfillmentStatus === 'retryable_failure'
              ? 'Payment received. Report generation hit a temporary issue.'
              : 'Checking your payment and report status.'}
          </p>
          <p className="text-sm text-fg-muted mt-1">
            {fulfillmentStatus === 'retryable_failure'
              ? 'It will retry automatically. You can close this page and return later.'
              : 'You can close this page. Delivery does not depend on keeping this browser open.'}
          </p>
        </div>
      )}

      {/* Free tier note */}
      {PRICING_ENABLED && tier === 'free' && !running && totalBetCount > 0 && (
        <p className="text-fg-muted text-sm">Free tier: unlimited snapshot reports. Unlock the full 5-chapter analysis for $19.99.</p>
      )}

      {/* Analyze controls */}
      {totalBetCount > 0 && !running && (
        <div className="card p-5 space-y-4">
          {/* Scope selector */}
          <div>
            <label className="label">Analyze</label>
            <select
              value={analyzeScope}
              onChange={(e) => setAnalyzeScope(e.target.value)}
              className="input-field text-sm w-full max-w-md"
            >
              <option value="all">All bets ({totalBetCount} total)</option>
              {newBetsSinceReport > 0 && lastReportDate && (
                <option value="since_last">Since last report ({newBetsSinceReport} new bets)</option>
              )}
              {uploads.length > 0 && (
                <optgroup label="By Upload">
                  {uploads.map((u) => (
                    <option key={u.id} value={`upload:${u.id}`}>
                      {u.filename ?? 'Upload'}: {u.bet_count} bets, {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </option>
                  ))}
                </optgroup>
              )}
              {sportsbooks.length > 0 && (
                <optgroup label="By Sportsbook">
                  {sportsbooks.map((b) => (
                    <option key={b} value={`book:${b}`}>{b}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div>
              <label className="label">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="label">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input-field text-sm"
              />
            </div>
            <button
              onClick={() => runAutopsy()}
              disabled={running || betCountForRun === 0}
              className="btn-primary"
            >
              <span className="flex items-center gap-1.5"><FlaskConical size={16} /> Run New Autopsy</span>
            </button>
          </div>

          {/* Quick filters */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Last 7 days', days: 7 },
              { label: 'Last 30 days', days: 30 },
              { label: 'Last 90 days', days: 90 },
              { label: 'All time', days: null },
            ].map((f) => {
              const isActive = f.days === null
                ? activeRange === 'all'
                : dateFrom === daysAgo(f.days);
              return (
                <button
                  key={f.label}
                  onClick={() => setQuickRange(f.days)}
                  className={`px-3 py-1 rounded-sm text-xs transition-colors ${
                    isActive
                      ? 'bg-scalpel-muted text-scalpel'
                      : 'text-fg-muted hover:text-fg hover:bg-white/[0.03]'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Bet count summary */}
          <p className="text-fg-muted text-sm">
            {dateFrom || dateTo ? (
              <>
                Analyzing <span className="text-fg-bright font-mono">{betCountForRun}</span> bet{betCountForRun !== 1 ? 's' : ''}{' '}
                {dateFrom && dateTo
                  ? `from ${dateFrom} to ${dateTo}`
                  : dateFrom
                  ? `from ${dateFrom} onwards`
                  : `up to ${dateTo}`}
              </>
            ) : (
              <>
                Analyzing all <span className="text-fg-bright font-mono">{betCountForRun}</span> bets
              </>
            )}
          </p>
        </div>
      )}

      {/* Running state — full screen only before metrics arrive */}
      {running && !activeReport && reports.length === 0 && (
        <OnboardingSteps active={2} completed={[1]} />
      )}
      {running && !activeReport && (
        <AnalyzingState betCount={betCountForRun} />
      )}

      {error && (
        <div className="card border-bleed/20 bg-bleed-muted p-4">
          <p className="text-loss text-sm">{error}</p>
        </div>
      )}

      {totalBetCount === 0 && !running && (
        <div className="card p-12 text-center">
          <div className="mb-4"><UploadIcon size={40} className="text-fg-muted" /></div>
          <h2 className="font-bold text-2xl mb-2 text-fg-bright">No bets to analyze</h2>
          <p className="text-fg-muted mb-6">
            Upload your bet history first, then come back to run your autopsy.
          </p>
          <a href="/upload" className="btn-primary inline-block">
            Upload Bets
          </a>
        </div>
      )}

      {/* Past reports list */}
      {reports.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-xl text-fg-bright">Past Reports</h2>
            {reports.length > 1 && (
              <button onClick={deleteAllReports} className="text-xs text-fg-dim hover:text-loss/70 transition-colors">
                Delete all reports
              </button>
            )}
          </div>
          {reports.map((report) => {
            let analysis: Partial<AutopsyAnalysis> | null = null;
            try {
              analysis =
                typeof report.report_json === 'string'
                  ? JSON.parse(report.report_json as string) as Partial<AutopsyAnalysis>
                  : report.report_json;
            } catch { /* skip corrupted report */ }
            const summary = analysis?.summary;
            const grade = summary?.overall_grade;
            const emotionScore = analysis?.emotion_score ?? analysis?.tilt_score;
            const profitVisible = summary
              ? isReportValueVisible(summary.total_profit_visibility)
              : false;
            const matchingUpload = uploads.find((upload) =>
              upload.bet_count === report.bet_count_analyzed &&
              Math.abs(new Date(upload.created_at).getTime() - new Date(report.created_at).getTime()) < 86400000
            );
            const title = matchingUpload?.filename
              ?? (report.report_type === 'snapshot'
                ? 'Snapshot'
                : report.report_type === 'full'
                ? 'Full Autopsy'
                : report.report_type === 'weekly'
                ? 'Weekly Report'
                : 'Quick Scan');
            const statusLabel = report.fulfillment_status === 'paid_queued'
              ? 'Paid, queued'
              : report.fulfillment_status === 'generating'
              ? 'Generating full report'
              : report.fulfillment_status === 'retryable_failure'
              ? 'Retry scheduled'
              : report.fulfillment_status === 'completed'
              ? 'Full report delivered'
              : null;

            return (
              <div key={report.id} className="card p-5 flex items-start gap-2 hover:border-border transition-colors">
                <button
                  onClick={() => openReport(report)}
                  disabled={openingReportId === report.id}
                  className="min-w-0 flex-1 text-left disabled:opacity-70"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-4 min-w-0">
                      <span
                        className={`font-bold text-2xl ${
                          grade?.startsWith('A')
                            ? 'text-win'
                            : grade?.startsWith('B')
                            ? 'text-win/70'
                            : grade?.startsWith('C')
                            ? 'text-caution'
                            : grade
                            ? 'text-loss'
                            : 'text-fg-muted'
                        }`}
                      >
                        {grade ?? 'N/A'}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{title}</p>
                        <p className="text-fg-muted text-sm">
                          {report.bet_count_analyzed} bets analyzed
                          {summary?.record ? ` · ${summary.record}` : ''}
                        </p>
                        {statusLabel && <p className="text-xs text-scalpel mt-1">{statusLabel}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      {summary && Number.isFinite(summary.total_profit) && (
                        profitVisible ? (
                          <span className={`font-mono ${summary.total_profit >= 0 ? 'text-win' : 'text-loss'}`}>
                            {summary.total_profit >= 0 ? '+' : ''}${summary.total_profit.toFixed(0)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-fg-muted">
                            <Lock size={11} /> Locked
                          </span>
                        )
                      )}
                      {typeof emotionScore === 'number' && (
                        <span className="text-fg-muted">Emotion: {emotionScore}/100</span>
                      )}
                      <span className="text-fg-dim text-xs">
                        {new Date(report.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        {new Date(report.created_at).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                      {openingReportId === report.id && <span className="text-xs text-fg-muted">Opening...</span>}
                    </div>
                  </div>
                  {(report.card_biases?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {report.card_biases!.map((bias) => (
                        <span
                          key={`${bias.bias_name}-${bias.severity}`}
                          className={`text-xs px-2 py-0.5 rounded-sm border ${
                            bias.severity === 'critical'
                              ? 'bg-bleed-muted text-loss border-bleed/20'
                              : bias.severity === 'high'
                              ? 'bg-loss/10 text-loss border-loss/20'
                              : bias.severity === 'medium'
                              ? 'bg-caution/10 text-caution border-caution/20'
                              : 'bg-win/10 text-win border-win/20'
                          }`}
                        >
                          {bias.bias_name}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
                <button
                  onClick={(event) => deleteReport(report.id, event)}
                  className="text-fg-dim hover:text-loss transition-colors text-xs w-11 h-11 -m-2 flex items-center justify-center rounded-sm shrink-0"
                  aria-label="Delete report"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Analyzing Loading State ──
//
// Single source for the explicit analysis loading indicators below. Paid
// checkout fulfillment does not use these client-side progress components.
const LOADING_MESSAGES = [
  'Scanning your bet history...',
  'Calculating your Emotion Score...',
  'Detecting loss-chasing patterns...',
  'Analyzing stake volatility...',
  'Mapping your timing patterns...',
  'Identifying cognitive biases...',
  'Building your behavioral profile...',
  'Generating your action plan...',
];

function analysisTimeEstimate(betCount: number): string {
  return betCount < 50
    ? 'This usually takes about 15 seconds.'
    : betCount <= 150
    ? `Analyzing ${betCount} bets, this usually takes 30-45 seconds.`
    : betCount <= 500
    ? `Deep analysis on ${betCount} bets. This can take 1-2 minutes.`
    : `Comprehensive analysis on ${betCount} bets. Sit tight, this may take a few minutes.`;
}

// Target duration (seconds) the progress bar paces itself against per
// bracket - reaches ~85% around this point instead of hitting a cap early
// and sitting still for the rest of a long real wait, which reads as a
// hang. 90s for the 150-500 bracket is the measured figure, not an
// estimate.
function analysisTargetSeconds(betCount: number): number {
  return betCount < 50 ? 15 : betCount <= 150 ? 45 : betCount <= 500 ? 90 : 180;
}

// Three phases, not a single curve: a linear ramp (first pass at this fix)
// paces correctly against the real target but reads as sluggish - a
// constant rate feels like crawling from the very start, even at
// identical total time to completion. And a hard cap at the target still
// reproduces the original stall, just later, on any run slower than its
// own estimate.
//   1. Fast initial burst (first ~5s, or 15% of the target if that's
//      shorter): climbs to 40%. This is what reads as "it's working" -
//      the first few seconds are what a user actually watches.
//   2. Decelerating climb from 40% to 85% across the rest of the target
//      window - lands close to done right around when the real response
//      is actually expected.
//   3. Past the target: an asymptotic creep from 85% toward 98% that
//      never fully stops (exponential decay, never reaches its ceiling)
//      instead of freezing dead - a run that takes 2-3x the target still
//      shows visible, real motion instead of looking hung.
function analysisSimulatedProgress(elapsedSeconds: number, betCount: number): number {
  const target = analysisTargetSeconds(betCount);
  const burst = Math.min(target * 0.15, 5);
  const burstCap = 40;
  const mainCap = 85;

  if (elapsedSeconds <= burst) {
    return (elapsedSeconds / burst) * burstCap;
  }
  if (elapsedSeconds <= target) {
    return burstCap + ((elapsedSeconds - burst) / (target - burst)) * (mainCap - burstCap);
  }
  const overTime = elapsedSeconds - target;
  const creepCeiling = 98;
  return mainCap + (creepCeiling - mainCap) * (1 - Math.exp(-overTime / target));
}

function AnalyzingState({ betCount }: { betCount: number }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const rotator = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(rotator);
  }, []);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  const estimate = analysisTimeEstimate(betCount);
  const progress = analysisSimulatedProgress(elapsed, betCount);

  return (
    <div className="card p-8 text-center space-y-4">
      <div className="animate-pulse"><Brain size={40} className="text-fg-muted" /></div>
      <h2 className="font-bold text-xl text-fg-bright">{LOADING_MESSAGES[msgIndex]}</h2>
      <div className="w-72 mx-auto">
        <div className="flex items-center justify-between text-xs text-fg-muted mb-1">
          <span>{estimate}</span>
          <span className="font-mono">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-surface-1 rounded-full overflow-hidden">
          <div
            className="h-full bg-scalpel rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      {elapsed > 90 && (
        <p className="text-caution/70 text-xs">Still working. Large bet histories take longer to analyze.</p>
      )}
      <p className="text-fg-muted text-xs font-mono">Elapsed: {timeStr}</p>
    </div>
  );
}

// ── Compact progress bar shown above partial report while Claude is working ──

const PROGRESS_MESSAGES = [
  'Reading behavioral patterns...',
  'Identifying cognitive biases...',
  'Calculating strategic leaks...',
  'Generating personal rules...',
  'Writing your action plan...',
];

function AnalyzingProgress({ betCount }: { betCount: number }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setMsgIndex((i) => (i + 1) % PROGRESS_MESSAGES.length), 3000);
    const clock = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { clearInterval(timer); clearInterval(clock); };
  }, []);

  const progress = analysisSimulatedProgress(elapsed, betCount);
  const estimate = analysisTimeEstimate(betCount);

  return (
    <div className="card border-scalpel/20 bg-scalpel-muted p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className="inline-block w-5 h-5 border-2 border-scalpel/20 border-t-scalpel rounded-full animate-spin shrink-0" />
        <div className="flex-1">
          <p className="text-fg-bright text-sm font-medium">Generating behavioral analysis...</p>
          <p className="text-fg-muted text-xs mt-0.5">{PROGRESS_MESSAGES[msgIndex]}</p>
        </div>
        <span className="text-fg-dim text-xs font-mono shrink-0">{Math.round(progress)}%</span>
      </div>
      <div className="h-1.5 bg-base rounded-full overflow-hidden">
        <div
          className="h-full bg-scalpel rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-fg-muted text-xs">{estimate}</p>
    </div>
  );
}

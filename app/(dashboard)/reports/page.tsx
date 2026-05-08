'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { useUser } from '@/hooks/useUser';
import { useReports } from '@/hooks/useReports';
import { useSnapshots } from '@/hooks/useSnapshots';
import { useUploads } from '@/hooks/useUploads';
import { apiPost } from '@/lib/api-client';
import dynamic from 'next/dynamic';
import OnboardingSteps from '@/components/OnboardingSteps';
import ProUpsellModal from '@/components/ProUpsellModal';

const AutopsyReport = dynamic(() => import('@/components/AutopsyReport'), {
  loading: () => <div className="h-96 bg-surface-1 rounded-sm animate-pulse" />,
});
import type { AutopsyReport as AutopsyReportType, AutopsyAnalysis, Bet, ReportComparison } from '@/types';
import { compareReports } from '@/lib/report-comparison';
import { PRICING_ENABLED, getEffectiveTier } from '@/lib/feature-flags';
import { trackPurchase as trackPurchaseMeta } from '@/lib/meta-events';
import { FlaskConical, Upload as UploadIcon, Brain, Lock } from 'lucide-react';

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

  // Local reports mirror so optimistic post-runAutopsy updates render
  // synchronously alongside the SWR cache.
  const [reports, setReports] = useState<AutopsyReportType[]>([]);
  useEffect(() => { setReports(cachedReports); }, [cachedReports]);

  const tier = profile?.subscription_tier ?? 'free';
  const prevSnapshot = latestTwoSnapshots.length >= 2 ? latestTwoSnapshots[1] : null;

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [activeReport, setActiveReport] = useState<AutopsyReportType | null>(null);
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
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [showProUpsell, setShowProUpsell] = useState(false);

  useEffect(() => {
    loadReports();
    // Set scope from query params
    const qUploadId = searchParams.get('upload_id');
    const qUploadIds = searchParams.get('upload_ids');
    const qSportsbook = searchParams.get('sportsbook');
    if (qUploadId) setAnalyzeScope(`upload:${qUploadId}`);
    else if (qUploadIds) setAnalyzeScope(`uploads:${qUploadIds}`);
    else if (qSportsbook) setAnalyzeScope(`book:${qSportsbook}`);

    // Fire conversion pixels exactly once on the post-checkout redirect.
    // The actual unlock trigger (capturing paid_snapshot_id and running
    // the full analysis) lives in the auto-run effect below — we used
    // to do that work here too, but setPaidSnapshotId followed by a
    // history.replaceState produced a race where runAutopsy could fire
    // before the state update applied AND before useSearchParams picked
    // up the new URL, sending the request without paid_snapshot_id and
    // letting the server downgrade to a snapshot. Now we capture
    // straight from `searchParams` synchronously in the run effect.
    if (typeof window !== 'undefined' && searchParams.get('unlocked') === 'true') {
      window.gtag?.('event', 'purchase', { value: 9.99, currency: 'USD' });
      trackPurchaseMeta('report', 9.99);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-trigger analysis after a post-checkout unlock (`?id=…&unlocked=true`)
  // OR a deep-link run trigger (`?run=true`, `?upload_id=…`). The unlock
  // path captures the paid snapshot id straight from the URL so timing
  // with React state updates can't drop it.
  useEffect(() => {
    const isUnlock = searchParams.get('unlocked') === 'true';
    const shouldAutoRun =
      isUnlock || searchParams.get('run') === 'true' || searchParams.get('upload_id');
    if (
      shouldAutoRun &&
      !autoRunTriggered.current &&
      !loading &&
      totalBetCount > 0
    ) {
      autoRunTriggered.current = true;
      const paidId = isUnlock ? searchParams.get('id') : null;
      // eslint-disable-next-line no-console
      console.log('[unlock-debug] auto-run effect firing', {
        isUnlock,
        paidId,
        searchParamsString: searchParams.toString(),
        loading,
        totalBetCount,
      });
      if (paidId) setPaidSnapshotId(paidId);
      // Clean URL only AFTER capturing what we need so refresh-during-run
      // doesn't strand the user on a stale `?unlocked=true` link or lose
      // the snapshot id mid-flight.
      window.history.replaceState({}, '', '/reports');
      runAutopsy(paidId ?? undefined);
    }
  }, [searchParams, loading, totalBetCount]); // eslint-disable-line react-hooks/exhaustive-deps

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

  async function runAutopsy(paidIdOverride?: string) {
    setRunning(true);
    setError('');
    setActiveReport(null);
    window.gtag?.('event', 'analysis_started');

    try {
      // Prefer the caller-supplied id (post-checkout unlock effect) so we
      // don't race against React's state batching on `paidSnapshotId`.
      // Falls back to state for the legacy callers that still rely on it.
      const paidId = paidIdOverride ?? paidSnapshotId;
      const isPaidUpgrade = !!paidId;
      const body: Record<string, string | string[]> = {
        report_type: (getEffectiveTier(tier) === 'pro' || isPaidUpgrade) ? 'full' : 'snapshot',
        ...(isPaidUpgrade ? { paid_snapshot_id: paidId } : {}),
      };
      // eslint-disable-next-line no-console
      console.log('[unlock-debug] runAutopsy outgoing body', {
        body,
        tier,
        effectiveTier: getEffectiveTier(tier),
        paidIdOverride,
        paidSnapshotId,
      });
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

                // Create temporary report so AutopsyReport can render partial results.
                // Mark it as `full` + paid when we're in a post-checkout unlock so the
                // 30-90s LLM-generation window doesn't render the snapshot lock UI
                // ("Get a Full Report" CTA) to a user who already paid. Without this,
                // the user stares at a paywall mid-run for the report they just bought.
                const tempReport: AutopsyReportType = {
                  id: 'loading',
                  user_id: '',
                  report_type: (getEffectiveTier(tier) === 'pro' || isPaidUpgrade) ? 'full' : 'snapshot',
                  bet_count_analyzed: d.partial_analysis.summary.total_bets,
                  date_range_start: null,
                  date_range_end: null,
                  report_json: d.partial_analysis,
                  report_markdown: '',
                  model_used: null,
                  tokens_used: null,
                  cost_cents: null,
                  is_paid: tier === 'pro' || isPaidUpgrade,
                  stripe_payment_intent_id: null,
                  upgraded_from_snapshot_id: isPaidUpgrade ? (paidId ?? null) : null,
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
              // eslint-disable-next-line no-console
              console.log('[unlock-debug] complete event received', {
                report_id: report.id,
                report_type: report.report_type,
                is_paid: report.is_paid,
                upgraded_from_snapshot_id: report.upgraded_from_snapshot_id,
              });
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

              // Pro upsell modal: fires once when a non-pro user just paid $9.99
              // to unlock this report AND the top bias has a pitch-worthy cost
              // (>= $100/qtr — below that the pitch economics don't land).
              // This runs inside the completion handler because paidSnapshotId
              // gets cleared on line 306 below; a later useEffect would miss it.
              if (
                paidSnapshotId !== null &&
                getEffectiveTier(tier) !== 'pro' &&
                topBias?.bias_name &&
                typeof topBias.estimated_cost === 'number' &&
                topBias.estimated_cost >= 100 &&
                typeof window !== 'undefined' &&
                !window.localStorage.getItem(`bap_pro_upsell_dismissed_${report.id}`)
              ) {
                setShowProUpsell(true);
              }

              setActiveReport(report);
              setReports((prev) => [report, ...prev]);
              mutateReports();
              setRunning(false);
              setPaidSnapshotId(null); // Clear after use
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

  async function openReport(report: AutopsyReportType) {
    setActiveReport(report);
    // Fetch bets for this report's date range so What-If and Leak Prioritizer work
    const supabase = createBrowserSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    let query = supabase.from('bets').select('*').eq('user_id', user.id).order('placed_at', { ascending: true });
    if (report.date_range_start) query = query.gte('placed_at', report.date_range_start);
    if (report.date_range_end) query = query.lte('placed_at', report.date_range_end);
    const { data: betsData } = await query;
    if (betsData) setAnalyzedBets(betsData as Bet[]);
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

    // Compare with previous report if one exists
    let reportComparison: ReportComparison | null = null;
    const activeIdx = reports.findIndex(r => r.id === activeReport.id);
    const previousReport = activeIdx >= 0 && activeIdx < reports.length - 1 ? reports[activeIdx + 1] : null;
    if (previousReport) {
      try {
        const prevAnalysis: AutopsyAnalysis =
          typeof previousReport.report_json === 'string'
            ? JSON.parse(previousReport.report_json)
            : previousReport.report_json;
        reportComparison = compareReports(analysis, prevAnalysis);
      } catch { /* skip comparison if previous report can't be parsed */ }
    }

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Onboarding step 3 */}
        {isFirstReport && (
          <OnboardingSteps active={3} completed={[1, 2]} />
        )}
        <button
          onClick={() => { setActiveReport(null); setAnalyzedBets([]); }}
          className="text-sm text-fg-muted hover:text-fg transition-colors"
        >
          ← Back to Reports
        </button>
        {PRICING_ENABLED && tierLimited && (
          <div className="card border-scalpel/20 bg-scalpel-muted p-5">
            <p className="text-fg-bright text-sm">
              This is a snapshot. The full report unlocks all 5 chapters
              with dollar costs, strategic leaks, and a personalized action plan.
            </p>
            <a href="/pricing" className="btn-primary inline-block mt-3 text-sm">
              Get Full Report: <span className="line-through text-fg-dim">$19.99</span> $9.99
            </a>
          </div>
        )}
        {/* Compact progress bar while Claude is still analyzing */}
        {running && <AnalyzingProgress />}

        {/* First-insight celebration — surfaces top bias before the full report */}
        {firstInsight && (
          <button
            onClick={() => setFirstInsight(null)}
            className="w-full text-left mb-6 animate-fade-in"
          >
            <div className="border-2 border-scalpel/40 bg-scalpel/[0.06] rounded-sm p-6 space-y-2">
              <div className="font-mono text-[10px] text-scalpel tracking-[3px] uppercase">YOUR FIRST AUTOPSY FOUND</div>
              <p className="font-bold text-xl text-fg-bright">
                {firstInsight.biasName} is costing you ~${firstInsight.cost.toLocaleString()}/quarter.
              </p>
              <p className="text-fg-muted text-sm">Tap to see the full report.</p>
            </div>
          </button>
        )}

        <AutopsyReport analysis={analysis} bets={analyzedBets} previousSnapshot={prevSnapshot} reportId={activeReport.id} tier={tier as 'free' | 'pro'} isSnapshot={activeReport.report_type === 'snapshot'} comparison={reportComparison} />
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

        {/* Pro upsell modal fires once after a paid $9.99 unlock. Parent
            owns dismissal persistence so the modal stays stateless. */}
        {showProUpsell && analysis && (
          <ProUpsellModal
            analysis={analysis}
            reportId={activeReport.id}
            onDismiss={() => {
              if (typeof window !== 'undefined') {
                window.localStorage.setItem(
                  `bap_pro_upsell_dismissed_${activeReport.id}`,
                  String(Date.now())
                );
              }
              setShowProUpsell(false);
            }}
          />
        )}
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
  const freeExhausted = PRICING_ENABLED && tier === 'free' && reports.length >= 1;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg-bright">Reports</h1>
        <p className="text-sm text-fg-muted mt-1">Run analysis and view past reports</p>
        <p className="text-xs text-fg-muted mt-0.5">
          {reports.length} report{reports.length !== 1 ? 's' : ''} generated
        </p>
      </div>

      {/* Free tier exhausted */}
      {freeExhausted && !running && (
        <div className="space-y-4">
          <div className="card border-scalpel/20 bg-scalpel-muted p-6 text-center space-y-3">
            <p className="text-fg-bright mb-2">
              This is a snapshot. The full report goes much deeper.
            </p>
            <p className="text-fg-muted text-sm mb-4">
              A full report goes 5,000 bets deep with dollar costs for every bias, strategic leak detection, and a personalized action plan.
            </p>
            <ul className="text-fg-muted text-sm space-y-1.5 mb-5 text-left max-w-md mx-auto">
              <li className="flex items-start gap-2"><span className="text-win shrink-0">•</span>Every bias explained with estimated dollar cost</li>
              <li className="flex items-start gap-2"><span className="text-win shrink-0">•</span>Strategic leaks ranked by impact</li>
              <li className="flex items-start gap-2"><span className="text-win shrink-0">•</span>Personal betting rules generated from YOUR data</li>
              <li className="flex items-start gap-2"><span className="text-win shrink-0">•</span>What-If Simulator: see what fixing each leak saves you</li>
            </ul>
            <a href="/pricing" className="btn-primary inline-block">
              Unlock Full Report: <span className="line-through text-fg-dim">$19.99</span> $9.99
            </a>
          </div>

          {/* Locked feature previews — behavioral framing */}
          <div className="relative">
            <div className="blur-sm pointer-events-none opacity-50">
              <div className="card p-5">
                <h3 className="font-semibold text-lg mb-2 text-fg-bright">Behavioral Edge Analysis</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-2 rounded-sm p-3"><p className="text-xs text-win">Researched bets (&gt;2hr before game)</p><p className="font-mono text-win">+6.1% ROI</p></div>
                  <div className="bg-surface-2 rounded-sm p-3"><p className="text-xs text-loss">Impulse bets (&lt;30min before game)</p><p className="font-mono text-loss">-18.4% ROI</p></div>
                  <div className="bg-surface-2 rounded-sm p-3"><p className="text-xs text-loss">Post-loss bets</p><p className="font-mono text-loss">-22.7% ROI</p></div>
                  <div className="bg-surface-2 rounded-sm p-3"><p className="text-xs text-win">Morning line bets</p><p className="font-mono text-win">+4.2% ROI</p></div>
                </div>
              </div>
              <div className="card p-5 mt-3">
                <h3 className="font-semibold text-lg mb-2 text-fg-bright">Personal Betting Rules</h3>
                <div className="space-y-2">
                  <div className="card-tier-1 p-3"><p className="text-sm flex items-center gap-2"><span className="inline-block w-1.5 h-1.5 rounded-full bg-scalpel shrink-0" />Never exceed $120 on a single bet. Your oversized bets lose at 71%</p></div>
                  <div className="card-tier-1 p-3"><p className="text-sm flex items-center gap-2"><span className="inline-block w-1.5 h-1.5 rounded-full bg-scalpel shrink-0" />No betting after 11pm. Your late-night bets are 4-17 with -34% ROI</p></div>
                  <div className="card-tier-1 p-3"><p className="text-sm flex items-center gap-2"><span className="inline-block w-1.5 h-1.5 rounded-full bg-scalpel shrink-0" />Cap parlays at 20% of weekly volume. You&apos;re currently at 43%</p></div>
                </div>
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="card bg-surface-1/95 p-6 text-center max-w-sm">
                <div className="mb-2"><Lock size={24} className="text-fg-muted" /></div>
                <p className="text-fg-bright font-medium mb-1">Unlock your full behavioral analysis</p>
                <p className="text-fg-muted text-sm mb-3">Session-by-session analysis, personal betting rules from YOUR patterns, and a personalized action plan.</p>
                <a href="/pricing" className="btn-primary inline-block text-sm">Get Full Report: <span className="line-through text-fg-dim">$19.99</span> $9.99</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Free tier note */}
      {PRICING_ENABLED && tier === 'free' && !freeExhausted && !running && totalBetCount > 0 && (
        <p className="text-fg-muted text-sm">Free tier: unlimited snapshot reports. Unlock the full 5-chapter analysis for $9.99.</p>
      )}

      {/* Analyze controls */}
      {totalBetCount > 0 && !running && !freeExhausted && (
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

      {/* No date picker needed — just the button if no bets */}
      {totalBetCount > 0 && !running && false && (
        <button onClick={() => runAutopsy()} disabled={running} className="btn-primary">
          <span className="flex items-center gap-1.5"><FlaskConical size={16} /> Run New Autopsy</span>
        </button>
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
      {reports.length > 0 && !running && (
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
            let analysis: AutopsyAnalysis | null = null;
            try {
              analysis =
                typeof report.report_json === 'string'
                  ? JSON.parse(report.report_json as string)
                  : report.report_json;
            } catch { /* skip corrupted report */ }
            if (!analysis) return null;

            return (
              <button
                key={report.id}
                onClick={() => openReport(report)}
                className="card p-5 w-full text-left hover:border-border transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-bold text-2xl font-bold ${
                        analysis.summary.overall_grade.startsWith('A')
                          ? 'text-win'
                          : analysis.summary.overall_grade.startsWith('B')
                          ? 'text-win/70'
                          : analysis.summary.overall_grade.startsWith('C')
                          ? 'text-caution'
                          : 'text-loss'
                      }`}
                    >
                      {analysis.summary.overall_grade}
                    </span>
                    <div>
                      <p className="font-medium">
                        {(() => {
                          // Check if this report matches an upload by bet count and date proximity
                          const matchingUpload = uploads.find((u) =>
                            u.bet_count === report.bet_count_analyzed &&
                            Math.abs(new Date(u.created_at).getTime() - new Date(report.created_at).getTime()) < 86400000
                          );
                          if (matchingUpload?.filename) return matchingUpload.filename;
                          return report.report_type === 'snapshot' ? 'Snapshot' : report.report_type === 'full' ? 'Full Autopsy' : report.report_type === 'weekly' ? 'Weekly Report' : 'Quick Scan';
                        })()}
                      </p>
                      <p className="text-fg-muted text-sm">
                        {report.bet_count_analyzed} bets analyzed · {analysis.summary.record}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span
                      className={`font-mono ${
                        analysis.summary.total_profit >= 0 ? 'text-win' : 'text-loss'
                      }`}
                    >
                      {analysis.summary.total_profit >= 0 ? '+' : ''}${analysis.summary.total_profit.toFixed(0)}
                    </span>
                    <span className="text-fg-muted">
                      Emotion: {analysis.emotion_score ?? analysis.tilt_score}/100
                    </span>
                    <span className="text-fg-dim text-xs">
                      {new Date(report.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      <span className="text-fg-dim">
                        {new Date(report.created_at).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </span>
                    <button
                      onClick={(e) => deleteReport(report.id, e)}
                      className="text-fg-dim hover:text-loss transition-colors text-xs ml-2 w-11 h-11 -m-2 flex items-center justify-center rounded-sm shrink-0"
                      aria-label="Delete report"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {analysis.biases_detected.slice(0, 3).map((bias, i) => (
                    <span
                      key={i}
                      className={`text-xs px-2 py-0.5 rounded-sm border ${
                        bias.severity === 'critical'
                          ? 'bg-bleed-muted text-loss border-bleed/20'
                          : bias.severity === 'high'
                          ? 'bg-orange-400/10 text-orange-400 border-orange-400/20'
                          : bias.severity === 'medium'
                          ? 'bg-caution/10 text-caution border-caution/20'
                          : 'bg-win/10 text-win border-win/20'
                      }`}
                    >
                      {bias.bias_name}
                    </span>
                  ))}
                  {analysis.biases_detected.length > 3 && (
                    <span className="text-xs text-fg-muted">
                      +{analysis.biases_detected.length - 3} more
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Analyzing Loading State ──

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

  const estimate = betCount < 50
    ? 'This usually takes about 15 seconds.'
    : betCount <= 150
    ? `Analyzing ${betCount} bets, this usually takes 30-45 seconds.`
    : betCount <= 500
    ? `Deep analysis on ${betCount} bets. This can take 1-2 minutes.`
    : `Comprehensive analysis on ${betCount} bets. Sit tight, this may take a few minutes.`;

  // Simulated progress
  const progress = Math.min(92,
    elapsed <= 5 ? (elapsed / 5) * 30 :
    elapsed <= 20 ? 30 + ((elapsed - 5) / 15) * 30 :
    elapsed <= 40 ? 60 + ((elapsed - 20) / 20) * 20 :
    80 + ((elapsed - 40) / 30) * 12
  );

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

function AnalyzingProgress() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setMsgIndex((i) => (i + 1) % PROGRESS_MESSAGES.length), 3000);
    const clock = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { clearInterval(timer); clearInterval(clock); };
  }, []);

  // Simulated progress: fast at start, slows down, caps at 92%
  const progress = Math.min(92,
    elapsed <= 5 ? (elapsed / 5) * 25 :
    elapsed <= 15 ? 25 + ((elapsed - 5) / 10) * 35 :
    elapsed <= 30 ? 60 + ((elapsed - 15) / 15) * 20 :
    80 + ((elapsed - 30) / 30) * 12
  );

  const estimate = elapsed < 10 ? 'Usually takes 15-25 seconds' : elapsed < 25 ? 'Almost there...' : 'Finishing up...';

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

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import OnboardingSteps from '@/components/OnboardingSteps';

const AutopsyReport = dynamic(() => import('@/components/AutopsyReport'), {
  loading: () => <div className="h-96 bg-ink-800 rounded-lg animate-pulse" />,
});
import type { AutopsyReport as AutopsyReportType, AutopsyAnalysis, Bet, ProgressSnapshot, Upload } from '@/types';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const [reports, setReports] = useState<AutopsyReportType[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [activeReport, setActiveReport] = useState<AutopsyReportType | null>(null);
  const [analyzedBets, setAnalyzedBets] = useState<Bet[]>([]);
  const [prevSnapshot, setPrevSnapshot] = useState<ProgressSnapshot | null>(null);
  const [tierLimited, setTierLimited] = useState(false);
  const [totalBetsAll, setTotalBetsAll] = useState(0);
  const [totalBetCount, setTotalBetCount] = useState(0);
  const [tier, setTier] = useState('free');
  const autoRunTriggered = useRef(false);

  // Filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [analyzeScope, setAnalyzeScope] = useState('all');
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [sportsbooks, setSportsbooks] = useState<string[]>([]);
  const [newBetsSinceReport, setNewBetsSinceReport] = useState(0);
  const [lastReportDate, setLastReportDate] = useState<string | null>(null);
  const [filteredCount, setFilteredCount] = useState<number | null>(null);

  useEffect(() => {
    loadReports();
    // Set scope from query params
    const qUploadId = searchParams.get('upload_id');
    const qUploadIds = searchParams.get('upload_ids');
    if (qUploadId) setAnalyzeScope(`upload:${qUploadId}`);
    else if (qUploadIds) setAnalyzeScope(`uploads:${qUploadIds}`);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-trigger analysis when ?run=true or ?upload_id=xxx
  useEffect(() => {
    const shouldAutoRun = (searchParams.get('run') === 'true' || searchParams.get('upload_id'));
    if (
      shouldAutoRun &&
      !autoRunTriggered.current &&
      !loading &&
      totalBetCount > 0
    ) {
      autoRunTriggered.current = true;
      runAutopsy();
    }
  }, [searchParams, loading, totalBetCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch filtered bet count when date range changes
  const fetchFilteredCount = useCallback(async () => {
    const supabase = createClient();
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

  async function loadReports() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [reportsRes, betsRes, profileRes, snapshotsRes, uploadsRes, sportsbooksRes] = await Promise.all([
      supabase.from('autopsy_reports').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('bets').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('profiles').select('subscription_tier').eq('id', user.id).single(),
      supabase.from('progress_snapshots').select('*').eq('user_id', user.id).order('snapshot_date', { ascending: false }).limit(2),
      supabase.from('uploads').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('bets').select('sportsbook').eq('user_id', user.id).not('sportsbook', 'is', null),
    ]);

    if (reportsRes.data) setReports(reportsRes.data as AutopsyReportType[]);
    if (profileRes.data) setTier(profileRes.data.subscription_tier);
    if (uploadsRes.data) setUploads(uploadsRes.data as Upload[]);
    // Unique sportsbooks
    const books = new Set<string>();
    (sportsbooksRes.data ?? []).forEach((b: { sportsbook: string | null }) => { if (b.sportsbook) books.add(b.sportsbook); });
    setSportsbooks(Array.from(books).sort());
    // The second-most-recent snapshot is the "previous" one
    const snaps = (snapshotsRes.data ?? []) as ProgressSnapshot[];
    if (snaps.length >= 2) setPrevSnapshot(snaps[1]);
    else if (snaps.length === 1) setPrevSnapshot(snaps[0]);
    const count = betsRes.count ?? 0;
    setTotalBetCount(count);
    setFilteredCount(count);
    // Count bets since last report
    const reportsList = (reportsRes.data ?? []) as AutopsyReportType[];
    if (reportsList.length > 0) {
      const lastDate = reportsList[0].created_at;
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
    const supabase = createClient();
    await supabase.from('autopsy_reports').delete().eq('id', reportId);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  }

  async function deleteAllReports() {
    if (!confirm('Delete all reports? This cannot be undone.')) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('autopsy_reports').delete().eq('user_id', user.id);
    setReports([]);
  }

  async function runAutopsy() {
    setRunning(true);
    setError('');

    try {
      const body: Record<string, string | string[]> = { report_type: 'full' };
      if (dateFrom) body.date_from = dateFrom;
      if (dateTo) body.date_to = dateTo;
      if (analyzeScope.startsWith('uploads:')) body.upload_ids = analyzeScope.replace('uploads:', '').split(',');
      else if (analyzeScope.startsWith('upload:')) body.upload_id = analyzeScope.replace('upload:', '');
      else if (analyzeScope.startsWith('book:')) body.sportsbook = analyzeScope.replace('book:', '');
      else if (analyzeScope === 'since_last' && lastReportDate) body.date_from = lastReportDate;

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Analysis failed');
        setRunning(false);
        return;
      }

      const report = data.report as AutopsyReportType;
      setTierLimited(data.tier_limited ?? false);
      setTotalBetsAll(data.total_bets ?? 0);
      setAnalyzedBets((data.analyzed_bets ?? []) as Bet[]);
      setActiveReport(report);
      setReports((prev) => [report, ...prev]);
    } catch {
      setError('Analysis failed. Please try again.');
    }

    setRunning(false);
  }

  async function openReport(report: AutopsyReportType) {
    setActiveReport(report);
    // Fetch bets for this report's date range so What-If and Leak Prioritizer work
    const supabase = createClient();
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
        <div className="h-8 w-48 bg-ink-800 rounded" />
        <div className="h-40 bg-ink-800 rounded-xl" />
      </div>
    );
  }

  const isFirstReport = reports.length <= 1 && activeReport !== null;

  // Viewing a specific report
  if (activeReport) {
    const analysis: AutopsyAnalysis =
      typeof activeReport.report_json === 'string'
        ? JSON.parse(activeReport.report_json)
        : activeReport.report_json;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Onboarding step 3 */}
        {isFirstReport && (
          <OnboardingSteps active={3} completed={[1, 2]} />
        )}
        <button
          onClick={() => { setActiveReport(null); setAnalyzedBets([]); }}
          className="text-sm text-ink-600 hover:text-[#F0F0F0] transition-colors"
        >
          ← Back to Reports
        </button>
        {tierLimited && (
          <div className="card border-flame-500/30 bg-flame-500/5 p-5">
            <p className="text-[#F0F0F0] text-sm">
              This analysis covers your <span className="font-medium">50 most recent bets</span>.
              Upgrade to Pro to unlock full analysis across all{' '}
              <span className="font-mono">{totalBetsAll}</span> of your bets — more data means
              more accurate bias detection and pattern recognition.
            </p>
            <a href="/pricing" className="btn-primary inline-block mt-3 text-sm">
              Upgrade to Pro
            </a>
          </div>
        )}
        <AutopsyReport analysis={analysis} bets={analyzedBets} previousSnapshot={prevSnapshot} reportId={activeReport.id} tier={tier as 'free' | 'pro' | 'sharp'} />
        {/* Post-first-report prompt */}
        {isFirstReport && (
          <div className="card p-5 text-center space-y-2">
            <p className="text-ink-600 text-sm">
              Want more accurate results? Set your bankroll and review your betting goals.
            </p>
            <Link href="/dashboard" className="text-sm text-flame-500 hover:underline">
              Go to Dashboard →
            </Link>
          </div>
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
  const freeExhausted = tier === 'free' && reports.length >= 1;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-bold text-3xl mb-1">Reports</h1>
        <p className="text-ink-600 text-sm">
          Your betting habits, dissected. No sugarcoating.
        </p>
        <p className="text-ink-700 text-xs mt-0.5">
          {reports.length} report{reports.length !== 1 ? 's' : ''} generated
        </p>
      </div>

      {/* Free tier exhausted */}
      {freeExhausted && !running && (
        <div className="space-y-4">
          <div className="card border-flame-500/30 bg-flame-500/5 p-6 text-center space-y-3">
            <p className="text-[#F0F0F0] mb-2">
              This report analyzed your 50 most recent bets. The rest are sitting in the dark.
            </p>
            <p className="text-ink-600 text-sm mb-4">
              With Pro, you&apos;d know whether your props are a real leak or just a bad month,
              if your weekend betting costs more than your whole week earns, and exactly which
              sportsbook you perform best on. One insight pays for the whole year.
            </p>
            <a href="/pricing" className="btn-primary inline-block">
              Unlock Full Analysis — $11/mo
            </a>
          </div>

          {/* Locked feature previews */}
          <div className="relative">
            <div className="blur-sm pointer-events-none opacity-50">
              <div className="card p-5">
                <h3 className="font-bold text-lg mb-2">Edge Profile</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-ink-900/50 rounded-lg p-3"><p className="text-xs text-mint-500">NFL Spreads</p><p className="font-mono text-mint-500">+8.3%</p></div>
                  <div className="bg-ink-900/50 rounded-lg p-3"><p className="text-xs text-red-400">NBA Props</p><p className="font-mono text-red-400">-14.2%</p></div>
                </div>
              </div>
              <div className="card p-5 mt-3">
                <h3 className="font-bold text-lg mb-2">Personal Rules</h3>
                <div className="space-y-2">
                  <div className="bg-ink-900/50 rounded-lg p-3 border-l-2 border-flame-500"><p className="text-sm">Max stake $150 on any single bet</p></div>
                  <div className="bg-ink-900/50 rounded-lg p-3 border-l-2 border-flame-500"><p className="text-sm">Stop betting after 3 consecutive losses</p></div>
                </div>
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="card bg-ink-800/95 p-6 text-center max-w-sm">
                <p className="text-2xl mb-2">🔒</p>
                <p className="text-[#F0F0F0] font-medium mb-1">Pro reports include</p>
                <p className="text-ink-600 text-sm mb-3">Edge Profile, Session Analysis, Personal Rules, Discipline Score tracking, and progress over time.</p>
                <a href="/pricing" className="btn-primary inline-block text-sm">Unlock with Pro — $11/mo</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Free tier note */}
      {tier === 'free' && !freeExhausted && !running && totalBetCount > 0 && (
        <p className="text-ink-600 text-sm">Free tier: 1 autopsy report included (analyzes your 50 most recent bets).</p>
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
                      {u.filename ?? 'Upload'} — {u.bet_count} bets, {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
              onClick={runAutopsy}
              disabled={running || betCountForRun === 0}
              className="btn-primary"
            >
              🔬 Run New Autopsy
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
                  className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                    isActive
                      ? 'bg-flame-500/10 text-flame-500'
                      : 'text-ink-600 hover:text-[#F0F0F0] hover:bg-white/[0.04]'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Bet count summary */}
          <p className="text-ink-600 text-sm">
            {dateFrom || dateTo ? (
              <>
                Analyzing <span className="text-[#F0F0F0] font-mono">{betCountForRun}</span> bet{betCountForRun !== 1 ? 's' : ''}{' '}
                {dateFrom && dateTo
                  ? `from ${dateFrom} to ${dateTo}`
                  : dateFrom
                  ? `from ${dateFrom} onwards`
                  : `up to ${dateTo}`}
              </>
            ) : (
              <>
                Analyzing all <span className="text-[#F0F0F0] font-mono">{betCountForRun}</span> bets
              </>
            )}
          </p>
        </div>
      )}

      {/* No date picker needed — just the button if no bets */}
      {totalBetCount > 0 && !running && false && (
        <button onClick={runAutopsy} disabled={running} className="btn-primary">
          🔬 Run New Autopsy
        </button>
      )}

      {/* Running state */}
      {running && reports.length === 0 && (
        <OnboardingSteps active={2} completed={[1]} />
      )}
      {running && (
        <AnalyzingState betCount={betCountForRun} />
      )}

      {error && (
        <div className="card border-red-400/30 bg-red-400/5 p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {totalBetCount === 0 && !running && (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">📤</div>
          <h2 className="font-bold text-2xl mb-2">No bets to analyze</h2>
          <p className="text-ink-600 mb-6">
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
            <h2 className="font-bold text-xl">Past Reports</h2>
            {reports.length > 1 && (
              <button onClick={deleteAllReports} className="text-xs text-ink-700 hover:text-red-400/70 transition-colors">
                Delete all reports
              </button>
            )}
          </div>
          {reports.map((report) => {
            const analysis: AutopsyAnalysis =
              typeof report.report_json === 'string'
                ? JSON.parse(report.report_json as string)
                : report.report_json;

            return (
              <button
                key={report.id}
                onClick={() => openReport(report)}
                className="card p-5 w-full text-left hover:border-white/[0.15] transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-bold text-2xl font-bold ${
                        analysis.summary.overall_grade.startsWith('A')
                          ? 'text-mint-500'
                          : analysis.summary.overall_grade.startsWith('B')
                          ? 'text-mint-500/70'
                          : analysis.summary.overall_grade.startsWith('C')
                          ? 'text-amber-400'
                          : 'text-red-400'
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
                          return report.report_type === 'full' ? 'Full Autopsy' : report.report_type === 'weekly' ? 'Weekly Report' : 'Quick Scan';
                        })()}
                      </p>
                      <p className="text-ink-600 text-sm">
                        {report.bet_count_analyzed} bets analyzed · {analysis.summary.record}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span
                      className={`font-mono ${
                        analysis.summary.total_profit >= 0 ? 'text-mint-500' : 'text-red-400'
                      }`}
                    >
                      {analysis.summary.total_profit >= 0 ? '+' : ''}${analysis.summary.total_profit.toFixed(0)}
                    </span>
                    <span className="text-ink-600">
                      Emotion: {analysis.tilt_score}/100
                    </span>
                    <span className="text-ink-700 text-xs">
                      {new Date(report.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <button
                      onClick={(e) => deleteReport(report.id, e)}
                      className="text-ink-700 hover:text-red-400 transition-colors text-xs ml-2"
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
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        bias.severity === 'critical'
                          ? 'bg-red-400/10 text-red-400 border-red-400/20'
                          : bias.severity === 'high'
                          ? 'bg-orange-400/10 text-orange-400 border-orange-400/20'
                          : bias.severity === 'medium'
                          ? 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                          : 'bg-mint-500/10 text-mint-500 border-mint-500/20'
                      }`}
                    >
                      {bias.bias_name}
                    </span>
                  ))}
                  {analysis.biases_detected.length > 3 && (
                    <span className="text-xs text-ink-600">
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
  'Analyzing stake patterns and timing...',
  'Checking for cognitive biases...',
  'Mapping strategic leaks by sport and bet type...',
  'Identifying emotional patterns...',
  'Calculating your edge profile...',
  'Building your action plan...',
  'Almost done — assembling your report...',
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
    }, 8000);
    return () => clearInterval(rotator);
  }, []);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  const estimate = betCount < 50
    ? 'This usually takes about 15 seconds.'
    : betCount <= 150
    ? `Analyzing ${betCount} bets — this usually takes 30-45 seconds.`
    : betCount <= 500
    ? `Deep analysis on ${betCount} bets — this can take 1-2 minutes.`
    : `Comprehensive analysis on ${betCount} bets — sit tight, this may take a few minutes.`;

  // Simulated progress
  const progress = Math.min(92,
    elapsed <= 5 ? (elapsed / 5) * 30 :
    elapsed <= 20 ? 30 + ((elapsed - 5) / 15) * 30 :
    elapsed <= 40 ? 60 + ((elapsed - 20) / 20) * 20 :
    80 + ((elapsed - 40) / 30) * 12
  );

  return (
    <div className="card p-8 text-center space-y-4">
      <div className="text-5xl animate-pulse">🧠</div>
      <h2 className="font-bold text-xl">{LOADING_MESSAGES[msgIndex]}</h2>
      <div className="w-72 mx-auto">
        <div className="flex items-center justify-between text-xs text-ink-600 mb-1">
          <span>{estimate}</span>
          <span className="font-mono">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-ink-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-flame-500 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      {elapsed > 90 && (
        <p className="text-amber-400/70 text-xs">Still working — large bet histories take longer to analyze.</p>
      )}
      <p className="text-ink-700 text-xs font-mono">Elapsed: {timeStr}</p>
    </div>
  );
}

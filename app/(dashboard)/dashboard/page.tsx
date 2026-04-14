'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase';
import { trackPurchase, trackSignup } from '@/lib/tiktok-events';
import { trackPurchase as trackPurchaseMeta, trackSignup as trackSignupMeta } from '@/lib/meta-events';

const ProgressChart = dynamic(() => import('@/components/ProgressChart'), {
  loading: () => <div className="case-card h-80 animate-pulse" />,
});
import DisciplineScoreCard from '@/components/DisciplineScoreCard';
import { usePrivacy, EyeToggle } from '@/components/PrivacyContext';
import JournalEntryModal from '@/components/JournalEntryModal';
import type { ProgressSnapshot } from '@/types';
import { FlaskConical, Brain, Flame, Dice5, DollarSign, Eye, Upload, PenLine, Target, Calendar, Lock, Snowflake, AlertTriangle } from 'lucide-react';
import { NumberTicker } from '@/components/ui/number-ticker';
import { BorderBeam } from '@/components/ui/border-beam';
import { getEffectiveTier } from '@/lib/feature-flags';

interface DashboardStats {
  totalBets: number;
  totalWagered: number;
  netPnL: number;
  winRate: number;
  avgStake: number;
  reportCount: number;
}

interface Milestone {
  id: string;
  label: string;
  icon: ReactNode;
  criteria: string;
  earned: boolean;
  date?: string;
}

const GRADE_ORDER = ['F', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];

function gradeImproved(from: string, to: string): boolean {
  return GRADE_ORDER.indexOf(to) > GRADE_ORDER.indexOf(from);
}

function gradeColor(grade: string): string {
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return 'text-win';
  if (g.startsWith('B')) return 'text-win/70';
  if (g.startsWith('C')) return 'text-caution';
  if (g.startsWith('D')) return 'text-orange-400';
  return 'text-loss';
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [bankroll, setBankroll] = useState('');
  const [tier, setTier] = useState('free');
  const [snapshots, setSnapshots] = useState<ProgressSnapshot[]>([]);
  const [newBetsSinceReport, setNewBetsSinceReport] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [streakBest, setStreakBest] = useState(0);
  const [streakLastDate, setStreakLastDate] = useState<string | null>(null);
  const [streakFreezes, setStreakFreezes] = useState(1);
  const [daysSinceReport, setDaysSinceReport] = useState<number | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('inactive');
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalCount, setJournalCount] = useState(0);
  const [daysSinceLastBet, setDaysSinceLastBet] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [welcomePulse, setWelcomePulse] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.search.includes('welcome=true')) {
      // First-login conversion event. The auth callback only sets ?welcome=true
      // when this user had never been welcomed before, so it's a clean signup
      // signal. Fire to BOTH GA4 (which had no sign_up event before this) and
      // TikTok pixel.
      window.gtag?.('event', 'sign_up', { method: 'supabase' });
      trackSignup();
      trackSignupMeta();
      setWelcomePulse(true);
      window.history.replaceState({}, '', '/dashboard');
      const timeout = window.setTimeout(() => setWelcomePulse(false), 3500);
      return () => window.clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch last report date first so we can pass it to the stats RPC
      const [profileRes, reportsRes, snapshotsRes, lastReportRes] = await Promise.all([
        supabase.from('profiles').select('bankroll, subscription_tier, subscription_status, streak_count, streak_best, streak_last_date').eq('id', user.id).single(),
        supabase.from('autopsy_reports').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('progress_snapshots').select('*').eq('user_id', user.id).order('snapshot_date', { ascending: true }),
        supabase.from('autopsy_reports').select('created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
      ]);

      const reportCount = reportsRes.count ?? 0;
      const lastReport = lastReportRes.data?.[0];
      const lastReportDate = lastReport ? new Date(lastReport.created_at) : null;

      // Single RPC replaces fetching every bet row — returns aggregates in ~50ms
      const [statsRpc, journalRes] = await Promise.all([
        supabase.rpc('dashboard_stats', {
          p_user_id: user.id,
          p_since: lastReportDate?.toISOString() ?? null,
        }),
        fetch('/api/journal?count=true').then(r => r.ok ? r.json() : null).catch(() => null),
      ]);

      const ds = (statsRpc.data ?? {}) as {
        total_bets: number; total_wagered: number; net_pnl: number;
        wins: number; settled: number; avg_stake: number;
        newest_created_at: string | null; bets_since: number;
      };

      const totalBets = ds.total_bets ?? 0;
      const totalWagered = ds.total_wagered ?? 0;
      const netPnL = ds.net_pnl ?? 0;
      const winRate = ds.settled > 0 ? (ds.wins / ds.settled) * 100 : 0;
      const avgStake = ds.avg_stake ?? 0;

      if (profileRes.data?.bankroll) setBankroll(profileRes.data.bankroll.toString());
      if (profileRes.data?.streak_count) setStreakCount(profileRes.data.streak_count);
      if (profileRes.data?.streak_best) setStreakBest(profileRes.data.streak_best);
      if (profileRes.data?.streak_last_date) setStreakLastDate(profileRes.data.streak_last_date);
      setStreakFreezes((profileRes.data as Record<string, unknown>)?.streak_freezes as number ?? 1);
      const profileTier = profileRes.data?.subscription_tier;
      if (profileTier) setTier(profileTier);
      setSubscriptionStatus(profileRes.data?.subscription_status ?? 'inactive');

      if (profileRes.error) console.error('Profile query error:', profileRes.error);
      if (snapshotsRes.data) setSnapshots(snapshotsRes.data as ProgressSnapshot[]);

      if (lastReportDate) {
        setNewBetsSinceReport(ds.bets_since ?? 0);
        setDaysSinceReport(Math.floor((Date.now() - lastReportDate.getTime()) / 86400000));
      }

      if (ds.newest_created_at) {
        setDaysSinceLastBet(Math.floor((Date.now() - new Date(ds.newest_created_at).getTime()) / 86400000));
      }

      setStats({ totalBets, totalWagered, netPnL, winRate, avgStake, reportCount });

      if (journalRes?.count) setJournalCount(journalRes.count);

      // Track TikTok + GA4 purchase event on post-checkout redirect (subscription flow)
      if (typeof window !== 'undefined' && window.location.search.includes('upgraded=true')) {
        const price = profileTier === 'pro' ? 19.99 : 0;
        if (price > 0) {
          trackPurchase(profileTier ?? 'pro', price);
          trackPurchaseMeta(profileTier ?? 'pro', price);
        }
        window.gtag?.('event', 'purchase', { value: price, currency: 'USD' });
        window.history.replaceState({}, '', '/dashboard');
      }
      } catch (err) {
        console.error('Dashboard load failed:', err);
        setLoadError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router, reloadToken]);

  const { mask } = usePrivacy();

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-surface-2 rounded-sm" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-surface-2 rounded-sm" />)}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <div className="case-card p-8 space-y-4">
          <div className="case-header">STATUS // LOAD FAILURE</div>
          <h2 className="font-bold text-2xl text-fg-bright">Something went wrong loading your dashboard</h2>
          <p className="data-body text-fg-muted">{loadError}</p>
          <button
            className="btn-primary"
            onClick={() => {
              setLoadError(null);
              setLoading(true);
              setReloadToken((n) => n + 1);
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const hasBets = stats && stats.totalBets > 0;
  const isPaid = getEffectiveTier(tier) === 'pro';
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const prev = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;

  // Milestones
  const milestones: Milestone[] = [
    {
      id: 'first_autopsy', label: 'First Autopsy', icon: <FlaskConical size={14} className="text-fg-muted" />,
      criteria: 'Ran your first report',
      earned: snapshots.length >= 1,
      date: snapshots[0]?.snapshot_date,
    },
    {
      id: 'self_aware', label: 'Self-Aware', icon: <Brain size={14} className="text-fg-muted" />,
      criteria: 'Emotion score dropped below 40',
      earned: snapshots.some((s) => s.tilt_score < 40),
      date: snapshots.find((s) => s.tilt_score < 40)?.snapshot_date,
    },
    {
      id: 'discipline_streak', label: 'Discipline Streak', icon: <Flame size={14} className="text-orange-400" />,
      criteria: '3 reports in a row with improving emotion score',
      earned: (() => {
        for (let i = 2; i < snapshots.length; i++) {
          if (snapshots[i].tilt_score < snapshots[i - 1].tilt_score && snapshots[i - 1].tilt_score < snapshots[i - 2].tilt_score) return true;
        }
        return false;
      })(),
    },
    {
      id: 'parlay_recovery', label: 'Parlay Recovery', icon: <Dice5 size={14} className="text-fg-muted" />,
      criteria: 'Reduced parlay % by 50%+ from first report',
      earned: snapshots.length >= 2 && latest !== null && snapshots[0].parlay_percent > 0 && latest.parlay_percent <= snapshots[0].parlay_percent * 0.5,
    },
    {
      id: 'profitable_month', label: 'Profitable Month', icon: <DollarSign size={14} className="text-fg-muted" />,
      criteria: 'Positive ROI in any snapshot',
      earned: snapshots.some((s) => s.roi_percent > 0),
      date: snapshots.find((s) => s.roi_percent > 0)?.snapshot_date,
    },
    {
      id: 'sharp_eye', label: 'Sharp Eye', icon: <Eye size={14} className="text-fg-muted" />,
      criteria: 'Sharp score above 50',
      earned: false,
    },
  ];

  const streakWeeks = (() => {
    if (snapshots.length < 2) return 0;
    let streak = 1;
    for (let i = snapshots.length - 1; i > 0; i--) {
      const curr = new Date(snapshots[i].snapshot_date).getTime();
      const prevDate = new Date(snapshots[i - 1].snapshot_date).getTime();
      const daysBetween = (curr - prevDate) / 86400000;
      if (daysBetween <= 10) streak++;
      else break;
    }
    return streak;
  })();

  // ── Priority nudge: pick exactly one ──
  const nudge = (() => {
    if (!hasBets || !stats) return null;
    // 1. Bankroll warning
    if (!bankroll) return {
      icon: <AlertTriangle size={16} className="text-caution shrink-0" />,
      message: "Your bankroll isn\u2019t set \u2014 this affects your grade and risk analysis.",
      action: 'Set Bankroll',
      href: '/settings',
    };
    // 2. Streak at risk
    if (isPaid && streakCount > 0 && streakLastDate) {
      const daysSinceStreak = Math.floor((Date.now() - new Date(streakLastDate).getTime()) / 86400000);
      const daysLeft = 21 - daysSinceStreak;
      if (daysSinceStreak >= 14 && daysLeft > 0) return {
        icon: <Flame size={16} className="text-orange-400 shrink-0" />,
        message: `Your ${streakCount}-week streak is at risk. ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left to keep it alive.`,
        action: 'Run Autopsy',
        href: '/reports?run=true',
      };
    }
    // 3. New bets since last report
    if (daysSinceReport !== null && daysSinceReport >= 7 && newBetsSinceReport > 0) return {
      icon: <FlaskConical size={16} className="text-fg-muted shrink-0" />,
      message: `${newBetsSinceReport} new bet${newBetsSinceReport !== 1 ? 's' : ''} since your last autopsy (${daysSinceReport}d ago).`,
      action: 'Run Autopsy',
      href: '/reports?run=true',
    };
    // 4. First autopsy (only if they have bets to analyze)
    if (stats.reportCount === 0 && stats.totalBets > 0) return {
      icon: <FlaskConical size={16} className="text-scalpel shrink-0" />,
      message: `${stats.totalBets} bets loaded. Run your first behavioral analysis.`,
      action: 'Run Autopsy',
      href: '/reports?run=true',
    };
    // 4b. No bets yet — nudge to upload
    if (stats.reportCount === 0 && stats.totalBets === 0) return {
      icon: <Upload size={16} className="text-scalpel shrink-0" />,
      message: 'Upload your betting history to get started.',
      action: 'Upload Bets',
      href: '/upload',
    };
    // 5. Streak start
    if (stats.reportCount > 0 && streakCount === 0) return {
      icon: <Flame size={16} className="text-orange-400 shrink-0" />,
      message: 'Start your streak. Weekly check-ins unlock badges and keep you accountable.',
      action: 'Run Autopsy',
      href: '/reports?run=true',
    };
    // 6. Upload nudge
    if (stats.reportCount > 0 && daysSinceLastBet !== null && daysSinceLastBet > 14) return {
      icon: <Upload size={16} className="text-fg-muted shrink-0" />,
      message: `Last upload was ${daysSinceLastBet} days ago. Add recent bets for a more accurate analysis.`,
      action: 'Add Bets',
      href: '/upload',
    };
    return null;
  })();

  return (
    <div className="animate-fade-in">
      {/* ── Forensic case header ── */}
      <div className="mb-10">
        <p className="case-header case-header-teal mb-2">CASE FILE // SUBJECT INTAKE</p>
        <h1 className="text-3xl font-bold tracking-tight text-fg-bright leading-tight">
          Your behavior, on record.
        </h1>
      </div>

      {/* Onboarding progress tracker — only for users who haven't run a report */}
      {stats && stats.reportCount === 0 && (
        <div className="case-card p-6 mb-8">
          <p className="case-header mb-2">STATUS // ONBOARDING</p>
          <h2 className="font-extrabold text-xl text-fg-bright mb-5">
            You&apos;re {hasBets ? '1 step' : '2 steps'} away from your first autopsy
          </h2>
          <div className="space-y-0">
            {/* Step 1: Create account — always complete */}
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-sm border-2 border-scalpel bg-scalpel/20 flex items-center justify-center shrink-0">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-scalpel" /></svg>
              </div>
              <span className="font-mono text-sm text-fg-bright line-through">Create your account</span>
            </div>
            <div className="ml-2.5 h-6 border-l-2 border-scalpel" />

            {/* Step 2: Upload betting history */}
            <div className="flex items-center gap-3">
              {hasBets ? (
                <div className="w-5 h-5 rounded-sm border-2 border-scalpel bg-scalpel/20 flex items-center justify-center shrink-0">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-scalpel" /></svg>
                </div>
              ) : (
                <div className="w-5 h-5 rounded-sm border-2 border-border-subtle bg-transparent shrink-0" />
              )}
              {hasBets ? (
                <span className="font-mono text-sm text-fg-bright line-through">Upload your betting history</span>
              ) : (
                <Link href="/upload" className="font-mono text-sm text-scalpel hover:underline">Upload your betting history</Link>
              )}
            </div>
            <div className={`ml-2.5 h-6 border-l-2 ${hasBets ? 'border-scalpel' : 'border-border-subtle'}`} />

            {/* Step 3: Run first autopsy — always incomplete here */}
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-sm border-2 border-border-subtle bg-transparent shrink-0" />
              {hasBets ? (
                <Link href="/reports" className="font-mono text-sm text-scalpel hover:underline">Run your first autopsy</Link>
              ) : (
                <span className="font-mono text-sm text-fg-dim">Run your first autopsy</span>
              )}
            </div>
          </div>

          <div className="mt-6">
            {hasBets ? (
              <Link href="/reports" className="btn-primary">Run Your First Autopsy</Link>
            ) : (
              <Link href="/upload" className="btn-primary">Upload Your Bets</Link>
            )}
          </div>
        </div>
      )}

      {!hasBets ? (
        <div
          id="upload-empty-state"
          className={`border-t border-white/[0.04] pt-10 transition-all duration-500 ${
            welcomePulse ? 'ring-2 ring-scalpel ring-offset-4 ring-offset-base rounded-sm animate-pulse' : ''
          }`}
        >
          <p className="case-header mb-3">STATUS // EMPTY SPECIMEN</p>
          <h2 className="font-bold text-2xl mb-2 text-fg-bright">Upload your first betting history</h2>
          <p className="data-body mb-6 max-w-md">
            Pick whichever method is easiest — we&apos;ll find the patterns your brain hides from you.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
            <Link
              href="/upload?method=screenshot"
              className="case-card p-4 hover:border-scalpel/40 transition-colors group"
            >
              <div className="case-header mb-1 group-hover:text-scalpel transition-colors">OPTION A</div>
              <div className="font-bold text-fg-bright mb-1">Screenshot</div>
              <div className="text-xs text-fg-muted">Fastest from your phone — snap your sportsbook &ldquo;My Bets&rdquo; screen.</div>
            </Link>
            <Link
              href="/upload?method=paste"
              className="case-card p-4 hover:border-scalpel/40 transition-colors group"
            >
              <div className="case-header mb-1 group-hover:text-scalpel transition-colors">OPTION B</div>
              <div className="font-bold text-fg-bright mb-1">Paste your bets</div>
              <div className="text-xs text-fg-muted">Copy-paste from desktop. We&apos;ll figure out the format.</div>
            </Link>
            <Link
              href="/upload?method=csv"
              className="case-card p-4 hover:border-scalpel/40 transition-colors group"
            >
              <div className="case-header mb-1 group-hover:text-scalpel transition-colors">OPTION C</div>
              <div className="font-bold text-fg-bright mb-1">Upload CSV</div>
              <div className="text-xs text-fg-muted">Export from your sportsbook&apos;s Activity / History tab.</div>
            </Link>
            <a
              href="https://links.pikkit.com/invite/surf40498"
              target="_blank"
              rel="noopener noreferrer"
              className="case-card p-4 hover:border-scalpel/40 transition-colors group"
            >
              <div className="case-header mb-1 group-hover:text-scalpel transition-colors">OPTION D</div>
              <div className="font-bold text-fg-bright mb-1">Import via Pikkit</div>
              <div className="text-xs text-fg-muted">Connect your sportsbook and sync automatically.</div>
            </a>
          </div>
          <p className="text-xs text-fg-muted font-mono mt-6">
            Need a sample?{' '}
            <a href="/example-bets.csv" className="text-scalpel hover:underline" download>
              Download an example CSV
            </a>{' '}
            to see how it works.
          </p>
        </div>
      ) : (
        <>
          {/* ── Priority nudge banner — left scalpel rule, no card box ── */}
          {nudge && (
            <div className="flex items-center gap-3 border-l-2 border-l-scalpel pl-4 py-2 mb-10">
              {nudge.icon}
              <p className="data-body flex-1">{nudge.message}</p>
              <Link href={nudge.href} className="ml-auto text-sm text-scalpel link-underline whitespace-nowrap font-mono">
                {nudge.action} →
              </Link>
            </div>
          )}

          {/* ── SECTION: VITALS ── Net P&L hero, then numbers strip ── */}
          <section className="mb-12 relative">
            <div className="absolute -top-1 right-0"><EyeToggle /></div>
            <p className="case-header mb-3">VITALS // NET P&amp;L</p>
            <p className={`text-6xl data-number leading-none ${stats.netPnL >= 0 ? 'text-win' : 'text-loss'}`}>
              {mask('x') === 'x'
                ? <>{stats.netPnL >= 0 ? '+' : '-'}$<NumberTicker value={Math.round(Math.abs(stats.netPnL))} /></>
                : mask(`${stats.netPnL >= 0 ? '+' : '-'}$${Math.round(Math.abs(stats.netPnL)).toLocaleString()}`)
              }
            </p>
            <p className="data-body mt-3 font-mono text-xs text-fg-dim tracking-wider">
              {mask(stats.totalBets.toLocaleString())} BETS · {mask(`$${Math.round(stats.totalWagered).toLocaleString()}`)} WAGERED · {mask(`$${Math.round(stats.avgStake).toLocaleString()}`)} AVG STAKE
            </p>

            {/* Numbers strip — pure dividers, no boxes */}
            <div className="mt-8 flex flex-wrap items-end divide-x divide-white/[0.04]">
              <div className="pr-8 py-1">
                <p className="case-header mb-2">WIN RATE</p>
                <p className={`text-2xl data-number leading-none ${stats.winRate >= 50 ? 'text-win' : 'text-loss'}`}>
                  {mask('x') === 'x'
                    ? <><NumberTicker value={parseFloat(stats.winRate.toFixed(1))} />%</>
                    : mask(`${stats.winRate.toFixed(1)}%`)
                  }
                </p>
              </div>
              <div className="px-8 py-1">
                <p className="case-header mb-2">ROI</p>
                <p className={`text-2xl data-number leading-none ${(latest?.roi_percent ?? stats.netPnL / Math.max(stats.totalWagered, 1) * 100) >= 0 ? 'text-win' : 'text-loss'}`}>
                  {mask('x') === 'x'
                    ? <><NumberTicker value={parseFloat(latest ? latest.roi_percent.toFixed(1) : (stats.netPnL / Math.max(stats.totalWagered, 1) * 100).toFixed(1))} />%</>
                    : latest ? mask(`${latest.roi_percent.toFixed(1)}%`) : mask(`${(stats.netPnL / Math.max(stats.totalWagered, 1) * 100).toFixed(1)}%`)
                  }
                </p>
              </div>
              {latest && (
                <div className="px-8 py-1">
                  <p className="case-header mb-2">EMOTION</p>
                  <p className="text-2xl data-number text-fg-bright leading-none">
                    {mask('x') === 'x'
                      ? <NumberTicker value={latest.tilt_score} />
                      : mask(latest.tilt_score.toString())
                    }
                  </p>
                </div>
              )}
              {latest && (
                <div className="px-8 py-1">
                  <p className="case-header mb-2">GRADE</p>
                  <p className={`text-2xl data-number leading-none ${gradeColor(latest.overall_grade)}`}>{mask(latest.overall_grade)}</p>
                </div>
              )}
              {latest?.discipline_score !== null && latest?.discipline_score !== undefined && (
                <div className="pl-8 py-1">
                  <p className="case-header mb-2">DISCIPLINE</p>
                  <p className="text-2xl data-number text-fg-bright leading-none">{mask((latest.discipline_score ?? 0).toString())}</p>
                </div>
              )}
            </div>
          </section>

          {/* ── SECTION: DISCIPLINE — ungated standalone (only if DIAGNOSIS section won't show it) ── */}
          {latest?.discipline_score != null && !isPaid && (
            <section className="border-t border-white/[0.04] pt-10 mb-12">
              <p className="case-header mb-6">DISCIPLINE // CURRENT SCORE</p>
              <div className="max-w-xl">
                <DisciplineScoreCard
                  currentScore={latest.discipline_score}
                  previousScore={prev?.discipline_score ?? null}
                  reportCount={stats?.reportCount ?? 1}
                  mask={mask}
                />
              </div>
            </section>
          )}

          {/* ── SECTION: DIAGNOSIS ── Discipline readout + markers column ── */}
          {(latest && isPaid) || (snapshots.length >= 2 && isPaid) || stats.reportCount === 0 || (isPaid && !latest && stats.reportCount > 0) ? (
            <section className="border-t border-white/[0.04] pt-10 mb-12">
              <p className="case-header mb-6">DIAGNOSIS // BEHAVIORAL DRIFT</p>

              {/* Discipline Score + Markers side-by-side */}
              {latest && isPaid && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10 mb-10">
                  {/* Left: discipline readout takes 7/12 */}
                  <div className="lg:col-span-7">
                    <DisciplineScoreCard
                      currentScore={latest.discipline_score ?? null}
                      previousScore={prev?.discipline_score ?? null}
                      reportCount={stats?.reportCount ?? 1}
                      mask={mask}
                    />
                  </div>

                  {/* Right: markers stack — fills the blank space */}
                  {((isPaid && snapshots.length > 0) || bankroll || journalCount >= 10) && (
                    <div className="lg:col-span-5 lg:border-l lg:border-white/[0.04] lg:pl-12 space-y-6">
                      <p className="case-header">CURRENT STATE</p>

                      {isPaid && snapshots.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="case-header">{streakCount > 0 ? 'STREAK' : 'NO STREAK'}</p>
                            {streakCount >= 3 && <Flame size={11} className="text-orange-400" />}
                            {streakCount >= 10 && <Flame size={11} className="text-orange-400 -ml-1" />}
                          </div>
                          <p className="text-2xl data-number text-fg-bright leading-none">
                            {streakCount > 0 ? `${streakCount}w` : '—'}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-fg-dim data-number mt-2 tracking-wider">
                            <span className="flex items-center gap-1"><Snowflake size={9} className="text-cyan-400" />{streakFreezes}</span>
                            {streakBest > 1 && <><span>·</span><span>BEST {streakBest}</span></>}
                            {streakWeeks >= 2 && <><span>·</span><span>{streakWeeks} CONSEC</span></>}
                          </div>
                        </div>
                      )}

                      {bankroll && (
                        <div>
                          <p className="case-header mb-2">BANKROLL</p>
                          <p className="text-2xl data-number text-fg-bright leading-none">{mask(`$${Number(bankroll).toLocaleString()}`)}</p>
                          <Link href="/settings" className="case-header link-underline mt-2 inline-block">EDIT →</Link>
                        </div>
                      )}

                      {journalCount >= 10 && (
                        <div>
                          <p className="case-header mb-2">JOURNAL</p>
                          <p className="text-2xl data-number text-fg-bright leading-none">{journalCount}</p>
                          <button onClick={() => setJournalOpen(true)} className="case-header case-header-teal link-underline mt-2 inline-block">
                            LOG ENTRY →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Progress chart */}
              {snapshots.length >= 2 && isPaid && (
                <div className="min-h-[320px]">
                  <ProgressChart snapshots={snapshots} />
                </div>
              )}

              {/* First autopsy CTA — uses examination surface */}
              {stats.reportCount === 0 && (
                <div className="card-hero py-12 px-8">
                  <p className="case-header case-header-teal mb-4">PROTOCOL // FIRST PASS</p>
                  <h2 className="font-bold text-3xl text-fg-bright tracking-tight mb-3">
                    {stats.totalBets} bets loaded. Run the autopsy.
                  </h2>
                  <p className="data-body mb-6 max-w-xl">
                    A full behavioral analysis takes about 20 seconds. You&apos;ll get every leak, every bias, every dollar amount.
                  </p>
                  <Link href="/reports?run=true" className="btn-primary inline-block text-base !px-6 !py-3 font-mono">
                    Run Your Autopsy →
                  </Link>
                </div>
              )}

              {/* Paid user without snapshots */}
              {isPaid && !latest && stats.reportCount > 0 && (
                <div className="border-l-2 border-l-scalpel pl-5 py-2">
                  <p className="case-header mb-2">PROTOCOL // STALE</p>
                  <p className="text-fg-bright text-base mb-2">Run a fresh autopsy to start tracking progress.</p>
                  <p className="data-body text-sm mb-4">Each report adds a snapshot: emotion score, ROI, discipline trends.</p>
                  <Link href="/reports?run=true" className="btn-primary inline-block text-sm font-mono">Run Autopsy</Link>
                </div>
              )}
            </section>
          ) : null}

          {/* ── SECTION: LONGITUDINAL ── Free tier preview ── */}
          {!isPaid && stats.reportCount > 0 && (
            <section className="border-t border-white/[0.04] pt-10 mb-12">
              <p className="case-header mb-6">LONGITUDINAL // LOCKED</p>
              <div className="relative">
                <div className="blur-sm pointer-events-none opacity-40">
                  <div className="space-y-3 max-w-2xl">
                    {[65, 52, 47, 38].map((h, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <span className="case-header w-16">WK {i + 1}</span>
                        <div className="flex-1 h-1 bg-tier-2">
                          <div className="h-full bg-scalpel" style={{ width: `${h}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Lock size={20} className="text-fg-muted mx-auto mb-2" />
                    <p className="case-header case-header-teal">PRO ONLY</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* MARKERS // CURRENT STATE — fallback for free users w/ bankroll only */}
          {!isPaid && !latest && (bankroll || journalCount >= 10) && (
            <section className="border-t border-white/[0.04] pt-10 mb-12">
              <p className="case-header mb-6">MARKERS // CURRENT STATE</p>
              <div className="flex flex-wrap items-end divide-x divide-white/[0.04]">
                {bankroll && (
                  <div className="pr-10 py-1">
                    <p className="case-header mb-2">BANKROLL</p>
                    <p className="text-2xl data-number text-fg-bright leading-none">{mask(`$${Number(bankroll).toLocaleString()}`)}</p>
                    <Link href="/settings" className="case-header link-underline mt-2 inline-block">EDIT →</Link>
                  </div>
                )}
                {journalCount >= 10 && (
                  <div className="pl-10 py-1">
                    <p className="case-header mb-2">JOURNAL</p>
                    <p className="text-2xl data-number text-fg-bright leading-none">{journalCount}</p>
                    <button onClick={() => setJournalOpen(true)} className="case-header case-header-teal link-underline mt-2 inline-block">
                      LOG ENTRY →
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── SECTION: MILESTONES ── */}
          {isPaid && snapshots.length > 0 && (
            <section className="border-t border-white/[0.04] pt-10 mb-12">
              <p className="case-header mb-6">MARKERS // MILESTONES</p>
              <div className="flex flex-wrap gap-x-10 gap-y-6">
                {milestones.map((m) => (
                  <div key={m.id} className={`flex items-center gap-3 ${m.earned ? '' : 'opacity-30'}`}>
                    <div className="shrink-0">
                      {m.earned ? m.icon : <Lock size={14} className="text-fg-dim" />}
                    </div>
                    <div>
                      <p className={`text-sm ${m.earned ? 'text-fg-bright' : 'text-fg-muted'}`}>{m.label}</p>
                      <p className="case-header mt-1">
                        {m.earned && m.date
                          ? new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
                          : m.earned ? 'EARNED' : 'LOCKED'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── SECTION: PROTOCOL ── Free tier upgrade ── */}
          {!isPaid && (
            <section className="border-t border-white/[0.04] pt-10 mb-12">
              <p className="case-header case-header-teal mb-3">PROTOCOL // PRO UPGRADE</p>
              <h3 className="font-bold text-xl text-fg-bright mb-2 tracking-tight">Track if you&apos;re actually changing.</h3>
              <p className="data-body max-w-xl mb-5">
                Pro users watched their Emotion Score drop from 72 to 34 over 8 weeks. Your first report was a snapshot. Your fifth is proof.
              </p>
              <Link href="/pricing" className="btn-primary inline-block text-sm font-mono">Start Tracking</Link>
            </section>
          )}

          {/* ── SECTION: ACTIONS ── ── */}
          <section className="border-t border-white/[0.04] pt-10">
            <p className="case-header mb-6">PROTOCOL // QUICK ACTIONS</p>
            <div className="max-w-md">
              <Link href="/upload" className="interactive-row flex items-center gap-3 text-sm text-fg-muted hover:text-fg-bright py-3">
                <Upload size={14} /> <span>Upload new bets</span>
              </Link>
              <Link href="/reports" className="interactive-row flex items-center gap-3 text-sm text-fg-muted hover:text-fg-bright py-3">
                <FlaskConical size={14} /> <span>Run new autopsy</span>
              </Link>
              <button onClick={() => setJournalOpen(true)} className="interactive-row w-full flex items-center gap-3 text-sm text-fg-muted hover:text-fg-bright text-left py-3">
                <PenLine size={14} /> <span>Log check-in</span>
                {journalCount > 0 && <span className="text-scalpel text-xs data-number ml-auto">({journalCount})</span>}
              </button>
            </div>
          </section>

          <JournalEntryModal
            isOpen={journalOpen}
            onClose={() => setJournalOpen(false)}
            onSaved={() => setJournalCount(prev => prev + 1)}
          />
        </>
      )}
    </div>
  );
}


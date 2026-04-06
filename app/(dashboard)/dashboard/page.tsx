'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase';
import { trackPurchase } from '@/lib/tiktok-events';

const ProgressChart = dynamic(() => import('@/components/ProgressChart'), {
  loading: () => <div className="case-card h-80 animate-pulse" />,
});
import { usePrivacy, EyeToggle } from '@/components/PrivacyContext';
import JournalEntryModal from '@/components/JournalEntryModal';
import type { ProgressSnapshot } from '@/types';
import { FlaskConical, Brain, Flame, Dice5, DollarSign, Eye, Upload, PenLine, Target, Calendar, Lock, Snowflake, AlertTriangle } from 'lucide-react';

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

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [betsRes, profileRes, reportsRes, snapshotsRes, lastReportRes] = await Promise.all([
        supabase.from('bets').select('result, profit, stake, placed_at, created_at').eq('user_id', user.id),
        supabase.from('profiles').select('bankroll, subscription_tier, subscription_status, streak_count, streak_best, streak_last_date').eq('id', user.id).single(),
        supabase.from('autopsy_reports').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('progress_snapshots').select('*').eq('user_id', user.id).order('snapshot_date', { ascending: true }),
        supabase.from('autopsy_reports').select('created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
      ]);

      const bets = betsRes.data ?? [];
      const reportCount = reportsRes.count ?? 0;

      const totalBets = bets.length;
      const totalWagered = bets.reduce((s, b) => s + Number(b.stake), 0);
      const netPnL = bets.reduce((s, b) => s + Number(b.profit), 0);
      const wins = bets.filter((b) => b.result === 'win').length;
      const settled = bets.filter((b) => ['win', 'loss', 'push'].includes(b.result)).length;
      const winRate = settled > 0 ? (wins / settled) * 100 : 0;
      const avgStake = totalBets > 0 ? totalWagered / totalBets : 0;

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

      const lastReport = lastReportRes.data?.[0];
      if (lastReport) {
        const lastDate = new Date(lastReport.created_at);
        const newBets = bets.filter((b) => new Date(b.placed_at) > lastDate);
        setNewBetsSinceReport(newBets.length);
        setDaysSinceReport(Math.floor((Date.now() - lastDate.getTime()) / 86400000));
      }

      // Compute days since most recent UPLOAD (created_at), not when bet was placed
      if (bets.length > 0) {
        const mostRecentUpload = bets.reduce((latest, b) => {
          const d = new Date(b.created_at ?? b.placed_at).getTime();
          return d > latest ? d : latest;
        }, 0);
        setDaysSinceLastBet(Math.floor((Date.now() - mostRecentUpload) / 86400000));
      }

      // No longer redirect to /upload — dashboard shows empty state instead

      setStats({ totalBets, totalWagered, netPnL, winRate, avgStake, reportCount });

      // Journal count
      try {
        const journalRes = await fetch('/api/journal?count=true');
        if (journalRes.ok) {
          const jData = await journalRes.json();
          setJournalCount(jData.count ?? 0);
        }
      } catch { /* silent */ }

      setLoading(false);

      // Track TikTok purchase event on post-checkout redirect
      if (typeof window !== 'undefined' && window.location.search.includes('upgraded=true')) {
        const price = profileTier === 'pro' ? 19.99 : 0;
        if (price > 0) trackPurchase(profileTier ?? 'pro', price);
        window.history.replaceState({}, '', '/dashboard');
      }
    }
    load();
  }, [router]);

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
  const hasBets = stats && stats.totalBets > 0;
  const isPaid = tier === 'pro';
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const prev = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;

  // Milestones
  const milestones: Milestone[] = [
    {
      id: 'first_autopsy', label: 'First Autopsy', icon: <FlaskConical size={20} className="text-fg-muted" />,
      criteria: 'Ran your first report',
      earned: snapshots.length >= 1,
      date: snapshots[0]?.snapshot_date,
    },
    {
      id: 'self_aware', label: 'Self-Aware', icon: <Brain size={20} className="text-fg-muted" />,
      criteria: 'Emotion score dropped below 40',
      earned: snapshots.some((s) => s.tilt_score < 40),
      date: snapshots.find((s) => s.tilt_score < 40)?.snapshot_date,
    },
    {
      id: 'discipline_streak', label: 'Discipline Streak', icon: <Flame size={20} className="text-orange-400" />,
      criteria: '3 reports in a row with improving emotion score',
      earned: (() => {
        for (let i = 2; i < snapshots.length; i++) {
          if (snapshots[i].tilt_score < snapshots[i - 1].tilt_score && snapshots[i - 1].tilt_score < snapshots[i - 2].tilt_score) return true;
        }
        return false;
      })(),
    },
    {
      id: 'parlay_recovery', label: 'Parlay Recovery', icon: <Dice5 size={20} className="text-fg-muted" />,
      criteria: 'Reduced parlay % by 50%+ from first report',
      earned: snapshots.length >= 2 && latest !== null && snapshots[0].parlay_percent > 0 && latest.parlay_percent <= snapshots[0].parlay_percent * 0.5,
    },
    {
      id: 'profitable_month', label: 'Profitable Month', icon: <DollarSign size={20} className="text-fg-muted" />,
      criteria: 'Positive ROI in any snapshot',
      earned: snapshots.some((s) => s.roi_percent > 0),
      date: snapshots.find((s) => s.roi_percent > 0)?.snapshot_date,
    },
    {
      id: 'sharp_eye', label: 'Sharp Eye', icon: <Eye size={20} className="text-fg-muted" />,
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
    // 4. First autopsy
    if (stats.reportCount === 0) return {
      icon: <FlaskConical size={16} className="text-scalpel shrink-0" />,
      message: `${stats.totalBets} bets loaded. Run your first behavioral analysis.`,
      action: 'Run Autopsy',
      href: '/reports?run=true',
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
      {/* ── Page header ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg-bright">Dashboard</h1>
        <p className="text-sm text-fg-muted mt-1">Overview of your betting behavior</p>
      </div>

      {!hasBets ? (
        <div className="bg-surface-1 border border-border-subtle rounded-xl p-12 text-center">
          <div className="mb-4"><Target size={40} className="text-fg-muted mx-auto" /></div>
          <h2 className="font-bold text-2xl mb-2 text-fg-bright">No bets yet</h2>
          <p className="text-fg-muted mb-6 max-w-md mx-auto">
            You&apos;ve got bets to upload and truths to face. Let&apos;s go.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/upload" className="btn-primary font-mono">Upload CSV</Link>
            <Link href="/bets" className="btn-secondary font-mono">Add Bets Manually</Link>
          </div>
        </div>
      ) : (
        <>
          {/* ── Priority nudge banner ── */}
          {nudge && (
            <div className="flex items-center gap-3 bg-surface-1 border border-border-subtle rounded-lg px-4 py-3 mb-6">
              {nudge.icon}
              <p className="text-sm text-fg-muted flex-1">{nudge.message}</p>
              <Link href={nudge.href} className="ml-auto text-sm text-scalpel hover:text-fg-bright transition-colors whitespace-nowrap font-mono">
                {nudge.action} →
              </Link>
            </div>
          )}

          {/* ── Vitals stat strip ── */}
          <div className="relative mb-8">
            <div className="absolute -top-8 right-0"><EyeToggle /></div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatCard label="Total Bets" value={mask(stats.totalBets.toLocaleString())} />
              <StatCard label="Total Wagered" value={mask(`$${Math.round(stats.totalWagered).toLocaleString()}`)} />
              <StatCard label="Net P&L" value={mask(`${stats.netPnL >= 0 ? '+' : ''}$${Math.round(stats.netPnL).toLocaleString()}`)} color={stats.netPnL >= 0 ? 'text-win' : 'text-loss'} />
              <StatCard label="Win Rate" value={mask(`${stats.winRate.toFixed(1)}%`)} color={stats.winRate >= 50 ? 'text-win' : 'text-loss'} />
              <StatCard label="Avg Stake" value={mask(`$${Math.round(stats.avgStake).toLocaleString()}`)} />
            </div>
          </div>

          {/* ── Progress trend strip (paid) ── */}
          {latest && isPaid && (
            <div className="mb-8">
              <span className="case-header block mb-3">Your Progress</span>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <TrendCard label="Emotion Score" current={mask(latest.tilt_score.toString())} prev={prev?.tilt_score} unit="" lowerIsBetter masked={mask('x') !== 'x'} />
                <TrendCard label="Grade" current={mask(latest.overall_grade)} prev={prev?.overall_grade} isGrade masked={mask('x') !== 'x'} />
                <TrendCard label="Win Rate" current={mask(`${latest.win_rate.toFixed(1)}%`)} prev={prev?.win_rate} unit="%" masked={mask('x') !== 'x'} />
                <TrendCard label="ROI" current={mask(`${latest.roi_percent.toFixed(1)}%`)} prev={prev?.roi_percent} unit="%" masked={mask('x') !== 'x'} />
                <TrendCard label="Parlay %" current={mask(`${latest.parlay_percent.toFixed(0)}%`)} prev={prev?.parlay_percent} unit="%" lowerIsBetter masked={mask('x') !== 'x'} />
              </div>
              {!prev && (
                <p className="font-mono text-xs text-fg-muted tracking-wider mt-3">Run another autopsy next week to start tracking progress.</p>
              )}
            </div>
          )}

          {/* ── Two-column bento grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* ── Left column: primary content ── */}
            <div className="lg:col-span-2 space-y-4">
              {/* Discipline Score + Streak (paid) */}
              {latest && isPaid && (
                <div className="bg-surface-1 border border-border-subtle rounded-xl p-6">
                  <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                    <div className="relative shrink-0">
                      <svg width="120" height="120" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="52" fill="none" stroke="#12141A" strokeWidth="8" />
                        <circle
                          cx="60" cy="60" r="52" fill="none"
                          stroke={
                            (latest.discipline_score ?? 0) >= 71 ? '#00FFCB' :
                            (latest.discipline_score ?? 0) >= 51 ? '#D29922' :
                            (latest.discipline_score ?? 0) >= 31 ? '#E8453C' : '#F85149'
                          }
                          strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={`${((latest.discipline_score ?? 0) / 100) * 327} 327`}
                          transform="rotate(-90 60 60)"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-mono text-3xl font-bold text-fg-bright">{latest.discipline_score ?? '-'}</span>
                      </div>
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h2 className="font-semibold text-xl mb-1 text-fg-bright">Discipline Score</h2>
                      <p className="text-fg-muted text-xs mb-3">
                        How consistently you&apos;re building better betting habits.
                      </p>
                      {prev && prev.discipline_score !== null && latest.discipline_score !== null && (
                        <p className={`text-sm font-mono ${
                          (latest.discipline_score ?? 0) > (prev.discipline_score ?? 0) ? 'text-win' : 'text-loss'
                        }`}>
                          {(latest.discipline_score ?? 0) > (prev.discipline_score ?? 0) ? '↑' : '↓'}{' '}
                          {Math.abs((latest.discipline_score ?? 0) - (prev.discipline_score ?? 0))} pts from last report
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {[
                          { weeks: 4, label: 'Consistent', color: 'bg-caution/10 text-caution border-caution/20' },
                          { weeks: 12, label: 'Dedicated', color: 'bg-fg-dim/10 text-fg-muted border-fg-dim/20' },
                          { weeks: 26, label: 'Half-Year Sharp', color: 'bg-caution/15 text-caution border-caution/25' },
                          { weeks: 52, label: 'Annual Autopsy', color: 'bg-scalpel-muted text-scalpel border-scalpel/20' },
                        ].map((m) => {
                          const earned = streakBest >= m.weeks;
                          return (
                            <span
                              key={m.weeks}
                              className={`font-mono text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-sm border ${
                                earned ? m.color : 'bg-surface-2 text-fg-dim border-border-subtle'
                              }`}
                            >
                              {!earned && <Lock size={12} className="text-fg-dim mr-0.5" />}
                              {m.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress Chart (paid, 2+ snapshots) */}
              {snapshots.length >= 2 && isPaid && (
                <ProgressChart snapshots={snapshots} />
              )}

              {/* First Autopsy CTA */}
              {stats.reportCount === 0 && (
                <div className="bg-surface-1 border border-border-subtle rounded-xl p-8 text-center space-y-4">
                  <div><FlaskConical size={32} className="text-fg-muted mx-auto" /></div>
                  <h2 className="font-bold text-2xl text-fg-bright">Run Your First Autopsy</h2>
                  <p className="text-fg-muted max-w-md mx-auto">
                    You&apos;ve got {stats.totalBets} bets loaded. Get a full behavioral
                    analysis in about 20 seconds.
                  </p>
                  <Link href="/reports?run=true" className="btn-primary inline-block text-lg !px-8 !py-3 font-mono">
                    Run Your Autopsy Now →
                  </Link>
                </div>
              )}

              {/* Paid user without snapshots */}
              {isPaid && !latest && stats.reportCount > 0 && (
                <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 text-center space-y-3">
                  <p className="text-fg-bright font-medium">Run a fresh autopsy to start tracking your progress</p>
                  <p className="text-fg-muted text-sm">Your reports will generate progress snapshots: emotion score, ROI, and discipline trends over time.</p>
                  <Link href="/reports?run=true" className="btn-primary inline-block text-sm font-mono">Run Autopsy</Link>
                </div>
              )}

              {/* Free tier: blurred progress preview + upgrade */}
              {!isPaid && stats.reportCount > 0 && (
                <div className="relative">
                  <div className="blur-sm pointer-events-none opacity-40">
                    <div className="bg-surface-1 border border-border-subtle rounded-xl p-6">
                      <h3 className="font-semibold text-lg mb-3 text-fg-bright">Progress Over Time</h3>
                      <div className="space-y-2">
                        {[65, 52, 47, 38].map((h, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="font-mono text-[10px] text-fg-dim w-16">Week {i + 1}</span>
                            <div className="flex-1 h-2 bg-surface-2 overflow-hidden rounded-sm">
                              <div className="h-full bg-scalpel rounded-sm" style={{ width: `${h}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="mb-1"><Lock size={24} className="text-fg-muted" /></div>
                      <p className="text-fg-muted text-sm font-mono">Track your progress with Pro</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Milestones (paid) */}
              {isPaid && snapshots.length > 0 && (
                <div>
                  <span className="case-header block mb-3">Milestones</span>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {milestones.map((m) => (
                      <div
                        key={m.id}
                        className={`bg-surface-1 border border-border-subtle rounded-xl p-4 ${m.earned ? '' : 'opacity-40'}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {m.icon}
                          <span className="font-medium text-sm text-fg-bright">{m.label}</span>
                        </div>
                        <p className="text-fg-muted text-xs">{m.criteria}</p>
                        {m.earned && m.date && (
                          <p className="font-mono text-xs text-fg-muted mt-1">{new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right column: secondary content ── */}
            <div className="space-y-4">
              {/* Streak counter (paid) */}
              {isPaid && snapshots.length > 0 && (
                <div className="bg-surface-1 border border-border-subtle rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={streakCount >= 10 ? 'animate-pulse' : ''}>
                      {streakCount >= 10 ? <><Flame size={18} className="text-orange-400" /><Flame size={18} className="text-orange-400" /></> : streakCount >= 3 ? <Flame size={18} className="text-orange-400" /> : <Calendar size={18} className="text-fg-muted" />}
                    </span>
                    <span className="text-sm text-fg-bright font-medium font-mono">
                      {streakCount > 0 ? `${streakCount}-week streak` : 'No active streak'}
                    </span>
                  </div>
                  {streakBest > 1 && (
                    <p className="font-mono text-xs text-fg-muted mb-2">Personal best: {streakBest}</p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-fg-muted font-mono" title="If you miss a week, a freeze saves your streak instead of resetting it. You get 1 per month.">
                    <Snowflake size={12} className="text-cyan-400" /> {streakFreezes} freeze{streakFreezes !== 1 ? 's' : ''} available
                  </div>
                  <div className="text-fg-muted text-xs mt-3">
                    {streakWeeks >= 2 ? (
                      <p className="font-mono">{streakWeeks} consecutive check-ins</p>
                    ) : daysSinceReport !== null && daysSinceReport > 12 ? (
                      <p>It&apos;s been {daysSinceReport} days since your last autopsy.</p>
                    ) : (
                      <p>{snapshots.length} report{snapshots.length !== 1 ? 's' : ''} so far. Keep checking in weekly.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Bankroll (if set) */}
              {bankroll && (
                <div className="bg-surface-1 border border-border-subtle rounded-xl p-4">
                  <span className="data-label block">Bankroll</span>
                  <p className="font-mono text-lg text-fg-bright">{mask(`$${Number(bankroll).toLocaleString()}`)}</p>
                  <Link href="/settings" className="font-mono text-xs text-fg-muted hover:text-scalpel transition-colors tracking-wider mt-1 inline-block">Edit</Link>
                </div>
              )}

              {/* Journal progress */}
              {journalCount >= 10 && (
                <div className="bg-surface-1 border border-border-subtle rounded-xl p-4">
                  <p className="text-fg-bright text-sm font-medium mb-1">{journalCount} journal entries</p>
                  <p className="text-fg-muted text-xs font-mono">
                    {journalCount >= 30
                      ? 'Correlation analysis available on your next autopsy'
                      : `${30 - journalCount} more until correlation insights`
                    }
                  </p>
                  <button onClick={() => setJournalOpen(true)} className="font-mono text-xs text-scalpel hover:underline mt-2 inline-block">Log entry →</button>
                </div>
              )}

              {/* Free tier upgrade CTA */}
              {!isPaid && (
                <div className="bg-surface-1 border border-scalpel/20 rounded-xl p-4 space-y-2">
                  <p className="text-fg-bright text-sm font-medium">Track your progress</p>
                  <p className="text-fg-muted text-xs">
                    Pro users watched their Emotion Score drop from 72 to 34 over 8 weeks.
                    Your first report was a snapshot. Your fifth is proof.
                  </p>
                  <Link href="/pricing" className="btn-primary inline-block text-xs font-mono !px-4 !py-2 mt-1">Start Tracking</Link>
                </div>
              )}

              {/* Quick actions */}
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-4">
                <span className="case-header block mb-3">Quick Actions</span>
                <div className="space-y-1">
                  <Link href="/upload" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-fg-muted hover:text-fg-bright hover:bg-white/[0.03] transition-colors">
                    <Upload size={16} /> Upload More Bets
                  </Link>
                  <Link href="/reports" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-fg-muted hover:text-fg-bright hover:bg-white/[0.03] transition-colors">
                    <FlaskConical size={16} /> Run New Autopsy
                  </Link>
                  <button onClick={() => setJournalOpen(true)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-fg-muted hover:text-fg-bright hover:bg-white/[0.03] transition-colors w-full text-left">
                    <PenLine size={16} /> Log Check-in {journalCount > 0 && <span className="text-scalpel text-xs ml-auto">({journalCount})</span>}
                  </button>
                </div>
              </div>
            </div>
          </div>

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

// ── Stat Card (compact vitals) ──

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-surface-1 border border-border-subtle rounded-xl p-4">
      <p className="text-sm text-fg-muted mb-1">{label}</p>
      <p className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${color ?? 'text-fg-bright'}`}>{value}</p>
    </div>
  );
}

// ── Trend Card (progress metrics) ──

function TrendCard({
  label, current, prev, unit, lowerIsBetter, isGrade, masked,
}: {
  label: string;
  current: string;
  prev?: number | string | null;
  unit?: string;
  lowerIsBetter?: boolean;
  isGrade?: boolean;
  masked?: boolean;
}) {
  let changeText = '';
  let changeColor = 'text-fg-muted';

  if (!masked && prev !== undefined && prev !== null) {
    if (isGrade && typeof prev === 'string') {
      const improved = gradeImproved(prev, current);
      const same = prev === current;
      if (!same) {
        changeText = `${improved ? '↑' : '↓'} from ${prev}`;
        changeColor = improved ? 'text-win' : 'text-loss';
      }
    } else if (typeof prev === 'number') {
      const currentNum = parseFloat(current);
      if (!isNaN(currentNum)) {
        const diff = currentNum - prev;
        if (Math.abs(diff) >= 0.1) {
          const positive = lowerIsBetter ? diff < 0 : diff > 0;
          changeText = `${positive ? '↓' : '↑'}${Math.abs(diff).toFixed(1)}${unit ?? ''} from last`;
          if (lowerIsBetter) changeText = `${diff < 0 ? '↓' : '↑'}${Math.abs(diff).toFixed(1)}${unit ?? ''} from last`;
          changeColor = positive ? 'text-win' : 'text-loss';
        }
      }
    }
  }

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-xl p-4">
      <p className="text-sm text-fg-muted mb-1">{label}</p>
      <p className="font-mono text-xl font-semibold text-fg-bright">{current}</p>
      {changeText && <p className={`font-mono text-xs mt-1 ${changeColor}`}>{changeText}</p>}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
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
  icon: string;
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
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
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
        supabase.from('profiles').select('bankroll, subscription_tier, subscription_status, trial_ends_at, streak_count, streak_best, streak_last_date').eq('id', user.id).single(),
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
      setTrialEndsAt((profileRes.data as Record<string, unknown>)?.trial_ends_at as string ?? null);
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

      const skipped = typeof window !== 'undefined' && sessionStorage.getItem('onboarding_skip');
      if (totalBets === 0 && !skipped) { router.push('/upload'); return; }

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
        const price = profileTier === 'sharp' ? 24.99 : profileTier === 'pro' ? 9.99 : 0;
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
        <div className="h-8 w-48 bg-surface-raised rounded-sm" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-surface-raised rounded-sm" />)}
        </div>
      </div>
    );
  }
  const hasBets = stats && stats.totalBets > 0;
  const isPaid = tier === 'pro' || tier === 'sharp';
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const prev = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;

  // Milestones
  const milestones: Milestone[] = [
    {
      id: 'first_autopsy', label: 'First Autopsy', icon: '🔬',
      criteria: 'Ran your first report',
      earned: snapshots.length >= 1,
      date: snapshots[0]?.snapshot_date,
    },
    {
      id: 'self_aware', label: 'Self-Aware', icon: '🧠',
      criteria: 'Emotion score dropped below 40',
      earned: snapshots.some((s) => s.tilt_score < 40),
      date: snapshots.find((s) => s.tilt_score < 40)?.snapshot_date,
    },
    {
      id: 'discipline_streak', label: 'Discipline Streak', icon: '🔥',
      criteria: '3 reports in a row with improving emotion score',
      earned: (() => {
        for (let i = 2; i < snapshots.length; i++) {
          if (snapshots[i].tilt_score < snapshots[i - 1].tilt_score && snapshots[i - 1].tilt_score < snapshots[i - 2].tilt_score) return true;
        }
        return false;
      })(),
    },
    {
      id: 'parlay_recovery', label: 'Parlay Recovery', icon: '🎰',
      criteria: 'Reduced parlay % by 50%+ from first report',
      earned: snapshots.length >= 2 && latest !== null && snapshots[0].parlay_percent > 0 && latest.parlay_percent <= snapshots[0].parlay_percent * 0.5,
    },
    {
      id: 'profitable_month', label: 'Profitable Month', icon: '💰',
      criteria: 'Positive ROI in any snapshot',
      earned: snapshots.some((s) => s.roi_percent > 0),
      date: snapshots.find((s) => s.roi_percent > 0)?.snapshot_date,
    },
    {
      id: 'sharp_eye', label: 'Sharp Eye', icon: '👁️',
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

  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="font-bold text-3xl text-fg-bright">Dashboard</h1>

      {/* Trial banner */}
      {subscriptionStatus === 'trial' && trialEndsAt && (
        <div className="finding-card border-l-scalpel p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-fg-bright text-sm font-medium">
                🎉 You&apos;re on a free Pro trial
              </p>
              <p className="text-fg-muted text-xs mt-0.5">
                {(() => {
                  const days = Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000));
                  return days === 0 ? 'Expires today' : `${days} day${days !== 1 ? 's' : ''} remaining — full Pro access, no credit card needed`;
                })()}
              </p>
            </div>
            <Link href="/pricing" className="btn-primary text-xs shrink-0 font-mono !px-4 !py-2">Keep Pro →</Link>
          </div>
        </div>
      )}

      {!hasBets ? (
        <div className="case-card p-12 text-center">
          <div className="text-5xl mb-4">🎯</div>
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
          {/* Vitals strip */}
          <div className="relative">
            <div className="absolute -top-8 right-0"><EyeToggle /></div>
            <div className="vitals-strip grid-cols-2 md:grid-cols-5">
              <VitalCell label="Total Bets" value={mask(stats.totalBets.toLocaleString())} />
              <VitalCell label="Total Wagered" value={mask(`$${Math.round(stats.totalWagered).toLocaleString()}`)} />
              <VitalCell label="Net P&L" value={mask(`${stats.netPnL >= 0 ? '+' : ''}$${Math.round(stats.netPnL).toLocaleString()}`)} color={stats.netPnL >= 0 ? 'text-win' : 'text-loss'} />
              <VitalCell label="Win Rate" value={mask(`${stats.winRate.toFixed(1)}%`)} color={stats.winRate >= 50 ? 'text-win' : 'text-loss'} />
              <VitalCell label="Avg Stake" value={mask(`$${Math.round(stats.avgStake).toLocaleString()}`)} />
            </div>
          </div>

          {/* Streak start CTA */}
          {stats.reportCount > 0 && streakCount === 0 && (
            <div className="finding-card border-l-scalpel flex items-center justify-between gap-4">
              <div>
                <p className="text-fg-bright font-medium">🔥 Start your streak — run an autopsy this week</p>
                <p className="text-fg-muted text-xs mt-0.5 font-mono">Weekly check-ins unlock milestone badges and keep you accountable.</p>
              </div>
              <Link href="/reports?run=true" className="btn-primary text-sm shrink-0 font-mono">Run Autopsy</Link>
            </div>
          )}

          {/* First Autopsy CTA */}
          {stats.reportCount === 0 && (
            <div className="case-card border-scalpel/20 p-8 text-center space-y-4">
              <div className="text-4xl">🔬</div>
              <h2 className="font-bold text-2xl text-fg-bright">Run Your First Autopsy</h2>
              <p className="text-fg-muted max-w-md mx-auto">
                You&apos;ve got {stats.totalBets} bets loaded. Get an AI-powered behavioral
                analysis in about 20 seconds.
              </p>
              <Link href="/reports?run=true" className="btn-primary inline-block text-lg !px-8 !py-3 font-mono">
                Run Your Autopsy Now →
              </Link>
            </div>
          )}

          {/* Nudge */}
          {daysSinceReport !== null && daysSinceReport >= 7 && newBetsSinceReport > 0 && (
            <div className="finding-card border-l-caution flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-fg-bright font-medium">
                  You&apos;ve placed {newBetsSinceReport} new bet{newBetsSinceReport !== 1 ? 's' : ''} since your last autopsy
                </p>
                <p className="text-fg-muted text-sm font-mono">Time for a check-up? ({daysSinceReport} days ago)</p>
              </div>
              <Link href="/reports?run=true" className="btn-primary text-sm shrink-0 font-mono">Run Autopsy</Link>
            </div>
          )}

          {/* Upload nudge — haven't added bets in >14 days */}
          {stats.reportCount > 0 && daysSinceLastBet !== null && daysSinceLastBet > 14 && (
            <div className="finding-card border-l-caution">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-fg-bright text-sm font-medium">Your last upload was {daysSinceLastBet} days ago</p>
                  <p className="text-fg-muted text-xs mt-0.5">Add your recent bets for a more accurate analysis.</p>
                </div>
                <Link href="/upload" className="btn-primary text-sm shrink-0 font-mono">Add Bets</Link>
              </div>
            </div>
          )}

          {/* Discipline Score + Streak */}
          {latest && isPaid && (
            <div className="case-card p-6">
              <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                {/* Score ring */}
                <div className="relative shrink-0">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#12141A" strokeWidth="8" />
                    <circle
                      cx="60" cy="60" r="52" fill="none"
                      stroke={
                        (latest.discipline_score ?? 0) >= 71 ? '#00C9A7' :
                        (latest.discipline_score ?? 0) >= 51 ? '#D29922' :
                        (latest.discipline_score ?? 0) >= 31 ? '#E8453C' : '#F85149'
                      }
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${((latest.discipline_score ?? 0) / 100) * 327} 327`}
                      transform="rotate(-90 60 60)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-mono text-3xl font-bold text-fg-bright">{latest.discipline_score ?? '—'}</span>
                  </div>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="font-bold text-xl mb-1 text-fg-bright">Discipline Score</h2>
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
                  {/* Streak */}
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`text-lg ${streakCount >= 10 ? 'animate-pulse' : ''}`}>
                      {streakCount >= 10 ? '🔥🔥' : streakCount >= 6 ? '🔥' : streakCount >= 3 ? '🔥' : '📅'}
                    </span>
                    <span className="text-sm text-fg-bright font-medium font-mono">
                      {streakCount > 0 ? `${streakCount}-week streak` : 'No active streak'}
                    </span>
                    {streakBest > 1 && (
                      <span className="font-mono text-xs text-fg-muted">Personal best: {streakBest}</span>
                    )}
                  </div>
                  {/* Freeze */}
                  <div className="flex items-center gap-2 mt-2" title="If you miss a week, a freeze saves your streak instead of resetting it. You get 1 per month.">
                    <span className="font-mono text-xs text-fg-muted">
                      ❄️ {streakFreezes} streak freeze{streakFreezes !== 1 ? 's' : ''}
                    </span>
                    <span className="font-mono text-xs text-fg-muted">— miss a week without losing your streak (resets monthly)</span>
                  </div>
                  {/* Milestone badges */}
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
                            earned ? m.color : 'bg-surface-raised text-fg-dim border-white/[0.04]'
                          }`}
                        >
                          {!earned && <span className="mr-0.5">🔒</span>}
                          {m.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Progress Trend Cards */}
          {latest && isPaid && (
            <div className="space-y-4">
              <span className="case-header block">Your Progress</span>
              <div className="vitals-strip grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                <TrendCell label="Emotion Score" current={mask(latest.tilt_score.toString())} prev={prev?.tilt_score} unit="" lowerIsBetter masked={mask('x') !== 'x'} />
                <TrendCell label="Grade" current={mask(latest.overall_grade)} prev={prev?.overall_grade} isGrade masked={mask('x') !== 'x'} />
                <TrendCell label="Win Rate" current={mask(`${latest.win_rate.toFixed(1)}%`)} prev={prev?.win_rate} unit="%" masked={mask('x') !== 'x'} />
                <TrendCell label="ROI" current={mask(`${latest.roi_percent.toFixed(1)}%`)} prev={prev?.roi_percent} unit="%" masked={mask('x') !== 'x'} />
                <TrendCell label="Parlay %" current={mask(`${latest.parlay_percent.toFixed(0)}%`)} prev={prev?.parlay_percent} unit="%" lowerIsBetter masked={mask('x') !== 'x'} />
              </div>
              {!prev && (
                <p className="font-mono text-xs text-fg-muted tracking-wider">Run another autopsy next week to start tracking progress.</p>
              )}
            </div>
          )}

          {/* Progress Chart */}
          {snapshots.length >= 2 && isPaid && (
            <ProgressChart snapshots={snapshots} />
          )}

          {/* Paid user without snapshots */}
          {isPaid && !latest && stats.reportCount > 0 && (
            <div className="finding-card border-l-scalpel p-5 text-center space-y-3">
              <p className="text-fg-bright font-medium">Run a fresh autopsy to start tracking your progress</p>
              <p className="text-fg-muted text-sm">Your reports will generate progress snapshots — emotion score, ROI, and discipline trends over time.</p>
              <Link href="/reports?run=true" className="btn-primary inline-block text-sm font-mono">Run Autopsy</Link>
            </div>
          )}

          {/* Free tier upgrade */}
          {!isPaid && (
            <div className="finding-card border-l-scalpel p-6 text-center space-y-3">
              <p className="text-fg-bright mb-2">
                Right now you&apos;re guessing whether you&apos;re getting better.
              </p>
              <p className="text-fg-muted text-sm mb-4">
                Pro users watched their Emotion Score drop from 72 to 34 over 8 weeks — and
                saw it in the numbers. Your first report was a snapshot. Your fifth report is
                proof you&apos;re a different bettor.
              </p>
              <Link href="/pricing" className="btn-primary inline-block text-sm font-mono">Start Tracking Your Progress</Link>
            </div>
          )}

          {!isPaid && stats.reportCount > 0 && (
            <div className="relative">
              <div className="blur-sm pointer-events-none opacity-40">
                <div className="case-card p-6">
                  <h3 className="font-bold text-lg mb-3 text-fg-bright">Progress Over Time</h3>
                  <div className="space-y-2">
                    {[65, 52, 47, 38].map((h, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-fg-dim w-16">Week {i + 1}</span>
                        <div className="flex-1 h-2 bg-surface-raised overflow-hidden rounded-sm">
                          <div className="h-full bg-scalpel rounded-sm" style={{ width: `${h}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl mb-1">🔒</p>
                  <p className="text-fg-muted text-sm font-mono">Track your progress with Pro</p>
                </div>
              </div>
            </div>
          )}

          {/* Streak warnings */}
          {isPaid && streakCount > 0 && streakLastDate && (() => {
            const daysSinceStreak = Math.floor((Date.now() - new Date(streakLastDate).getTime()) / 86400000);
            const daysLeft = 21 - daysSinceStreak;
            if (daysSinceStreak >= 14 && daysLeft > 0) {
              return (
                <div className="finding-card border-l-caution">
                  <p className="text-caution text-sm font-mono">
                    Your {streakCount}-report streak is at risk — run an autopsy in the next {daysLeft} day{daysLeft !== 1 ? 's' : ''} to keep it alive.
                    {newBetsSinceReport > 0 && ` You have ${newBetsSinceReport} new bets since your last check-in.`}
                  </p>
                  <Link href="/reports?run=true" className="text-sm text-scalpel hover:underline mt-1 inline-block font-mono">
                    Run Autopsy →
                  </Link>
                </div>
              );
            }
            return null;
          })()}

          {/* Bankroll */}
          {bankroll ? (
            <div className="case-card p-5 flex items-center justify-between">
              <div>
                <span className="data-label block">Bankroll</span>
                <p className="font-mono text-lg text-fg-bright">{mask(`$${Number(bankroll).toLocaleString()}`)}</p>
              </div>
              <Link href="/settings" className="font-mono text-xs text-fg-muted hover:text-scalpel transition-colors tracking-wider">Edit in Settings</Link>
            </div>
          ) : (
            <div className="finding-card border-l-caution p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-fg-bright text-sm font-medium">⚠️ Your bankroll isn&apos;t set — this affects your grade</p>
                  <p className="text-fg-muted text-xs mt-1">
                    Your bankroll is the total amount you&apos;ve set aside for betting across all sportsbooks.
                    Without it, we have to guess — and that guess directly impacts your overall grade, bankroll health rating,
                    and risk analysis. Even a rough estimate makes your report significantly more accurate.
                  </p>
                </div>
                <Link href="/settings" className="btn-primary text-sm shrink-0 font-mono !px-4 !py-2">Set Bankroll</Link>
              </div>
            </div>
          )}

          {/* Milestones */}
          {isPaid && snapshots.length > 0 && (
            <div className="space-y-3">
              <span className="case-header block">Milestones</span>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {milestones.map((m) => (
                  <div
                    key={m.id}
                    className={`case-card p-4 ${m.earned ? '' : 'opacity-40'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{m.icon}</span>
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

          {/* Streak Counter */}
          {isPaid && snapshots.length > 0 && (
            <div className="case-card p-5 flex items-center gap-4">
              <span className="text-3xl">{streakWeeks >= 3 ? '🔥' : '📅'}</span>
              <div>
                {streakWeeks >= 2 ? (
                  <p className="text-fg-bright font-medium font-mono">
                    {streakWeeks} consecutive autopsy check-ins
                  </p>
                ) : daysSinceReport !== null && daysSinceReport > 12 ? (
                  <p className="text-fg-bright">
                    It&apos;s been {daysSinceReport} days since your last autopsy — upload your recent bets and check in.
                  </p>
                ) : (
                  <p className="text-fg-bright">
                    {snapshots.length} autopsy report{snapshots.length !== 1 ? 's' : ''} so far. Keep checking in weekly for the best insights.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Journal progress */}
          {journalCount >= 10 && (
            <div className="finding-card border-l-scalpel">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-fg-bright text-sm font-medium">{journalCount} journal entries logged</p>
                  <p className="text-fg-muted text-xs font-mono mt-0.5">
                    {journalCount >= 30
                      ? 'Correlation analysis available on your next autopsy'
                      : `${30 - journalCount} more entries until correlation insights unlock`
                    }
                  </p>
                </div>
                <button onClick={() => setJournalOpen(true)} className="font-mono text-xs text-scalpel hover:underline">Log entry →</button>
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="grid md:grid-cols-3 gap-4">
            <Link href="/upload" className="case-card p-6 hover:border-white/[0.08] transition-colors group">
              <div className="flex items-start gap-4">
                <span className="text-3xl">📤</span>
                <div>
                  <h3 className="font-medium text-lg text-fg-bright group-hover:text-scalpel transition-colors">Upload More Bets</h3>
                  <p className="text-fg-muted text-sm mt-1">Import your latest bet history via CSV.</p>
                </div>
              </div>
            </Link>
            <Link href="/reports" className="case-card p-6 hover:border-white/[0.08] transition-colors group">
              <div className="flex items-start gap-4">
                <span className="text-3xl">🔬</span>
                <div>
                  <h3 className="font-medium text-lg text-fg-bright group-hover:text-scalpel transition-colors">Run New Autopsy</h3>
                  <p className="text-fg-muted text-sm mt-1">AI-powered behavioral analysis.</p>
                </div>
              </div>
            </Link>
            <button onClick={() => setJournalOpen(true)} className="case-card p-6 hover:border-white/[0.08] transition-colors group text-left">
              <div className="flex items-start gap-4">
                <span className="text-3xl">📝</span>
                <div>
                  <h3 className="font-medium text-lg text-fg-bright group-hover:text-scalpel transition-colors">
                    Log Check-in {journalCount > 0 && <span className="text-scalpel text-sm">({journalCount})</span>}
                  </h3>
                  <p className="text-fg-muted text-sm mt-1">Pre-bet mental state journal.</p>
                </div>
              </div>
            </button>
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

// ── Vital Cell ──

function VitalCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="vitals-cell">
      <span className="data-label block mb-1">{label}</span>
      <p className={`font-mono text-xl font-bold tabular-nums ${color ?? 'text-fg-bright'}`}>{value}</p>
    </div>
  );
}

// ── Trend Cell ──

function TrendCell({
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
    <div className="vitals-cell">
      <span className="data-label block mb-1">{label}</span>
      <p className="font-mono text-xl font-semibold text-fg-bright">{current}</p>
      {changeText && <p className={`font-mono text-xs mt-1 ${changeColor}`}>{changeText}</p>}
    </div>
  );
}

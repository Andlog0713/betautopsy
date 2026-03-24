'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase';

const ProgressChart = dynamic(() => import('@/components/ProgressChart'), {
  loading: () => <div className="card h-80 animate-pulse" />,
});
import { usePrivacy, EyeToggle } from '@/components/PrivacyContext';
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
  const [daysSinceReport, setDaysSinceReport] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [betsRes, profileRes, reportsRes, snapshotsRes, lastReportRes] = await Promise.all([
        supabase.from('bets').select('result, profit, stake, placed_at').eq('user_id', user.id),
        supabase.from('profiles').select('bankroll, subscription_tier, streak_count, streak_best, streak_last_date').eq('id', user.id).single(),
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
      if (profileRes.data?.subscription_tier) setTier(profileRes.data.subscription_tier);
      if (snapshotsRes.data) setSnapshots(snapshotsRes.data as ProgressSnapshot[]);

      // Bets since last report
      const lastReport = lastReportRes.data?.[0];
      if (lastReport) {
        const lastDate = new Date(lastReport.created_at);
        const newBets = bets.filter((b) => new Date(b.placed_at) > lastDate);
        setNewBetsSinceReport(newBets.length);
        setDaysSinceReport(Math.floor((Date.now() - lastDate.getTime()) / 86400000));
      }

      const skipped = typeof window !== 'undefined' && sessionStorage.getItem('onboarding_skip');
      if (totalBets === 0 && !skipped) { router.push('/upload'); return; }

      setStats({ totalBets, totalWagered, netPnL, winRate, avgStake, reportCount });
      setLoading(false);
    }
    load();
  }, [router]);

  const { mask } = usePrivacy();

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-ink-800 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-ink-800 rounded-xl" />)}
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
      earned: false, // requires edge_profile from report, not snapshot
    },
  ];

  // Streak counter
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
      <h1 className="font-bold text-3xl">Dashboard</h1>

      {!hasBets ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h2 className="font-bold text-2xl mb-2">No bets yet</h2>
          <p className="text-ink-600 mb-6 max-w-md mx-auto">
            You&apos;ve got bets to upload and truths to face. Let&apos;s go.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/upload" className="btn-primary">Upload CSV</Link>
            <Link href="/bets" className="btn-secondary">Add Bets Manually</Link>
          </div>
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="relative">
            <div className="absolute -top-8 right-0"><EyeToggle /></div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard label="Total Bets" value={mask(stats.totalBets.toLocaleString())} icon="🎯" />
              <StatCard label="Total Wagered" value={mask(`$${Math.round(stats.totalWagered).toLocaleString()}`)} icon="💵" />
              <StatCard label="Net P&L" value={mask(`${stats.netPnL >= 0 ? '+' : ''}$${Math.round(stats.netPnL).toLocaleString()}`)} icon="💰" color={stats.netPnL >= 0 ? 'text-mint-500' : 'text-red-400'} />
              <StatCard label="Win Rate" value={mask(`${stats.winRate.toFixed(1)}%`)} icon="📈" color={stats.winRate >= 50 ? 'text-mint-500' : 'text-red-400'} />
              <StatCard label="Avg Stake" value={mask(`$${Math.round(stats.avgStake).toLocaleString()}`)} icon="📊" />
            </div>
          </div>

          {/* First Autopsy CTA */}
          {stats.reportCount === 0 && (
            <div className="card border-flame-500/30 bg-flame-500/5 p-8 text-center space-y-4">
              <div className="text-4xl">🔬</div>
              <h2 className="font-bold text-2xl">Run Your First Autopsy</h2>
              <p className="text-ink-600 max-w-md mx-auto">
                You&apos;ve got {stats.totalBets} bets loaded. Get an AI-powered behavioral
                analysis in about 20 seconds.
              </p>
              <Link href="/reports?run=true" className="btn-primary inline-block text-lg !px-8 !py-3">
                Run Your Autopsy Now →
              </Link>
            </div>
          )}

          {/* Nudge — haven't run a report in 7+ days */}
          {daysSinceReport !== null && daysSinceReport >= 7 && newBetsSinceReport > 0 && (
            <div className="card border-flame-500/30 bg-flame-500/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[#F0F0F0] font-medium">
                  You&apos;ve placed {newBetsSinceReport} new bet{newBetsSinceReport !== 1 ? 's' : ''} since your last autopsy
                </p>
                <p className="text-ink-600 text-sm">Time for a check-up? ({daysSinceReport} days ago)</p>
              </div>
              <Link href="/reports?run=true" className="btn-primary text-sm shrink-0">Run Autopsy</Link>
            </div>
          )}

          {/* Discipline Score + Streak Hero */}
          {latest && isPaid && (
            <div className="card p-6">
              <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                {/* Score ring */}
                <div className="relative shrink-0">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#1C1E2D" strokeWidth="8" />
                    <circle
                      cx="60" cy="60" r="52" fill="none"
                      stroke={
                        (latest.discipline_score ?? 0) >= 71 ? '#00C853' :
                        (latest.discipline_score ?? 0) >= 51 ? '#fbbf24' :
                        (latest.discipline_score ?? 0) >= 31 ? '#f97316' : '#f87171'
                      }
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${((latest.discipline_score ?? 0) / 100) * 327} 327`}
                      transform="rotate(-90 60 60)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-mono text-3xl font-bold text-[#F0F0F0]">{latest.discipline_score ?? '—'}</span>
                  </div>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="font-bold text-xl mb-1">Discipline Score</h2>
                  <p className="text-ink-600 text-xs mb-3">
                    How consistently you&apos;re building better betting habits.
                  </p>
                  {prev && prev.discipline_score !== null && latest.discipline_score !== null && (
                    <p className={`text-sm font-mono ${
                      (latest.discipline_score ?? 0) > (prev.discipline_score ?? 0) ? 'text-mint-500' : 'text-red-400'
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
                    <span className="text-sm text-[#F0F0F0]">
                      {streakCount > 0 ? `${streakCount}-report streak` : 'No active streak'}
                    </span>
                    {streakBest > 1 && (
                      <span className="text-xs text-ink-600">(Best: {streakBest})</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Progress Trend Cards */}
          {latest && isPaid && (
            <div className="space-y-4">
              <h2 className="font-bold text-xl">Your Progress</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <TrendCard label="Emotion Score" current={mask(latest.tilt_score.toString())} prev={prev?.tilt_score} unit="" lowerIsBetter masked={mask('x') !== 'x'} />
                <TrendCard label="Grade" current={mask(latest.overall_grade)} prev={prev?.overall_grade} isGrade masked={mask('x') !== 'x'} />
                <TrendCard label="Win Rate" current={mask(`${latest.win_rate.toFixed(1)}%`)} prev={prev?.win_rate} unit="%" masked={mask('x') !== 'x'} />
                <TrendCard label="ROI" current={mask(`${latest.roi_percent.toFixed(1)}%`)} prev={prev?.roi_percent} unit="%" masked={mask('x') !== 'x'} />
                <TrendCard label="Parlay %" current={mask(`${latest.parlay_percent.toFixed(0)}%`)} prev={prev?.parlay_percent} unit="%" lowerIsBetter masked={mask('x') !== 'x'} />
              </div>
              {!prev && (
                <p className="text-ink-700 text-xs">Run another autopsy next week to start tracking progress.</p>
              )}
            </div>
          )}

          {/* Progress Chart */}
          {snapshots.length >= 2 && isPaid && (
            <ProgressChart snapshots={snapshots} />
          )}

          {/* Free tier upgrade prompt */}
          {latest && !isPaid && (
            <div className="card border-flame-500/20 bg-flame-500/5 p-6 text-center space-y-3">
              <p className="text-[#F0F0F0] mb-2">
                Right now you&apos;re guessing whether you&apos;re getting better.
              </p>
              <p className="text-ink-600 text-sm mb-4">
                Pro users watched their Emotion Score drop from 72 to 34 over 8 weeks — and
                saw it in the numbers. Your first report was a snapshot. Your fifth report is
                proof you&apos;re a different bettor.
              </p>
              <Link href="/pricing" className="btn-primary inline-block text-sm">Start Tracking Your Progress</Link>
            </div>
          )}

          {!isPaid && stats.reportCount > 0 && (
            <div className="relative">
              <div className="blur-sm pointer-events-none opacity-40">
                <div className="card p-6">
                  <h3 className="font-bold text-lg mb-3">Progress Over Time</h3>
                  <div className="space-y-2">
                    {[65, 52, 47, 38].map((h, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-ink-600 w-16">Week {i + 1}</span>
                        <div className="flex-1 h-2 bg-ink-900 rounded-full overflow-hidden">
                          <div className="h-full bg-flame-500 rounded-full" style={{ width: `${h}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl mb-1">🔒</p>
                  <p className="text-ink-600 text-sm">Track your progress with Pro</p>
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
                <div className="card border-amber-400/30 bg-amber-400/5 p-4">
                  <p className="text-amber-400 text-sm">
                    Your {streakCount}-report streak is at risk — run an autopsy in the next {daysLeft} day{daysLeft !== 1 ? 's' : ''} to keep it alive.
                    {newBetsSinceReport > 0 && ` You have ${newBetsSinceReport} new bets since your last check-in.`}
                  </p>
                  <Link href="/reports?run=true" className="text-sm text-flame-500 hover:underline mt-1 inline-block">
                    Run Autopsy →
                  </Link>
                </div>
              );
            }
            return null;
          })()}

          {/* Bankroll */}
          {bankroll ? (
            <div className="card p-5 flex items-center justify-between">
              <div>
                <p className="text-ink-600 text-xs">Bankroll</p>
                <p className="font-mono text-lg text-[#F0F0F0]">{mask(`$${Number(bankroll).toLocaleString()}`)}</p>
              </div>
              <Link href="/settings" className="text-xs text-ink-600 hover:text-flame-500 transition-colors">Edit in Settings</Link>
            </div>
          ) : (
            <div className="card p-5 flex items-center justify-between">
              <div>
                <p className="text-[#F0F0F0] text-sm">Set your bankroll for more accurate analysis</p>
                <p className="text-ink-700 text-xs mt-0.5">Helps us assess your risk level</p>
              </div>
              <Link href="/settings" className="text-sm text-flame-500 hover:underline">Set up your profile →</Link>
            </div>
          )}

          {/* Milestones */}
          {isPaid && snapshots.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-bold text-xl">Milestones</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {milestones.map((m) => (
                  <div
                    key={m.id}
                    className={`card p-4 ${m.earned ? '' : 'opacity-40'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{m.icon}</span>
                      <span className="font-medium text-sm">{m.label}</span>
                    </div>
                    <p className="text-ink-600 text-xs">{m.criteria}</p>
                    {m.earned && m.date && (
                      <p className="text-ink-700 text-xs mt-1">{new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Streak Counter */}
          {isPaid && snapshots.length > 0 && (
            <div className="card p-5 flex items-center gap-4">
              <span className="text-3xl">{streakWeeks >= 3 ? '🔥' : '📅'}</span>
              <div>
                {streakWeeks >= 2 ? (
                  <p className="text-[#F0F0F0] font-medium">
                    {streakWeeks} consecutive autopsy check-ins
                  </p>
                ) : daysSinceReport !== null && daysSinceReport > 12 ? (
                  <p className="text-[#F0F0F0]">
                    It&apos;s been {daysSinceReport} days since your last autopsy — upload your recent bets and check in.
                  </p>
                ) : (
                  <p className="text-[#F0F0F0]">
                    {snapshots.length} autopsy report{snapshots.length !== 1 ? 's' : ''} so far. Keep checking in weekly for the best insights.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/upload" className="card p-6 hover:border-white/[0.15] transition-colors group">
              <div className="flex items-start gap-4">
                <span className="text-3xl">📤</span>
                <div>
                  <h3 className="font-medium text-lg group-hover:text-flame-500 transition-colors">Upload More Bets</h3>
                  <p className="text-ink-600 text-sm mt-1">Import your latest bet history from any tracker via CSV.</p>
                </div>
              </div>
            </Link>
            <Link href="/reports" className="card p-6 hover:border-white/[0.15] transition-colors group">
              <div className="flex items-start gap-4">
                <span className="text-3xl">🔬</span>
                <div>
                  <h3 className="font-medium text-lg group-hover:text-flame-500 transition-colors">Run New Autopsy</h3>
                  <p className="text-ink-600 text-sm mt-1">Get an AI-powered behavioral analysis of your betting patterns.</p>
                </div>
              </div>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

// ── Trend Card ──

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
  let changeColor = 'text-ink-600';

  if (!masked && prev !== undefined && prev !== null) {
    if (isGrade && typeof prev === 'string') {
      const improved = gradeImproved(prev, current);
      const same = prev === current;
      if (!same) {
        changeText = `${improved ? '↑' : '↓'} from ${prev}`;
        changeColor = improved ? 'text-mint-500' : 'text-red-400';
      }
    } else if (typeof prev === 'number') {
      const currentNum = parseFloat(current);
      if (!isNaN(currentNum)) {
        const diff = currentNum - prev;
        if (Math.abs(diff) >= 0.1) {
          const positive = lowerIsBetter ? diff < 0 : diff > 0;
          changeText = `${positive ? '↓' : '↑'}${Math.abs(diff).toFixed(1)}${unit ?? ''} from last`;
          if (lowerIsBetter) changeText = `${diff < 0 ? '↓' : '↑'}${Math.abs(diff).toFixed(1)}${unit ?? ''} from last`;
          changeColor = positive ? 'text-mint-500' : 'text-red-400';
        }
      }
    }
  }

  return (
    <div className="card p-4">
      <p className="text-ink-600 text-xs mb-1">{label}</p>
      <p className="font-mono text-xl font-semibold text-[#F0F0F0]">{current}</p>
      {changeText && <p className={`text-xs mt-1 ${changeColor}`}>{changeText}</p>}
    </div>
  );
}

// ── Stat Card ──

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-ink-600 text-sm">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className={`font-mono text-2xl font-semibold ${color ?? 'text-[#F0F0F0]'}`}>{value}</p>
    </div>
  );
}

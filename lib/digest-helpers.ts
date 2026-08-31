import type { SupabaseClient } from '@supabase/supabase-js';
import type { Bet } from '@/types';
import { formatParlayCompact } from '@/lib/format-parlay';
import {
  betSourceDayOfWeek,
  betSourceHour,
  betSequenceTimeMs,
  comparableBetSequences,
  formatSourceTime,
} from '@/lib/temporal-provenance';

export interface DigestStats {
  totalBets: number;
  wins: number;
  losses: number;
  pushes: number;
  netPnL: number;
  totalStaked: number;
  roi: number;
  avgStake: number;
  avgStakeAfterLoss: number;
  avgStakeAfterWin: number;
  parlayCount: number;
  parlayPnL: number;
  parlayRoi: number;
  straightBetPnL: number;
  straightBetRoi: number;
  biggestWin: { description: string; profit: number; odds: number } | null;
  biggestLoss: { description: string; profit: number } | null;
  mostBetSport: string | null;
  mostProfitableSport: string | null;
  lateNightBets: number;
  longestWinStreak: number;
  longestLoseStreak: number;
  uniqueSportsbooks: string[];
  betsByDay: Record<string, number>;
  timeBearingBets: number;
  hasReliableClockCoverage: boolean;
}

export async function getWeeklyBets(
  supabase: SupabaseClient,
  userId: string,
  sinceDate: string
): Promise<Bet[]> {
  const { data } = await supabase
    .from('bets')
    .select('*')
    .eq('user_id', userId)
    .gte('recorded_date', sinceDate.slice(0, 10))
    .order('recorded_date', { ascending: true })
    .order('placed_time', { ascending: true, nullsFirst: false })
    .order('placed_at', { ascending: true, nullsFirst: false });
  return (data ?? []) as Bet[];
}

export function calculateDigestStats(bets: Bet[]): DigestStats {
  const settled = bets.filter((b) => ['win', 'loss', 'push'].includes(b.result));
  const wins = bets.filter((b) => b.result === 'win').length;
  const losses = bets.filter((b) => b.result === 'loss').length;
  const pushes = bets.filter((b) => b.result === 'push').length;
  const totalStaked = bets.reduce((s, b) => s + Number(b.stake), 0);
  const netPnL = bets.reduce((s, b) => s + Number(b.profit), 0);
  const roi = totalStaked > 0 ? (netPnL / totalStaked) * 100 : 0;
  const avgStake = bets.length > 0 ? totalStaked / bets.length : 0;

  // Loss chasing detection
  let stakeAfterLoss = 0, countAfterLoss = 0, stakeAfterWin = 0, countAfterWin = 0;
  const sequences = comparableBetSequences(bets);
  for (const sequence of sequences) {
    for (let i = 1; i < sequence.length; i++) {
      const prev = sequence[i - 1];
      if (prev.result === 'loss') { stakeAfterLoss += Number(sequence[i].stake); countAfterLoss++; }
      else if (prev.result === 'win') { stakeAfterWin += Number(sequence[i].stake); countAfterWin++; }
    }
  }
  const avgStakeAfterLoss = countAfterLoss > 0 ? stakeAfterLoss / countAfterLoss : avgStake;
  const avgStakeAfterWin = countAfterWin > 0 ? stakeAfterWin / countAfterWin : avgStake;

  // Parlay vs straight
  const parlays = bets.filter((b) => b.bet_type === 'parlay' || (b.parlay_legs && b.parlay_legs > 1));
  const straights = bets.filter((b) => !(b.bet_type === 'parlay' || (b.parlay_legs && b.parlay_legs > 1)));
  const parlayStaked = parlays.reduce((s, b) => s + Number(b.stake), 0);
  const parlayPnL = parlays.reduce((s, b) => s + Number(b.profit), 0);
  const parlayRoi = parlayStaked > 0 ? (parlayPnL / parlayStaked) * 100 : 0;
  const straightStaked = straights.reduce((s, b) => s + Number(b.stake), 0);
  const straightBetPnL = straights.reduce((s, b) => s + Number(b.profit), 0);
  const straightBetRoi = straightStaked > 0 ? (straightBetPnL / straightStaked) * 100 : 0;

  // Biggest win/loss
  const winBets = settled.filter((b) => b.result === 'win' && Number(b.profit) > 0);
  const lossBets = settled.filter((b) => b.result === 'loss');
  const biggestWin = winBets.length > 0
    ? winBets.sort((a, b) => Number(b.profit) - Number(a.profit))[0]
    : null;
  const biggestLoss = lossBets.length > 0
    ? lossBets.sort((a, b) => Number(a.profit) - Number(b.profit))[0]
    : null;

  // Sport stats
  const sportMap = new Map<string, { staked: number; profit: number; count: number }>();
  settled.forEach((b) => {
    const s = sportMap.get(b.sport) ?? { staked: 0, profit: 0, count: 0 };
    s.staked += Number(b.stake); s.profit += Number(b.profit); s.count++;
    sportMap.set(b.sport, s);
  });
  let mostBetSport: string | null = null;
  let mostBetCount = 0;
  let mostProfitableSport: string | null = null;
  let bestSportRoi = -Infinity;
  sportMap.forEach((v, k) => {
    if (v.count > mostBetCount) { mostBetCount = v.count; mostBetSport = k; }
    const sportRoi = v.staked > 0 ? (v.profit / v.staked) * 100 : 0;
    if (sportRoi > bestSportRoi && v.count >= 3) { bestSportRoi = sportRoi; mostProfitableSport = k; }
  });

  // Count only sourced clock values. A missing clock is not midnight.
  const timeBearingBets = bets.filter((bet) => betSourceHour(bet) !== null).length;
  const hasReliableClockCoverage = timeBearingBets >= 5
    && timeBearingBets / Math.max(1, bets.length) >= 0.95;
  const lateNightBets = bets.filter((b) => {
    const hour = betSourceHour(b);
    return hour !== null && (hour >= 23 || hour <= 4);
  }).length;

  // Streaks
  let longestWinStreak = 0, longestLoseStreak = 0, curWin = 0, curLose = 0;
  for (const sequence of sequences) {
    curWin = 0;
    curLose = 0;
    for (const b of sequence) {
      if (b.result === 'win') { curWin++; curLose = 0; longestWinStreak = Math.max(longestWinStreak, curWin); }
      else if (b.result === 'loss') { curLose++; curWin = 0; longestLoseStreak = Math.max(longestLoseStreak, curLose); }
      else { curWin = 0; curLose = 0; }
    }
  }

  // Sportsbooks
  const books = new Set<string>();
  bets.forEach((b) => { if (b.sportsbook) books.add(b.sportsbook); });

  // Bets by day
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const betsByDay: Record<string, number> = {};
  bets.forEach((b) => {
    const dayIndex = betSourceDayOfWeek(b);
    if (dayIndex === null) return;
    const day = days[dayIndex];
    betsByDay[day] = (betsByDay[day] ?? 0) + 1;
  });

  return {
    totalBets: bets.length, wins, losses, pushes,
    netPnL: Math.round(netPnL * 100) / 100,
    totalStaked: Math.round(totalStaked * 100) / 100,
    roi: Math.round(roi * 10) / 10,
    avgStake: Math.round(avgStake), avgStakeAfterLoss: Math.round(avgStakeAfterLoss), avgStakeAfterWin: Math.round(avgStakeAfterWin),
    parlayCount: parlays.length, parlayPnL: Math.round(parlayPnL * 100) / 100, parlayRoi: Math.round(parlayRoi * 10) / 10,
    straightBetPnL: Math.round(straightBetPnL * 100) / 100, straightBetRoi: Math.round(straightBetRoi * 10) / 10,
    biggestWin: biggestWin ? { description: formatParlayCompact(biggestWin, 60), profit: Math.round(Number(biggestWin.profit)), odds: biggestWin.odds } : null,
    biggestLoss: biggestLoss ? { description: formatParlayCompact(biggestLoss, 60), profit: Math.round(Number(biggestLoss.profit)) } : null,
    mostBetSport, mostProfitableSport, lateNightBets,
    longestWinStreak, longestLoseStreak,
    uniqueSportsbooks: Array.from(books),
    betsByDay,
    timeBearingBets,
    hasReliableClockCoverage,
  };
}

export interface Insight {
  headline: string;
  detail: string;
}

export function generateInsight(stats: DigestStats): Insight {
  // 1. Loss chasing
  if (stats.avgStakeAfterLoss > stats.avgStakeAfterWin * 1.3 && stats.losses > 2) {
    const pctIncrease = Math.round(((stats.avgStakeAfterLoss - stats.avgStakeAfterWin) / stats.avgStakeAfterWin) * 100);
    return {
      headline: 'Higher stakes followed losing-result rows',
      detail: `In the comparable source order, your average stake was $${stats.avgStakeAfterLoss.toLocaleString()} following a bet later settled as a loss vs $${stats.avgStakeAfterWin.toLocaleString()} following one later settled as a win, a ${pctIncrease}% difference. Settlement times are unavailable, so this does not show that a result caused the next stake.`,
    };
  }

  // 2. Heavy parlay week
  if (stats.totalBets > 0 && stats.parlayCount / stats.totalBets > 0.35) {
    const pct = Math.round((stats.parlayCount / stats.totalBets) * 100);
    return {
      headline: `${pct}% of your bets were parlays`,
      detail: `Your parlay ROI this week: ${stats.parlayRoi >= 0 ? '+' : ''}${stats.parlayRoi}%. Your straight bet ROI: ${stats.straightBetRoi >= 0 ? '+' : ''}${stats.straightBetRoi}%. ${stats.straightBetRoi > stats.parlayRoi ? 'Your straight bets are holding up better. A temporary no-parlay rule would reduce relapse risk.' : 'This is worth tightening now. Parlays carry significantly higher sportsbook edge and tend to show up in reactive sessions.'}`,
    };
  }

  // 3. Late night bets
  if (stats.hasReliableClockCoverage && stats.lateNightBets >= 3) {
    return {
      headline: `${stats.lateNightBets} bets in the source-clock 11pm to 4:59am window`,
      detail: 'This is a source-clock observation only. BetAutopsy does not assume that the source clock is your local time, so it does not turn this window into a cutoff recommendation.',
    };
  }

  // 4. Hot streak
  if (stats.longestWinStreak >= 4) {
    return {
      headline: `${stats.longestWinStreak}-bet win streak`,
      detail: 'The question is not whether the streak felt good. It is whether your size and pace stayed controlled while it was happening. Winning runs are where a lot of discipline quietly slips.',
    };
  }

  // 5. Strong week
  if (stats.roi > 5 && stats.totalBets >= 5) {
    return {
      headline: `+${stats.roi}% ROI this week`,
      detail: `Strong week. ${stats.wins}-${stats.losses} with $${Math.abs(Math.round(stats.netPnL)).toLocaleString()} in profit. The real win is keeping the same rules next week instead of loosening them because results cooperated.`,
    };
  }

  // 6. Rough week
  if (stats.roi < -15 && stats.totalBets >= 5) {
    return {
      headline: 'Tough week',
      detail: `${stats.wins}-${stats.losses} for -$${Math.abs(Math.round(stats.netPnL)).toLocaleString()}. Everyone has down weeks. The key is whether your behavior stayed consistent. Did bet sizes stay flat? Did you avoid chasing? If yes, the process is working even when results don't show it yet.`,
    };
  }

  // 7. Default
  return {
    headline: `${stats.totalBets} bets, ${stats.wins}-${stats.losses} record`,
    detail: `You wagered $${Math.round(stats.totalStaked).toLocaleString()} this week for ${stats.netPnL >= 0 ? '+' : ''}$${Math.abs(Math.round(stats.netPnL)).toLocaleString()}. ${stats.mostBetSport ? `Most of your action was on ${stats.mostBetSport}.` : ''} The useful question now is which part of your process needs a firmer rule before next week starts.`,
  };
}

export interface PositiveLead {
  text: string;
}

export function generatePositiveLead(stats: DigestStats): PositiveLead {
  if (stats.straightBetRoi > 0) {
    return { text: `Your straight bets went +${stats.straightBetRoi}% this week` };
  }
  if (stats.hasReliableClockCoverage && stats.lateNightBets === 0 && stats.totalBets > 0) {
    return { text: 'No bets appeared in the source-clock 11pm to 4:59am window this week' };
  }
  if (stats.mostProfitableSport) {
    const sport = stats.mostProfitableSport;
    return { text: `Your ${sport} bets are in the green this week` };
  }
  if (stats.biggestWin && stats.biggestWin.profit > 100) {
    return { text: `Biggest hit: ${stats.biggestWin.description} for +$${stats.biggestWin.profit.toLocaleString()}` };
  }
  if (stats.longestWinStreak >= 3) {
    return { text: `${stats.longestWinStreak}-bet win streak this week` };
  }
  return { text: `${stats.totalBets} bets placed this week. Let's see how they went` };
}

// ── Weekend-specific helpers ──

export async function getWeekendBets(
  supabase: SupabaseClient,
  userId: string
): Promise<Bet[]> {
  // Previous Friday through Sunday by recorded source calendar date. A
  // partial timestamp cannot support a universal 5pm cutoff.
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ...
  // Calculate days back to last Friday
  const daysToFriday = dayOfWeek >= 5 ? dayOfWeek - 5 : dayOfWeek + 2;
  const friday = new Date(now);
  friday.setUTCDate(friday.getUTCDate() - daysToFriday);
  friday.setUTCHours(17, 0, 0, 0); // Friday 5pm UTC

  const sunday = new Date(friday);
  sunday.setUTCDate(sunday.getUTCDate() + 2);
  sunday.setUTCHours(23, 59, 59, 999); // Sunday 11:59pm UTC

  const { data } = await supabase
    .from('bets')
    .select('*')
    .eq('user_id', userId)
    .gte('recorded_date', friday.toISOString().slice(0, 10))
    .lte('recorded_date', sunday.toISOString().slice(0, 10))
    .order('recorded_date', { ascending: true })
    .order('placed_time', { ascending: true, nullsFirst: false })
    .order('placed_at', { ascending: true, nullsFirst: false });
  return (data ?? []) as Bet[];
}

export interface WeekendSession {
  day: string;       // "Friday", "Saturday", "Sunday"
  startTime: string; // "8:30 PM"
  bets: number;
  profit: number;
  isHeated: boolean;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export function detectWeekendSessions(bets: Bet[]): WeekendSession[] {
  if (bets.length === 0) return [];

  const sessions: Bet[][] = [];
  for (const sequence of comparableBetSequences(bets)) {
    let current: Bet[] = [];
    for (const bet of sequence) {
      if (current.length > 0) {
        const previous = current[current.length - 1];
        const previousTime = betSequenceTimeMs(previous);
        const thisTime = betSequenceTimeMs(bet);
        if (previousTime === null || thisTime === null || (thisTime - previousTime) / 60000 > 90) {
          sessions.push(current);
          current = [];
        }
      }
      current.push(bet);
    }
    if (current.length > 0) sessions.push(current);
  }

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return sessions.map(sessionBets => {
    const first = sessionBets[0];
    const day = days[betSourceDayOfWeek(first) ?? 0];
    const startTime = formatSourceTime(first) ?? 'Time unknown';

    const profit = sessionBets.reduce((s, b) => s + Number(b.profit), 0);
    const betsCount = sessionBets.length;

    // Heated detection: 3+ consecutive losses or stake escalation > 1.5x
    let isHeated = false;
    let consecutiveLosses = 0;
    for (const b of sessionBets) {
      if (b.result === 'loss') {
        consecutiveLosses++;
        if (consecutiveLosses >= 3) { isHeated = true; break; }
      } else {
        consecutiveLosses = 0;
      }
    }
    if (!isHeated && sessionBets.length >= 2) {
      const firstStake = Number(sessionBets[0].stake);
      const maxStake = Math.max(...sessionBets.map(b => Number(b.stake)));
      if (firstStake > 0 && maxStake / firstStake > 1.5) {
        isHeated = true;
      }
    }

    // Grade: A (profitable, not heated), B (profitable, heated), C (breakeven), D (unprofitable), F (unprofitable + heated)
    const isProfitable = profit > 0;
    const isBreakeven = Math.abs(profit) < Number(sessionBets[0].stake) * 0.1;
    let grade: WeekendSession['grade'];
    if (isProfitable && !isHeated) grade = 'A';
    else if (isProfitable && isHeated) grade = 'B';
    else if (isBreakeven) grade = 'C';
    else if (!isProfitable && !isHeated) grade = 'D';
    else grade = 'F';

    return { day, startTime, bets: betsCount, profit: Math.round(profit), isHeated, grade };
  });
}

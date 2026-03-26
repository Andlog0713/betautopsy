import type { SupabaseClient } from '@supabase/supabase-js';
import type { Bet } from '@/types';
import { formatParlayCompact } from '@/lib/format-parlay';

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
    .gte('placed_at', sinceDate)
    .order('placed_at', { ascending: true });
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
  const sorted = [...bets].sort((a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime());
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    if (prev.result === 'loss') { stakeAfterLoss += Number(sorted[i].stake); countAfterLoss++; }
    else if (prev.result === 'win') { stakeAfterWin += Number(sorted[i].stake); countAfterWin++; }
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

  // Late night bets (after ~10pm — rough UTC estimate: hours 2-8 UTC for US timezones)
  const lateNightBets = bets.filter((b) => {
    const h = new Date(b.placed_at).getUTCHours();
    return h >= 3 && h <= 9; // roughly 10pm-4am US
  }).length;

  // Streaks
  let longestWinStreak = 0, longestLoseStreak = 0, curWin = 0, curLose = 0;
  for (const b of sorted) {
    if (b.result === 'win') { curWin++; curLose = 0; longestWinStreak = Math.max(longestWinStreak, curWin); }
    else if (b.result === 'loss') { curLose++; curWin = 0; longestLoseStreak = Math.max(longestLoseStreak, curLose); }
    else { curWin = 0; curLose = 0; }
  }

  // Sportsbooks
  const books = new Set<string>();
  bets.forEach((b) => { if (b.sportsbook) books.add(b.sportsbook); });

  // Bets by day
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const betsByDay: Record<string, number> = {};
  bets.forEach((b) => {
    const day = days[new Date(b.placed_at).getDay()];
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
  };
}

export interface Insight {
  emoji: string;
  headline: string;
  detail: string;
}

export function generateInsight(stats: DigestStats): Insight {
  // 1. Loss chasing
  if (stats.avgStakeAfterLoss > stats.avgStakeAfterWin * 1.3 && stats.losses > 2) {
    const pctIncrease = Math.round(((stats.avgStakeAfterLoss - stats.avgStakeAfterWin) / stats.avgStakeAfterWin) * 100);
    return {
      emoji: '🔥',
      headline: 'Your stakes jumped after losses',
      detail: `Your average bet was $${stats.avgStakeAfterLoss.toLocaleString()} after a loss vs $${stats.avgStakeAfterWin.toLocaleString()} after a win — a ${pctIncrease}% increase. This is the most expensive pattern in sports betting. Try setting a rule: next bet after a loss must be the same size or smaller.`,
    };
  }

  // 2. Heavy parlay week
  if (stats.totalBets > 0 && stats.parlayCount / stats.totalBets > 0.35) {
    const pct = Math.round((stats.parlayCount / stats.totalBets) * 100);
    return {
      emoji: '🎰',
      headline: `${pct}% of your bets were parlays`,
      detail: `Your parlay ROI this week: ${stats.parlayRoi >= 0 ? '+' : ''}${stats.parlayRoi}%. Your straight bet ROI: ${stats.straightBetRoi >= 0 ? '+' : ''}${stats.straightBetRoi}%. ${stats.straightBetRoi > stats.parlayRoi ? 'Your straight bets are outperforming — consider shifting volume.' : 'Keep an eye on this — parlays carry significantly higher sportsbook edge.'}`,
    };
  }

  // 3. Late night bets
  if (stats.lateNightBets >= 3) {
    return {
      emoji: '🌙',
      headline: `${stats.lateNightBets} late-night bets this week`,
      detail: 'Bets placed late at night tend to be less researched and more impulsive. Consider setting a betting cutoff time — your morning-you makes better decisions than your midnight-you.',
    };
  }

  // 4. Hot streak
  if (stats.longestWinStreak >= 4) {
    return {
      emoji: '🔥',
      headline: `${stats.longestWinStreak}-bet win streak`,
      detail: 'Nice run. The real question: did your bet sizing stay flat during it, or did you start pressing? Streaks feel like skill in the moment, but keeping your process consistent is what separates long-term winners.',
    };
  }

  // 5. Strong week
  if (stats.roi > 5 && stats.totalBets >= 5) {
    return {
      emoji: '📈',
      headline: `+${stats.roi}% ROI this week`,
      detail: `Strong week — ${stats.wins}-${stats.losses} with $${Math.abs(Math.round(stats.netPnL)).toLocaleString()} in profit. Was this edge or variance? A full autopsy on your bet history would tell you which categories are genuinely profitable vs running hot.`,
    };
  }

  // 6. Rough week
  if (stats.roi < -15 && stats.totalBets >= 5) {
    return {
      emoji: '📉',
      headline: 'Tough week',
      detail: `${stats.wins}-${stats.losses} for -$${Math.abs(Math.round(stats.netPnL)).toLocaleString()}. Everyone has down weeks — the key is whether your behavior stayed consistent. Did bet sizes stay flat? Did you avoid chasing? If yes, the process is working even when results don't show it yet.`,
    };
  }

  // 7. Default
  return {
    emoji: '📊',
    headline: `${stats.totalBets} bets, ${stats.wins}-${stats.losses} record`,
    detail: `You wagered $${Math.round(stats.totalStaked).toLocaleString()} this week for ${stats.netPnL >= 0 ? '+' : ''}$${Math.abs(Math.round(stats.netPnL)).toLocaleString()}. ${stats.mostBetSport ? `Most of your action was on ${stats.mostBetSport}.` : ''} Run an autopsy to see what patterns are hiding in the data.`,
  };
}

export interface PositiveLead {
  emoji: string;
  text: string;
}

export function generatePositiveLead(stats: DigestStats): PositiveLead {
  if (stats.biggestWin && stats.biggestWin.profit > 100) {
    return { emoji: '💰', text: `Biggest hit: ${stats.biggestWin.description} for +$${stats.biggestWin.profit.toLocaleString()}` };
  }
  if (stats.mostProfitableSport) {
    const sport = stats.mostProfitableSport;
    return { emoji: '🎯', text: `Your ${sport} bets are in the green this week` };
  }
  if (stats.straightBetRoi > 0) {
    return { emoji: '📈', text: `Your straight bets went +${stats.straightBetRoi}% this week` };
  }
  if (stats.longestWinStreak >= 3) {
    return { emoji: '🔥', text: `${stats.longestWinStreak}-bet win streak this week` };
  }
  return { emoji: '📊', text: `${stats.totalBets} bets placed this week — let's see how they went` };
}

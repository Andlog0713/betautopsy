import type { Bet } from '@/types';

export interface RoastStat {
  emoji: string;
  text: string;
}

export function generateRoastStats(bets?: Bet[]): RoastStat[] {
  if (!bets || bets.length < 10) return [];

  const settled = bets.filter((b) => b.result === 'win' || b.result === 'loss');
  const roasts: RoastStat[] = [];

  // 1. Most-bet losing team/description pattern
  const descCounts = new Map<string, { wins: number; losses: number; total: number }>();
  settled.forEach((b) => {
    let key = b.description.split(' | ')[0].trim();
    if (key.length > 30) key = key.slice(0, 28);
    const c = descCounts.get(key) ?? { wins: 0, losses: 0, total: 0 };
    c.total++;
    if (b.result === 'win') c.wins++;
    else c.losses++;
    descCounts.set(key, c);
  });
  let worstTeamName = '';
  let worstTeamW = 0, worstTeamL = 0, worstTeamTotal = 0;
  descCounts.forEach((v, k) => {
    const winRate = v.total > 0 ? v.wins / v.total : 0;
    if (v.total >= 5 && winRate < 0.4 && v.total > worstTeamTotal) {
      worstTeamName = k;
      worstTeamW = v.wins;
      worstTeamL = v.losses;
      worstTeamTotal = v.total;
    }
  });
  if (worstTeamTotal > 0) {
    roasts.push({
      emoji: '💀',
      text: `Bet on ${worstTeamName} ${worstTeamTotal} times. They went ${worstTeamW}-${worstTeamL}.`,
    });
  }

  // 2. Late night record
  const lateNight = settled.filter((b) => {
    const h = new Date(b.placed_at).getUTCHours();
    return h >= 3 && h <= 9;
  });
  if (lateNight.length >= 5) {
    const lnWins = lateNight.filter((b) => b.result === 'win').length;
    const lnLosses = lateNight.length - lnWins;
    roasts.push({
      emoji: '🌙',
      text: `After-midnight bets: ${lnWins}-${lnLosses}. ${lnWins < lnLosses ? 'Maybe sleep on it.' : 'Night owl with an edge.'}`,
    });
  }

  // 3. Parlay win rate (no dollar amounts)
  const parlays = bets.filter((b) => b.bet_type === 'parlay' || (b.parlay_legs && b.parlay_legs > 1));
  if (parlays.length >= 10) {
    const parlayWins = parlays.filter((b) => b.result === 'win').length;
    const parlayWinRate = Math.round((parlayWins / parlays.length) * 100);
    if (parlayWinRate < 20) {
      roasts.push({
        emoji: '🎰',
        text: `${parlays.length} parlays placed. ${parlayWins} hit. That's a ${parlayWinRate}% hit rate.`,
      });
    } else {
      roasts.push({
        emoji: '🎰',
        text: `${parlayWins} of ${parlays.length} parlays hit (${parlayWinRate}%). ${parlayWinRate > 30 ? 'Actually impressive.' : 'About average.'}`,
      });
    }
  }

  // 4. Biggest single-day loss count (no dollar amounts)
  const dayPnL = new Map<string, { losses: number; count: number }>();
  settled.forEach((b) => {
    const day = b.placed_at.split('T')[0];
    const d = dayPnL.get(day) ?? { losses: 0, count: 0 };
    d.count++;
    if (b.result === 'loss') d.losses++;
    dayPnL.set(day, d);
  });
  let worstDayDate = '', worstDayLosses = 0, worstDayCount = 0;
  dayPnL.forEach((v, k) => {
    if (v.losses >= 5 && v.losses > worstDayLosses) {
      worstDayDate = k;
      worstDayLosses = v.losses;
      worstDayCount = v.count;
    }
  });
  if (worstDayLosses >= 5) {
    const dateStr = new Date(worstDayDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    roasts.push({
      emoji: '📉',
      text: `${dateStr}: ${worstDayLosses} losses in ${worstDayCount} bets. Rough day.`,
    });
  }

  // 5. Longest losing streak
  let maxLoseStreak = 0, curLose = 0;
  const sorted = [...settled].sort((a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime());
  for (const b of sorted) {
    if (b.result === 'loss') {
      curLose++;
      if (curLose > maxLoseStreak) maxLoseStreak = curLose;
    } else {
      curLose = 0;
    }
  }
  if (maxLoseStreak >= 5) {
    roasts.push({
      emoji: '💀',
      text: `${maxLoseStreak}-bet losing streak. The comeback started on bet ${maxLoseStreak + 1}.`,
    });
  }

  // Return top 3 most interesting
  return roasts.slice(0, 3);
}

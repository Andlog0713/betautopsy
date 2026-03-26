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
    // Extract a short key — first ~25 chars or before " | " for parlays
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
      text: `You bet on ${worstTeamName} ${worstTeamTotal} times. They went ${worstTeamW}-${worstTeamL}. Loyalty isn't a betting strategy.`,
    });
  }

  // 2. Late night record (approximate: UTC hours 3-9 ≈ US 10pm-4am)
  const lateNight = settled.filter((b) => {
    const h = new Date(b.placed_at).getUTCHours();
    return h >= 3 && h <= 9;
  });
  if (lateNight.length >= 5) {
    const lnWins = lateNight.filter((b) => b.result === 'win').length;
    const lnLosses = lateNight.length - lnWins;
    roasts.push({
      emoji: '🌙',
      text: `Your after-midnight bets: ${lnWins}-${lnLosses}. ${lnWins < lnLosses ? 'Maybe sleep on it?' : 'Night owl with an edge.'}`,
    });
  }

  // 3. Parlay spending vs winnings
  const parlays = bets.filter((b) => b.bet_type === 'parlay' || (b.parlay_legs && b.parlay_legs > 1));
  if (parlays.length >= 10) {
    const parlayStaked = Math.round(parlays.reduce((s, b) => s + Number(b.stake), 0));
    const parlayPayout = Math.round(parlays.reduce((s, b) => s + Number(b.payout), 0));
    if (parlayPayout < parlayStaked) {
      const donationRate = Math.round((1 - parlayPayout / parlayStaked) * 100);
      roasts.push({
        emoji: '🎰',
        text: `Parlay spending: $${parlayStaked.toLocaleString()}. Parlay winnings: $${parlayPayout.toLocaleString()}. That's a ${donationRate}% donation rate.`,
      });
    } else {
      roasts.push({
        emoji: '🎰',
        text: `Parlay spending: $${parlayStaked.toLocaleString()}. Parlay winnings: $${parlayPayout.toLocaleString()}. You're actually beating parlays? Respect.`,
      });
    }
  }

  // 4. Biggest single-day loss
  const dayPnL = new Map<string, { pnl: number; count: number }>();
  settled.forEach((b) => {
    const day = b.placed_at.split('T')[0];
    const d = dayPnL.get(day) ?? { pnl: 0, count: 0 };
    d.pnl += Number(b.profit);
    d.count++;
    dayPnL.set(day, d);
  });
  let worstDayDate = '', worstDayPnl = 0, worstDayCount = 0;
  dayPnL.forEach((v, k) => {
    if (v.pnl < -200 && v.pnl < worstDayPnl) {
      worstDayDate = k;
      worstDayPnl = v.pnl;
      worstDayCount = v.count;
    }
  });
  if (worstDayPnl < -200) {
    const dateStr = new Date(worstDayDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    roasts.push({
      emoji: '📉',
      text: `${dateStr}: Down $${Math.abs(Math.round(worstDayPnl)).toLocaleString()} in ${worstDayCount} bets. We've all been there.`,
    });
  }

  // 5. Longest losing streak
  let maxLoseStreak = 0, curLose = 0, streakStart = '';
  const sorted = [...settled].sort((a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime());
  for (const b of sorted) {
    if (b.result === 'loss') {
      if (curLose === 0) streakStart = b.placed_at.split('T')[0];
      curLose++;
      if (curLose > maxLoseStreak) maxLoseStreak = curLose;
    } else {
      curLose = 0;
    }
  }
  if (maxLoseStreak >= 5) {
    const startStr = new Date(streakStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    roasts.push({
      emoji: '💀',
      text: `${maxLoseStreak}-bet losing streak starting ${startStr}. The comeback started on bet ${maxLoseStreak + 1}.`,
    });
  }

  // Return top 3 most interesting
  return roasts.slice(0, 3);
}

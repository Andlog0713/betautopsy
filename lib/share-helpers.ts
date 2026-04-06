import type { Bet } from '@/types';

export interface RoastStat {
  emoji: string;
  text: string;
}

export interface BehavioralInsight {
  contextLabel: string;   // "AFTER A LOSS"
  heroStat: string;       // "4.2x"
  heroLabel: string;      // "more likely to bet within the hour"
  verdict: string;        // "That's a textbook revenge bettor..."
}

export interface PatternComparison {
  topLabel: string;       // "Your win rate before 9pm"
  topValue: string;       // "58%"
  bottomLabel: string;    // "Your win rate after 11pm"
  bottomValue: string;    // "34%"
  punchline: string;      // "Your phone should lock you out after midnight."
}

// ── Archetype roast lines ──

const ARCHETYPE_ROASTS: Record<string, string> = {
  'Heated Bettor': "You don't lose bets. You lose arguments with yourself about whether to stop.",
  'Parlay Dreamer': "You don't want to win. You want to win big. There's a difference.",
  'The Natural': "You actually know what you're doing. That makes one of us.",
  'Chalk Grinder': "You play it safe. Your bankroll thanks you. Your adrenaline doesn't.",
  'Sharp Sleeper': "You have edge and you don't even know it yet.",
  'Volume Warrior': "You don't have a strategy. You have a quota.",
  'Sniper': "Few bets. High conviction. You treat this like a job.",
  'Degen King': "You're not here to make money. You're here to feel alive.",
  'The Grinder': "Consistent, methodical, boring in the best way.",
  'Multiplier Chaser': "You see a 10-legger and think 'why not.' That's why not.",
  'All-or-Nothing Player': "Go big or go home, and you go big a lot.",
  'Loyalty Bettor': "Your favorite team loves your support. Your bankroll doesn't.",
};

export function getArchetypeRoast(name: string): string {
  return ARCHETYPE_ROASTS[name] ?? "Your betting history tells a story. This is it.";
}

// ── Behavioral insight derivation ──

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function deriveBehavioralInsight(bets?: Bet[], emotionScore?: number): BehavioralInsight {
  const fallback: BehavioralInsight = {
    contextLabel: 'EMOTION SCORE',
    heroStat: `${emotionScore ?? 50}`,
    heroLabel: emotionScore !== undefined && emotionScore <= 30 ? 'Cool under pressure' : emotionScore !== undefined && emotionScore >= 70 ? 'Emotions run the show' : 'Room to improve',
    verdict: 'Your emotion score measures how much tilt, chasing, and impulsive sizing affect your decisions. Lower is better.',
  };

  if (!bets || bets.length < 20) return fallback;

  const settled = [...bets]
    .filter((b) => b.result === 'win' || b.result === 'loss')
    .sort((a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime());

  if (settled.length < 20) return fallback;

  // 1. Post-loss acceleration: how much faster do they bet after a loss?
  const afterLossGaps: number[] = [];
  const afterWinGaps: number[] = [];

  for (let i = 1; i < settled.length; i++) {
    const gapMin = (new Date(settled[i].placed_at).getTime() - new Date(settled[i - 1].placed_at).getTime()) / 60000;
    if (gapMin > 360) continue; // skip overnight / next-day gaps
    if (settled[i - 1].result === 'loss') afterLossGaps.push(gapMin);
    else afterWinGaps.push(gapMin);
  }

  if (afterLossGaps.length >= 10 && afterWinGaps.length >= 10) {
    const medAfterLoss = median(afterLossGaps);
    const medAfterWin = median(afterWinGaps);
    if (medAfterLoss > 0 && medAfterWin / medAfterLoss >= 1.5) {
      const ratio = Math.round((medAfterWin / medAfterLoss) * 10) / 10;
      return {
        contextLabel: 'AFTER A LOSS',
        heroStat: `${ratio}x`,
        heroLabel: 'faster to place another bet',
        verdict: ratio >= 3
          ? "That's textbook revenge betting. Your worst decisions come right after your worst results."
          : "You speed up after losses. Most bettors do. The ones who win learn to slow down.",
      };
    }
  }

  // 2. Session stake escalation
  const sessions: Bet[][] = [];
  let currentSession: Bet[] = [settled[0]];
  for (let i = 1; i < settled.length; i++) {
    const gapMin = (new Date(settled[i].placed_at).getTime() - new Date(settled[i - 1].placed_at).getTime()) / 60000;
    if (gapMin <= 90) {
      currentSession.push(settled[i]);
    } else {
      sessions.push(currentSession);
      currentSession = [settled[i]];
    }
  }
  sessions.push(currentSession);

  const escalations = sessions
    .filter((s) => s.length >= 3)
    .map((s) => Number(s[s.length - 1].stake) / Number(s[0].stake))
    .filter((e) => isFinite(e) && e > 0);

  if (escalations.length >= 3) {
    const avgEsc = escalations.reduce((a, b) => a + b, 0) / escalations.length;
    if (avgEsc >= 1.3) {
      const rounded = Math.round(avgEsc * 10) / 10;
      return {
        contextLabel: 'BY END OF SESSION',
        heroStat: `${rounded}x`,
        heroLabel: 'larger stakes than when you started',
        verdict: rounded >= 2
          ? "You escalate hard within sessions. Winning makes you confident. Losing makes you chase. Both cost you."
          : "Your stakes creep up during sessions. Setting a flat unit size would change your results.",
      };
    }
  }

  // 3. Fallback to emotion score
  return fallback;
}

// ── Pattern comparison derivation ──

export function derivePatternComparison(bets?: Bet[]): PatternComparison {
  if (!bets || bets.length === 0) {
    return {
      topLabel: 'Your win rate',
      topValue: '—',
      bottomLabel: 'Average sports bettor',
      bottomValue: '48%',
      punchline: 'Upload your bets to see your patterns.',
    };
  }

  const settled = bets.filter((b) => b.result === 'win' || b.result === 'loss');
  const overallWR = settled.length > 0 ? Math.round((settled.filter((b) => b.result === 'win').length / settled.length) * 100) : 0;

  // Not enough data for split comparisons — show overall win rate vs average
  if (settled.length < 20) {
    return {
      topLabel: 'Your win rate',
      topValue: `${overallWR}%`,
      bottomLabel: 'Average sports bettor',
      bottomValue: '48%',
      punchline: overallWR > 48 ? "You're beating the average. Most don't." : "The house always has edge. Knowing yours is step one.",
    };
  }

  interface Candidate {
    topLabel: string;
    topValue: string;
    topWR: number;
    bottomLabel: string;
    bottomValue: string;
    bottomWR: number;
    diff: number;
    punchline: string;
  }

  const candidates: Candidate[] = [];

  // 1. Timing: Before 9pm vs After 11pm
  const before9pm = settled.filter((b) => {
    const h = new Date(b.placed_at).getUTCHours();
    // Approximate: UTC 0-2 and 13-23 ≈ US evening/daytime
    return h >= 13 || h <= 2; // roughly before 9pm US
  });
  const after11pm = settled.filter((b) => {
    const h = new Date(b.placed_at).getUTCHours();
    return h >= 3 && h <= 9; // roughly 10pm-4am US
  });

  if (before9pm.length >= 10 && after11pm.length >= 10) {
    const wr1 = Math.round((before9pm.filter((b) => b.result === 'win').length / before9pm.length) * 100);
    const wr2 = Math.round((after11pm.filter((b) => b.result === 'win').length / after11pm.length) * 100);
    const better = wr1 >= wr2;
    candidates.push({
      topLabel: 'Your win rate before 9pm',
      topValue: `${wr1}%`,
      topWR: wr1,
      bottomLabel: 'Your win rate after 11pm',
      bottomValue: `${wr2}%`,
      bottomWR: wr2,
      diff: Math.abs(wr1 - wr2),
      punchline: better
        ? (wr1 - wr2 >= 15 ? "You stop researching and start guessing. Your phone should lock you out after midnight." : "You're sharper earlier in the day.")
        : "Night owl with an edge. Most bettors can't say that.",
    });
  }

  // 2. Parlays vs straight bets
  const parlays = settled.filter((b) => b.bet_type === 'parlay' || (b.parlay_legs && b.parlay_legs > 1));
  const straights = settled.filter((b) => b.bet_type !== 'parlay' && (!b.parlay_legs || b.parlay_legs <= 1));

  if (parlays.length >= 10 && straights.length >= 10) {
    const wrP = Math.round((parlays.filter((b) => b.result === 'win').length / parlays.length) * 100);
    const wrS = Math.round((straights.filter((b) => b.result === 'win').length / straights.length) * 100);
    candidates.push({
      topLabel: 'Straight bet win rate',
      topValue: `${wrS}%`,
      topWR: wrS,
      bottomLabel: 'Parlay win rate',
      bottomValue: `${wrP}%`,
      bottomWR: wrP,
      diff: Math.abs(wrS - wrP),
      punchline: wrS > wrP
        ? "Your straight bets carry you. Your parlays drain you."
        : "You're actually winning more parlays than straights. That's rare.",
    });
  }

  // 3. Top two sports
  const sportMap = new Map<string, { wins: number; total: number }>();
  settled.forEach((b) => {
    const s = sportMap.get(b.sport) ?? { wins: 0, total: 0 };
    s.total++;
    if (b.result === 'win') s.wins++;
    sportMap.set(b.sport, s);
  });
  const sports = Array.from(sportMap.entries())
    .filter(([, v]) => v.total >= 10)
    .sort((a, b) => b[1].total - a[1].total);

  if (sports.length >= 2) {
    const [s1Name, s1Data] = sports[0];
    const [s2Name, s2Data] = sports[1];
    const wr1 = Math.round((s1Data.wins / s1Data.total) * 100);
    const wr2 = Math.round((s2Data.wins / s2Data.total) * 100);
    candidates.push({
      topLabel: `${s1Name.toUpperCase()} win rate`,
      topValue: `${wr1}%`,
      topWR: wr1,
      bottomLabel: `${s2Name.toUpperCase()} win rate`,
      bottomValue: `${wr2}%`,
      bottomWR: wr2,
      diff: Math.abs(wr1 - wr2),
      punchline: wr1 > wr2
        ? `You know ${s1Name}. You're guessing on ${s2Name}.`
        : `${s2Name} is your game. ${s1Name} is costing you.`,
    });
  }

  if (candidates.length === 0) {
    const overallWR = Math.round((settled.filter((b) => b.result === 'win').length / settled.length) * 100);
    return {
      topLabel: 'Your win rate',
      topValue: `${overallWR}%`,
      bottomLabel: 'Average sports bettor',
      bottomValue: '48%',
      punchline: overallWR > 48 ? "You're beating the average. Most don't." : "The house always has edge. Knowing yours is step one.",
    };
  }

  // Pick the comparison with the largest difference
  candidates.sort((a, b) => b.diff - a.diff);
  const winner = candidates[0];

  // If top value is worse, swap so the better number is always on top
  if (winner.topWR < winner.bottomWR) {
    return {
      topLabel: winner.bottomLabel,
      topValue: winner.bottomValue,
      bottomLabel: winner.topLabel,
      bottomValue: winner.topValue,
      punchline: winner.punchline,
    };
  }

  return {
    topLabel: winner.topLabel,
    topValue: winner.topValue,
    bottomLabel: winner.bottomLabel,
    bottomValue: winner.bottomValue,
    punchline: winner.punchline,
  };
}

// ── Roast stats (existing, for tweet text) ──

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

  // 3. Parlay win rate
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

  // 4. Biggest single-day loss count
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

  return roasts.slice(0, 3);
}

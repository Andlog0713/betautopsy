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
  const fallback: PatternComparison = {
    topLabel: 'Bets when you wait 2+ hours',
    topValue: '—',
    bottomLabel: 'Bets within 30 min of a loss',
    bottomValue: '—',
    punchline: 'Upload more bets to see your behavioral patterns.',
  };

  if (!bets || bets.length === 0) return fallback;

  const settled = [...bets]
    .filter((b) => b.result === 'win' || b.result === 'loss')
    .sort((a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime());

  if (settled.length < 15) return fallback;

  // ── Priority 1: Post-loss reaction record ──
  // Bets placed within 30 min of a loss vs bets placed 2+ hours after previous bet
  const quickAfterLoss: Bet[] = [];
  const patientBets: Bet[] = [];

  for (let i = 1; i < settled.length; i++) {
    const gapMin = (new Date(settled[i].placed_at).getTime() - new Date(settled[i - 1].placed_at).getTime()) / 60000;
    if (gapMin > 480) continue; // skip next-day gaps

    if (settled[i - 1].result === 'loss' && gapMin <= 30) {
      quickAfterLoss.push(settled[i]);
    } else if (gapMin >= 120) {
      patientBets.push(settled[i]);
    }
  }

  if (quickAfterLoss.length >= 5 && patientBets.length >= 5) {
    const quickWins = quickAfterLoss.filter((b) => b.result === 'win').length;
    const quickLosses = quickAfterLoss.length - quickWins;
    const patientWins = patientBets.filter((b) => b.result === 'win').length;
    const patientLosses = patientBets.length - patientWins;

    const quickRecord = `${quickWins}-${quickLosses}`;
    const patientRecord = `${patientWins}-${patientLosses}`;
    const quickWR = Math.round((quickWins / quickAfterLoss.length) * 100);
    const patientWR = Math.round((patientWins / patientBets.length) * 100);

    if (Math.abs(quickWR - patientWR) >= 5) {
      return {
        topLabel: 'When you wait 2+ hours',
        topValue: patientRecord,
        bottomLabel: 'Within 30 min of a loss',
        bottomValue: quickRecord,
        punchline: patientWR > quickWR
          ? 'Patience is literally your edge.'
          : "You bet angry and somehow win. That won't last.",
      };
    }
  }

  // ── Priority 2: Session length behavior ──
  // Short sessions (1-3 bets) vs long sessions (6+ bets)
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

  const shortSessions = sessions.filter((s) => s.length >= 1 && s.length <= 3);
  const longSessions = sessions.filter((s) => s.length >= 6);

  if (shortSessions.length >= 3 && longSessions.length >= 3) {
    const shortBets = shortSessions.flat();
    const longBets = longSessions.flat();
    const shortWins = shortBets.filter((b) => b.result === 'win').length;
    const shortLosses = shortBets.length - shortWins;
    const longWins = longBets.filter((b) => b.result === 'win').length;
    const longLosses = longBets.length - longWins;
    const shortWR = Math.round((shortWins / shortBets.length) * 100);
    const longWR = Math.round((longWins / longBets.length) * 100);

    if (Math.abs(shortWR - longWR) >= 8) {
      return {
        topLabel: 'Short sessions (1-3 bets)',
        topValue: `${shortWins}-${shortLosses}`,
        bottomLabel: 'Long sessions (6+ bets)',
        bottomValue: `${longWins}-${longLosses}`,
        punchline: shortWR > longWR
          ? "You're sharp when you're selective. You bleed when you grind."
          : "You need reps to find your rhythm. Your instincts improve mid-session.",
      };
    }
  }

  // ── Priority 3: Late night behavior ──
  const lateNight = settled.filter((b) => {
    const h = new Date(b.placed_at).getUTCHours();
    return h >= 3 && h <= 9;
  });
  const daytime = settled.filter((b) => {
    const h = new Date(b.placed_at).getUTCHours();
    return h >= 13 || h <= 2;
  });

  if (lateNight.length >= 8 && daytime.length >= 8) {
    const lnWins = lateNight.filter((b) => b.result === 'win').length;
    const lnLosses = lateNight.length - lnWins;
    const dayWins = daytime.filter((b) => b.result === 'win').length;
    const dayLosses = daytime.length - dayWins;
    const lnWR = Math.round((lnWins / lateNight.length) * 100);
    const dayWR = Math.round((dayWins / daytime.length) * 100);

    if (Math.abs(lnWR - dayWR) >= 8) {
      return {
        topLabel: 'Daytime bets',
        topValue: `${dayWins}-${dayLosses}`,
        bottomLabel: 'After midnight bets',
        bottomValue: `${lnWins}-${lnLosses}`,
        punchline: dayWR > lnWR
          ? "Your worst decisions happen when everyone else is asleep."
          : "Night owl with an edge. You bet better when the world's quiet.",
      };
    }
  }

  // ── Fallback: overall record vs context ──
  const wins = settled.filter((b) => b.result === 'win').length;
  const losses = settled.length - wins;
  return {
    topLabel: 'Your record',
    topValue: `${wins}-${losses}`,
    bottomLabel: 'Across all bets',
    bottomValue: `${settled.length} bets analyzed`,
    punchline: wins > losses ? "Winning more than losing. The question is how much you're leaving on the table." : "Knowing your patterns is the first step to changing them.",
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

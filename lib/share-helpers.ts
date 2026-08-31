import type { Bet } from '@/types';
import {
  betRecordedDate,
  betSequenceTimeMs,
  betSourceHour,
  comparableBetSequences,
} from '@/lib/temporal-provenance';

export interface RoastStat {
  text: string;
}

export interface BehavioralInsight {
  contextLabel: string;
  heroStat: string;       // "4.2x"
  heroLabel: string;
  verdict: string;
}

// ── Archetype roast lines ──

const ARCHETYPE_ROASTS: Record<string, string> = {
  // V3 taxonomy (autopsy engine path B — current)
  'The Sharp': "You actually know what you're doing. That makes one of us.",
  'The Tilter': "You don't lose bets. You lose arguments with yourself about whether to stop.",
  'The Grinder': "Consistent, methodical, boring in the best way.",
  'The Lottery Bettor': "You don't want to win. You want to win big. There's a difference.",
  'The Methodical': "Selective and patient. Now go find the edge to apply it to.",
  'The Action Junkie': "You don't have a strategy. You have a quota.",
  'The Chaser': "You're not here to make money. You're here to feel alive.",
  // Legacy autopsy engine names (kept for back-compat on already-rendered share cards)
  'Heated Bettor': "You don't lose bets. You lose arguments with yourself about whether to stop.",
  'Parlay Dreamer': "You don't want to win. You want to win big. There's a difference.",
  'The Natural': "You actually know what you're doing. That makes one of us.",
  'Chalk Grinder': "You play it safe. Your bankroll thanks you. Your adrenaline doesn't.",
  'Sharp Sleeper': "You have edge and you don't even know it yet.",
  'Volume Warrior': "You don't have a strategy. You have a quota.",
  'Sniper': "Few bets. High conviction. You treat this like a job.",
  'Degen King': "You're not here to make money. You're here to feel alive.",
  'Multiplier Chaser': "You see a 10-legger and think 'why not.' That's why not.",
  'All-or-Nothing Player': "Go big or go home, and you go big a lot.",
  'Loyalty Bettor': "Your favorite team loves your support. Your bankroll doesn't.",
  // Quiz-result archetypes (lib/archetypes.ts — path A, untouched in this phase)
  'The Surgeon': "Profitable and disciplined. The sportsbook's least favorite customer.",
  'The Heat Chaser': "Emotions placing the bets. Wallet paying the price.",
  'The Parlay Dreamer': "Still chasing that one big hit. Math said no.",
  'The Gut Bettor': "No system. No edge. Just vibes.",
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
    verdict: 'Your emotion score measures how much heat, chasing, and impulsive sizing affect your decisions. Lower is better.',
  };

  if (!bets || bets.length < 20) return fallback;

  const settled = bets.filter((b) => b.result === 'win' || b.result === 'loss');
  const sequences = comparableBetSequences(settled);

  if (settled.length < 20) return fallback;

  // 1. Losing-result sequence acceleration: compare gaps by the prior row's final result.
  const afterLossGaps: number[] = [];
  const afterWinGaps: number[] = [];

  for (const sequence of sequences) {
    for (let i = 1; i < sequence.length; i++) {
      const currentTime = betSequenceTimeMs(sequence[i]);
      const priorTime = betSequenceTimeMs(sequence[i - 1]);
      if (currentTime === null || priorTime === null) continue;
      const gapMin = (currentTime - priorTime) / 60000;
      if (gapMin > 360) continue;
      if (sequence[i - 1].result === 'loss') afterLossGaps.push(gapMin);
      else afterWinGaps.push(gapMin);
    }
  }

  if (afterLossGaps.length >= 10 && afterWinGaps.length >= 10) {
    const medAfterLoss = median(afterLossGaps);
    const medAfterWin = median(afterWinGaps);
    if (medAfterLoss > 0 && medAfterWin / medAfterLoss >= 1.5) {
      const ratio = Math.round((medAfterWin / medAfterLoss) * 10) / 10;
      return {
        contextLabel: 'AFTER A BET LATER SETTLED AS A LOSS',
        heroStat: `${ratio}x`,
        heroLabel: 'shorter gap to the next recorded bet',
        verdict: 'The sequence speeds up around losing bets. Settlement times are unavailable, so this does not prove the loss triggered the next bet.',
      };
    }
  }

  // 2. Session stake escalation
  const sessions: Bet[][] = [];
  for (const sequence of sequences) {
    let currentSession: Bet[] = [];
    for (const bet of sequence) {
      if (currentSession.length > 0) {
        const previousTime = betSequenceTimeMs(currentSession[currentSession.length - 1]);
        const currentTime = betSequenceTimeMs(bet);
        if (previousTime === null || currentTime === null || (currentTime - previousTime) / 60000 > 90) {
          sessions.push(currentSession);
          currentSession = [];
        }
      }
      currentSession.push(bet);
    }
    if (currentSession.length > 0) sessions.push(currentSession);
  }

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
          ? 'Stakes rose sharply within these sessions. Settlement times are unavailable, so the sequence does not show what caused the increase.'
          : 'Stakes rose within these sessions. Settlement times are unavailable, so the sequence does not show what caused the increase.',
      };
    }
  }

  // 3. Fallback to emotion score
  return fallback;
}
// ── Roast stats ──

export function generateRoastStats(bets?: Bet[]): RoastStat[] {
  if (!bets || bets.length < 10) return [];

  const settled = bets.filter((b) => b.result === 'win' || b.result === 'loss');
  const sequences = comparableBetSequences(settled);
  const roasts: RoastStat[] = [];

  // 1. Most-bet losing team/description pattern.
  // Skip parlays — their descriptions are multi-team aggregates like
  // "3-leg parlay various teams" and don't represent a team-loyalty pattern.
  // Feeding them into this aggregation produces nonsense roasts like
  // "Bet on 3-leg parlays various 26 times." Parlay patterns get their own
  // dedicated roast further down (section 3).
  const descCounts = new Map<string, { wins: number; losses: number; total: number }>();
  settled.forEach((b) => {
    if (b.bet_type === 'parlay' || (b.parlay_legs && b.parlay_legs > 1)) return;
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
      text: `Bet on ${worstTeamName} ${worstTeamTotal} times. They went ${worstTeamW}-${worstTeamL}.`,
    });
  }

  // 2. Late night record
  const timeBearingCount = settled.filter((bet) => betSourceHour(bet) !== null).length;
  const hasReliableClockCoverage = timeBearingCount >= 5
    && timeBearingCount / Math.max(1, settled.length) >= 0.95;
  const sourceClockWindow = settled.filter((b) => {
    const hour = betSourceHour(b);
    return hour !== null && (hour >= 23 || hour <= 4);
  });
  if (hasReliableClockCoverage && sourceClockWindow.length >= 5) {
    const lnWins = sourceClockWindow.filter((b) => b.result === 'win').length;
    const lnLosses = sourceClockWindow.length - lnWins;
    roasts.push({
      text: `Source-clock 11pm to 4:59am record: ${lnWins}-${lnLosses}. This clock is not assumed to be local time.`,
    });
  }

  // 3. Parlay win rate
  const parlays = bets.filter((b) => b.bet_type === 'parlay' || (b.parlay_legs && b.parlay_legs > 1));
  if (parlays.length >= 10) {
    const parlayWins = parlays.filter((b) => b.result === 'win').length;
    const parlayWinRate = Math.round((parlayWins / parlays.length) * 100);
    if (parlayWinRate < 20) {
      roasts.push({
        text: `${parlays.length} parlays placed. ${parlayWins} hit. That's a ${parlayWinRate}% hit rate.`,
      });
    } else {
      roasts.push({
        text: `${parlayWins} of ${parlays.length} parlays hit (${parlayWinRate}%). ${parlayWinRate > 30 ? 'Actually impressive.' : 'About average.'}`,
      });
    }
  }

  // 4. Biggest single-day loss count
  const dayPnL = new Map<string, { losses: number; count: number }>();
  settled.forEach((b) => {
    const day = betRecordedDate(b);
    if (!day) return;
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
      text: `${dateStr}: ${worstDayLosses} losses in ${worstDayCount} bets. Rough day.`,
    });
  }

  // 5. Longest losing streak
  let maxLoseStreak = 0;
  for (const sequence of sequences) {
    let curLose = 0;
    for (const b of sequence) {
      if (b.result === 'loss') {
        curLose++;
        if (curLose > maxLoseStreak) maxLoseStreak = curLose;
      } else {
        curLose = 0;
      }
    }
  }
  if (maxLoseStreak >= 5) {
    roasts.push({
      text: `${maxLoseStreak}-bet losing streak in the comparable source order.`,
    });
  }

  // Defensive filter: drop any roast whose text contains template-interpolation
  // bleed-through words. Belt-and-suspenders after the parlay-skip fix above —
  // protects against future template bugs even if new aggregation logic is
  // added later that reintroduces a bad key.
  const BAD_ROAST_PATTERN = /\b(various|multiple|undefined|null|n\/a)\b/i;
  const clean = roasts.filter((r) => !BAD_ROAST_PATTERN.test(r.text));

  // If everything got filtered, surface a generic fallback so the Receipts
  // slide is never empty.
  if (clean.length === 0 && settled.length > 0) {
    clean.push({
      text: `${settled.length} bets placed. The receipts tell their own story.`,
    });
  }

  return clean.slice(0, 3);
}

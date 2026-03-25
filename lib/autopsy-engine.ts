import Anthropic from '@anthropic-ai/sdk';
import type { Bet, AutopsyAnalysis, TimingAnalysis, TimingBucket, OddsAnalysis, OddsBucket } from '@/types';

// ── Deterministic Metrics Calculator ──

export interface CalculatedMetrics {
  summary: {
    total_bets: number;
    wins: number;
    losses: number;
    pushes: number;
    record: string;
    total_staked: number;
    total_profit: number;
    roi_percent: number;
    avg_stake: number;
    median_stake: number;
    max_stake: number;
    min_stake: number;
    win_rate: number;
    date_range: string;
    overall_grade: string;
  };
  emotion_score: number;
  emotion_breakdown: {
    stake_volatility: number;
    loss_chasing: number;
    streak_behavior: number;
    session_discipline: number;
  };
  bankroll_health: 'healthy' | 'caution' | 'danger';
  parlay_stats: {
    parlay_count: number;
    parlay_percent: number;
    parlay_roi: number;
    straight_roi: number;
  };
  loss_chase_ratio: number;
  stake_cv: number;
  category_roi: { category: string; roi: number; count: number; profit: number; staked: number }[];
  biases_detected: { bias_name: string; severity: string; data: string }[];
  bankroll_used: number | null;
  what_ifs: {
    flat_stake: { median_stake: number; hypothetical_profit: number };
    no_long_parlays: { removed_count: number; hypothetical_profit: number };
    profitable_only: { categories: string[]; hypothetical_profit: number };
    actual_profit: number;
  };
  betting_archetype: { name: string; description: string };
  timing: TimingAnalysis;
  odds: OddsAnalysis;
}

// ── Odds Intelligence ──

const ODDS_BUCKETS: { label: string; range: string; min: number; max: number }[] = [
  { label: 'Heavy Chalk', range: '-300 or worse', min: -Infinity, max: -299 },
  { label: 'Moderate Favorite', range: '-200 to -299', min: -299, max: -199 },
  { label: 'Slight Favorite', range: '-110 to -199', min: -199, max: -109 },
  { label: 'Pick\'em', range: '-109 to +109', min: -109, max: 109 },
  { label: 'Slight Dog', range: '+110 to +175', min: 110, max: 175 },
  { label: 'Moderate Dog', range: '+176 to +300', min: 176, max: 300 },
  { label: 'Longshot', range: '+301 or longer', min: 301, max: Infinity },
];

function oddsToImpliedProb(americanOdds: number): number {
  if (americanOdds >= 0) return 100 / (americanOdds + 100);
  return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
}

function getBucketIndex(odds: number): number {
  // American odds: negatives are favorites, positives are dogs
  // Sort into buckets by the raw odds value
  for (let i = 0; i < ODDS_BUCKETS.length; i++) {
    const b = ODDS_BUCKETS[i];
    if (i === 0 && odds <= b.max) return i;                          // Heavy chalk: <= -300
    if (i === ODDS_BUCKETS.length - 1 && odds >= b.min) return i;    // Longshot: >= +301
    if (odds >= b.min && odds <= b.max) return i;
  }
  return 3; // default to pick'em
}

function calculateOdds(bets: Bet[]): OddsAnalysis {
  const settled = bets.filter((b) => b.result === 'win' || b.result === 'loss');

  // Initialize bucket accumulators
  const accum: { bets: number; wins: number; losses: number; staked: number; profit: number; impliedProbSum: number }[] =
    ODDS_BUCKETS.map(() => ({ bets: 0, wins: 0, losses: 0, staked: 0, profit: 0, impliedProbSum: 0 }));

  let totalExpectedWins = 0;
  let totalActualWins = 0;

  for (const b of settled) {
    const idx = getBucketIndex(b.odds);
    const stake = Number(b.stake);
    const profit = Number(b.profit);
    const isWin = b.result === 'win';
    const impliedProb = oddsToImpliedProb(b.odds);

    accum[idx].bets++;
    accum[idx].staked += stake;
    accum[idx].profit += profit;
    accum[idx].impliedProbSum += impliedProb;
    if (isWin) { accum[idx].wins++; totalActualWins++; }
    else accum[idx].losses++;

    totalExpectedWins += impliedProb;
  }

  const buckets: OddsBucket[] = ODDS_BUCKETS.map((def, i) => {
    const a = accum[i];
    const avgImplied = a.bets > 0 ? a.impliedProbSum / a.bets : 0;
    const actualWR = a.bets > 0 ? a.wins / a.bets : 0;
    return {
      label: def.label,
      range: def.range,
      bets: a.bets,
      wins: a.wins,
      losses: a.losses,
      staked: round2(a.staked),
      profit: round2(a.profit),
      roi: a.staked > 0 ? round2((a.profit / a.staked) * 100) : 0,
      win_rate: round2(actualWR * 100),
      implied_prob: round2(avgImplied * 100),
      actual_win_rate: round2(actualWR * 100),
      edge: round2((actualWR - avgImplied) * 100),
    };
  });

  const activeBuckets = buckets.filter((b) => b.bets >= 3);
  activeBuckets.sort((a, b) => a.edge - b.edge);
  const worstBucket = activeBuckets.length > 0 ? { label: activeBuckets[0].label, edge: activeBuckets[0].edge, count: activeBuckets[0].bets } : null;
  const bestBucket = activeBuckets.length > 0 ? { label: activeBuckets[activeBuckets.length - 1].label, edge: activeBuckets[activeBuckets.length - 1].edge, count: activeBuckets[activeBuckets.length - 1].bets } : null;

  const luckRating = round2(totalActualWins - totalExpectedWins);
  let luckLabel: string;
  if (settled.length < 10) luckLabel = 'Not enough data';
  else if (luckRating > 3) luckLabel = 'Running hot';
  else if (luckRating > 1) luckLabel = 'Slightly lucky';
  else if (luckRating >= -1) luckLabel = 'Right on track';
  else if (luckRating >= -3) luckLabel = 'Slightly cold';
  else luckLabel = 'Running cold';

  return {
    buckets,
    expected_wins: round2(totalExpectedWins),
    actual_wins: totalActualWins,
    luck_rating: luckRating,
    luck_label: luckLabel,
    total_settled: settled.length,
    best_bucket: bestBucket,
    worst_bucket: worstBucket,
  };
}

// ── Timing Analysis ──

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_LABELS = [
  '12am', '1am', '2am', '3am', '4am', '5am', '6am', '7am', '8am', '9am', '10am', '11am',
  '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm',
];

function calculateTiming(bets: Bet[]): TimingAnalysis {
  const settled = bets.filter((b) => b.result === 'win' || b.result === 'loss');

  // Detect if we actually have time data — if >80% of bets land at exactly midnight, timestamps are date-only
  const midnightCount = settled.filter((b) => {
    const d = new Date(b.placed_at);
    return d.getHours() === 0 && d.getMinutes() === 0;
  }).length;
  const hasTimeData = settled.length >= 5 && midnightCount / settled.length < 0.8;

  // Initialize buckets
  const hourBuckets: { bets: number; wins: number; losses: number; staked: number; profit: number }[] =
    Array.from({ length: 24 }, () => ({ bets: 0, wins: 0, losses: 0, staked: 0, profit: 0 }));
  const dayBuckets: { bets: number; wins: number; losses: number; staked: number; profit: number }[] =
    Array.from({ length: 7 }, () => ({ bets: 0, wins: 0, losses: 0, staked: 0, profit: 0 }));

  for (const b of settled) {
    const d = new Date(b.placed_at);
    const hour = d.getHours();
    const day = d.getDay(); // 0=Sun

    const stake = Number(b.stake);
    const profit = Number(b.profit);
    const isWin = b.result === 'win';

    hourBuckets[hour].bets++;
    hourBuckets[hour].staked += stake;
    hourBuckets[hour].profit += profit;
    if (isWin) hourBuckets[hour].wins++;
    else hourBuckets[hour].losses++;

    dayBuckets[day].bets++;
    dayBuckets[day].staked += stake;
    dayBuckets[day].profit += profit;
    if (isWin) dayBuckets[day].wins++;
    else dayBuckets[day].losses++;
  }

  function toBucket(raw: { bets: number; wins: number; losses: number; staked: number; profit: number }, label: string): TimingBucket {
    return {
      label,
      bets: raw.bets,
      wins: raw.wins,
      losses: raw.losses,
      staked: round2(raw.staked),
      profit: round2(raw.profit),
      roi: raw.staked > 0 ? round2((raw.profit / raw.staked) * 100) : 0,
      win_rate: raw.bets > 0 ? round2((raw.wins / raw.bets) * 100) : 0,
    };
  }

  const byHour = hourBuckets.map((b, i) => toBucket(b, HOUR_LABELS[i]));
  // Reorder days to Mon-Sun for display
  const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon=1 through Sun=0
  const byDay = dayOrder.map((i) => toBucket(dayBuckets[i], DAY_LABELS[i]));

  // Find best/worst windows (minimum 3 bets to qualify)
  const allBuckets = [...byHour, ...byDay].filter((b) => b.bets >= 3);
  allBuckets.sort((a, b) => a.roi - b.roi);

  const worstWindow = allBuckets.length > 0 ? { label: allBuckets[0].label, roi: allBuckets[0].roi, count: allBuckets[0].bets } : null;
  const bestWindow = allBuckets.length > 0 ? { label: allBuckets[allBuckets.length - 1].label, roi: allBuckets[allBuckets.length - 1].roi, count: allBuckets[allBuckets.length - 1].bets } : null;

  // Late night stats (11pm-4am)
  const lateNightHours = [23, 0, 1, 2, 3, 4];
  const lateNight = lateNightHours.reduce(
    (acc, h) => {
      acc.count += hourBuckets[h].bets;
      acc.staked += hourBuckets[h].staked;
      acc.profit += hourBuckets[h].profit;
      return acc;
    },
    { count: 0, staked: 0, profit: 0 }
  );
  const lateNightStats = lateNight.count >= 3
    ? {
        count: lateNight.count,
        roi: lateNight.staked > 0 ? round2((lateNight.profit / lateNight.staked) * 100) : 0,
        pct_of_total: settled.length > 0 ? round2((lateNight.count / settled.length) * 100) : 0,
      }
    : null;

  return { by_hour: byHour, by_day: byDay, best_window: bestWindow, worst_window: worstWindow, late_night_stats: lateNightStats, has_time_data: hasTimeData };
}

export function calculateMetrics(bets: Bet[], bankroll?: number | null): CalculatedMetrics {
  const sorted = [...bets].sort((a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime());
  const settled = sorted.filter((b) => b.result === 'win' || b.result === 'loss');

  // Summary
  const totalBets = sorted.length;
  const wins = sorted.filter((b) => b.result === 'win').length;
  const losses = sorted.filter((b) => b.result === 'loss').length;
  const pushes = sorted.filter((b) => b.result === 'push').length;
  const record = `${wins}W-${losses}L-${pushes}P`;
  const totalStaked = sorted.reduce((s, b) => s + Number(b.stake), 0);
  const totalProfit = sorted.reduce((s, b) => s + Number(b.profit), 0);
  const roiPercent = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;
  const avgStake = totalBets > 0 ? totalStaked / totalBets : 0;
  const stakes = sorted.map((b) => Number(b.stake)).sort((a, b) => a - b);
  const medianStake = stakes.length > 0 ? stakes[Math.floor(stakes.length / 2)] : 0;
  const maxStake = stakes.length > 0 ? stakes[stakes.length - 1] : 0;
  const minStake = stakes.length > 0 ? stakes[0] : 0;
  const settledCount = sorted.filter((b) => ['win', 'loss', 'push'].includes(b.result)).length;
  const winRate = settledCount > 0 ? (wins / settledCount) * 100 : 0;

  const dateStart = sorted[0]?.placed_at ?? '';
  const dateEnd = sorted[sorted.length - 1]?.placed_at ?? '';
  const dateRange = dateStart && dateEnd
    ? `${fmtDate(dateStart)} to ${fmtDate(dateEnd)}`
    : 'Unknown';

  // Stake CV
  const mean = avgStake;
  const variance = totalBets > 0
    ? sorted.reduce((s, b) => s + Math.pow(Number(b.stake) - mean, 2), 0) / totalBets
    : 0;
  const stdDev = Math.sqrt(variance);
  const stakeCv = mean > 0 ? stdDev / mean : 0;

  // Loss chase ratio
  let stakeAfterLoss = 0, countAfterLoss = 0, stakeAfterWin = 0, countAfterWin = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    if (prev.result === 'loss') { stakeAfterLoss += Number(sorted[i].stake); countAfterLoss++; }
    else if (prev.result === 'win') { stakeAfterWin += Number(sorted[i].stake); countAfterWin++; }
  }
  const avgAfterLoss = countAfterLoss > 0 ? stakeAfterLoss / countAfterLoss : avgStake;
  const avgAfterWin = countAfterWin > 0 ? stakeAfterWin / countAfterWin : avgStake;
  const lossChaseRatio = avgAfterWin > 0 ? avgAfterLoss / avgAfterWin : 1;

  // Emotion score components (recalibrated: typical casual bettor = 30-55)
  const stakeVolatility = stakeCv < 0.5 ? 0 : stakeCv < 0.8 ? 3 : stakeCv < 1.0 ? 7 : stakeCv < 1.5 ? 12 : stakeCv < 2.0 ? 18 : 25;
  const lossChasingPts = lossChaseRatio < 1.15 ? 0 : lossChaseRatio < 1.3 ? 4 : lossChaseRatio < 1.6 ? 9 : lossChaseRatio < 2.0 ? 15 : lossChaseRatio < 3.0 ? 20 : 25;

  // Behavior during losing streaks
  let streakBehaviorPts = 0;
  let rapidFireInStreaks = 0;
  let marathonEscalation = false;
  let streakFreqIncrease = 1.0;
  {
    // Count rapid-fire bets during loss streaks (within 2 hours)
    let lossRun = 0;
    let betsInStreakSession = 0;
    let stakesEscalating = false;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].result === 'loss') {
        lossRun++;
        if (lossRun >= 3) {
          if (i > 0) {
            const gap = new Date(sorted[i].placed_at).getTime() - new Date(sorted[i - 1].placed_at).getTime();
            if (gap < 7200000) { rapidFireInStreaks++; betsInStreakSession++; }
            if (Number(sorted[i].stake) > Number(sorted[i - 1].stake) * 1.1) stakesEscalating = true;
          }
        }
      } else {
        if (betsInStreakSession >= 8 && stakesEscalating) marathonEscalation = true;
        lossRun = 0;
        betsInStreakSession = 0;
        stakesEscalating = false;
      }
    }
    // Estimate frequency increase during streaks vs normal
    const normalGaps: number[] = [];
    const streakGaps: number[] = [];
    let run = 0;
    for (let i = 1; i < sorted.length; i++) {
      const gap = new Date(sorted[i].placed_at).getTime() - new Date(sorted[i - 1].placed_at).getTime();
      if (sorted[i - 1].result === 'loss') { run++; if (run >= 2) streakGaps.push(gap); }
      else { run = 0; normalGaps.push(gap); }
    }
    const avgNormalGap = normalGaps.length > 0 ? normalGaps.reduce((a, b) => a + b, 0) / normalGaps.length : 1;
    const avgStreakGap = streakGaps.length > 0 ? streakGaps.reduce((a, b) => a + b, 0) / streakGaps.length : avgNormalGap;
    streakFreqIncrease = avgStreakGap > 0 && avgNormalGap > 0 ? avgNormalGap / avgStreakGap : 1;
  }

  if (marathonEscalation) streakBehaviorPts = 25;
  else if (rapidFireInStreaks >= 5 || streakFreqIncrease >= 2.5) streakBehaviorPts = 21;
  else if (streakFreqIncrease >= 1.7) streakBehaviorPts = 16;
  else if (streakFreqIncrease >= 1.3) streakBehaviorPts = 10;
  else if (streakFreqIncrease >= 1.05) streakBehaviorPts = 5;

  // Session discipline
  const sessions: { bets: Bet[]; profit: number }[] = [];
  let currentSession: Bet[] = [];
  for (const bet of sorted) {
    if (currentSession.length > 0) {
      const lastTime = new Date(currentSession[currentSession.length - 1].placed_at).getTime();
      const thisTime = new Date(bet.placed_at).getTime();
      if (thisTime - lastTime > 3 * 3600000) {
        sessions.push({ bets: currentSession, profit: currentSession.reduce((s, b) => s + Number(b.profit), 0) });
        currentSession = [];
      }
    }
    currentSession.push(bet);
  }
  if (currentSession.length > 0) {
    sessions.push({ bets: currentSession, profit: currentSession.reduce((s, b) => s + Number(b.profit), 0) });
  }

  const winningSessions = sessions.filter((s) => s.profit > 0);
  const losingSessions = sessions.filter((s) => s.profit < 0);
  const avgWinSessionBets = winningSessions.length > 0 ? winningSessions.reduce((s, sess) => s + sess.bets.length, 0) / winningSessions.length : 0;
  const avgLoseSessionBets = losingSessions.length > 0 ? losingSessions.reduce((s, sess) => s + sess.bets.length, 0) / losingSessions.length : 0;
  const marathonLosing = losingSessions.some((s) => s.bets.length >= 10);
  const loseWinRatio = avgWinSessionBets > 0 ? avgLoseSessionBets / avgWinSessionBets : 1;

  let sessionDisciplinePts = 0;
  if (marathonLosing) sessionDisciplinePts = 25;
  else if (loseWinRatio >= 3.0) sessionDisciplinePts = 21;
  else if (loseWinRatio >= 2.0) sessionDisciplinePts = 16;
  else if (loseWinRatio >= 1.5) sessionDisciplinePts = 10;
  else if (loseWinRatio >= 1.2) sessionDisciplinePts = 5;

  const emotionScore = Math.min(100, stakeVolatility + lossChasingPts + streakBehaviorPts + sessionDisciplinePts);

  // Bankroll health
  const br = bankroll ? Number(bankroll) : avgStake * 20;
  let bankrollHealth: 'healthy' | 'caution' | 'danger' = 'healthy';
  if (br > 0) {
    const betsOver10pct = sorted.filter((b) => Number(b.stake) > br * 0.1).length;
    const betsOver5pct = sorted.filter((b) => Number(b.stake) > br * 0.05).length;
    const anyOver25pct = sorted.some((b) => Number(b.stake) > br * 0.25);
    const avgStakePct = (avgStake / br) * 100;

    if (anyOver25pct || (totalBets > 0 && betsOver10pct / totalBets > 0.2) || avgStakePct > 5) {
      bankrollHealth = 'danger';
    } else if ((totalBets > 0 && betsOver10pct / totalBets > 0.1) || avgStakePct > 3) {
      bankrollHealth = 'caution';
    } else if (betsOver5pct > 3) {
      bankrollHealth = totalBets > 20 ? 'caution' : 'healthy';
    }
  }

  // Parlay stats
  const parlays = sorted.filter((b) => b.bet_type === 'parlay' || (b.parlay_legs && b.parlay_legs > 1));
  const straights = sorted.filter((b) => !(b.bet_type === 'parlay' || (b.parlay_legs && b.parlay_legs > 1)));
  const parlayStaked = parlays.reduce((s, b) => s + Number(b.stake), 0);
  const parlayProfit = parlays.reduce((s, b) => s + Number(b.profit), 0);
  const straightStaked = straights.reduce((s, b) => s + Number(b.stake), 0);
  const straightProfit = straights.reduce((s, b) => s + Number(b.profit), 0);
  const parlayRoi = parlayStaked > 0 ? (parlayProfit / parlayStaked) * 100 : 0;
  const straightRoi = straightStaked > 0 ? (straightProfit / straightStaked) * 100 : 0;
  const parlayPercent = totalBets > 0 ? (parlays.length / totalBets) * 100 : 0;

  // Category ROI
  const catMap = new Map<string, { profit: number; staked: number; count: number }>();
  settled.forEach((b) => {
    const keys = [b.sport, b.bet_type, `${b.sport} ${b.bet_type}`];
    if (b.sportsbook) keys.push(b.sportsbook);
    keys.forEach((k) => {
      const c = catMap.get(k) ?? { profit: 0, staked: 0, count: 0 };
      c.profit += Number(b.profit);
      c.staked += Number(b.stake);
      c.count++;
      catMap.set(k, c);
    });
  });
  const categoryRoi: CalculatedMetrics['category_roi'] = [];
  catMap.forEach((v, k) => {
    if (v.count >= 3) {
      categoryRoi.push({ category: k, roi: v.staked > 0 ? (v.profit / v.staked) * 100 : 0, count: v.count, profit: v.profit, staked: v.staked });
    }
  });
  categoryRoi.sort((a, b) => b.count - a.count);

  // Pre-classify biases
  const biases: CalculatedMetrics['biases_detected'] = [];

  // Loss chasing
  if (lossChaseRatio >= 1.1) {
    const sev = lossChaseRatio >= 2.0 ? 'critical' : lossChaseRatio >= 1.5 ? 'high' : lossChaseRatio >= 1.3 ? 'medium' : 'low';
    biases.push({ bias_name: 'Post-Loss Escalation', severity: sev, data: `ratio: ${lossChaseRatio.toFixed(2)}x (avg stake after loss: $${avgAfterLoss.toFixed(0)} vs after win: $${avgAfterWin.toFixed(0)})` });
  }

  // Parlay addiction
  if (parlayPercent >= 20 && parlays.length >= 3) {
    const roiDiff = straightRoi - parlayRoi;
    let sev = '';
    if (parlayPercent >= 80) sev = 'critical';
    else if (parlayPercent >= 60) sev = 'high';
    else if (parlayPercent >= 40 && roiDiff > 10) sev = 'medium';
    else if (roiDiff > 5) sev = 'low';
    if (sev) {
      biases.push({ bias_name: 'Heavy Parlay Tendency', severity: sev, data: `${parlayPercent.toFixed(0)}% parlays, parlay ROI: ${parlayRoi.toFixed(1)}% vs straight: ${straightRoi.toFixed(1)}%` });
    }
  }

  // Stake size chaos
  if (stakeCv >= 0.5) {
    const sev = stakeCv >= 1.8 ? 'critical' : stakeCv >= 1.2 ? 'high' : stakeCv >= 0.8 ? 'medium' : 'low';
    biases.push({ bias_name: 'Stake Volatility', severity: sev, data: `Bet sizes range from $${minStake.toFixed(0)} to $${maxStake.toFixed(0)} (avg $${avgStake.toFixed(0)}) — ${stakeCv >= 1.0 ? 'wildly' : 'noticeably'} inconsistent sizing` });
  }

  // Favorite bias
  const favBets = settled.filter((b) => b.odds < 0);
  const dogBets = settled.filter((b) => b.odds > 0);
  const favPct = settled.length > 0 ? (favBets.length / settled.length) * 100 : 0;
  const favStaked = favBets.reduce((s, b) => s + Number(b.stake), 0);
  const favProfit = favBets.reduce((s, b) => s + Number(b.profit), 0);
  const dogStaked = dogBets.reduce((s, b) => s + Number(b.stake), 0);
  const dogProfit = dogBets.reduce((s, b) => s + Number(b.profit), 0);
  const favRoi = favStaked > 0 ? (favProfit / favStaked) * 100 : 0;
  const dogRoi = dogStaked > 0 ? (dogProfit / dogStaked) * 100 : 0;

  if (favPct >= 65 && favRoi < 0) {
    const sev = favPct >= 85 ? 'high' : favPct >= 75 && dogRoi > favRoi ? 'medium' : 'low';
    biases.push({ bias_name: 'Favorite-Heavy Lean', severity: sev, data: `${favPct.toFixed(0)}% favorites, fav ROI: ${favRoi.toFixed(1)}%, dog ROI: ${dogRoi.toFixed(1)}%` });
  }

  // Overall grade (deterministic)
  let gradeScore = 100;
  // Emotion score penalty
  if (emotionScore > 80) gradeScore -= 35;
  else if (emotionScore > 60) gradeScore -= 25;
  else if (emotionScore > 40) gradeScore -= 15;
  else if (emotionScore > 20) gradeScore -= 5;
  // ROI penalty
  if (roiPercent < -10) gradeScore -= 35;
  else if (roiPercent < -5) gradeScore -= 25;
  else if (roiPercent < 0) gradeScore -= 15;
  else if (roiPercent < 5) gradeScore -= 5;
  // Bias penalty
  for (const b of biases) {
    if (b.severity === 'critical') gradeScore -= 8;
    else if (b.severity === 'high') gradeScore -= 5;
    else if (b.severity === 'medium') gradeScore -= 3;
    else gradeScore -= 1;
  }
  // Bankroll penalty
  if (bankrollHealth === 'danger') gradeScore -= 15;
  else if (bankrollHealth === 'caution') gradeScore -= 5;

  gradeScore = Math.max(0, Math.min(100, gradeScore));
  const overallGrade = gradeScore >= 90 ? 'A+' : gradeScore >= 85 ? 'A' : gradeScore >= 80 ? 'A-'
    : gradeScore >= 75 ? 'B+' : gradeScore >= 70 ? 'B' : gradeScore >= 65 ? 'B-'
    : gradeScore >= 60 ? 'C+' : gradeScore >= 55 ? 'C' : gradeScore >= 50 ? 'C-'
    : gradeScore >= 45 ? 'D+' : gradeScore >= 40 ? 'D' : gradeScore >= 35 ? 'D-' : 'F';

  // What-if calculations
  function calcWhatIfProfit(odds: number, stake: number, result: string): number {
    if (result === 'win') return odds > 0 ? stake * (odds / 100) : stake * (100 / Math.abs(odds));
    if (result === 'loss') return -stake;
    return 0;
  }

  const actualProfit = settled.reduce((s, b) => s + Number(b.profit), 0);

  // flat_stake: recalculate profit using median_stake for each settled bet
  const flatStakeProfit = settled.reduce((s, b) => s + calcWhatIfProfit(b.odds, medianStake, b.result), 0);

  // no_long_parlays: sum profit excluding bets with parlay_legs >= 4
  const noParlaySettled = settled.filter((b) => !(b.parlay_legs != null && b.parlay_legs >= 4));
  const noParlayProfit = noParlaySettled.reduce((s, b) => s + Number(b.profit), 0);
  const removedParlayCount = settled.length - noParlaySettled.length;

  // profitable_only: find categories (sport + bet_type) with positive ROI, then sum profit of matching bets
  const profitableCategoryRoi = categoryRoi.filter((c) => {
    // Only consider sport+bet_type combos (contains a space between two words with no extra spaces pattern)
    const parts = c.category.split(' ');
    return parts.length === 2 && c.roi > 0;
  });
  const profitableCatNames = profitableCategoryRoi.map((c) => c.category);
  const profitableOnlyProfit = settled
    .filter((b) => profitableCatNames.includes(`${b.sport} ${b.bet_type}`))
    .reduce((s, b) => s + Number(b.profit), 0);

  return {
    summary: { total_bets: totalBets, wins, losses, pushes, record, total_staked: totalStaked, total_profit: totalProfit, roi_percent: round2(roiPercent), avg_stake: round2(avgStake), median_stake: round2(medianStake), max_stake: round2(maxStake), min_stake: round2(minStake), win_rate: round2(winRate), date_range: dateRange, overall_grade: overallGrade },
    emotion_score: emotionScore,
    emotion_breakdown: { stake_volatility: stakeVolatility, loss_chasing: lossChasingPts, streak_behavior: streakBehaviorPts, session_discipline: sessionDisciplinePts },
    bankroll_health: bankrollHealth,
    parlay_stats: { parlay_count: parlays.length, parlay_percent: round2(parlayPercent), parlay_roi: round2(parlayRoi), straight_roi: round2(straightRoi) },
    loss_chase_ratio: round2(lossChaseRatio),
    stake_cv: round2(stakeCv),
    category_roi: categoryRoi,
    biases_detected: biases,
    bankroll_used: bankroll ? Number(bankroll) : null,
    what_ifs: {
      flat_stake: { median_stake: round2(medianStake), hypothetical_profit: round2(flatStakeProfit) },
      no_long_parlays: { removed_count: removedParlayCount, hypothetical_profit: round2(noParlayProfit) },
      profitable_only: { categories: profitableCatNames, hypothetical_profit: round2(profitableOnlyProfit) },
      actual_profit: round2(actualProfit),
    },
    betting_archetype: determineArchetype(roiPercent, emotionScore, lossChaseRatio, stakeCv, parlayPercent, favPct, totalBets, categoryRoi),
    timing: calculateTiming(sorted),
    odds: calculateOdds(sorted),
  };
}

function determineArchetype(
  roi: number, emotionScore: number, lossChaseRatio: number, stakeCv: number,
  parlayPct: number, favPct: number, totalBets: number,
  categoryRoi: { category: string; roi: number; count: number }[]
): { name: string; description: string } {
  const hasProfitableCats = categoryRoi.some((c) => c.roi > 0 && c.count >= 5);
  const sportCount = new Set(categoryRoi.filter((c) => !c.category.includes(' ')).map((c) => c.category)).size;

  // The Natural — genuinely sharp
  if (emotionScore <= 30 && roi > 0 && lossChaseRatio < 1.2 && sportCount >= 2) {
    return { name: 'The Natural', description: "Low emotion, positive ROI, diversified. You're genuinely sharp." };
  }
  // Sharp Sleeper — has edges but sizing issues
  if (hasProfitableCats && roi > -5 && stakeCv >= 0.8) {
    return { name: 'Sharp Sleeper', description: "You've got real edges but your sizing is holding you back." };
  }
  // Heated Bettor — decent picks, emotions ruin it
  if (hasProfitableCats && emotionScore > 55 && lossChaseRatio > 1.4) {
    return { name: 'Heated Bettor', description: "Your strategy has promise but your emotions are eating the profit." };
  }
  // Chalk Grinder — heavy favorites, paying juice
  if (favPct >= 65 && stakeCv < 0.8 && roi < 0) {
    return { name: 'Chalk Grinder', description: "You're laying juice on favorites and it's costing you. The safe picks aren't safe for your bankroll." };
  }
  // Parlay Dreamer — heavy parlays
  if (parlayPct >= 40) {
    return { name: 'Parlay Dreamer', description: "The big ticket is always calling. Your straight bet game is probably better than you think." };
  }
  // Sniper — selective bettor
  if (totalBets < 50 && sportCount <= 2) {
    return { name: 'Sniper', description: "Selective and focused. You pick your spots — now it's about sharpening the edge." };
  }
  // Volume Warrior — lots of bets, flat stakes
  if (totalBets >= 150 && stakeCv < 0.8) {
    return { name: 'Volume Warrior', description: "You grind it out with consistent sizing. It's a sustainable approach — now find the leaks in the volume." };
  }
  // Degen King — high variance, mixed, emotional
  if (stakeCv >= 1.0 && parlayPct >= 20 && emotionScore > 40) {
    return { name: 'Degen King', description: "You're here for the ride. Embrace it — but know which parts of the ride are costing you." };
  }
  // Default
  return { name: 'The Grinder', description: "Consistent and steady. You've got a foundation — the analysis shows where to build on it." };
}

// ── Discipline Score Calculator ──

export interface DisciplineContext {
  hasBankroll: boolean;
  reportCount: number;
  streakCount: number;
  uploadedRecently: boolean; // bets uploaded in last 14 days
  prevSnapshot: { tilt_score: number; emotion_score?: number; stake_cv?: number; parlay_percent?: number; loss_chase_ratio?: number } | null;
}

export function calculateDisciplineScore(
  metrics: CalculatedMetrics,
  ctx: DisciplineContext
): { total: number; tracking: number; sizing: number; control: number; strategy: number } {
  // TRACKING CONSISTENCY (0-25)
  let tracking = 0;
  if (ctx.hasBankroll) tracking += 3;
  if (ctx.reportCount >= 2) tracking += 4;
  if (ctx.reportCount >= 4) tracking += 4;
  if (ctx.streakCount >= 3) tracking += 4;
  if (ctx.uploadedRecently) tracking += 3;
  // Extra pts for having data — 3 pts for baseline tracking
  tracking += 3;
  tracking = Math.min(25, tracking);

  // BET SIZING DISCIPLINE (0-25)
  let sizing = 0;
  if (metrics.stake_cv < 1.0) sizing += 8;
  if (metrics.stake_cv < 0.6) sizing += 5;
  if (metrics.bankroll_used && metrics.bankroll_used > 0) {
    const maxBetPct = (metrics.summary.max_stake / metrics.bankroll_used) * 100;
    if (maxBetPct <= 10) sizing += 7;
  } else {
    sizing += 3; // partial credit if no bankroll set
  }
  if (ctx.prevSnapshot && ctx.prevSnapshot.stake_cv !== undefined) {
    if (metrics.stake_cv < ctx.prevSnapshot.stake_cv) sizing += 5;
  }
  sizing = Math.min(25, sizing);

  // EMOTIONAL CONTROL (0-25)
  let control = 0;
  if (metrics.emotion_score < 50) control += 8;
  if (metrics.emotion_score < 25) control += 5;
  if (metrics.loss_chase_ratio < 1.3) control += 7;
  if (ctx.prevSnapshot) {
    const prevEmotion = ctx.prevSnapshot.emotion_score ?? ctx.prevSnapshot.tilt_score;
    if (metrics.emotion_score < prevEmotion) control += 5;
  }
  control = Math.min(25, control);

  // STRATEGIC FOCUS (0-25)
  let strategy = 0;
  const profitableCats = metrics.category_roi.filter((c) => c.roi > 0 && c.count >= 5);
  const hasProfitableEdge = profitableCats.some((c) => c.count >= 20);
  if (hasProfitableEdge) strategy += 8;
  else if (profitableCats.length > 0) strategy += 4;

  // Check if majority of bets are in profitable categories
  const profitableCatNames = new Set(profitableCats.map((c) => c.category));
  const settled = metrics.summary.total_bets;
  if (settled > 0) {
    const profitableCount = metrics.category_roi
      .filter((c) => profitableCatNames.has(c.category))
      .reduce((s, c) => s + c.count, 0);
    if (profitableCount / settled > 0.5) strategy += 7;
  }

  if (metrics.parlay_stats.parlay_percent < 40) strategy += 5;

  if (ctx.prevSnapshot && ctx.prevSnapshot.parlay_percent !== undefined) {
    if (metrics.parlay_stats.parlay_percent < ctx.prevSnapshot.parlay_percent) strategy += 5;
  }
  strategy = Math.min(25, strategy);

  const total = Math.min(100, tracking + sizing + control + strategy);
  return { total, tracking, sizing, control, strategy };
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function fmtDate(iso: string): string { try { return new Date(iso).toISOString().split('T')[0]; } catch { return 'N/A'; } }
function pad(str: string, len: number): string { return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length); }

// ── System Prompt ──

const SYSTEM_PROMPT = `You are BetAutopsy, an elite sports betting behavioral analyst.

IMPORTANT: All numerical metrics (ROI, win rate, emotion score, bankroll health, category breakdowns, bias classifications) are PRE-CALCULATED and provided to you. NEVER recalculate them. Use the EXACT numbers given. Your role is:
- Interpret what the numbers mean behaviorally
- Write descriptions and evidence for each pre-classified bias (do NOT add or remove biases, do NOT change severity levels)
- Identify behavioral patterns in the sequence and timing of bets
- Generate personal_rules (3-5 specific, measurable rules referencing data)
- Generate session narratives for best/worst sessions
- Generate edge_profile reallocation advice and sharp_score
- Assign the overall_grade based on the provided metrics
- Write all recommendations

You do NOT calculate: emotion_score, roi_percent, win_rate, bankroll_health, category ROIs, bias severity levels, or any other number.

## Output Format
Respond with valid JSON:
{
  "overall_grade": "use the exact pre-calculated grade provided — do not assign a different one",
  "biases_detected": [
    {
      "bias_name": "exact name from pre-classified list",
      "severity": "exact severity from pre-classified list",
      "description": "2-3 sentence explanation in casual, direct language",
      "evidence": "cite the specific pre-calculated numbers",
      "estimated_cost": number (rough dollar estimate based on the data),
      "fix": "specific actionable advice"
    }
  ],
  "strategic_leaks": [
    {
      "category": "string",
      "detail": "what the leak is",
      "roi_impact": number (use the pre-calculated ROI),
      "sample_size": number,
      "suggestion": "what to do about it"
    }
  ],
  "behavioral_patterns": [
    {
      "pattern_name": "string",
      "description": "what you observed",
      "frequency": "how often",
      "impact": "positive|negative|neutral",
      "data_points": "supporting evidence"
    }
  ],
  "recommendations": [
    {
      "priority": 1,
      "title": "short action title",
      "description": "2-3 sentence explanation",
      "expected_improvement": "estimated $ or % impact",
      "difficulty": "easy|medium|hard"
    }
  ],
  "personal_rules": [
    {
      "rule": "specific measurable rule referencing a number from the data",
      "reason": "why this rule matters",
      "based_on": "the data pattern"
    }
  ],
  "session_analysis": {
    "total_sessions": number,
    "avg_bets_per_winning_session": number,
    "avg_bets_per_losing_session": number,
    "worst_session": { "date": "string", "bets": number, "duration": "string", "net": number, "description": "1-2 sentence narrative" },
    "best_session": { "date": "string", "bets": number, "duration": "string", "net": number, "description": "1-2 sentence narrative" },
    "insight": "key takeaway"
  },
  "edge_profile": {
    "profitable_areas": [{ "category": "string", "roi": number, "sample_size": number, "confidence": "low|medium|high" }],
    "unprofitable_areas": [{ "category": "string", "roi": number, "sample_size": number, "estimated_loss": number }],
    "reallocation_advice": "string",
    "sharp_score": number (0-100)
  }
}

## Voice & Tone
You sound like a sharp friend who watches games and actually bets — not a data scientist reading a report. Use real betting language naturally, not forced.

Vocabulary to use when it fits naturally:
- "chalk" instead of "favorite"
- "dog" instead of "underdog"
- "juice" instead of "vig" or "commission"
- "hook" when referring to half-points that cost them
- "SGP" instead of "same-game parlay"
- "straight bet" instead of "single wager"
- "laying juice" when they're consistently betting heavy favorites at -150+
- "sharp" / "sharp money" when complimenting disciplined behavior
- "bad beat" when a loss was genuinely unlucky vs a bad decision
- "cashed" or "hit" for wins
- "unit" / "units" when discussing stake sizing (explain: "a unit is whatever your standard bet size is")

Tone rules:
- Celebrate wins and edges with real energy: "Your unders game is legit — that's a real edge, not just a hot streak"
- Be real about losses without being clinical: "That March 9 session was rough — 3 Ls in a row and the stakes crept up."
- Reference specific bets by description when possible
- Never sound like a textbook: "Your coefficient of variation is elevated" = bad. "Your bet sizing is all over the place — $50 one play, $400 the next" = good
- Be direct: "You're laying way too much juice on chalk. 22 bets at -150 or worse with a -8% ROI — you're paying a tax to feel safe."
- When they have no edge somewhere, say it straight: "Real talk — your NHL bets are cooked. 2-9 with -44% ROI. Either find a real angle or cut it entirely."
- Frame everything around behavior improvement, never around "winning more"

CRITICAL TONE RULE: Every report must lead with what the user is doing RIGHT before addressing problems.
- Start with their best quality or strongest area
- For every leak, mention a contrasting strength
- Frame problems as opportunities with dollar amounts
- Use encouraging language for strengths: "legit edge", "sharp instinct", "real discipline here"
- Use direct but non-judgmental language for problems: "this is costing you" not clinical labels
- Never use words like: addiction, reckless, gambling problem, degenerate, out of control

## Critical Rules
- NEVER recommend specific bets or picks
- NEVER promise profitability
- NEVER recalculate any numbers — use only what is provided
- If bankroll_health is "danger", mention responsible bankroll management but do NOT use alarmist language
- If data is sparse (<20 bets), say so and give limited analysis`;

// ── Format bet table for Claude ──

function formatBetTable(bets: Bet[]): string {
  const sorted = [...bets].sort((a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime());
  const header = 'DATE       | SPORT  | TYPE       | DESCRIPTION                          | ODDS   | STAKE  | RESULT | PROFIT  | BOOK';
  const divider = '-'.repeat(header.length);
  const rows = sorted.map((b) => {
    const date = fmtDate(b.placed_at);
    const sport = pad(b.sport, 6);
    const type = pad(b.bet_type, 10);
    const desc = pad(b.description.replace(/[<>{}]/g, '').slice(0, 200), 36);
    const odds = pad(b.odds > 0 ? `+${b.odds}` : `${b.odds}`, 6);
    const stake = pad(`$${Number(b.stake).toFixed(0)}`, 6);
    const result = pad(b.result.toUpperCase(), 6);
    const profit = pad(`${Number(b.profit) >= 0 ? '+' : ''}$${Number(b.profit).toFixed(0)}`, 7);
    const book = b.sportsbook ?? '—';
    const bonus = b.is_bonus_bet ? ' [BONUS]' : '';
    const legs = b.parlay_legs && b.parlay_legs > 1 ? ` [${b.parlay_legs}L]` : '';
    return `${date} | ${sport} | ${type} | ${desc} | ${odds} | ${stake} | ${result} | ${profit} | ${book}${bonus}${legs}`;
  });
  return `${header}\n${divider}\n${rows.join('\n')}`;
}

// ── Run the autopsy ──

export async function runAutopsy(
  bets: Bet[],
  bankroll?: number | null
): Promise<{ analysis: AutopsyAnalysis; markdown: string; tokensUsed: number; model: string }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = 'claude-sonnet-4-20250514';

  // Step 1: Calculate all metrics deterministically in JS
  const metrics = calculateMetrics(bets, bankroll);

  // Step 2: Build the prompt with pre-calculated data
  const metricsBlock = `=== PRE-CALCULATED METRICS (use these exact numbers, do not recalculate) ===
Record: ${metrics.summary.record} (${metrics.summary.total_bets} total)
Total Profit: $${metrics.summary.total_profit.toFixed(2)}
ROI: ${metrics.summary.roi_percent.toFixed(1)}%
Win Rate: ${metrics.summary.win_rate.toFixed(1)}%
Avg Stake: $${metrics.summary.avg_stake.toFixed(2)}
Median Stake: $${metrics.summary.median_stake.toFixed(2)}
Max Stake: $${metrics.summary.max_stake.toFixed(0)} | Min Stake: $${metrics.summary.min_stake.toFixed(0)}
Total Staked: $${metrics.summary.total_staked.toFixed(2)}
Date Range: ${metrics.summary.date_range}
Bankroll: ${metrics.bankroll_used ? `$${metrics.bankroll_used.toLocaleString()}` : 'Not set (estimated at $' + Math.round(metrics.summary.avg_stake * 20).toLocaleString() + ')'}
Bankroll Health: ${metrics.bankroll_health === 'danger' ? 'At Risk' : metrics.bankroll_health === 'caution' ? 'Monitor' : 'Healthy'}
Overall Grade: ${metrics.summary.overall_grade} (pre-calculated, do not override)
Bet DNA: ${metrics.betting_archetype.name} — ${metrics.betting_archetype.description}
Emotion Score: ${metrics.emotion_score}/100 (bet_sizing: ${metrics.emotion_breakdown.stake_volatility}/25, loss_reaction: ${metrics.emotion_breakdown.loss_chasing}/25, streak_behavior: ${metrics.emotion_breakdown.streak_behavior}/25, knowing_when_to_stop: ${metrics.emotion_breakdown.session_discipline}/25)
Bet Sizing Consistency: ${metrics.stake_cv < 0.5 ? 'very consistent' : metrics.stake_cv < 0.8 ? 'somewhat varied' : metrics.stake_cv < 1.2 ? 'inconsistent' : 'wildly inconsistent'} (variability score: ${metrics.stake_cv.toFixed(2)})
Loss Chase Ratio: ${metrics.loss_chase_ratio.toFixed(2)}x
Parlays: ${metrics.parlay_stats.parlay_count} (${metrics.parlay_stats.parlay_percent.toFixed(1)}%), Parlay ROI: ${metrics.parlay_stats.parlay_roi.toFixed(1)}%, Straight ROI: ${metrics.parlay_stats.straight_roi.toFixed(1)}%
===

=== CATEGORY ROI BREAKDOWN ===
${metrics.category_roi.map((c) => `${c.category}: ${c.roi.toFixed(1)}% ROI (${c.count} bets, $${c.profit.toFixed(0)} profit)`).join('\n')}
===

=== TIMING ANALYSIS (day-of-week and time-of-day performance) ===
${metrics.timing.has_time_data ? `By Day of Week:
${metrics.timing.by_day.filter((d) => d.bets >= 1).map((d) => `${d.label}: ${d.roi.toFixed(1)}% ROI (${d.bets} bets, ${d.win_rate.toFixed(0)}% win rate, $${d.profit.toFixed(0)} profit)`).join('\n')}

By Time of Day:
${metrics.timing.by_hour.filter((h) => h.bets >= 1).map((h) => `${h.label}: ${h.roi.toFixed(1)}% ROI (${h.bets} bets, ${h.win_rate.toFixed(0)}% win rate, $${h.profit.toFixed(0)} profit)`).join('\n')}
${metrics.timing.best_window ? `\nBest Window: ${metrics.timing.best_window.label} — ${metrics.timing.best_window.roi.toFixed(1)}% ROI (${metrics.timing.best_window.count} bets)` : ''}
${metrics.timing.worst_window ? `Worst Window: ${metrics.timing.worst_window.label} — ${metrics.timing.worst_window.roi.toFixed(1)}% ROI (${metrics.timing.worst_window.count} bets)` : ''}
${metrics.timing.late_night_stats ? `Late Night (11pm-4am): ${metrics.timing.late_night_stats.count} bets (${metrics.timing.late_night_stats.pct_of_total.toFixed(0)}% of total), ${metrics.timing.late_night_stats.roi.toFixed(1)}% ROI` : ''}` : 'No time-of-day data available (timestamps are date-only).'}
===

=== ODDS INTELLIGENCE ===
By Odds Bucket:
${metrics.odds.buckets.filter((b) => b.bets >= 1).map((b) => `${b.label} (${b.range}): ${b.bets} bets, ${b.win_rate.toFixed(0)}% win rate vs ${b.implied_prob.toFixed(0)}% implied, edge: ${b.edge >= 0 ? '+' : ''}${b.edge.toFixed(1)}pp, ROI: ${b.roi.toFixed(1)}%, $${b.profit.toFixed(0)} profit`).join('\n')}

Luck vs Skill: ${metrics.odds.actual_wins} actual wins vs ${metrics.odds.expected_wins.toFixed(1)} expected wins (${metrics.odds.luck_label}, ${metrics.odds.luck_rating >= 0 ? '+' : ''}${metrics.odds.luck_rating.toFixed(1)} wins above expected)
${metrics.odds.best_bucket ? `Best Odds Range: ${metrics.odds.best_bucket.label} (${metrics.odds.best_bucket.edge >= 0 ? '+' : ''}${metrics.odds.best_bucket.edge.toFixed(1)}pp edge, ${metrics.odds.best_bucket.count} bets)` : ''}
${metrics.odds.worst_bucket ? `Worst Odds Range: ${metrics.odds.worst_bucket.label} (${metrics.odds.worst_bucket.edge >= 0 ? '+' : ''}${metrics.odds.worst_bucket.edge.toFixed(1)}pp edge, ${metrics.odds.worst_bucket.count} bets)` : ''}
===

=== PRE-CLASSIFIED BIASES (do not change bias names or severity levels — write descriptions and evidence for each) ===
${metrics.biases_detected.length > 0
    ? metrics.biases_detected.map((b) => `- ${b.bias_name}: ${b.severity.toUpperCase()} (${b.data})`).join('\n')
    : 'No significant biases detected at current thresholds.'}
===`;

  const betTable = formatBetTable(bets);

  const userMessage = `${metricsBlock}\n\n=== RAW BETS FOR PATTERN ANALYSIS ===\n${betTable}`;

  // Step 3: Call Claude for behavioral interpretation
  const message = await client.messages.create({
    model,
    max_tokens: 8192,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No response from analysis engine');
  }

  const tokensUsed = (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0);
  const claudeData = parseResponseJSON(textBlock.text);

  // Step 4: Merge — JS metrics are authoritative, Claude provides text
  const analysis: AutopsyAnalysis = {
    summary: {
      total_bets: metrics.summary.total_bets,
      record: metrics.summary.record,
      total_profit: metrics.summary.total_profit,
      roi_percent: metrics.summary.roi_percent,
      avg_stake: metrics.summary.avg_stake,
      date_range: metrics.summary.date_range,
      overall_grade: metrics.summary.overall_grade,
    },
    biases_detected: metrics.biases_detected.map((jsBias) => {
      const claudeBiases = Array.isArray(claudeData.biases_detected) ? claudeData.biases_detected : [];
      const claudeBias = claudeBiases.find(
        (cb: Record<string, unknown>) => (cb.bias_name as string)?.toLowerCase() === jsBias.bias_name.toLowerCase()
      ) as Record<string, unknown> | undefined;
      return {
        bias_name: jsBias.bias_name,
        severity: jsBias.severity as 'low' | 'medium' | 'high' | 'critical',
        description: (claudeBias?.description as string) ?? `${jsBias.bias_name} detected with ${jsBias.severity} severity.`,
        evidence: (claudeBias?.evidence as string) ?? jsBias.data,
        estimated_cost: (claudeBias?.estimated_cost as number) ?? 0,
        fix: (claudeBias?.fix as string) ?? 'Review your betting patterns.',
      };
    }),
    strategic_leaks: (Array.isArray(claudeData.strategic_leaks) ? claudeData.strategic_leaks : []).map((leak: Record<string, unknown>) => {
      // Try to use JS-calculated ROI if available
      const jsCat = metrics.category_roi.find((c) => c.category.toLowerCase() === (leak.category as string)?.toLowerCase());
      return {
        category: (leak.category as string) ?? '',
        detail: (leak.detail as string) ?? '',
        roi_impact: jsCat ? jsCat.roi : (leak.roi_impact as number) ?? 0,
        sample_size: jsCat ? jsCat.count : (leak.sample_size as number) ?? 0,
        suggestion: (leak.suggestion as string) ?? '',
      };
    }),
    behavioral_patterns: (Array.isArray(claudeData.behavioral_patterns) ? claudeData.behavioral_patterns : []) as AutopsyAnalysis['behavioral_patterns'],
    recommendations: (Array.isArray(claudeData.recommendations) ? claudeData.recommendations : []) as AutopsyAnalysis['recommendations'],
    emotion_score: metrics.emotion_score,
    tilt_score: metrics.emotion_score, // backward compat for old report renders
    emotion_breakdown: metrics.emotion_breakdown,
    tilt_breakdown: metrics.emotion_breakdown, // backward compat
    bankroll_health: metrics.bankroll_health,
    personal_rules: claudeData.personal_rules as AutopsyAnalysis['personal_rules'],
    session_analysis: claudeData.session_analysis as AutopsyAnalysis['session_analysis'],
    edge_profile: claudeData.edge_profile as AutopsyAnalysis['edge_profile'],
    betting_archetype: metrics.betting_archetype,
    timing_analysis: metrics.timing,
    odds_analysis: metrics.odds,
  };

  const markdown = generateMarkdownReport(analysis);

  return { analysis, markdown, tokensUsed, model };
}

// ── Parse JSON from response ──

function parseResponseJSON(raw: string): Record<string, unknown> {
  let text = raw.trim();
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) text = codeBlockMatch[1].trim();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) text = text.slice(firstBrace, lastBrace + 1);
  try { return JSON.parse(text); }
  catch { return {}; }
}

// ── Keep formatBetsForAnalysis for backward compat ──

export function formatBetsForAnalysis(bets: Bet[], bankroll?: number | null): string {
  const metrics = calculateMetrics(bets, bankroll);
  const statsBlock = `=== QUICK STATS ===
Record: ${metrics.summary.record}
Total Profit: $${metrics.summary.total_profit.toFixed(2)}
ROI: ${metrics.summary.roi_percent.toFixed(1)}%
Avg Stake: $${metrics.summary.avg_stake.toFixed(2)}
Total Staked: $${metrics.summary.total_staked.toFixed(2)}
Bankroll Health: ${metrics.bankroll_health}
==================`;
  return `${statsBlock}\n\n${formatBetTable(bets)}`;
}

// ── Generate markdown report ──

export function generateMarkdownReport(a: AutopsyAnalysis): string {
  const lines: string[] = [];
  lines.push('# BetAutopsy Report\n');
  lines.push('## Summary');
  lines.push(`- **Record:** ${a.summary.record} (${a.summary.total_bets} bets)`);
  lines.push(`- **Net P&L:** $${a.summary.total_profit.toFixed(2)}`);
  lines.push(`- **ROI:** ${a.summary.roi_percent.toFixed(1)}%`);
  lines.push(`- **Avg Stake:** $${a.summary.avg_stake.toFixed(2)}`);
  lines.push(`- **Date Range:** ${a.summary.date_range}`);
  lines.push(`- **Overall Grade:** ${a.summary.overall_grade}`);
  lines.push('');
  lines.push(`## Emotion Score: ${a.emotion_score}/100`);
  lines.push(`## Bankroll Health: ${a.bankroll_health === 'danger' ? 'At Risk' : a.bankroll_health === 'caution' ? 'Monitor' : 'Healthy'}`);
  lines.push('');
  if (a.biases_detected.length > 0) {
    lines.push('## Biases Detected\n');
    for (const bias of a.biases_detected) {
      lines.push(`### ${bias.bias_name} (${bias.severity.toUpperCase()})`);
      lines.push(bias.description);
      lines.push(`- **Evidence:** ${bias.evidence}`);
      lines.push(`- **Estimated Cost:** $${bias.estimated_cost.toFixed(0)}`);
      lines.push(`- **Fix:** ${bias.fix}\n`);
    }
  }
  if (a.strategic_leaks.length > 0) {
    lines.push('## Strategic Leaks\n');
    lines.push('| Category | Issue | ROI | Sample | Suggestion |');
    lines.push('|----------|-------|-----|--------|------------|');
    for (const l of a.strategic_leaks) lines.push(`| ${l.category} | ${l.detail} | ${l.roi_impact.toFixed(1)}% | ${l.sample_size} | ${l.suggestion} |`);
    lines.push('');
  }
  if (a.timing_analysis && a.timing_analysis.by_day.some((d) => d.bets > 0)) {
    lines.push('## Timing Patterns\n');
    lines.push('### By Day of Week\n');
    lines.push('| Day | Bets | Win Rate | ROI | Profit |');
    lines.push('|-----|------|----------|-----|--------|');
    for (const d of a.timing_analysis.by_day.filter((d) => d.bets > 0)) {
      lines.push(`| ${d.label} | ${d.bets} | ${d.win_rate.toFixed(0)}% | ${d.roi.toFixed(1)}% | $${d.profit.toFixed(0)} |`);
    }
    lines.push('');
    if (a.timing_analysis.has_time_data) {
      lines.push('### By Time of Day\n');
      lines.push('| Time | Bets | Win Rate | ROI | Profit |');
      lines.push('|------|------|----------|-----|--------|');
      for (const h of a.timing_analysis.by_hour.filter((h) => h.bets > 0)) {
        lines.push(`| ${h.label} | ${h.bets} | ${h.win_rate.toFixed(0)}% | ${h.roi.toFixed(1)}% | $${h.profit.toFixed(0)} |`);
      }
      lines.push('');
    }
    if (a.timing_analysis.best_window) lines.push(`- **Best Window:** ${a.timing_analysis.best_window.label} (${a.timing_analysis.best_window.roi.toFixed(1)}% ROI, ${a.timing_analysis.best_window.count} bets)`);
    if (a.timing_analysis.worst_window) lines.push(`- **Worst Window:** ${a.timing_analysis.worst_window.label} (${a.timing_analysis.worst_window.roi.toFixed(1)}% ROI, ${a.timing_analysis.worst_window.count} bets)`);
    if (a.timing_analysis.late_night_stats) lines.push(`- **Late Night (11pm-4am):** ${a.timing_analysis.late_night_stats.count} bets, ${a.timing_analysis.late_night_stats.roi.toFixed(1)}% ROI`);
    lines.push('');
  }
  if (a.odds_analysis && a.odds_analysis.buckets.some((b) => b.bets > 0)) {
    lines.push('## Odds Intelligence\n');
    lines.push('| Odds Range | Bets | Win Rate | Implied | Edge | ROI | Profit |');
    lines.push('|------------|------|----------|---------|------|-----|--------|');
    for (const b of a.odds_analysis.buckets.filter((b) => b.bets > 0)) {
      lines.push(`| ${b.label} (${b.range}) | ${b.bets} | ${b.win_rate.toFixed(0)}% | ${b.implied_prob.toFixed(0)}% | ${b.edge >= 0 ? '+' : ''}${b.edge.toFixed(1)}pp | ${b.roi.toFixed(1)}% | $${b.profit.toFixed(0)} |`);
    }
    lines.push('');
    lines.push(`- **Luck vs Skill:** ${a.odds_analysis.actual_wins} actual wins vs ${a.odds_analysis.expected_wins.toFixed(1)} expected — ${a.odds_analysis.luck_label}`);
    if (a.odds_analysis.best_bucket) lines.push(`- **Best Odds Range:** ${a.odds_analysis.best_bucket.label} (${a.odds_analysis.best_bucket.edge >= 0 ? '+' : ''}${a.odds_analysis.best_bucket.edge.toFixed(1)}pp edge)`);
    if (a.odds_analysis.worst_bucket) lines.push(`- **Worst Odds Range:** ${a.odds_analysis.worst_bucket.label} (${a.odds_analysis.worst_bucket.edge >= 0 ? '+' : ''}${a.odds_analysis.worst_bucket.edge.toFixed(1)}pp edge)`);
    lines.push('');
  }
  if (a.recommendations.length > 0) {
    lines.push('## Action Plan\n');
    for (const r of a.recommendations) { lines.push(`**${r.priority}. ${r.title}** (${r.difficulty})`); lines.push(`${r.description}\n`); }
  }
  lines.push('---');
  lines.push('*BetAutopsy provides behavioral analysis and educational insights — not gambling or financial advice. Past results don\'t guarantee future outcomes. 21+. If you or someone you know has a gambling problem, call 1-800-GAMBLER.*');
  return lines.join('\n');
}

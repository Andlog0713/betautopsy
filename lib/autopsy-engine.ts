import Anthropic from '@anthropic-ai/sdk';
import type { Bet, AutopsyAnalysis, TimingAnalysis, TimingBucket, OddsAnalysis, OddsBucket, DFSDetection, DFSMetrics, BetIQResult, BetIQComponent, EnhancedTiltResult, TiltSignals, SportSpecificFinding, DetectedSession, SessionDetectionResult, BetAnnotation, BetSignal, BetClassification, AnnotationSummary } from '@/types';
import { formatParlayForClaude } from '@/lib/format-parlay';

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
  biases_detected: { bias_name: string; severity: string; data: string; evidence_bet_ids?: string[] }[];
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
  dfs: DFSDetection;
  dfs_metrics: DFSMetrics | null;
  sessionDetection: SessionDetectionResult | null;
  annotations: AnnotationSummary | null;
}

// ── DFS Detection + Metrics ──

const DFS_PLATFORMS = ['prizepicks', 'prize picks', 'underdog', 'underdog fantasy', 'sleeper', 'dabble', 'thrive', 'vivid picks', 'boom fantasy', 'parlayplay', 'pick6', 'betr picks'];
// Kalshi intentionally excluded — prediction market contracts are binary bets, not multi-pick entries.
// They should be analyzed with standard sportsbook logic, not DFS pick count analysis.
// Future: add isPredictionMarket detection mode with contract/trade language.

export function detectDFSSource(bets: Bet[]): DFSDetection {
  if (bets.length === 0) return { isDFS: false, dfsPercent: 0, primaryPlatform: null, isMixed: false };

  const platformCounts = new Map<string, number>();
  let dfsCount = 0;

  for (const b of bets) {
    const book = (b.sportsbook ?? '').toLowerCase().trim();
    if (!book) continue;
    for (const p of DFS_PLATFORMS) {
      if (book.includes(p)) {
        dfsCount++;
        const normalized = p === 'prize picks' ? 'prizepicks' : p === 'underdog fantasy' ? 'underdog' : p;
        platformCounts.set(normalized, (platformCounts.get(normalized) ?? 0) + 1);
        break;
      }
    }
  }

  const dfsPercent = bets.length > 0 ? (dfsCount / bets.length) * 100 : 0;
  let primaryPlatform: string | null = null;
  let maxCount = 0;
  platformCounts.forEach((count, name) => {
    if (count > maxCount) { maxCount = count; primaryPlatform = name.charAt(0).toUpperCase() + name.slice(1); }
  });

  return {
    isDFS: dfsPercent >= 70,
    dfsPercent: Math.round(dfsPercent),
    primaryPlatform,
    isMixed: dfsPercent >= 30 && dfsPercent < 70,
  };
}

function getPickCount(bet: Bet): number {
  // Try parlay_legs first
  if (bet.parlay_legs && bet.parlay_legs > 1) return bet.parlay_legs;
  // Try "X-pick" pattern
  const pickMatch = bet.description.match(/(\d+)[- ]pick/i);
  if (pickMatch) return parseInt(pickMatch[1]);
  // Count " | " separators
  const legs = bet.description.split(' | ').filter(Boolean);
  if (legs.length > 1) return legs.length;
  // Fallback
  if (bet.bet_type === 'pick_em') return 2;
  return 2;
}

export function calculateDFSMetrics(bets: Bet[]): DFSMetrics {
  const settled = bets.filter((b) => b.result === 'win' || b.result === 'loss');

  // Pick count distribution
  const pickBuckets = new Map<number, { count: number; wins: number; staked: number; profit: number }>();
  for (const b of settled) {
    const picks = getPickCount(b);
    const bucket = pickBuckets.get(picks) ?? { count: 0, wins: 0, staked: 0, profit: 0 };
    bucket.count++;
    if (b.result === 'win') bucket.wins++;
    bucket.staked += Number(b.stake);
    bucket.profit += Number(b.profit);
    pickBuckets.set(picks, bucket);
  }

  const pickCountDistribution: DFSMetrics['pickCountDistribution'] = [];
  pickBuckets.forEach((v, picks) => {
    pickCountDistribution.push({
      picks,
      count: v.count,
      roi: v.staked > 0 ? Math.round((v.profit / v.staked) * 1000) / 10 : 0,
      profit: Math.round(v.profit),
      winRate: v.count > 0 ? Math.round((v.wins / v.count) * 1000) / 10 : 0,
    });
  });
  pickCountDistribution.sort((a, b) => a.picks - b.picks);

  // Power vs Flex
  let powerCount = 0, powerStaked = 0, powerProfit = 0;
  let flexCount = 0, flexStaked = 0, flexProfit = 0;
  let hasPowerFlex = false;
  for (const b of settled) {
    const desc = b.description.toLowerCase();
    if (desc.includes('power')) {
      powerCount++; powerStaked += Number(b.stake); powerProfit += Number(b.profit);
      hasPowerFlex = true;
    } else if (desc.includes('flex')) {
      flexCount++; flexStaked += Number(b.stake); flexProfit += Number(b.profit);
      hasPowerFlex = true;
    }
  }

  const powerVsFlex = hasPowerFlex ? {
    powerCount, powerROI: powerStaked > 0 ? Math.round((powerProfit / powerStaked) * 1000) / 10 : 0, powerProfit: Math.round(powerProfit),
    flexCount, flexROI: flexStaked > 0 ? Math.round((flexProfit / flexStaked) * 1000) / 10 : 0, flexProfit: Math.round(flexProfit),
  } : null;

  // Player concentration
  const playerCounts = new Map<string, { count: number; staked: number; profit: number }>();
  for (const b of settled) {
    const segments = b.description.split(' | ');
    for (const seg of segments) {
      // Extract player name: text before Over/Under
      const match = seg.match(/^(.+?)\s+(Over|Under|o\d|u\d)/i);
      if (match) {
        const player = match[1].trim().replace(/^\(\d+\)\s*/, ''); // remove seed numbers like (1)
        if (player.length > 2 && player.length < 40) {
          const p = playerCounts.get(player) ?? { count: 0, staked: 0, profit: 0 };
          p.count++; p.staked += Number(b.stake); p.profit += Number(b.profit);
          playerCounts.set(player, p);
        }
      }
    }
  }

  const totalEntries = settled.length;
  const playerConcentration: DFSMetrics['playerConcentration'] = [];
  playerCounts.forEach((v, player) => {
    if (v.count >= 3) {
      playerConcentration.push({
        player,
        count: v.count,
        percent: totalEntries > 0 ? Math.round((v.count / totalEntries) * 100) : 0,
        roi: v.staked > 0 ? Math.round((v.profit / v.staked) * 1000) / 10 : 0,
      });
    }
  });
  playerConcentration.sort((a, b) => b.count - a.count);

  // Avg pick count + pick count after loss/win
  let totalPicks = 0;
  const sorted = [...settled].sort((a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime());
  for (const b of sorted) totalPicks += getPickCount(b);
  const avgPickCount = settled.length > 0 ? Math.round((totalPicks / settled.length) * 10) / 10 : 0;

  let picksAfterLoss = 0, countAfterLoss = 0, picksAfterWin = 0, countAfterWin = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const picks = getPickCount(sorted[i]);
    if (prev.result === 'loss') { picksAfterLoss += picks; countAfterLoss++; }
    else if (prev.result === 'win') { picksAfterWin += picks; countAfterWin++; }
  }

  const pickCountAfterLoss = countAfterLoss > 0 ? Math.round((picksAfterLoss / countAfterLoss) * 10) / 10 : avgPickCount;
  const pickCountAfterWin = countAfterWin > 0 ? Math.round((picksAfterWin / countAfterWin) * 10) / 10 : avgPickCount;

  // Low pick vs high pick ROI
  const lowPick = pickCountDistribution.filter((d) => d.picks <= 3);
  const highPick = pickCountDistribution.filter((d) => d.picks >= 5);
  const lowStaked = lowPick.reduce((s, d) => s + (d.count > 0 ? d.profit / (d.roi / 100 || 1) : 0), 0);
  const lowProfit = lowPick.reduce((s, d) => s + d.profit, 0);
  const highStaked = highPick.reduce((s, d) => s + (d.count > 0 ? d.profit / (d.roi / 100 || 1) : 0), 0);
  const highProfit = highPick.reduce((s, d) => s + d.profit, 0);

  return {
    pickCountDistribution,
    powerVsFlex,
    playerConcentration: playerConcentration.slice(0, 10),
    avgPickCount,
    lowPickROI: lowStaked > 0 ? Math.round((lowProfit / lowStaked) * 1000) / 10 : 0,
    highPickROI: highStaked > 0 ? Math.round((highProfit / highStaked) * 1000) / 10 : 0,
    pickCountAfterLoss,
    pickCountAfterWin,
  };
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

  // Stake CV — odds-normalized to avoid penalizing intentional sizing
  // Convert each stake to its implied-risk equivalent: what you'd need to
  // stake at -110 to have the same potential loss.  This way, $200 at +500
  // and $50 at -110 produce similar normalized values.
  function impliedProb(americanOdds: number): number {
    if (americanOdds >= 0) return 100 / (americanOdds + 100);
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
  const BASELINE_PROB = impliedProb(-110); // ≈ 0.5238
  const normalizedStakes = sorted.map((b) => {
    const prob = impliedProb(b.odds);
    // Scale stake by (prob / baseline) — longer odds → smaller normalized stake
    return Number(b.stake) * (prob / BASELINE_PROB);
  });
  const normMean = normalizedStakes.length > 0
    ? normalizedStakes.reduce((a, b) => a + b, 0) / normalizedStakes.length : 0;
  const variance = normalizedStakes.length > 0
    ? normalizedStakes.reduce((s, v) => s + Math.pow(v - normMean, 2), 0) / normalizedStakes.length
    : 0;
  const stdDev = Math.sqrt(variance);
  const stakeCv = normMean > 0 ? stdDev / normMean : 0;

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
  // If bankroll not set, estimate conservatively — avgStake * 50 assumes reasonable bankroll management
  // (previously avgStake * 20 which was too aggressive and caused grade penalties for normal betting)
  const br = bankroll ? Number(bankroll) : avgStake * 50;
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
    // Capture bets where stake increased after a loss
    const chaseEvidence: { id: string; ratio: number }[] = [];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i - 1].result === 'loss' && Number(sorted[i].stake) > Number(sorted[i - 1].stake) * 1.15) {
        chaseEvidence.push({ id: sorted[i].id, ratio: Number(sorted[i].stake) / Number(sorted[i - 1].stake) });
      }
    }
    chaseEvidence.sort((a, b) => b.ratio - a.ratio);
    biases.push({ bias_name: 'Post-Loss Escalation', severity: sev, data: `ratio: ${lossChaseRatio.toFixed(2)}x (avg stake after loss: $${avgAfterLoss.toFixed(0)} vs after win: $${avgAfterWin.toFixed(0)})`, evidence_bet_ids: chaseEvidence.slice(0, 8).map(e => e.id) });
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
      // Capture losing parlays with highest stakes
      const losingParlays = parlays.filter(b => b.result === 'loss')
        .sort((a, b) => Number(b.stake) - Number(a.stake))
        .slice(0, 8)
        .map(b => b.id);
      biases.push({ bias_name: 'Heavy Parlay Tendency', severity: sev, data: `${parlayPercent.toFixed(0)}% parlays, parlay ROI: ${parlayRoi.toFixed(1)}% vs straight: ${straightRoi.toFixed(1)}%`, evidence_bet_ids: losingParlays });
    }
  }

  // Stake size chaos
  if (stakeCv >= 0.5) {
    const sev = stakeCv >= 1.8 ? 'critical' : stakeCv >= 1.2 ? 'high' : stakeCv >= 0.8 ? 'medium' : 'low';
    // Capture bets with most extreme stake deviations from median
    const stakeOutliers = [...sorted]
      .map(b => ({ id: b.id, dev: Math.abs(Number(b.stake) - medianStake) }))
      .sort((a, b) => b.dev - a.dev)
      .slice(0, 8)
      .map(b => b.id);
    biases.push({ bias_name: 'Stake Volatility', severity: sev, data: `Bet sizes range from $${minStake.toFixed(0)} to $${maxStake.toFixed(0)} (avg $${avgStake.toFixed(0)}) . ${stakeCv >= 1.0 ? 'wildly' : 'noticeably'} inconsistent sizing`, evidence_bet_ids: stakeOutliers });
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
    // Capture highest-stake favorites that lost
    const losingFavs = favBets.filter(b => b.result === 'loss')
      .sort((a, b) => Number(b.stake) - Number(a.stake))
      .slice(0, 8)
      .map(b => b.id);
    biases.push({ bias_name: 'Favorite-Heavy Lean', severity: sev, data: `${favPct.toFixed(0)}% favorites, fav ROI: ${favRoi.toFixed(1)}%, dog ROI: ${dogRoi.toFixed(1)}%`, evidence_bet_ids: losingFavs });
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

  const result: CalculatedMetrics = {
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
    betting_archetype: { name: '', description: '' }, // set below after DFS check
    timing: calculateTiming(sorted),
    odds: calculateOdds(sorted),
    dfs: detectDFSSource(sorted),
    dfs_metrics: null, // set below
    sessionDetection: sorted.length > 0 ? detectAndGradeSessions(sorted) : null,
    annotations: null, // set below after DFS detection
  };

  // DFS-specific metrics + archetype
  const dfsDetection = result.dfs;
  if (dfsDetection.isDFS) {
    result.dfs_metrics = calculateDFSMetrics(sorted);
    result.betting_archetype = determineDFSArchetype(result.dfs_metrics, emotionScore, stakeCv);
    // Replace parlay-related biases with DFS biases
    result.biases_detected = result.biases_detected.filter((b) => b.bias_name !== 'Heavy Parlay Tendency');
    const dm = result.dfs_metrics;
    const highPickEntries = dm.pickCountDistribution.filter((d) => d.picks >= 5);
    const highPickTotal = highPickEntries.reduce((s, d) => s + d.count, 0);
    const highPickPct = totalBets > 0 ? (highPickTotal / totalBets) * 100 : 0;
    if (highPickPct >= 50) {
      const sev = highPickPct >= 60 ? 'critical' : 'high';
      result.biases_detected.push({ bias_name: 'High-Pick Addiction', severity: sev, data: `${highPickTotal} entries at 5-6 picks (${Math.round(highPickPct)}%) with ${dm.highPickROI}% ROI vs ${dm.lowPickROI}% ROI on 2-3 pick entries` });
    }
    if (dm.powerVsFlex && dm.powerVsFlex.powerCount > 0) {
      const totalPF = dm.powerVsFlex.powerCount + dm.powerVsFlex.flexCount;
      const powerPct = totalPF > 0 ? (dm.powerVsFlex.powerCount / totalPF) * 100 : 0;
      if (powerPct > 55 && dm.powerVsFlex.powerROI < dm.powerVsFlex.flexROI) {
        const sev = powerPct > 65 ? 'high' : 'medium';
        result.biases_detected.push({ bias_name: 'Power Play Preference', severity: sev, data: `${dm.powerVsFlex.powerCount} Power entries (${Math.round(powerPct)}%) at ${dm.powerVsFlex.powerROI}% ROI vs ${dm.powerVsFlex.flexCount} Flex entries at ${dm.powerVsFlex.flexROI}% ROI` });
      }
    }
    if (dm.pickCountAfterLoss > dm.pickCountAfterWin * 1.2 && countAfterLoss > 2) {
      const sev = dm.pickCountAfterLoss > dm.pickCountAfterWin * 1.4 ? 'high' : 'medium';
      result.biases_detected.push({ bias_name: 'Multiplier Chasing', severity: sev, data: `Average pick count after loss: ${dm.pickCountAfterLoss} vs ${dm.pickCountAfterWin} after win . chasing bigger multipliers to recover` });
    }
    const topPlayer = dm.playerConcentration[0];
    if (topPlayer && topPlayer.percent >= 25) {
      const sev = topPlayer.percent >= 30 ? 'high' : 'medium';
      const top2 = dm.playerConcentration.slice(0, 2).map((p) => `${p.player} in ${p.percent}% of entries`).join(', ');
      result.biases_detected.push({ bias_name: 'Player Concentration Bias', severity: sev, data: `Top picks: ${top2}. Overexposure to individual player performance.` });
    }
  } else {
    result.betting_archetype = determineArchetype(roiPercent, emotionScore, lossChaseRatio, stakeCv, parlayPercent, favPct, totalBets, categoryRoi);
  }

  // Bet-by-bet annotations
  if (sorted.length > 0 && result.sessionDetection) {
    result.annotations = annotateBets(sorted, result.sessionDetection.sessions, medianStake, result.dfs);
  }

  return result;
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
    return { name: 'Sniper', description: "Selective and focused. You pick your spots . now it's about sharpening the edge." };
  }
  // Volume Warrior — lots of bets, flat stakes
  if (totalBets >= 150 && stakeCv < 0.8) {
    return { name: 'Volume Warrior', description: "You grind it out with consistent sizing. It's a sustainable approach . now find the leaks in the volume." };
  }
  // Degen King — high variance, mixed, emotional
  if (stakeCv >= 1.0 && parlayPct >= 20 && emotionScore > 40) {
    return { name: 'Degen King', description: "You're here for the ride. Embrace it , but know which parts of the ride are costing you." };
  }
  // Default
  return { name: 'The Grinder', description: "Consistent and steady. You've got a foundation . the analysis shows where to build on it." };
}

function determineDFSArchetype(dm: DFSMetrics, emotionScore: number, stakeCv: number): { name: string; description: string } {
  const highPickEntries = dm.pickCountDistribution.filter((d) => d.picks >= 5);
  const highPickPct = dm.pickCountDistribution.reduce((s, d) => s + d.count, 0) > 0
    ? (highPickEntries.reduce((s, d) => s + d.count, 0) / dm.pickCountDistribution.reduce((s, d) => s + d.count, 0)) * 100 : 0;

  // Multiplier Chaser — high pick count + bad ROI on high picks
  if (dm.avgPickCount > 4.5 && dm.highPickROI < -40) {
    return { name: 'Multiplier Chaser', description: "You keep swinging for the 20x payout when the 3x entries are where your edge lives. Every big Power Play feels like a lottery ticket , and it performs like one too." };
  }
  // All-or-Nothing — Power heavy + Flex is better
  if (dm.powerVsFlex && dm.powerVsFlex.powerCount > 0) {
    const totalPF = dm.powerVsFlex.powerCount + dm.powerVsFlex.flexCount;
    const powerPct = totalPF > 0 ? (dm.powerVsFlex.powerCount / totalPF) * 100 : 0;
    if (powerPct > 65 && dm.powerVsFlex.flexROI > dm.powerVsFlex.powerROI) {
      return { name: 'All-or-Nothing Player', description: "Power Play or nothing. You want the big hit, not the safe play. The math says Flex gives you better value, but the thrill is in the all-or-nothing." };
    }
  }
  // Loyalty Bettor — player concentration + emotional
  const topPlayer = dm.playerConcentration[0];
  if (topPlayer && topPlayer.percent >= 25 && emotionScore > 45) {
    return { name: 'Loyalty Bettor', description: `You ride with your guys. ${topPlayer.player} in ${topPlayer.percent}% of your entries isn't a strategy . it's a relationship.` };
  }
  // Fall through to standard archetypes based on discipline/emotion
  if (emotionScore <= 30 && stakeCv < 0.8) {
    return { name: 'The Natural', description: "Cool, calculated, and data-driven. You treat pick'em like a business, not a game." };
  }
  if (emotionScore > 55 && dm.pickCountAfterLoss > dm.pickCountAfterWin * 1.2) {
    return { name: 'Heated Bettor', description: "Your reads aren't bad , but your emotions turn winners into losing weeks. After losses you chase bigger multipliers." };
  }
  if (highPickPct > 60) {
    return { name: 'Multiplier Chaser', description: "You keep swinging for the 20x payout when the 3x entries are where your edge lives." };
  }
  return { name: 'The Grinder', description: "Steady and consistent. You've got a foundation . the analysis shows where to build on it." };
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

// ── Partial Analysis (JS-only, no Claude call) ──

// ── Population Percentile Baselines ──
// Hardcoded estimates from academic research (Edson et al. 2023, Tom et al. 2025, Newall et al. 2021).
// Will be replaced with real population data as user base grows.

const PERCENTILE_BASELINES = {
  discipline_score: { top_10: 78, top_25: 65, median: 48, bottom_25: 32, bottom_10: 20 },
  betiq_score: { top_10: 72, top_25: 58, median: 42, bottom_25: 28, bottom_10: 15 },
  emotion_score: { top_10: 22, top_25: 35, median: 52, bottom_25: 68, bottom_10: 82 },
  roi_percent: { top_10: 5.0, top_25: 0.5, median: -4.0, bottom_25: -12.0, bottom_10: -25.0 },
};

export function estimatePercentile(
  metric: keyof typeof PERCENTILE_BASELINES,
  value: number,
  lowerIsBetter = false
): number {
  const b = PERCENTILE_BASELINES[metric];
  if (lowerIsBetter) {
    if (value <= b.top_10) return 95;
    if (value <= b.top_25) return 80;
    if (value <= b.median) return 55;
    if (value <= b.bottom_25) return 30;
    if (value <= b.bottom_10) return 12;
    return 5;
  } else {
    if (value >= b.top_10) return 95;
    if (value >= b.top_25) return 80;
    if (value >= b.median) return 55;
    if (value >= b.bottom_25) return 30;
    if (value >= b.bottom_10) return 12;
    return 5;
  }
}

export function calculateBetIQ(metrics: CalculatedMetrics, bets: Bet[]): BetIQResult {
  const settled = bets.filter(b => b.result === 'win' || b.result === 'loss');

  if (settled.length < 50) {
    return {
      score: 0,
      components: { line_value: 0, calibration: 0, sophistication: 0, specialization: 0, timing: 0, confidence: 0 },
      percentile: 50,
      interpretation: `Need at least 50 settled bets for a meaningful BetIQ score. You have ${settled.length}.`,
      insufficient_data: true,
    };
  }

  // COMPONENT 1: LINE VALUE (0-25)
  let lineValue = 0;
  const straightBets = settled.filter(b => b.bet_type !== 'parlay' && (!b.parlay_legs || b.parlay_legs <= 1));
  if (straightBets.length >= 10) {
    const goodJuice = straightBets.filter(b => {
      const odds = Number(b.odds);
      return odds > 0 || odds >= -110;
    });
    const goodJuicePct = (goodJuice.length / straightBets.length) * 100;
    if (goodJuicePct >= 70) lineValue += 10;
    else if (goodJuicePct >= 50) lineValue += 7;
    else if (goodJuicePct >= 30) lineValue += 4;
    else lineValue += 1;
  }
  const favBets = straightBets.filter(b => Number(b.odds) < 0);
  if (favBets.length >= 10) {
    const avgFavOdds = favBets.reduce((s, b) => s + Number(b.odds), 0) / favBets.length;
    if (avgFavOdds >= -115) lineValue += 8;
    else if (avgFavOdds >= -125) lineValue += 5;
    else if (avgFavOdds >= -140) lineValue += 3;
    else lineValue += 1;
  }
  if (metrics.odds && metrics.odds.buckets) {
    const dogBuckets = metrics.odds.buckets.filter(b => b.implied_prob < 50 && b.bets >= 5);
    const posEdgeDogs = dogBuckets.filter(b => b.edge > 0);
    if (posEdgeDogs.length > 0) lineValue += 7;
    else if (dogBuckets.length > 0 && dogBuckets.some(b => b.edge > -3)) lineValue += 3;
  }
  lineValue = Math.min(25, lineValue);

  // COMPONENT 2: CALIBRATION (0-20)
  let calibration = 0;
  if (metrics.odds && metrics.odds.buckets) {
    const validBuckets = metrics.odds.buckets.filter(b => b.bets >= 10);
    if (validBuckets.length >= 2) {
      const totalBetsInBuckets = validBuckets.reduce((s, b) => s + b.bets, 0);
      const weightedMAE = validBuckets.reduce((s, b) => {
        return s + Math.abs(b.win_rate - b.implied_prob) * (b.bets / totalBetsInBuckets);
      }, 0);
      if (weightedMAE < 3) calibration = 20;
      else if (weightedMAE < 6) calibration = 15;
      else if (weightedMAE < 10) calibration = 10;
      else if (weightedMAE < 15) calibration = 5;
      else calibration = 2;
    }
  }

  // COMPONENT 3: SOPHISTICATION (0-15)
  let sophistication = 0;
  const parlayPct = metrics.parlay_stats.parlay_percent;
  if (parlayPct <= 5) sophistication = 15;
  else if (parlayPct <= 15) sophistication = 12;
  else if (parlayPct <= 25) sophistication = 9;
  else if (parlayPct <= 40) sophistication = 6;
  else if (parlayPct <= 60) sophistication = 3;
  else sophistication = 1;
  const longParlays = settled.filter(b => b.parlay_legs && b.parlay_legs >= 5);
  if (longParlays.length > 5) sophistication = Math.max(0, sophistication - 3);

  // COMPONENT 4: SPECIALIZATION (0-15)
  let specialization = 0;
  const sportCats = metrics.category_roi.filter(c => {
    return !c.category.includes(' ') && c.count >= 15 && c.roi > 0;
  });
  if (sportCats.length >= 1) specialization += 5;
  if (sportCats.some(c => c.count >= 30 && c.roi > 3)) specialization += 5;
  if (sportCats.some(c => c.roi > 8)) specialization += 5;
  const sportTypeCats = metrics.category_roi.filter(c => {
    return c.category.includes(' ') && c.count >= 10 && c.roi > 0;
  });
  if (sportTypeCats.length >= 1 && specialization < 10) specialization += 3;
  specialization = Math.min(15, specialization);

  // COMPONENT 5: TIMING (0-10)
  let timing = 0;
  if (metrics.timing && metrics.timing.has_time_data) {
    const lateNight = metrics.timing.late_night_stats;
    if (!lateNight || lateNight.pct_of_total < 5) timing += 5;
    else if (lateNight.pct_of_total < 15) timing += 3;
    else timing += 1;
    if (metrics.timing.best_window && metrics.timing.worst_window) {
      const spread = metrics.timing.best_window.roi - metrics.timing.worst_window.roi;
      if (spread > 20) timing += 5;
      else if (spread > 10) timing += 3;
      else timing += 2;
    }
  } else {
    timing = 5;
  }
  timing = Math.min(10, timing);

  // COMPONENT 6: CONFIDENCE (0-15)
  let confidence = 0;
  if (settled.length >= 500) confidence = 15;
  else if (settled.length >= 300) confidence = 12;
  else if (settled.length >= 150) confidence = 9;
  else if (settled.length >= 75) confidence = 6;
  else confidence = 3;

  // COMPOSITE
  const score = Math.min(100, lineValue + calibration + sophistication + specialization + timing + confidence);
  const percentile = estimatePercentile('betiq_score', score);

  let interpretation = '';
  if (score >= 75) interpretation = 'Elite-level betting skill. You consistently find value and specialize where you have edge.';
  else if (score >= 60) interpretation = 'Above-average skill. You have identifiable edges . the question is whether you\'re exploiting them enough.';
  else if (score >= 45) interpretation = 'Moderate skill level. Some promising spots, but you\'re also making bets without clear edge.';
  else if (score >= 30) interpretation = 'Below average. Focus on the 1-2 areas where you actually show positive ROI and cut everything else.';
  else interpretation = 'Significant room for improvement. Your bet selection suggests recreational patterns . start tracking WHY you make each bet.';

  return {
    score,
    components: { line_value: lineValue, calibration, sophistication, specialization, timing, confidence },
    percentile,
    interpretation,
    insufficient_data: false,
  };
}

// ── Enhanced Tilt Index ──

export function calculateEnhancedTilt(metrics: CalculatedMetrics, bets: Bet[]): EnhancedTiltResult {
  const settled = bets.filter(b => b.result === 'win' || b.result === 'loss');
  const sorted = [...settled].sort((a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime());

  // SESSION ACCELERATION (0-25)
  let sessionAcceleration = 0;
  const sessions: Bet[][] = [];
  let currentSession: Bet[] = [];
  for (const bet of sorted) {
    if (currentSession.length === 0) { currentSession.push(bet); continue; }
    const lastTime = new Date(currentSession[currentSession.length - 1].placed_at).getTime();
    const thisTime = new Date(bet.placed_at).getTime();
    if ((thisTime - lastTime) / (1000 * 60 * 60) <= 3) {
      currentSession.push(bet);
    } else {
      if (currentSession.length >= 4) sessions.push([...currentSession]);
      currentSession = [bet];
    }
  }
  if (currentSession.length >= 4) sessions.push(currentSession);

  if (sessions.length >= 2) {
    let acceleratingSessions = 0;
    let totalAccelRatio = 0;
    for (const session of sessions) {
      if (session.length < 4) continue;
      const mid = Math.floor(session.length / 2);
      const firstHalf = session.slice(0, mid);
      const secondHalf = session.slice(mid);
      const firstSpan = Math.max((new Date(firstHalf[firstHalf.length - 1].placed_at).getTime() - new Date(firstHalf[0].placed_at).getTime()) / 3600000, 0.1);
      const secondSpan = Math.max((new Date(secondHalf[secondHalf.length - 1].placed_at).getTime() - new Date(secondHalf[0].placed_at).getTime()) / 3600000, 0.1);
      const firstRate = firstHalf.length / firstSpan;
      const secondRate = secondHalf.length / secondSpan;
      if (secondRate > firstRate * 1.3) {
        acceleratingSessions++;
        totalAccelRatio += secondRate / firstRate;
      }
    }
    if (sessions.length > 0) {
      const accelPct = (acceleratingSessions / sessions.length) * 100;
      const avgRatio = acceleratingSessions > 0 ? totalAccelRatio / acceleratingSessions : 1;
      if (accelPct >= 60 && avgRatio >= 2.0) sessionAcceleration = 25;
      else if (accelPct >= 40 && avgRatio >= 1.8) sessionAcceleration = 20;
      else if (accelPct >= 30) sessionAcceleration = 15;
      else if (accelPct >= 20) sessionAcceleration = 10;
      else if (acceleratingSessions >= 1) sessionAcceleration = 5;
    }
  }

  // ODDS DRIFT AFTER LOSS (0-25)
  let oddsDrift = 0;
  const afterWinOdds: number[] = [];
  const afterLossOdds: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prevResult = sorted[i - 1].result;
    const odds = Number(sorted[i].odds);
    const impliedProb = odds > 0
      ? 100 / (odds + 100) * 100
      : Math.abs(odds) / (Math.abs(odds) + 100) * 100;
    if (prevResult === 'win') afterWinOdds.push(impliedProb);
    else if (prevResult === 'loss') afterLossOdds.push(impliedProb);
  }
  if (afterWinOdds.length >= 10 && afterLossOdds.length >= 10) {
    const avgAfterWin = afterWinOdds.reduce((s, v) => s + v, 0) / afterWinOdds.length;
    const avgAfterLoss = afterLossOdds.reduce((s, v) => s + v, 0) / afterLossOdds.length;
    const driftPp = avgAfterWin - avgAfterLoss;
    if (driftPp >= 8) oddsDrift = 25;
    else if (driftPp >= 5) oddsDrift = 20;
    else if (driftPp >= 3) oddsDrift = 15;
    else if (driftPp >= 1.5) oddsDrift = 10;
    else if (driftPp >= 0.5) oddsDrift = 5;
  }

  const signals: TiltSignals = {
    bet_sizing_volatility: metrics.emotion_breakdown.stake_volatility,
    loss_reaction: metrics.emotion_breakdown.loss_chasing,
    streak_behavior: metrics.emotion_breakdown.streak_behavior,
    session_discipline: metrics.emotion_breakdown.session_discipline,
    session_acceleration: sessionAcceleration,
    odds_drift_after_loss: oddsDrift,
  };

  const score = metrics.emotion_score;
  const totalSignal = Object.values(signals).reduce((s, v) => s + v, 0);
  const signalPct = (totalSignal / 150) * 100;

  let riskLevel: EnhancedTiltResult['risk_level'] = 'low';
  if (signalPct >= 70) riskLevel = 'critical';
  else if (signalPct >= 55) riskLevel = 'high';
  else if (signalPct >= 40) riskLevel = 'elevated';
  else if (signalPct >= 25) riskLevel = 'moderate';

  const signalEntries = Object.entries(signals) as [string, number][];
  const worstSignal = signalEntries.reduce((a, b) => b[1] > a[1] ? b : a);
  const triggerDescriptions: Record<string, string> = {
    bet_sizing_volatility: `Your bet sizes vary wildly . a ${metrics.stake_cv.toFixed(1)}x coefficient of variation suggests emotional sizing.`,
    loss_reaction: `Your stakes increase ${metrics.loss_chase_ratio.toFixed(1)}x after losses . classic loss chasing.`,
    streak_behavior: 'Your betting behavior deteriorates significantly during losing streaks.',
    session_discipline: 'Your losing sessions run much longer than your winning ones . you don\'t know when to stop.',
    session_acceleration: 'Your bet frequency increases within sessions . you place bets faster as sessions progress, especially after losses.',
    odds_drift_after_loss: 'After losses, you shift toward longer odds . chasing bigger payouts to recover instead of sticking to your edge.',
  };

  return {
    score,
    signals,
    risk_level: riskLevel,
    worst_trigger: triggerDescriptions[worstSignal[0]] ?? 'Multiple emotional signals detected.',
    percentile: estimatePercentile('emotion_score', score, true),
  };
}

// ── Pertinent Negatives ──

const ALL_BIAS_CHECKS: { name: string; matchNames: string[]; populationPercent: number; cleanDetail: string }[] = [
  { name: 'Loss Chasing', matchNames: ['loss chasing', 'post-loss escalation', 'post loss escalation', 'chase'], populationPercent: 73, cleanDetail: 'Your stake sizing remains consistent after losses. {pct}% of bettors show measurable post-loss escalation.' },
  { name: 'Parlay Overuse', matchNames: ['parlay', 'multi-leg', 'parlay addiction', 'heavy parlay'], populationPercent: 68, cleanDetail: 'Your parlay volume is within reasonable bounds. {pct}% of bettors over-allocate to parlays.' },
  { name: 'Late Night Bias', matchNames: ['late night', 'late-night', 'overnight'], populationPercent: 45, cleanDetail: 'No significant late-night performance decay detected. {pct}% of bettors show worse outcomes after 10pm.' },
  { name: 'Emotional Betting', matchNames: ['emotional', 'heated', 'tilt'], populationPercent: 61, cleanDetail: 'Session behavior stays disciplined under pressure. {pct}% of bettors show heated sessions exceeding 25% of total.' },
  { name: 'Favorite Bias', matchNames: ['favorite', 'favourite', 'chalk', 'favorite-heavy'], populationPercent: 52, cleanDetail: 'No systematic over-betting of favorites detected. {pct}% of bettors lean too heavily on chalk.' },
  { name: 'Sunk Cost', matchNames: ['sunk cost', 'same team', 'doubling down'], populationPercent: 38, cleanDetail: 'No pattern of chasing losing teams or players. {pct}% of bettors double down on losing selections.' },
];

export function generatePertinentNegatives(
  detectedBiasNames: string[]
): import('@/types').PertinentNegative[] {
  const detected = detectedBiasNames.map(n => n.toLowerCase());

  const negatives: import('@/types').PertinentNegative[] = [];

  for (const check of ALL_BIAS_CHECKS) {
    const isDetected = check.matchNames.some(m =>
      detected.some(d => d.includes(m) || m.includes(d))
    );
    if (!isDetected) {
      negatives.push({
        pattern: check.name,
        finding: 'Not detected',
        detail: check.cleanDetail.replace('{pct}', String(check.populationPercent)),
        populationPercent: check.populationPercent,
      });
    }
  }

  return negatives
    .sort((a, b) => b.populationPercent - a.populationPercent)
    .slice(0, 4);
}

// ── Sport-Specific Pattern Detection ──

export function detectSportSpecificPatterns(metrics: CalculatedMetrics, bets: Bet[]): SportSpecificFinding[] {
  const findings: SportSpecificFinding[] = [];
  const settled = bets.filter(b => b.result === 'win' || b.result === 'loss');

  // NFL
  const nflBets = settled.filter(b => b.sport?.toUpperCase() === 'NFL');
  if (nflBets.length >= 15) {
    const nflSpreads = nflBets.filter(b => b.bet_type === 'spread');
    if (nflSpreads.length >= 10) {
      const heavyJuice = nflSpreads.filter(b => Number(b.odds) <= -115);
      const heavyJuicePct = (heavyJuice.length / nflSpreads.length) * 100;
      const heavyJuiceProfit = heavyJuice.reduce((s, b) => s + Number(b.profit), 0);
      if (heavyJuicePct >= 40 && heavyJuiceProfit < 0) {
        findings.push({
          id: 'NFL-KEY-NUMBERS', name: 'Key number juice overpay', sport: 'NFL',
          severity: heavyJuicePct >= 60 ? 'high' : 'medium',
          description: 'You\'re consistently paying premium juice (-115 or worse) on NFL spreads, likely buying through key numbers 3 and 7.',
          evidence: `${heavyJuicePct.toFixed(0)}% of NFL spread bets at -115 or worse (${heavyJuice.length}/${nflSpreads.length}). Net: $${Math.round(heavyJuiceProfit)}.`,
          estimated_cost: heavyJuiceProfit < 0 ? Math.round(heavyJuiceProfit) : null,
          recommendation: 'Shop for better lines instead of paying extra juice. A -110 line costs $4.55 less per $100 staked than -115.',
        });
      }
    }
    const nflParlays = nflBets.filter(b => b.bet_type === 'parlay' || (b.parlay_legs && b.parlay_legs > 1));
    const nflParlayPct = (nflParlays.length / nflBets.length) * 100;
    const nflParlayProfit = nflParlays.reduce((s, b) => s + Number(b.profit), 0);
    const nflStraightProfit = nflBets.filter(b => b.bet_type !== 'parlay' && (!b.parlay_legs || b.parlay_legs <= 1)).reduce((s, b) => s + Number(b.profit), 0);
    if (nflParlayPct >= 30 && nflParlayProfit < 0 && nflStraightProfit > 0) {
      findings.push({
        id: 'NFL-PARLAY-DRAG', name: 'NFL parlay drag', sport: 'NFL',
        severity: nflParlayPct >= 50 ? 'high' : 'medium',
        description: 'Your NFL straight bets are profitable, but NFL parlays are dragging your overall NFL ROI down.',
        evidence: `NFL straight bets: +$${Math.round(nflStraightProfit)}. NFL parlays (${nflParlayPct.toFixed(0)}%): $${Math.round(nflParlayProfit)}.`,
        estimated_cost: nflParlayProfit < 0 ? Math.round(nflParlayProfit) : null,
        recommendation: 'Take your NFL reads and make them singles. Your NFL edge is in straight bets . parlays are erasing it.',
      });
    }
  }

  // NBA
  const nbaBets = settled.filter(b => b.sport?.toUpperCase() === 'NBA');
  if (nbaBets.length >= 15) {
    const nbaProps = nbaBets.filter(b => b.bet_type === 'prop');
    if (nbaProps.length >= 10) {
      const nbaPropsStaked = nbaProps.reduce((s, b) => s + Number(b.stake), 0);
      const nbaPropsProfit = nbaProps.reduce((s, b) => s + Number(b.profit), 0);
      const nbaPropsROI = nbaPropsStaked > 0 ? (nbaPropsProfit / nbaPropsStaked) * 100 : 0;
      const nbaPropPct = (nbaProps.length / nbaBets.length) * 100;
      if (nbaPropPct >= 30 && nbaPropsROI < -5) {
        findings.push({
          id: 'NBA-PROP-OVEREXPOSURE', name: 'NBA player prop overexposure', sport: 'NBA',
          severity: nbaPropsROI < -15 ? 'high' : nbaPropPct >= 50 ? 'high' : 'medium',
          description: 'Heavy NBA player prop volume with negative returns. The prop market is sharp and the juice is high.',
          evidence: `${nbaPropPct.toFixed(0)}% of NBA bets are props (${nbaProps.length}). Props ROI: ${nbaPropsROI.toFixed(1)}%, net $${Math.round(nbaPropsProfit)}.`,
          estimated_cost: nbaPropsProfit < 0 ? Math.round(nbaPropsProfit) : null,
          recommendation: 'Cut NBA prop volume by at least 50%. Focus on spreads and totals where inefficiency is greater.',
        });
      }
    }
    const nbaDayGroups = new Map<string, Bet[]>();
    for (const b of nbaBets) {
      const day = b.placed_at.split('T')[0];
      const group = nbaDayGroups.get(day) ?? [];
      group.push(b);
      nbaDayGroups.set(day, group);
    }
    let rapidNBADays = 0;
    nbaDayGroups.forEach(dayBets => { if (dayBets.length >= 4) rapidNBADays++; });
    if (rapidNBADays >= 3) {
      const rapidDayBets = Array.from(nbaDayGroups.values()).filter(d => d.length >= 4).flat();
      const rapidProfit = rapidDayBets.reduce((s, b) => s + Number(b.profit), 0);
      if (rapidProfit < 0) {
        findings.push({
          id: 'NBA-RAPID-BETTING', name: 'NBA rapid-fire sessions', sport: 'NBA',
          severity: rapidNBADays >= 6 ? 'high' : 'medium',
          description: 'Multiple days with 4+ NBA bets suggest live/in-play betting or emotional reactions to game flow.',
          evidence: `${rapidNBADays} days with 4+ NBA bets. Combined: $${Math.round(rapidProfit)}.`,
          estimated_cost: rapidProfit < 0 ? Math.round(rapidProfit) : null,
          recommendation: 'Limit yourself to pre-game NBA bets only. Live betting NBA is where emotional decisions get expensive.',
        });
      }
    }
  }

  // MLB
  const mlbBets = settled.filter(b => b.sport?.toUpperCase() === 'MLB');
  if (mlbBets.length >= 20) {
    const mlbML = mlbBets.filter(b => b.bet_type === 'moneyline');
    const mlbMLPct = (mlbML.length / mlbBets.length) * 100;
    if (mlbMLPct >= 80) {
      const mlbMLStaked = mlbML.reduce((s, b) => s + Number(b.stake), 0);
      const mlbMLProfit = mlbML.reduce((s, b) => s + Number(b.profit), 0);
      const mlbMLROI = mlbMLStaked > 0 ? (mlbMLProfit / mlbMLStaked) * 100 : 0;
      findings.push({
        id: 'MLB-ML-ONLY', name: 'MLB moneyline tunnel vision', sport: 'MLB',
        severity: mlbMLROI < -8 ? 'medium' : 'low',
        description: 'Almost all your MLB bets are moneylines. Run lines and totals often offer better value in baseball.',
        evidence: `${mlbMLPct.toFixed(0)}% of MLB bets are moneylines (${mlbML.length}/${mlbBets.length}). ML ROI: ${mlbMLROI.toFixed(1)}%.`,
        estimated_cost: null,
        recommendation: 'Explore run lines . the +1.5 on underdogs with good pitching matchups is often where MLB value hides.',
      });
    }
  }

  // DFS
  if (metrics.dfs.isDFS && metrics.dfs_metrics) {
    const dm = metrics.dfs_metrics;
    if (dm.avgPickCount > 4 && dm.highPickROI < -10) {
      findings.push({
        id: 'DFS-HIGH-PICK-CHASE', name: 'Multiplier chasing', sport: 'DFS',
        severity: dm.avgPickCount > 5 ? 'high' : 'medium',
        description: 'You\'re averaging 5+ picks per entry chasing large multipliers, but expected value drops sharply above 3 picks.',
        evidence: `Avg ${dm.avgPickCount.toFixed(1)} picks/entry. 4+ pick ROI: ${dm.highPickROI.toFixed(1)}%. 2-3 pick ROI: ${dm.lowPickROI.toFixed(1)}%.`,
        estimated_cost: null,
        recommendation: 'Shift to 2-3 pick entries. Your hit rate is almost certainly better at lower pick counts.',
      });
    }
    if (dm.pickCountAfterLoss > dm.pickCountAfterWin * 1.15) {
      const ratio = dm.pickCountAfterLoss / dm.pickCountAfterWin;
      findings.push({
        id: 'DFS-LOSS-ESCALATION', name: 'DFS pick count escalation after loss', sport: 'DFS',
        severity: ratio > 1.4 ? 'high' : 'medium',
        description: 'After losses, you increase your pick count . going for bigger multipliers to recover.',
        evidence: `Avg picks after loss: ${dm.pickCountAfterLoss.toFixed(1)} vs after win: ${dm.pickCountAfterWin.toFixed(1)} (${((ratio - 1) * 100).toFixed(0)}% increase).`,
        estimated_cost: null,
        recommendation: 'Set a rule: your pick count should never change based on your last result.',
      });
    }
  }

  return findings;
}

// ── Session Detection & Grading ──

export function detectAndGradeSessions(bets: Bet[]): SessionDetectionResult {
  const sorted = [...bets].sort((a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime());

  if (sorted.length === 0) {
    return {
      sessions: [],
      totalSessions: 0,
      avgSessionLength: 0,
      avgSessionDuration: 0,
      sessionGradeDistribution: [],
      heatedSessionCount: 0,
      heatedSessionPercent: 0,
      avgGradedROI: {},
      bestSession: null,
      worstSession: null,
      insight: 'No bets to analyze.',
    };
  }

  // Split bets into sessions (gap > 3 hours)
  const sessionGroups: { bets: Bet[]; indices: number[] }[] = [];
  let currentBets: Bet[] = [sorted[0]];
  let currentIndices: number[] = [0];

  for (let i = 1; i < sorted.length; i++) {
    const prevTime = new Date(sorted[i - 1].placed_at).getTime();
    const thisTime = new Date(sorted[i].placed_at).getTime();
    if (thisTime - prevTime > 3 * 3600000) {
      sessionGroups.push({ bets: currentBets, indices: currentIndices });
      currentBets = [sorted[i]];
      currentIndices = [i];
    } else {
      currentBets.push(sorted[i]);
      currentIndices.push(i);
    }
  }
  sessionGroups.push({ bets: currentBets, indices: currentIndices });

  // Build DetectedSession for each group
  const sessions: DetectedSession[] = sessionGroups.map((group, idx) => {
    const sessionBets = group.bets;
    const firstBet = sessionBets[0];
    const lastBet = sessionBets[sessionBets.length - 1];
    const startDate = new Date(firstBet.placed_at);
    const endDate = new Date(lastBet.placed_at);

    const durationMinutes = Math.max(0, (endDate.getTime() - startDate.getTime()) / 60000);

    const wins = sessionBets.filter(b => b.result === 'win').length;
    const losses = sessionBets.filter(b => b.result === 'loss').length;
    const pushes = sessionBets.filter(b => b.result === 'push').length;

    const stakes = sessionBets.map(b => Number(b.stake));
    const staked = stakes.reduce((s, v) => s + v, 0);
    const profit = sessionBets.reduce((s, b) => s + Number(b.profit), 0);
    const roi = staked > 0 ? (profit / staked) * 100 : 0;
    const avgStake = sessionBets.length > 0 ? staked / sessionBets.length : 0;
    const startingStake = Number(firstBet.stake);
    const endingStake = Number(lastBet.stake);
    const stakeEscalation = startingStake > 0 ? endingStake / startingStake : 1;
    const maxStake = Math.max(...stakes);
    const minStake = Math.min(...stakes);

    // Coefficient of variation of stakes
    const stakeMean = avgStake;
    const stakeVariance = stakes.length > 0
      ? stakes.reduce((s, v) => s + Math.pow(v - stakeMean, 2), 0) / stakes.length
      : 0;
    const stakeCv = stakeMean > 0 ? Math.sqrt(stakeVariance) / stakeMean : 0;

    const betsPerHour = sessionBets.length / Math.max(durationMinutes / 60, 0.1);

    // Longest loss streak
    let longestLossStreak = 0;
    let currentLossStreak = 0;
    for (const b of sessionBets) {
      if (b.result === 'loss') {
        currentLossStreak++;
        if (currentLossStreak > longestLossStreak) longestLossStreak = currentLossStreak;
      } else {
        currentLossStreak = 0;
      }
    }

    // Chase detection
    let chasedAfterLoss = false;
    let chaseCount = 0;
    for (let i = 1; i < sessionBets.length; i++) {
      if (sessionBets[i - 1].result === 'loss') {
        if (Number(sessionBets[i].stake) > Number(sessionBets[i - 1].stake)) {
          chasedAfterLoss = true;
          chaseCount++;
        }
      }
    }

    // Late night check (any bet after 23:00)
    const lateNight = sessionBets.some(b => new Date(b.placed_at).getHours() >= 23);

    const id = `SESSION-${String(idx + 1).padStart(3, '0')}`;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Grading (start at 100)
    let score = 100;
    const deductions: { points: number; reason: string }[] = [];

    if (stakeEscalation > 2.0) { score -= 20; deductions.push({ points: 20, reason: 'Stakes escalated more than 2x from start to finish' }); }
    else if (stakeEscalation > 1.5) { score -= 12; deductions.push({ points: 12, reason: 'Stakes escalated more than 1.5x during the session' }); }

    if (stakeCv > 0.8) { score -= 10; deductions.push({ points: 10, reason: 'Highly inconsistent stake sizing within session' }); }
    else if (stakeCv > 0.5) { score -= 5; deductions.push({ points: 5, reason: 'Moderately inconsistent stake sizing within session' }); }

    if (chasedAfterLoss) { score -= 8; deductions.push({ points: 8, reason: 'Increased stakes after a loss' }); }
    if (chaseCount >= 3) { score -= 12; deductions.push({ points: 12, reason: `Chased losses ${chaseCount} times in a single session` }); }

    if (sessionBets.length > 10) { score -= 15; deductions.push({ points: 15, reason: `Placed ${sessionBets.length} bets in one session . marathon session` }); }
    else if (sessionBets.length > 7) { score -= 8; deductions.push({ points: 8, reason: `Placed ${sessionBets.length} bets in one session` }); }

    if (betsPerHour > 4) { score -= 10; deductions.push({ points: 10, reason: `Rapid-fire betting at ${betsPerHour.toFixed(1)} bets/hour` }); }
    else if (betsPerHour > 2.5) { score -= 5; deductions.push({ points: 5, reason: `Elevated pace at ${betsPerHour.toFixed(1)} bets/hour` }); }

    if (lateNight) { score -= 5; deductions.push({ points: 5, reason: 'Late-night betting (after 11pm)' }); }

    if (longestLossStreak >= 5) { score -= 10; deductions.push({ points: 10, reason: `${longestLossStreak} consecutive losses without stopping` }); }
    else if (longestLossStreak >= 3) { score -= 5; deductions.push({ points: 5, reason: `${longestLossStreak} consecutive losses` }); }

    if (roi < -30) { score -= 8; deductions.push({ points: 8, reason: `Heavy losses this session (${roi.toFixed(1)}% ROI)` }); }
    else if (roi < -15) { score -= 4; deductions.push({ points: 4, reason: `Significant losses this session (${roi.toFixed(1)}% ROI)` }); }

    score = Math.max(0, score);
    const grade: DetectedSession['grade'] = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';

    // Top 1-3 deductions as gradeReasons
    deductions.sort((a, b) => b.points - a.points);
    const gradeReasons = deductions.slice(0, 3).map(d => d.reason);

    // Heated detection
    const isHeated =
      (grade === 'D' || grade === 'F') ||
      (stakeEscalation > 2.0 && chasedAfterLoss) ||
      (betsPerHour > 4 && longestLossStreak >= 3) ||
      (sessionBets.length >= 8 && roi < -25);

    const heatSignals: string[] = [];
    if (grade === 'D' || grade === 'F') heatSignals.push(`Session grade: ${grade}`);
    if (stakeEscalation > 2.0 && chasedAfterLoss) heatSignals.push('Stakes more than doubled while chasing losses');
    if (betsPerHour > 4 && longestLossStreak >= 3) heatSignals.push('Rapid-fire betting during a loss streak');
    if (sessionBets.length >= 8 && roi < -25) heatSignals.push('Extended session with heavy losses');

    return {
      id,
      date: startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      dayOfWeek: dayNames[startDate.getDay()],
      startTime: startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      endTime: endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      durationMinutes: round2(durationMinutes),
      bets: sessionBets.length,
      wins,
      losses,
      pushes,
      staked: round2(staked),
      profit: round2(profit),
      roi: round2(roi),
      avgStake: round2(avgStake),
      startingStake: round2(startingStake),
      endingStake: round2(endingStake),
      stakeEscalation: round2(stakeEscalation),
      maxStake: round2(maxStake),
      minStake: round2(minStake),
      stakeCv: round2(stakeCv),
      betsPerHour: round2(betsPerHour),
      longestLossStreak,
      chasedAfterLoss,
      chaseCount,
      lateNight,
      grade,
      gradeReasons,
      isHeated,
      heatSignals,
      betIndices: group.indices,
    };
  });

  // Aggregates
  const totalSessions = sessions.length;
  const avgSessionLength = totalSessions > 0 ? sessions.reduce((s, sess) => s + sess.bets, 0) / totalSessions : 0;
  const avgSessionDuration = totalSessions > 0 ? sessions.reduce((s, sess) => s + sess.durationMinutes, 0) / totalSessions : 0;

  // Grade distribution
  const gradeCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const sess of sessions) gradeCounts[sess.grade]++;
  const sessionGradeDistribution = Object.entries(gradeCounts).map(([grade, count]) => ({
    grade,
    count,
    percent: totalSessions > 0 ? round2((count / totalSessions) * 100) : 0,
  }));

  // Average ROI by grade
  const avgGradedROI: Record<string, number> = {};
  for (const g of ['A', 'B', 'C', 'D', 'F']) {
    const gradeSessions = sessions.filter(s => s.grade === g);
    if (gradeSessions.length > 0) {
      avgGradedROI[g] = round2(gradeSessions.reduce((s, sess) => s + sess.roi, 0) / gradeSessions.length);
    }
  }

  // Heated stats
  const heatedSessions = sessions.filter(s => s.isHeated);
  const heatedSessionCount = heatedSessions.length;
  const heatedSessionPercent = totalSessions > 0 ? round2((heatedSessionCount / totalSessions) * 100) : 0;

  // Best session: highest profit with grade A or B, fallback highest profit
  const abSessions = sessions.filter(s => s.grade === 'A' || s.grade === 'B');
  let bestSession: DetectedSession | null = null;
  if (abSessions.length > 0) {
    bestSession = abSessions.reduce((best, s) => s.profit > best.profit ? s : best, abSessions[0]);
  } else if (sessions.length > 0) {
    bestSession = sessions.reduce((best, s) => s.profit > best.profit ? s : best, sessions[0]);
  }

  // Worst session: lowest profit that's heated, fallback lowest profit
  let worstSession: DetectedSession | null = null;
  if (heatedSessions.length > 0) {
    worstSession = heatedSessions.reduce((worst, s) => s.profit < worst.profit ? s : worst, heatedSessions[0]);
  } else if (sessions.length > 0) {
    worstSession = sessions.reduce((worst, s) => s.profit < worst.profit ? s : worst, sessions[0]);
  }

  // Insight
  let insight: string;
  if (heatedSessionCount === 0) {
    insight = `Across ${totalSessions} sessions, discipline stayed solid with no heated sessions detected.`;
  } else if (heatedSessionPercent > 50) {
    insight = `${heatedSessionCount} of ${totalSessions} sessions (${heatedSessionPercent}%) showed heated behavior . the majority of your betting is happening under emotional pressure.`;
  } else if (heatedSessionPercent > 25) {
    insight = `${heatedSessionCount} of ${totalSessions} sessions were heated . about 1 in ${Math.round(totalSessions / heatedSessionCount)} sessions shows signs of emotional betting or loss chasing.`;
  } else {
    insight = `Most sessions look disciplined, but ${heatedSessionCount} of ${totalSessions} had heated moments worth reviewing.`;
  }

  return {
    sessions,
    totalSessions,
    avgSessionLength: round2(avgSessionLength),
    avgSessionDuration: round2(avgSessionDuration),
    sessionGradeDistribution,
    heatedSessionCount,
    heatedSessionPercent,
    avgGradedROI,
    bestSession,
    worstSession,
    insight,
  };
}

// ── Bet-by-Bet Annotation Engine ──

export function annotateBets(
  bets: Bet[],
  sessions: DetectedSession[],
  medianStake: number,
  dfs: DFSDetection
): AnnotationSummary {
  const sorted = [...bets].sort((a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime());

  // Session lookup map: betIndex → session
  const sessionByIndex = new Map<number, DetectedSession>();
  for (const session of sessions) {
    for (const idx of session.betIndices) {
      sessionByIndex.set(idx, session);
    }
  }

  const annotations: BetAnnotation[] = [];

  let prevBet: Bet | null = null;
  let prevResult: 'win' | 'loss' | 'push' | 'void' | 'pending' | null = null;
  let runningStreak = 0; // positive = wins, negative = losses

  // Track daily bet counts for weekend volume spike
  const dailyBetCounts = new Map<string, number>();

  for (let i = 0; i < sorted.length; i++) {
    const bet = sorted[i];
    const stake = Number(bet.stake);
    const stakeVsMedian = medianStake > 0 ? stake / medianStake : 1;
    const betDate = new Date(bet.placed_at);
    const hour = betDate.getHours();
    const dayOfWeek = betDate.getDay(); // 0=Sun, 6=Sat
    const dateKey = betDate.toISOString().split('T')[0];

    // Increment daily count
    dailyBetCounts.set(dateKey, (dailyBetCounts.get(dateKey) ?? 0) + 1);
    const dailyCount = dailyBetCounts.get(dateKey)!;

    // Time since last bet
    let timeSinceLastBet: number | null = null;
    if (prevBet) {
      timeSinceLastBet = (betDate.getTime() - new Date(prevBet.placed_at).getTime()) / 60000;
    }

    // Session info
    const session = sessionByIndex.get(i) ?? null;
    const isInHeatedSession = session?.isHeated ?? false;

    // Previous stake and odds
    const prevStake = prevBet ? Number(prevBet.stake) : 0;
    const prevOdds = prevBet ? prevBet.odds : 0;
    const prevProfit = prevBet ? Number(prevBet.profit) : 0;
    const prevParlayLegs = prevBet?.parlay_legs ?? null;
    const isParlay = bet.bet_type === 'parlay' || (bet.parlay_legs != null && bet.parlay_legs > 1);
    const prevIsParlay = prevBet ? (prevBet.bet_type === 'parlay' || (prevBet.parlay_legs != null && prevBet.parlay_legs > 1)) : false;

    // Build signals
    const signals: BetSignal[] = [];

    // ── Chasing signals ──
    if (prevResult === 'loss' && prevStake > 0 && stake > prevStake * 1.3) {
      const ratio = stake / prevStake;
      const weight = Math.min(10, Math.round(6 + (ratio - 1.3) * 4));
      signals.push({ name: 'post_loss_escalation', weight, description: `Stake increased ${ratio.toFixed(1)}x after a loss`, category: 'chasing' });
    }

    if (prevResult === 'loss' && prevBet && bet.sport === prevBet.sport && bet.bet_type === prevBet.bet_type) {
      signals.push({ name: 'double_down_after_loss', weight: 4, description: `Same sport+type (${bet.sport} ${bet.bet_type}) right after a loss`, category: 'chasing' });
    }

    if (prevResult === 'loss' && bet.odds > 200 && prevOdds >= -200 && prevOdds <= 150) {
      signals.push({ name: 'odds_shift_to_longshot', weight: 5, description: `Shifted to longshot odds (+${bet.odds}) after losing at shorter odds`, category: 'chasing' });
    }

    if (!dfs.isDFS && prevResult === 'loss' && isParlay && !prevIsParlay) {
      signals.push({ name: 'parlay_after_straight_loss', weight: 5, description: 'Jumped to a parlay after a straight bet loss', category: 'chasing' });
    }

    if (runningStreak <= -3) {
      signals.push({ name: 'loss_streak_continuation', weight: 3, description: `Betting during a ${Math.abs(runningStreak)}-loss streak`, category: 'chasing' });
    }

    if (dfs.isDFS && prevResult === 'loss' && bet.parlay_legs != null && prevParlayLegs != null && bet.parlay_legs > prevParlayLegs) {
      signals.push({ name: 'dfs_pick_escalation', weight: 5, description: `Increased picks from ${prevParlayLegs} to ${bet.parlay_legs} after a loss`, category: 'chasing' });
    }

    // ── Emotional signals ──
    if (stakeVsMedian > 2.0) {
      const weight = Math.min(8, Math.round(4 + (stakeVsMedian - 2) * 2));
      signals.push({ name: 'oversized_bet', weight, description: `Stake is ${stakeVsMedian.toFixed(1)}x the median`, category: 'emotional' });
    }

    if (hour >= 23 || hour <= 4) {
      signals.push({ name: 'late_night', weight: 3, description: `Placed at ${hour <= 4 ? hour : hour - 12}${hour <= 4 ? 'am' : 'pm'}`, category: 'emotional' });
    }

    if (timeSinceLastBet !== null && timeSinceLastBet < 5) {
      signals.push({ name: 'rapid_session_bet', weight: 4, description: `Only ${timeSinceLastBet.toFixed(1)} min since last bet`, category: 'emotional' });
    }

    if (isInHeatedSession) {
      signals.push({ name: 'heated_session_context', weight: 3, description: 'Part of a heated session', category: 'emotional' });
    }

    if (prevResult === 'loss' && prevProfit < -(medianStake * 2) && timeSinceLastBet !== null && timeSinceLastBet < 30) {
      signals.push({ name: 'emotional_after_big_loss', weight: 6, description: `Bet within ${timeSinceLastBet.toFixed(0)} min of a $${Math.abs(prevProfit).toFixed(0)} loss`, category: 'emotional' });
    }

    if ((dayOfWeek === 0 || dayOfWeek === 6) && dailyCount >= 4) {
      signals.push({ name: 'weekend_volume_spike', weight: 2, description: `${dailyCount}th bet on a weekend day`, category: 'emotional' });
    }

    // ── Impulsive signals ──
    if (timeSinceLastBet !== null && timeSinceLastBet < 2) {
      signals.push({ name: 'instant_rebet', weight: 7, description: `Rebet in under ${timeSinceLastBet.toFixed(1)} minutes`, category: 'impulsive' });
    }

    if (stakeVsMedian < 0.25 && bet.odds > 300) {
      signals.push({ name: 'undersized_throwaway', weight: 3, description: `Tiny stake (${stakeVsMedian.toFixed(2)}x median) on a longshot (+${bet.odds})`, category: 'impulsive' });
    }

    // ── Disciplined signals (negative weight) ──
    if (stakeVsMedian >= 0.7 && stakeVsMedian <= 1.3) {
      signals.push({ name: 'flat_stake', weight: -4, description: 'Stake is near the median', category: 'disciplined' });
    }

    if (prevResult === 'loss' && stakeVsMedian >= 0.5 && stakeVsMedian <= 1.2) {
      signals.push({ name: 'consistent_after_loss', weight: -5, description: 'Maintained discipline after a loss', category: 'disciplined' });
    }

    if (timeSinceLastBet !== null && timeSinceLastBet > 60) {
      signals.push({ name: 'reasonable_pace', weight: -2, description: `${timeSinceLastBet.toFixed(0)} min since last bet`, category: 'disciplined' });
    }

    if (session && (session.grade === 'A' || session.grade === 'B')) {
      signals.push({ name: 'controlled_in_good_session', weight: -2, description: `In a grade-${session.grade} session`, category: 'disciplined' });
    }

    if (runningStreak >= 3 && stakeVsMedian <= 1.3) {
      signals.push({ name: 'win_streak_no_escalation', weight: -4, description: `On a ${runningStreak}-win streak without increasing stakes`, category: 'disciplined' });
    }

    // ── Classification ──
    const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
    const absWeight = Math.abs(totalWeight);

    let classification: BetClassification;
    if (totalWeight <= -6) {
      classification = 'disciplined';
    } else if (totalWeight >= 4) {
      // Count positive signal weights by category
      const catWeights: Record<string, number> = {};
      for (const s of signals) {
        if (s.weight > 0) {
          catWeights[s.category] = (catWeights[s.category] ?? 0) + s.weight;
        }
      }
      const topCat = Object.entries(catWeights).sort((a, b) => b[1] - a[1])[0];
      if (topCat) {
        classification = topCat[0] as BetClassification;
      } else {
        classification = 'neutral';
      }
    } else {
      classification = 'neutral';
    }

    // Confidence
    let confidence: number;
    if (absWeight >= 15) confidence = 95;
    else if (absWeight >= 10) confidence = 80 + Math.round((absWeight - 10) * 3);
    else if (absWeight >= 6) confidence = 60 + Math.round((absWeight - 6) * 5);
    else if (absWeight >= 3) confidence = 40 + Math.round((absWeight - 3) * 6.67);
    else confidence = 20 + Math.round(absWeight * 6.67);
    confidence = Math.min(95, Math.max(15, confidence));

    // Primary reason: highest absolute weight signal
    const sortedSignals = [...signals].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
    const primaryReason = sortedSignals.length > 0 ? sortedSignals[0].description : 'No significant signals';

    annotations.push({
      betIndex: i,
      betId: bet.id,
      classification,
      confidence,
      signals,
      primaryReason,
      sessionId: session?.id ?? null,
      sessionGrade: session?.grade ?? null,
      isInHeatedSession,
      stakeVsMedian: Math.round(stakeVsMedian * 100) / 100,
      timeSinceLastBet: timeSinceLastBet !== null ? Math.round(timeSinceLastBet * 10) / 10 : null,
      currentStreak: runningStreak,
    });

    // Update streak
    if (bet.result === 'win') {
      runningStreak = runningStreak > 0 ? runningStreak + 1 : 1;
    } else if (bet.result === 'loss') {
      runningStreak = runningStreak < 0 ? runningStreak - 1 : -1;
    }
    // push/void/pending don't change streak

    prevBet = bet;
    prevResult = bet.result;
  }

  // ── Aggregates ──
  const classificationTypes: BetClassification[] = ['disciplined', 'emotional', 'chasing', 'impulsive', 'neutral'];
  const distribution = {} as AnnotationSummary['distribution'];
  for (const cls of classificationTypes) {
    const matching = annotations.filter(a => a.classification === cls);
    const totalStaked = matching.reduce((s, a) => s + Number(sorted[a.betIndex].stake), 0);
    const totalProfit = matching.reduce((s, a) => s + Number(sorted[a.betIndex].profit), 0);
    distribution[cls] = {
      count: matching.length,
      percent: annotations.length > 0 ? Math.round((matching.length / annotations.length) * 1000) / 10 : 0,
      totalStaked: Math.round(totalStaked * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      roi: totalStaked > 0 ? Math.round((totalProfit / totalStaked) * 10000) / 100 : 0,
    };
  }

  // Emotional cost: how much worse emotional/chasing/impulsive bets perform vs disciplined baseline
  const disciplinedROI = distribution.disciplined.roi;
  const emotionalClasses: BetClassification[] = ['emotional', 'chasing', 'impulsive'];
  const emotionalStaked = emotionalClasses.reduce((s, c) => s + distribution[c].totalStaked, 0);
  const emotionalROI = emotionalStaked > 0
    ? emotionalClasses.reduce((s, c) => s + distribution[c].totalProfit, 0) / emotionalStaked * 100
    : 0;
  const emotionalCost = Math.round(emotionalStaked * (disciplinedROI - emotionalROI) / 100 * 100) / 100;

  // Worst annotated bet: highest confidence emotional/chasing/impulsive
  const badAnnotations = annotations.filter(a => emotionalClasses.includes(a.classification));
  const worstAnnotatedBet = badAnnotations.length > 0
    ? badAnnotations.reduce((worst, a) => a.confidence > worst.confidence ? a : worst, badAnnotations[0])
    : null;

  // Best annotated bet: highest confidence disciplined that won
  const goodAnnotations = annotations.filter(a => a.classification === 'disciplined' && sorted[a.betIndex].result === 'win');
  const bestAnnotatedBet = goodAnnotations.length > 0
    ? goodAnnotations.reduce((best, a) => a.confidence > best.confidence ? a : best, goodAnnotations[0])
    : null;

  // Streak influence
  const winStreakBets = annotations.filter(a => a.currentStreak >= 3);
  const lossStreakBets = annotations.filter(a => a.currentStreak <= -3);
  const neutralStreakBets = annotations.filter(a => a.currentStreak > -3 && a.currentStreak < 3);

  const avgStakeAfterWinStreak3 = winStreakBets.length > 0
    ? Math.round(winStreakBets.reduce((s, a) => s + Number(sorted[a.betIndex].stake), 0) / winStreakBets.length * 100) / 100
    : 0;
  const avgStakeAfterLossStreak3 = lossStreakBets.length > 0
    ? Math.round(lossStreakBets.reduce((s, a) => s + Number(sorted[a.betIndex].stake), 0) / lossStreakBets.length * 100) / 100
    : 0;
  const avgStakeNeutral = neutralStreakBets.length > 0
    ? Math.round(neutralStreakBets.reduce((s, a) => s + Number(sorted[a.betIndex].stake), 0) / neutralStreakBets.length * 100) / 100
    : 0;

  // Insight
  const topClass = classificationTypes
    .filter(c => c !== 'neutral')
    .sort((a, b) => distribution[b].count - distribution[a].count)[0];
  let insight: string;
  const disciplinedPct = distribution.disciplined.percent;
  const chasingPct = distribution.chasing.percent;
  const emotionalPct = distribution.emotional.percent;

  if (disciplinedPct >= 60) {
    insight = `${disciplinedPct}% of your bets show disciplined patterns . solid self-control across most of your action.`;
  } else if (chasingPct >= 30) {
    insight = `${chasingPct}% of bets are classified as chasing, costing an estimated $${Math.abs(emotionalCost).toFixed(0)} in lost edge.`;
  } else if (emotionalPct >= 25) {
    insight = `${emotionalPct}% of bets carry emotional signals . late-night, oversized, or heated session bets are dragging your ROI.`;
  } else if (topClass && distribution[topClass].count > 0) {
    insight = `Most bets are neutral, but your ${topClass} bets (${distribution[topClass].percent}%) ${distribution[topClass].roi < 0 ? 'are costing you' : 'show promise'}.`;
  } else {
    insight = 'Bet patterns are mostly neutral with no dominant behavioral signal.';
  }

  return {
    annotations,
    distribution,
    emotionalCost,
    worstAnnotatedBet,
    bestAnnotatedBet,
    streakInfluence: {
      avgStakeAfterWinStreak3,
      avgStakeAfterLossStreak3,
      avgStakeNeutral,
    },
    insight,
  };
}

export function calculateMetricsOnly(
  bets: Bet[],
  bankroll?: number | null,
  disciplineCtx?: Partial<DisciplineContext>
): { partialAnalysis: Partial<AutopsyAnalysis>; metrics: CalculatedMetrics } {
  const metrics = calculateMetrics(bets, bankroll);

  const disciplineScore = calculateDisciplineScore(metrics, {
    hasBankroll: disciplineCtx?.hasBankroll ?? false,
    reportCount: disciplineCtx?.reportCount ?? 0,
    streakCount: disciplineCtx?.streakCount ?? 0,
    uploadedRecently: disciplineCtx?.uploadedRecently ?? false,
    prevSnapshot: disciplineCtx?.prevSnapshot ?? null,
  });

  const partialAnalysis: Partial<AutopsyAnalysis> = {
    summary: {
      total_bets: metrics.summary.total_bets,
      record: metrics.summary.record,
      total_profit: metrics.summary.total_profit,
      roi_percent: metrics.summary.roi_percent,
      avg_stake: metrics.summary.avg_stake,
      date_range: metrics.summary.date_range,
      overall_grade: metrics.summary.overall_grade,
    },
    biases_detected: metrics.biases_detected.map((b) => ({
      bias_name: b.bias_name,
      severity: b.severity as 'low' | 'medium' | 'high' | 'critical',
      description: '',
      evidence: b.data,
      estimated_cost: 0,
      fix: '',
      evidence_bet_ids: b.evidence_bet_ids,
    })),
    emotion_score: metrics.emotion_score,
    tilt_score: metrics.emotion_score,
    emotion_breakdown: metrics.emotion_breakdown,
    tilt_breakdown: metrics.emotion_breakdown,
    bankroll_health: metrics.bankroll_health,
    betting_archetype: metrics.betting_archetype,
    timing_analysis: metrics.timing,
    odds_analysis: metrics.odds,
    dfs_mode: metrics.dfs.isDFS,
    dfs_platform: metrics.dfs.primaryPlatform ?? undefined,
    dfs_metrics: metrics.dfs_metrics ?? undefined,
    discipline_score: disciplineScore ? { ...disciplineScore, percentile: estimatePercentile('discipline_score', disciplineScore.total) } : undefined,
    betiq: calculateBetIQ(metrics, bets),
    emotion_percentile: estimatePercentile('emotion_score', metrics.emotion_score, true),
    enhanced_tilt: calculateEnhancedTilt(metrics, bets),
    sport_specific_findings: (() => { const f = detectSportSpecificPatterns(metrics, bets); return f.length > 0 ? f : undefined; })(),
    session_detection: metrics.sessionDetection ?? undefined,
    bet_annotations: metrics.annotations ?? undefined,
    strategic_leaks: [],
    behavioral_patterns: [],
    recommendations: [],
    personal_rules: undefined,
    session_analysis: undefined,
    edge_profile: undefined,
    pertinent_negatives: generatePertinentNegatives(metrics.biases_detected.map(b => b.bias_name)),
  };

  return { partialAnalysis, metrics };
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function fmtDate(iso: string): string { try { return new Date(iso).toISOString().split('T')[0]; } catch { return 'N/A'; } }
function pad(str: string, len: number): string { return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length); }

// ── System Prompt ──

const SYSTEM_PROMPT = `You are BetAutopsy, an elite sports betting behavioral analyst.

LANGUAGE RULE: NEVER use the word "tilt" or "tilting" . most sports bettors don't know this poker term. Instead say "emotional betting", "heated session", "emotional decisions", "loss-driven behavior", or "chasing". This is critical . your audience is sports bettors, not poker players.

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

### Sport-Specific Considerations
When analyzing bets, pay attention to these sport-specific behavioral patterns:
- **NFL**: Key number overpays (buying through 3/7 at bad juice), primetime game overload, parlay addiction specific to NFL
- **NBA**: Player prop overexposure (recreational trap), rapid-fire in-game betting suggesting emotional decisions, back-to-back scheduling awareness
- **MLB**: Moneyline tunnel vision (ignoring run lines and totals), starting pitcher obsession
- **DFS**: Multiplier/pick-count chasing (5+ picks for max payout when 2-3 is more profitable), same-player repetition regardless of matchup

These sport-specific patterns are pre-detected by the system. Reference the pre-calculated sport-specific findings in your analysis where relevant.

## Output Format
Respond with valid JSON:
{
  "executive_diagnosis": "4 sentences, 15-20 words each. See EXECUTIVE_DIAGNOSIS RULES below. No em-dashes.",
  "overall_grade": "use the exact pre-calculated grade provided . do not assign a different one",
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
You sound like a sharp friend who watches games and actually bets . not a data scientist reading a report. Use real betting language naturally, not forced.

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
- Celebrate wins and edges with real energy: "Your unders game is legit . that's a real edge, not just a hot streak"
- Be real about losses without being clinical: "That March 9 session was rough . 3 Ls in a row and the stakes crept up."
- Reference specific bets by description when possible
- Never sound like a textbook: "Your coefficient of variation is elevated" = bad. "Your bet sizing is all over the place . $50 one play, $400 the next" = good
- Be direct: "You're laying way too much juice on chalk. 22 bets at -150 or worse with a -8% ROI . you're paying a tax to feel safe."
- When they have no edge somewhere, say it straight: "Your NHL bets are cooked. 2-9 with -44% ROI. Either find a real angle or cut it entirely."
- Frame everything around behavior improvement, never around "winning more"

PUNCTUATION RULE: Never use em-dashes in any output. Use periods to separate independent thoughts. Use commas for dependent clauses. Use parentheses for interjections. Use colons before explanations or lists. This is a hard rule with zero exceptions.

CRITICAL TONE RULE: Every report must lead with what the user is doing RIGHT before addressing problems.
- Start with their best quality or strongest area
- For every leak, mention a contrasting strength
- Frame problems as opportunities with dollar amounts
- Use encouraging language for strengths: "legit edge", "sharp instinct", "real discipline here"
- Use direct but non-judgmental language for problems: "this is costing you" not clinical labels
- Never use words like: addiction, reckless, gambling problem, degenerate, out of control

## Executive Diagnosis Rules
- Exactly 4 sentences. 15-20 words each. Short and direct.
- Voice: sharp friend, not professor. Write like you're telling someone the truth about their betting over a beer. No academic language.
- BANNED phrases: "systematically eroding", "the data indicate", "the preponderance of evidence suggests", "significant tendencies", "representing the primary leak", "otherwise disciplined approach", "understates the true damage". No phrase that sounds like it came from a research paper.
- Sentence 1: Name the biggest problem in plain English. One number max.
- Sentence 2: The single most damning stat. Make it specific and sharp.
- Sentence 3: What makes it worse (the compounding factor). One number.
- Sentence 4: What it's costing them. Clean dollar figure, no hedging.
- Third person ("This bettor") but conversational. Think sports podcast host who studied behavioral psychology, not a journal article.
- Reference the pre-computed Estimated Total Leak Cost for sentence 4. Do NOT calculate your own.
- Do NOT invent numbers. Cite only pre-calculated metrics.
- No em-dashes.
- If no significant biases detected, write a positive diagnosis noting what they're doing right.
- EXAMPLE (match this energy, not these exact words): "This bettor has a favorite problem. 57 bets on -110 to -199 chalk have returned -31.7% ROI, the worst category in the dataset. It gets worse after losses, where stakes jump 29% on average. That pattern is costing roughly $1,043 over this sample."

## Critical Rules
- NEVER recommend specific bets or picks
- NEVER promise profitability
- NEVER recalculate any numbers . use only what is provided
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
    const desc = pad(formatParlayForClaude(b).replace(/[<>{}]/g, '').slice(0, 200), 36);
    const odds = pad(b.odds > 0 ? `+${b.odds}` : `${b.odds}`, 6);
    const stake = pad(`$${Number(b.stake).toFixed(0)}`, 6);
    const result = pad(b.result.toUpperCase(), 6);
    const profit = pad(`${Number(b.profit) >= 0 ? '+' : ''}$${Number(b.profit).toFixed(0)}`, 7);
    const book = b.sportsbook ?? '-';
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
Bankroll: ${metrics.bankroll_used ? `$${metrics.bankroll_used.toLocaleString()}` : 'Not set (estimated at $' + Math.round(metrics.summary.avg_stake * 50).toLocaleString() + '). user should set this for accurate grading'}
Bankroll Health: ${metrics.bankroll_health === 'danger' ? 'At Risk' : metrics.bankroll_health === 'caution' ? 'Monitor' : 'Healthy'}
Overall Grade: ${metrics.summary.overall_grade} (pre-calculated, do not override)
Bet DNA: ${metrics.betting_archetype.name}: ${metrics.betting_archetype.description}
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
${metrics.timing.best_window ? `\nBest Window: ${metrics.timing.best_window.label}: ${metrics.timing.best_window.roi.toFixed(1)}% ROI (${metrics.timing.best_window.count} bets)` : ''}
${metrics.timing.worst_window ? `Worst Window: ${metrics.timing.worst_window.label}: ${metrics.timing.worst_window.roi.toFixed(1)}% ROI (${metrics.timing.worst_window.count} bets)` : ''}
${metrics.timing.late_night_stats ? `Late Night (11pm-4am): ${metrics.timing.late_night_stats.count} bets (${metrics.timing.late_night_stats.pct_of_total.toFixed(0)}% of total), ${metrics.timing.late_night_stats.roi.toFixed(1)}% ROI` : ''}` : 'No time-of-day data available (timestamps are date-only).'}
===

=== ODDS INTELLIGENCE ===
By Odds Bucket:
${metrics.odds.buckets.filter((b) => b.bets >= 1).map((b) => `${b.label} (${b.range}): ${b.bets} bets, ${b.win_rate.toFixed(0)}% win rate vs ${b.implied_prob.toFixed(0)}% implied, edge: ${b.edge >= 0 ? '+' : ''}${b.edge.toFixed(1)}pp, ROI: ${b.roi.toFixed(1)}%, $${b.profit.toFixed(0)} profit`).join('\n')}

Luck vs Skill: ${metrics.odds.actual_wins} actual wins vs ${metrics.odds.expected_wins.toFixed(1)} expected wins (${metrics.odds.luck_label}, ${metrics.odds.luck_rating >= 0 ? '+' : ''}${metrics.odds.luck_rating.toFixed(1)} wins above expected)
${metrics.odds.best_bucket ? `Best Odds Range: ${metrics.odds.best_bucket.label} (${metrics.odds.best_bucket.edge >= 0 ? '+' : ''}${metrics.odds.best_bucket.edge.toFixed(1)}pp edge, ${metrics.odds.best_bucket.count} bets)` : ''}
${metrics.odds.worst_bucket ? `Worst Odds Range: ${metrics.odds.worst_bucket.label} (${metrics.odds.worst_bucket.edge >= 0 ? '+' : ''}${metrics.odds.worst_bucket.edge.toFixed(1)}pp edge, ${metrics.odds.worst_bucket.count} bets)` : ''}
===

=== PRE-CLASSIFIED BIASES (do not change bias names or severity levels. write descriptions and evidence for each) ===
${metrics.biases_detected.length > 0
    ? metrics.biases_detected.map((b) => `- ${b.bias_name}: ${b.severity.toUpperCase()} (${b.data})`).join('\n')
    : 'No significant biases detected at current thresholds.'}
===${metrics.sessionDetection ? `

=== SESSION DETECTION (${metrics.sessionDetection.totalSessions} sessions detected) ===
Total Sessions: ${metrics.sessionDetection.totalSessions}
Avg Bets/Session: ${metrics.sessionDetection.avgSessionLength.toFixed(1)}
Avg Duration: ${metrics.sessionDetection.avgSessionDuration.toFixed(0)} min
Grade Distribution: ${metrics.sessionDetection.sessionGradeDistribution.filter(g => g.count > 0).map(g => `${g.grade}: ${g.count} (${g.percent}%)`).join(', ')}
Heated Sessions: ${metrics.sessionDetection.heatedSessionCount} (${metrics.sessionDetection.heatedSessionPercent}%)
Avg ROI by Grade: ${Object.entries(metrics.sessionDetection.avgGradedROI).map(([g, r]) => `${g}: ${r.toFixed(1)}%`).join(', ')}
${metrics.sessionDetection.bestSession ? `Best Session: ${metrics.sessionDetection.bestSession.id} on ${metrics.sessionDetection.bestSession.date}: ${metrics.sessionDetection.bestSession.bets} bets, $${metrics.sessionDetection.bestSession.profit.toFixed(0)} profit, grade ${metrics.sessionDetection.bestSession.grade}` : ''}
${metrics.sessionDetection.worstSession ? `Worst Session: ${metrics.sessionDetection.worstSession.id} on ${metrics.sessionDetection.worstSession.date}: ${metrics.sessionDetection.worstSession.bets} bets, $${metrics.sessionDetection.worstSession.profit.toFixed(0)} profit, grade ${metrics.sessionDetection.worstSession.grade}${metrics.sessionDetection.worstSession.isHeated ? ' [HEATED]' : ''}` : ''}
Insight: ${metrics.sessionDetection.insight}
===` : ''}${metrics.annotations ? `

=== BET ANNOTATIONS (${metrics.annotations.annotations.length} bets annotated) ===
Distribution: ${(['disciplined', 'emotional', 'chasing', 'impulsive', 'neutral'] as const).map(c => `${c}: ${metrics.annotations!.distribution[c].count} (${metrics.annotations!.distribution[c].percent}%), ROI: ${metrics.annotations!.distribution[c].roi.toFixed(1)}%`).join(' | ')}
Emotional Cost: $${metrics.annotations.emotionalCost.toFixed(0)} (estimated profit lost to emotional/chasing/impulsive bets)
Streak Influence: After 3+ win streak avg stake $${metrics.annotations.streakInfluence.avgStakeAfterWinStreak3.toFixed(0)} | After 3+ loss streak avg stake $${metrics.annotations.streakInfluence.avgStakeAfterLossStreak3.toFixed(0)} | Neutral avg stake $${metrics.annotations.streakInfluence.avgStakeNeutral.toFixed(0)}
Insight: ${metrics.annotations.insight}
===` : ''}

=== EXECUTIVE DIAGNOSIS CONTEXT ===
Estimated Total Leak Cost: $${Math.abs(metrics.what_ifs.actual_profit - metrics.what_ifs.flat_stake.hypothetical_profit).toFixed(0)}
Primary Bias: ${metrics.biases_detected[0]?.bias_name ?? 'None'} (${metrics.biases_detected[0]?.severity ?? 'N/A'})
Session Profile: ${metrics.sessionDetection ? `${metrics.sessionDetection.heatedSessionPercent}% heated sessions, grade distribution: ${metrics.sessionDetection.sessionGradeDistribution.filter(g => g.count > 0).map(g => `${g.grade}:${g.count}`).join('/')}` : 'N/A'}
===`;

  const betTable = formatBetTable(bets);

  // DFS mode prompt appendix
  let dfsPromptBlock = '';
  if (metrics.dfs.isDFS && metrics.dfs_metrics) {
    const dm = metrics.dfs_metrics;
    dfsPromptBlock = `\n\n=== DFS PICK'EM MODE ===
This user plays on ${metrics.dfs.primaryPlatform ?? 'a DFS platform'}. ALL entries are multi-pick (2-6 player prop predictions). There are no "straight bets."

CRITICAL LANGUAGE RULES:
- NEVER call their activity "parlay addiction" . multi-pick entries are the only format
- NEVER advise "cut parlays" or "switch to straight bets" . impossible on this platform
- Use "entries" not "bets" and "picks" not "legs"
- Say "2-pick entry" not "straight bet" and "5-pick entry" not "5-leg parlay"
- Say "entry fee" not "stake" and "Power Play" / "Flex Play" not "all-or-nothing"

WHAT TO ANALYZE:
- Pick count distribution: are they overloaded on 5-6 pick entries vs 2-3?
- Power vs Flex: Power = all picks must hit. Flex = partial payouts. Flex has better EV.
- Multiplier chasing: after losses, do they increase pick count for bigger multipliers?
- Player concentration: over-exposed to specific players?

DFS METRICS:
Pick Count Distribution: ${dm.pickCountDistribution.map((d) => `${d.picks}-pick: ${d.count} entries, ${d.winRate}% WR, ${d.roi}% ROI`).join(' | ')}
Avg Pick Count: ${dm.avgPickCount}
Pick Count After Loss: ${dm.pickCountAfterLoss} vs After Win: ${dm.pickCountAfterWin}
Low Pick (2-3) ROI: ${dm.lowPickROI}% | High Pick (5-6) ROI: ${dm.highPickROI}%
${dm.powerVsFlex ? `Power: ${dm.powerVsFlex.powerCount} entries, ${dm.powerVsFlex.powerROI}% ROI | Flex: ${dm.powerVsFlex.flexCount} entries, ${dm.powerVsFlex.flexROI}% ROI` : ''}
Top Players: ${dm.playerConcentration.slice(0, 5).map((p) => `${p.player} (${p.percent}%, ${p.roi}% ROI)`).join(', ')}

Frame all advice around PICK COUNT REDUCTION and FLEX OVER POWER, not parlay reduction.
===`;
  }

  const sportFindings = detectSportSpecificPatterns(metrics, bets);
  const sportFindingsBlock = sportFindings.length > 0
    ? `\n\n=== SPORT-SPECIFIC FINDINGS (pre-detected) ===\n${sportFindings.map(f => `${f.id}: ${f.name} [${f.severity}]: ${f.evidence}`).join('\n')}\n===`
    : '';

  const userMessage = `${metricsBlock}${dfsPromptBlock}${sportFindingsBlock}\n\n=== RAW BETS FOR PATTERN ANALYSIS ===\n${betTable}`;

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
        evidence_bet_ids: jsBias.evidence_bet_ids,
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
    dfs_mode: metrics.dfs.isDFS,
    dfs_platform: metrics.dfs.primaryPlatform ?? undefined,
    dfs_metrics: metrics.dfs_metrics ?? undefined,
    betiq: calculateBetIQ(metrics, bets),
    emotion_percentile: estimatePercentile('emotion_score', metrics.emotion_score, true),
    enhanced_tilt: calculateEnhancedTilt(metrics, bets),
    sport_specific_findings: sportFindings.length > 0 ? sportFindings : undefined,
    session_detection: metrics.sessionDetection ?? undefined,
    bet_annotations: metrics.annotations ?? undefined,
    executive_diagnosis: (claudeData.executive_diagnosis as string) ?? undefined,
    pertinent_negatives: generatePertinentNegatives(metrics.biases_detected.map(b => b.bias_name)),
  };

  const markdown = generateMarkdownReport(analysis);

  return { analysis, markdown, tokensUsed, model };
}

// ── Run a snapshot (free, cheap) ──

const SNAPSHOT_SYSTEM_PROMPT = `You are a sports betting analyst writing a brief snapshot report. You will receive pre-calculated metrics and a top bias to explain.

Your job is to write a compelling, specific explanation of the user's #1 bias. Make the reader think "damn, that's exactly what I do."

Rules:
- Use real betting language: chalk, dog, juice, SGP, steam, sharp. Never say "wager" or "proposition."
- Never use the word "tilt." Use "emotion score" instead.
- Be direct and specific. Reference their actual numbers.
- No em-dashes. Use periods for independent thoughts.
- Keep it punchy. 3-4 sentences for description, 2-3 for evidence, 1-2 for fix.
- Return valid JSON only.`;

export async function runSnapshot(
  bets: Bet[],
  bankroll?: number | null
): Promise<{ analysis: AutopsyAnalysis; markdown: string; tokensUsed: number; model: string }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = 'claude-haiku-4-5-20251001';

  const metrics = calculateMetrics(bets, bankroll);
  const topBias = metrics.biases_detected.length > 0 ? metrics.biases_detected[0] : null;

  let claudeData: Record<string, unknown> = {};
  let tokensUsed = 0;

  if (topBias) {
    const prompt = `=== USER STATS ===
Record: ${metrics.summary.record} (${metrics.summary.total_bets} bets)
ROI: ${metrics.summary.roi_percent.toFixed(1)}%
Net P&L: $${metrics.summary.total_profit.toFixed(2)}
Overall Grade: ${metrics.summary.overall_grade}
Archetype: ${metrics.betting_archetype.name}
Emotion Score: ${metrics.emotion_score}/100
===

The user's #1 detected bias is: "${topBias.bias_name}" (severity: ${topBias.severity})
Raw data: ${topBias.data}

Write a JSON object with these fields for this single bias:
{
  "description": "3-4 sentence explanation of what this bias is and how it shows up in their betting",
  "evidence": "2-3 sentences citing their specific numbers",
  "estimated_cost": <number, estimated quarterly dollar cost>,
  "fix": "1-2 sentence actionable fix"
}

Return ONLY the JSON object, nothing else.`;

    const message = await client.messages.create({
      model,
      max_tokens: 512,
      temperature: 0,
      system: SNAPSHOT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      claudeData = parseResponseJSON(textBlock.text);
    }
    tokensUsed = (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0);
  }

  // Build snapshot analysis — real data visible, dollar costs and fixes locked
  const snapshotCounts = {
    leaks: metrics.category_roi.filter(c => c.roi < -5 && c.count >= 3).length,
    patterns: Math.min(metrics.biases_detected.length, 5),
    sessions: metrics.sessionDetection?.totalSessions ?? 0,
    sport_findings: detectSportSpecificPatterns(metrics, bets).length,
    total_biases: metrics.biases_detected.length,
  };

  const snapshotTeaser = {
    biasNames: metrics.biases_detected.map(b => ({ name: b.bias_name, severity: b.severity })),
    leakCategories: metrics.category_roi.filter(c => c.roi < -5 && c.count >= 3).map(c => c.category),
    sessionGrades: Object.fromEntries(
      (metrics.sessionDetection?.sessionGradeDistribution ?? []).map(g => [g.grade, g.count])
    ),
    heatedSessionCount: metrics.sessionDetection?.heatedSessionCount ?? 0,
  };

  // All biases visible by name+severity; only top 1 has Claude-generated description/fix
  const allBiases: AutopsyAnalysis['biases_detected'] = metrics.biases_detected.map((b, i) => {
    if (i === 0 && topBias) {
      return {
        bias_name: topBias.bias_name,
        severity: topBias.severity as 'low' | 'medium' | 'high' | 'critical',
        description: (claudeData.description as string) ?? `${topBias.bias_name} detected with ${topBias.severity} severity.`,
        evidence: (claudeData.evidence as string) ?? topBias.data,
        estimated_cost: (claudeData.estimated_cost as number) ?? 0,
        fix: (claudeData.fix as string) ?? '',
      };
    }
    return {
      bias_name: b.bias_name,
      severity: b.severity as 'low' | 'medium' | 'high' | 'critical',
      description: '',
      evidence: b.data,
      estimated_cost: 0,
      fix: '',
    };
  });

  // Strategic leaks from category_roi — category names and ROI visible, suggestions locked
  const snapshotLeaks: AutopsyAnalysis['strategic_leaks'] = metrics.category_roi
    .filter(c => c.roi < -5 && c.count >= 3)
    .map(c => ({
      category: c.category,
      detail: '',
      roi_impact: c.roi,
      sample_size: c.count,
      suggestion: '',
    }));

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
    biases_detected: allBiases,
    strategic_leaks: snapshotLeaks,
    behavioral_patterns: [], // needs Claude interpretation
    recommendations: [], // needs Claude interpretation
    emotion_score: metrics.emotion_score,
    tilt_score: metrics.emotion_score,
    emotion_breakdown: metrics.emotion_breakdown,
    tilt_breakdown: metrics.emotion_breakdown,
    bankroll_health: metrics.bankroll_health,
    betting_archetype: metrics.betting_archetype,
    timing_analysis: metrics.timing,
    odds_analysis: metrics.odds,
    dfs_mode: metrics.dfs.isDFS,
    dfs_platform: metrics.dfs.primaryPlatform ?? undefined,
    dfs_metrics: metrics.dfs_metrics ?? undefined,
    betiq: calculateBetIQ(metrics, bets),
    emotion_percentile: estimatePercentile('emotion_score', metrics.emotion_score, true),
    session_detection: metrics.sessionDetection ? {
      ...metrics.sessionDetection,
      sessions: metrics.sessionDetection.sessions.map(s => ({
        ...s,
        gradeReasons: [],
        heatSignals: [],
        profit: 0,
        staked: 0,
        roi: 0,
        avgStake: 0,
        startingStake: 0,
        endingStake: 0,
        maxStake: 0,
        minStake: 0,
      })),
      bestSession: null,
      worstSession: null,
    } : undefined,
    bet_annotations: metrics.annotations ?? undefined,
    _snapshot_counts: snapshotCounts,
    _snapshot_teaser: snapshotTeaser,
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
    lines.push(`- **Luck vs Skill:** ${a.odds_analysis.actual_wins} actual wins vs ${a.odds_analysis.expected_wins.toFixed(1)} expected: ${a.odds_analysis.luck_label}`);
    if (a.odds_analysis.best_bucket) lines.push(`- **Best Odds Range:** ${a.odds_analysis.best_bucket.label} (${a.odds_analysis.best_bucket.edge >= 0 ? '+' : ''}${a.odds_analysis.best_bucket.edge.toFixed(1)}pp edge)`);
    if (a.odds_analysis.worst_bucket) lines.push(`- **Worst Odds Range:** ${a.odds_analysis.worst_bucket.label} (${a.odds_analysis.worst_bucket.edge >= 0 ? '+' : ''}${a.odds_analysis.worst_bucket.edge.toFixed(1)}pp edge)`);
    lines.push('');
  }
  if (a.recommendations.length > 0) {
    lines.push('## Action Plan\n');
    for (const r of a.recommendations) { lines.push(`**${r.priority}. ${r.title}** (${r.difficulty})`); lines.push(`${r.description}\n`); }
  }
  lines.push('---');
  lines.push('*BetAutopsy provides behavioral analysis and educational insights. not gambling or financial advice. Past results don\'t guarantee future outcomes. 21+. If you or someone you know has a gambling problem, call 1-800-GAMBLER.*');
  return lines.join('\n');
}

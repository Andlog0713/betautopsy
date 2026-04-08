import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateMetrics,
  detectAndGradeSessions,
  annotateBets,
  calculateDisciplineScore,
  calculateBetIQ,
  calculateEnhancedTilt,
  detectDFSSource,
  calculateDFSMetrics,
  detectSportSpecificPatterns,
  detectContradictions,
  generatePertinentNegatives,
  estimatePercentile,
  calculateMetricsOnly,
} from '@/lib/autopsy-engine';
import type { Bet } from '@/types';

// ── Fixture helpers ──

let betId = 0;

function makeBet(overrides: Partial<Bet> = {}): Bet {
  betId++;
  return {
    id: `test-${betId}`,
    user_id: 'user-test',
    placed_at: '2025-03-15T14:00:00Z',
    sport: 'NFL',
    league: 'NFL',
    bet_type: 'spread',
    description: 'Chiefs -3.5',
    odds: -110,
    stake: 50,
    result: 'loss',
    payout: 0,
    profit: -50,
    sportsbook: 'DraftKings',
    is_bonus_bet: false,
    parlay_legs: null,
    tags: null,
    notes: null,
    upload_id: 'upload-test',
    created_at: '2025-03-15T14:00:00Z',
    ...overrides,
  };
}

function makeBetSequence(
  count: number,
  overrides: (i: number) => Partial<Bet>
): Bet[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date('2025-01-01T12:00:00Z');
    date.setHours(date.getHours() + i * 4); // 4 hours apart
    return makeBet({
      placed_at: date.toISOString(),
      created_at: date.toISOString(),
      ...overrides(i),
    });
  });
}

// Compute a win payout/profit for given stake + American odds
function winFor(stake: number, odds: number): { payout: number; profit: number } {
  const profit = odds > 0 ? stake * (odds / 100) : stake * (100 / Math.abs(odds));
  return {
    profit: Math.round(profit * 100) / 100,
    payout: Math.round((stake + profit) * 100) / 100,
  };
}

beforeEach(() => {
  betId = 0;
});

// ── Shared test helpers ──

const DISCIPLINE_CTX = {
  hasBankroll: true,
  reportCount: 2,
  streakCount: 3,
  uploadedRecently: true,
  prevSnapshot: null,
};

function runAllSnapshots(name: string, bets: Bet[], options?: { dfs?: boolean }) {
  describe(name, () => {
    it('calculateMetrics snapshot', () => {
      const metrics = calculateMetrics(bets, 5000);
      expect(metrics).toMatchSnapshot();
    });

    it('detectAndGradeSessions snapshot', () => {
      const sessions = detectAndGradeSessions(bets);
      expect(sessions).toMatchSnapshot();
    });

    it('annotateBets snapshot', () => {
      const metrics = calculateMetrics(bets, 5000);
      const sessions = detectAndGradeSessions(bets);
      const annotations = annotateBets(
        bets,
        sessions.sessions,
        metrics.summary.median_stake,
        metrics.dfs
      );
      expect(annotations).toMatchSnapshot();
    });

    it('calculateDisciplineScore snapshot', () => {
      const metrics = calculateMetrics(bets, 5000);
      const score = calculateDisciplineScore(metrics, DISCIPLINE_CTX);
      expect(score).toMatchSnapshot();
    });

    it('calculateBetIQ snapshot', () => {
      const metrics = calculateMetrics(bets, 5000);
      const betiq = calculateBetIQ(metrics, bets);
      expect(betiq).toMatchSnapshot();
    });

    it('calculateEnhancedTilt snapshot', () => {
      const metrics = calculateMetrics(bets, 5000);
      const tilt = calculateEnhancedTilt(metrics, bets);
      expect(tilt).toMatchSnapshot();
    });

    it('detectSportSpecificPatterns snapshot', () => {
      const metrics = calculateMetrics(bets, 5000);
      const patterns = detectSportSpecificPatterns(metrics, bets);
      expect(patterns).toMatchSnapshot();
    });

    if (options?.dfs) {
      it('detectDFSSource snapshot', () => {
        expect(detectDFSSource(bets)).toMatchSnapshot();
      });

      it('calculateDFSMetrics snapshot', () => {
        expect(calculateDFSMetrics(bets)).toMatchSnapshot();
      });
    }

    it('has no NaN or undefined values in metrics', () => {
      const metrics = calculateMetrics(bets, 5000);
      const json = JSON.stringify(metrics);
      expect(json).not.toContain('NaN');
      expect(json).not.toContain('undefined');
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// Scenario 1: Standard sportsbook bettor
// ═══════════════════════════════════════════════════════════════
describe('Scenario 1: Standard sportsbook bettor', () => {
  const stakes = [50, 75, 25, 100, 50, 60, 30, 80, 45, 55, 70, 40, 50, 65, 35, 90, 50, 45, 60, 75, 50, 30, 80, 55, 40, 70, 50, 60, 45, 100];
  const results: Bet['result'][] = [
    'win', 'loss', 'win', 'loss', 'push', 'win', 'win', 'loss', 'win', 'loss',
    'win', 'loss', 'win', 'win', 'loss', 'loss', 'win', 'loss', 'win', 'loss',
    'push', 'win', 'loss', 'win', 'loss', 'win', 'win', 'loss', 'win', 'loss',
  ];
  const sports = ['NFL', 'NBA'];
  const types = ['spread', 'total'];
  const odds = [-110, -105, -115, +100, +120, +140, -110, -110, +150, -120];
  const descriptions = ['Chiefs -3.5', 'Lakers -4.5', 'Over 48.5', 'Bills ML +110', 'Under 215.5', 'Cowboys -7', 'Celtics -6.5', 'Over 220.5', 'Eagles -3', 'Nuggets +2.5'];

  const bets: Bet[] = Array.from({ length: 30 }, (_, i) => {
    const date = new Date('2025-01-02T13:00:00Z');
    date.setDate(date.getDate() + Math.floor(i * 2)); // ~2 days apart, spans ~2 months
    const stake = stakes[i];
    const result = results[i];
    const odd = odds[i % odds.length];
    const win = winFor(stake, odd);
    return makeBet({
      placed_at: date.toISOString(),
      created_at: date.toISOString(),
      sport: sports[i % sports.length],
      league: sports[i % sports.length],
      bet_type: types[i % types.length],
      description: descriptions[i % descriptions.length],
      odds: odd,
      stake,
      result,
      payout: result === 'win' ? win.payout : result === 'push' ? stake : 0,
      profit: result === 'win' ? win.profit : result === 'push' ? 0 : -stake,
    });
  });

  runAllSnapshots('Standard sportsbook bettor', bets);
});

// ═══════════════════════════════════════════════════════════════
// Scenario 2: DFS user — PrizePicks
// ═══════════════════════════════════════════════════════════════
describe('Scenario 2: DFS user — PrizePicks', () => {
  const legs = [2, 3, 4, 5, 6, 2, 3, 4, 5, 6, 2, 3, 4, 5, 6, 3, 4, 5, 3, 4, 2, 3, 4, 5, 6];
  // 5 wins, 20 losses — typical DFS win rate
  const results: Bet['result'][] = [
    'win', 'loss', 'loss', 'loss', 'loss',
    'loss', 'win', 'loss', 'loss', 'loss',
    'loss', 'loss', 'win', 'loss', 'loss',
    'loss', 'loss', 'loss', 'win', 'loss',
    'loss', 'loss', 'loss', 'win', 'loss',
  ];
  const stakes = [10, 15, 20, 25, 10, 15, 20, 25, 10, 15, 20, 25, 10, 15, 20, 25, 10, 15, 20, 25, 10, 15, 20, 25, 10];
  const sports = ['NBA', 'NFL'];
  const descriptions = ['LeBron 25+ pts + Curry 30+ pts', 'Mahomes 275+ yds + Kelce 6+ rec', 'Giannis 10+ reb + Embiid 10+ reb'];

  const bets: Bet[] = Array.from({ length: 25 }, (_, i) => {
    const date = new Date('2025-02-01T19:00:00Z');
    date.setDate(date.getDate() + i);
    const stake = stakes[i];
    const result = results[i];
    // DFS odds scale with legs (rough approximation)
    const leg = legs[i];
    const odds = leg === 2 ? 200 : leg === 3 ? 500 : leg === 4 ? 1000 : leg === 5 ? 2000 : 2500;
    const win = winFor(stake, odds);
    return makeBet({
      placed_at: date.toISOString(),
      created_at: date.toISOString(),
      sport: sports[i % 2],
      league: sports[i % 2],
      bet_type: 'parlay',
      description: descriptions[i % descriptions.length],
      odds,
      stake,
      result,
      payout: result === 'win' ? win.payout : 0,
      profit: result === 'win' ? win.profit : -stake,
      sportsbook: 'PrizePicks',
      parlay_legs: leg,
    });
  });

  runAllSnapshots('DFS user — PrizePicks', bets, { dfs: true });
});

// ═══════════════════════════════════════════════════════════════
// Scenario 3: Heavy parlay bettor
// ═══════════════════════════════════════════════════════════════
describe('Scenario 3: Heavy parlay bettor', () => {
  const bets: Bet[] = [];
  // 25 parlays — 3 wins, 22 losses
  const parlayResults: Bet['result'][] = [
    'win', 'loss', 'loss', 'loss', 'loss',
    'loss', 'loss', 'win', 'loss', 'loss',
    'loss', 'loss', 'loss', 'loss', 'win',
    'loss', 'loss', 'loss', 'loss', 'loss',
    'loss', 'loss', 'loss', 'loss', 'loss',
  ];
  for (let i = 0; i < 25; i++) {
    const date = new Date('2025-01-05T20:00:00Z');
    date.setDate(date.getDate() + i);
    const legs = 3 + (i % 6); // 3..8
    const stake = 10 + (i % 11); // 10..20
    const odds = 500 + legs * 300;
    const result = parlayResults[i];
    const win = winFor(stake, odds);
    bets.push(
      makeBet({
        placed_at: date.toISOString(),
        created_at: date.toISOString(),
        bet_type: 'parlay',
        parlay_legs: legs,
        odds,
        stake,
        result,
        payout: result === 'win' ? win.payout : 0,
        profit: result === 'win' ? win.profit : -stake,
        sportsbook: 'FanDuel',
        description: `${legs}-leg parlay`,
      })
    );
  }
  // 15 straight bets — 8 wins, 7 losses
  const straightResults: Bet['result'][] = [
    'win', 'loss', 'win', 'loss', 'win', 'loss', 'win', 'loss',
    'win', 'loss', 'win', 'loss', 'win', 'win', 'loss',
  ];
  for (let i = 0; i < 15; i++) {
    const date = new Date('2025-02-10T19:00:00Z');
    date.setDate(date.getDate() + i);
    const stake = 50 + (i % 6) * 10; // 50..100
    const odds = -110;
    const result = straightResults[i];
    const win = winFor(stake, odds);
    bets.push(
      makeBet({
        placed_at: date.toISOString(),
        created_at: date.toISOString(),
        bet_type: 'spread',
        parlay_legs: null,
        odds,
        stake,
        result,
        payout: result === 'win' ? win.payout : 0,
        profit: result === 'win' ? win.profit : -stake,
        sportsbook: 'FanDuel',
        description: 'Cowboys -3.5',
      })
    );
  }

  runAllSnapshots('Heavy parlay bettor', bets);
});

// ═══════════════════════════════════════════════════════════════
// Scenario 4: Loss chaser
// ═══════════════════════════════════════════════════════════════
describe('Scenario 4: Loss chaser', () => {
  // Rapid-fire sessions, stakes double after losses, reset on win
  // Pattern: L L L W L L W L L L W L L W ...
  const pattern: Bet['result'][] = [];
  const base: Bet['result'][] = ['loss', 'loss', 'loss', 'win', 'loss', 'loss', 'win'];
  for (let i = 0; i < 35; i++) pattern.push(base[i % base.length]);

  const bets: Bet[] = [];
  let currentStake = 50;
  for (let i = 0; i < 35; i++) {
    const date = new Date('2025-01-04T17:00:00Z');
    date.setHours(date.getHours() + i * 2); // ~2hr apart, tight sessions
    const result = pattern[i];
    const win = winFor(currentStake, -110);
    bets.push(
      makeBet({
        placed_at: date.toISOString(),
        created_at: date.toISOString(),
        stake: currentStake,
        result,
        payout: result === 'win' ? win.payout : 0,
        profit: result === 'win' ? win.profit : -currentStake,
      })
    );
    if (result === 'loss') {
      currentStake = Math.round(currentStake * 2);
    } else {
      currentStake = 50;
    }
  }

  runAllSnapshots('Loss chaser', bets);
});

// ═══════════════════════════════════════════════════════════════
// Scenario 5: Late night session cluster
// ═══════════════════════════════════════════════════════════════
describe('Scenario 5: Late night session cluster', () => {
  const bets: Bet[] = [];
  // 10 late-night Saturday bets (11pm Sat → 3am Sun), bigger stakes, more parlays, mostly losses
  const nightResults: Bet['result'][] = ['loss', 'loss', 'win', 'loss', 'loss', 'loss', 'loss', 'win', 'loss', 'loss'];
  for (let i = 0; i < 10; i++) {
    // Start at 2025-01-11 23:00 UTC (Saturday), 30 min apart
    const date = new Date('2025-01-11T23:00:00Z');
    date.setMinutes(date.getMinutes() + i * 30);
    const result = nightResults[i];
    const stake = 100 + i * 20; // escalating
    const isParlay = i % 2 === 0;
    const odds = isParlay ? 600 : -110;
    const win = winFor(stake, odds);
    bets.push(
      makeBet({
        placed_at: date.toISOString(),
        created_at: date.toISOString(),
        stake,
        result,
        bet_type: isParlay ? 'parlay' : 'spread',
        parlay_legs: isParlay ? 3 : null,
        odds,
        payout: result === 'win' ? win.payout : 0,
        profit: result === 'win' ? win.profit : -stake,
        description: isParlay ? '3-leg parlay' : 'Lakers -5.5',
      })
    );
  }
  // 10 normal Sat/Sun afternoon bets — profitable, disciplined
  const dayResults: Bet['result'][] = ['win', 'win', 'loss', 'win', 'win', 'loss', 'win', 'win', 'loss', 'win'];
  for (let i = 0; i < 10; i++) {
    // 2025-01-18 15:00 UTC (Saturday afternoon), spaced out
    const date = new Date('2025-01-18T15:00:00Z');
    date.setHours(date.getHours() + i * 6);
    const result = dayResults[i];
    const stake = 50;
    const odds = -110;
    const win = winFor(stake, odds);
    bets.push(
      makeBet({
        placed_at: date.toISOString(),
        created_at: date.toISOString(),
        stake,
        result,
        bet_type: 'spread',
        parlay_legs: null,
        odds,
        payout: result === 'win' ? win.payout : 0,
        profit: result === 'win' ? win.profit : -stake,
      })
    );
  }

  runAllSnapshots('Late night session cluster', bets);
});

// ═══════════════════════════════════════════════════════════════
// Scenario 6: Minimum viable — exactly 10 bets
// ═══════════════════════════════════════════════════════════════
describe('Scenario 6: Minimum viable — exactly 10 bets', () => {
  const results: Bet['result'][] = ['win', 'loss', 'win', 'loss', 'win', 'loss', 'win', 'loss', 'win', 'loss'];
  const bets: Bet[] = results.map((result, i) => {
    const date = new Date('2025-01-05T14:00:00Z');
    date.setDate(date.getDate() + i);
    const win = winFor(50, -110);
    return makeBet({
      placed_at: date.toISOString(),
      created_at: date.toISOString(),
      stake: 50,
      odds: -110,
      result,
      payout: result === 'win' ? win.payout : 0,
      profit: result === 'win' ? win.profit : -50,
    });
  });

  runAllSnapshots('Minimum viable — exactly 10 bets', bets);
});

// ═══════════════════════════════════════════════════════════════
// Scenario 7: Large volume — 200 bets
// ═══════════════════════════════════════════════════════════════
describe('Scenario 7: Large volume — 200 bets', () => {
  const sports = [
    ...Array(80).fill('NFL'),   // 40%
    ...Array(60).fill('NBA'),   // 30%
    ...Array(40).fill('MLB'),   // 20%
    ...Array(20).fill('NHL'),   // 10%
  ];
  const types = [
    ...Array(100).fill('spread'),    // 50%
    ...Array(50).fill('moneyline'),  // 25%
    ...Array(30).fill('total'),      // 15%
    ...Array(20).fill('prop'),       // 10%
  ];
  // Deterministic pseudo-random via mulberry32
  function prng(seed: number) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = prng(42);

  const bets: Bet[] = Array.from({ length: 200 }, (_, i) => {
    const date = new Date('2025-01-01T15:00:00Z');
    // ~6 months spread: 200 bets × ~22 hrs apart ≈ 183 days
    date.setHours(date.getHours() + Math.floor(i * 22));
    const sport = sports[Math.floor(rand() * sports.length)];
    const bet_type = types[Math.floor(rand() * types.length)];
    const stake = 25 + Math.floor(rand() * 126); // 25..150
    const odds = -110 + Math.floor(rand() * 41) - 20; // -130..-90 ish
    const result: Bet['result'] = rand() < 0.48 ? 'win' : 'loss';
    const win = winFor(stake, odds);
    return makeBet({
      placed_at: date.toISOString(),
      created_at: date.toISOString(),
      sport,
      league: sport,
      bet_type,
      stake,
      odds,
      result,
      payout: result === 'win' ? win.payout : 0,
      profit: result === 'win' ? win.profit : -stake,
      description: `${sport} ${bet_type}`,
    });
  });

  runAllSnapshots('Large volume — 200 bets', bets);
});

// ═══════════════════════════════════════════════════════════════
// Scenario 8: Mixed sportsbooks
// ═══════════════════════════════════════════════════════════════
describe('Scenario 8: Mixed sportsbooks', () => {
  const books = [
    ...Array(10).fill({ book: 'DraftKings', type: 'spread', legs: null, odds: -110 }),
    ...Array(10).fill({ book: 'FanDuel', type: 'moneyline', legs: null, odds: +130 }),
    ...Array(5).fill({ book: 'BetMGM', type: 'total', legs: null, odds: -105 }),
    ...Array(5).fill({ book: 'PrizePicks', type: 'parlay', legs: 3, odds: 500 }),
  ];
  const results: Bet['result'][] = [
    'win', 'loss', 'win', 'loss', 'win', 'loss', 'win', 'loss', 'win', 'loss',
    'loss', 'win', 'loss', 'win', 'loss', 'win', 'loss', 'win', 'loss', 'win',
    'win', 'loss', 'win', 'loss', 'win',
    'loss', 'loss', 'win', 'loss', 'loss',
  ];
  const bets: Bet[] = books.map((b, i) => {
    const date = new Date('2025-01-05T14:00:00Z');
    date.setDate(date.getDate() + i);
    const stake = 50;
    const result = results[i];
    const win = winFor(stake, b.odds);
    return makeBet({
      placed_at: date.toISOString(),
      created_at: date.toISOString(),
      sportsbook: b.book,
      bet_type: b.type,
      parlay_legs: b.legs,
      odds: b.odds,
      stake,
      result,
      payout: result === 'win' ? win.payout : 0,
      profit: result === 'win' ? win.profit : -stake,
    });
  });

  runAllSnapshots('Mixed sportsbooks', bets, { dfs: true });
});

// ═══════════════════════════════════════════════════════════════
// Scenario 9: All wins streak
// ═══════════════════════════════════════════════════════════════
describe('Scenario 9: All wins streak', () => {
  const bets: Bet[] = Array.from({ length: 15 }, (_, i) => {
    const date = new Date('2025-01-03T14:00:00Z');
    date.setDate(date.getDate() + i);
    const stake = 50;
    const win = winFor(stake, -110);
    return makeBet({
      placed_at: date.toISOString(),
      created_at: date.toISOString(),
      stake,
      odds: -110,
      result: 'win',
      payout: win.payout,
      profit: win.profit,
    });
  });

  runAllSnapshots('All wins streak', bets);
});

// ═══════════════════════════════════════════════════════════════
// Scenario 10: All losses streak
// ═══════════════════════════════════════════════════════════════
describe('Scenario 10: All losses streak', () => {
  const bets: Bet[] = Array.from({ length: 15 }, (_, i) => {
    const date = new Date('2025-01-03T14:00:00Z');
    date.setDate(date.getDate() + i);
    const stake = 50 + i * 5; // slowly escalating — tilt
    return makeBet({
      placed_at: date.toISOString(),
      created_at: date.toISOString(),
      stake,
      odds: -110,
      result: 'loss',
      payout: 0,
      profit: -stake,
    });
  });

  runAllSnapshots('All losses streak', bets);
});

// ═══════════════════════════════════════════════════════════════
// Scenario 11: Profitable sharp bettor
// ═══════════════════════════════════════════════════════════════
describe('Scenario 11: Profitable sharp bettor', () => {
  // 55% win rate → 28 wins, 22 losses over 50 bets
  const results: Bet['result'][] = [];
  for (let i = 0; i < 50; i++) {
    results.push(i % 20 < 11 ? 'win' : 'loss'); // gives ~55% with regular pattern
  }
  // Count: for i=0..19, 11 wins; for i=20..39, 11 wins; for i=40..49, 6 wins → 28 wins
  const bets: Bet[] = results.map((result, i) => {
    const date = new Date('2025-01-01T13:00:00Z');
    date.setDate(date.getDate() + i * 2);
    const stake = 100;
    const win = winFor(stake, -110);
    return makeBet({
      placed_at: date.toISOString(),
      created_at: date.toISOString(),
      sport: 'NFL',
      league: 'NFL',
      bet_type: 'spread',
      stake,
      odds: -110,
      result,
      payout: result === 'win' ? win.payout : 0,
      profit: result === 'win' ? win.profit : -stake,
      description: 'Chiefs -3.5',
    });
  });

  runAllSnapshots('Profitable sharp bettor', bets);
});

// ═══════════════════════════════════════════════════════════════
// Scenario 12: Bonus bet heavy
// ═══════════════════════════════════════════════════════════════
describe('Scenario 12: Bonus bet heavy', () => {
  const bonusIdx = new Set([1, 3, 5, 8, 10, 13, 16, 18]);
  const results: Bet['result'][] = [
    'win', 'loss', 'loss', 'loss', 'win', 'loss', 'loss', 'win', 'loss', 'win',
    'loss', 'loss', 'win', 'loss', 'win', 'loss', 'loss', 'win', 'loss', 'loss',
  ];
  const bets: Bet[] = Array.from({ length: 20 }, (_, i) => {
    const date = new Date('2025-01-02T16:00:00Z');
    date.setDate(date.getDate() + i);
    const isBonus = bonusIdx.has(i);
    const stake = isBonus ? 10 : 50;
    const odds = isBonus ? 500 + (i % 4) * 400 : -110; // +500..+2000 for bonus
    const bet_type = isBonus ? 'parlay' : 'spread';
    const parlay_legs = isBonus ? 4 : null;
    const result = results[i];
    const win = winFor(stake, odds);
    return makeBet({
      placed_at: date.toISOString(),
      created_at: date.toISOString(),
      stake,
      odds,
      bet_type,
      parlay_legs,
      is_bonus_bet: isBonus,
      result,
      payout: result === 'win' ? win.payout : 0,
      profit: result === 'win' ? win.profit : -stake,
      description: isBonus ? '4-leg bonus parlay' : 'Patriots -2.5',
    });
  });

  runAllSnapshots('Bonus bet heavy', bets);
});

// ═══════════════════════════════════════════════════════════════
// Scenario 13: Single sport deep — NBA props
// ═══════════════════════════════════════════════════════════════
describe('Scenario 13: Single sport deep — NBA props', () => {
  const propDescriptions = [
    'LeBron James Over 25.5 Points',
    'Stephen Curry Over 4.5 3PM',
    'Giannis Antetokounmpo Over 11.5 Rebounds',
    'Luka Doncic Over 8.5 Assists',
    'Jayson Tatum Over 27.5 Points',
    'Nikola Jokic Over 11.5 Rebounds',
    'Joel Embiid Over 2.5 Blocks',
    'Damian Lillard Over 3.5 3PM',
  ];
  const results: Bet['result'][] = [
    'win', 'loss', 'win', 'loss', 'win', 'loss', 'loss', 'win', 'win', 'loss',
    'win', 'loss', 'win', 'loss', 'loss', 'win', 'loss', 'win', 'loss', 'win',
    'loss', 'win', 'loss', 'win', 'loss', 'loss', 'win', 'loss', 'win', 'loss',
  ];
  const bets: Bet[] = Array.from({ length: 30 }, (_, i) => {
    const date = new Date('2025-01-05T20:00:00Z');
    date.setDate(date.getDate() + i);
    const stake = 25 + (i % 4) * 15; // 25..70
    const odds = [-110, -115, -105, +100, -120][i % 5];
    const result = results[i];
    const win = winFor(stake, odds);
    return makeBet({
      placed_at: date.toISOString(),
      created_at: date.toISOString(),
      sport: 'NBA',
      league: 'NBA',
      bet_type: 'prop',
      description: propDescriptions[i % propDescriptions.length],
      odds,
      stake,
      result,
      payout: result === 'win' ? win.payout : 0,
      profit: result === 'win' ? win.profit : -stake,
    });
  });

  runAllSnapshots('Single sport deep — NBA props', bets);
});

// ═══════════════════════════════════════════════════════════════
// Edge cases
// ═══════════════════════════════════════════════════════════════
describe('Edge cases', () => {
  it('estimatePercentile returns valid ranges', () => {
    expect(estimatePercentile('emotion_score', 0)).toMatchSnapshot();
    expect(estimatePercentile('emotion_score', 50)).toMatchSnapshot();
    expect(estimatePercentile('emotion_score', 100)).toMatchSnapshot();
    expect(estimatePercentile('discipline_score', 0)).toMatchSnapshot();
    expect(estimatePercentile('discipline_score', 50)).toMatchSnapshot();
    expect(estimatePercentile('discipline_score', 100)).toMatchSnapshot();
  });

  it('detectContradictions with conflicting patterns', () => {
    // 15 profitable straight bets alternating win/loss
    const straights = makeBetSequence(15, (i) => ({
      result: i % 2 === 0 ? ('win' as const) : ('loss' as const),
      profit: i % 2 === 0 ? 45 : -50,
      payout: i % 2 === 0 ? 95 : 0,
      stake: 50,
      odds: -110,
      bet_type: 'spread',
    }));
    // 10 terrible parlays
    const parlays = makeBetSequence(10, () => ({
      bet_type: 'parlay',
      parlay_legs: 4,
      result: 'loss' as const,
      profit: -20,
      payout: 0,
      stake: 20,
      odds: 1000,
    }));
    const bets = [...straights, ...parlays];
    const metrics = calculateMetrics(bets, 5000);
    const contradictions = detectContradictions(metrics, bets);
    expect(contradictions).toMatchSnapshot();
  });

  it('generatePertinentNegatives', () => {
    // Disciplined bettor — flat stakes, no parlays, alternating wins/losses
    const bets = makeBetSequence(30, (i) => ({
      result: i % 2 === 0 ? ('win' as const) : ('loss' as const),
      profit: i % 2 === 0 ? 45 : -50,
      payout: i % 2 === 0 ? 95 : 0,
      stake: 50,
      odds: -110,
      bet_type: 'spread',
    }));
    const metrics = calculateMetrics(bets, 5000);
    const detectedBiasNames = metrics.biases_detected.map((b) => b.bias_name);
    const negatives = generatePertinentNegatives(detectedBiasNames);
    expect(negatives).toMatchSnapshot();
  });

  it('calculateMetricsOnly returns consistent partial analysis', () => {
    const bets = makeBetSequence(20, (i) => ({
      result: i % 3 === 0 ? ('win' as const) : ('loss' as const),
      profit: i % 3 === 0 ? 45 : -50,
      payout: i % 3 === 0 ? 95 : 0,
      stake: 50,
      odds: -110,
    }));
    const { partialAnalysis } = calculateMetricsOnly(bets, 5000, DISCIPLINE_CTX);
    expect(partialAnalysis).toMatchSnapshot();
  });
});

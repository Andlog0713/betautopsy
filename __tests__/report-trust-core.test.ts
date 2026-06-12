import { describe, it, expect } from 'vitest';
import { confidenceFor, leakSeverityFromRoi } from '@/lib/engine/confidence';
import { dedupeBiases } from '@/lib/engine/dedupeBiases';
import { buildRecoveryModel, roundRecoveryRange } from '@/lib/engine/recovery';
import { calculateMetrics, runSnapshot } from '@/lib/autopsy-engine';
import type { Bet } from '@/types';

// ── helpers ──────────────────────────────────────────────────────────

let betSeq = 0;
function makeBet(overrides: Partial<Bet> = {}): Bet {
  betSeq++;
  return {
    id: `bet-${betSeq}`,
    user_id: 'user-1',
    placed_at: `2026-01-${String((betSeq % 27) + 1).padStart(2, '0')}T12:00:00.000Z`,
    sport: 'NFL',
    league: null,
    bet_type: 'spread',
    description: `Test bet ${betSeq}`,
    odds: -110,
    stake: 100,
    result: 'win',
    payout: 190,
    profit: 90,
    sportsbook: null,
    is_bonus_bet: false,
    parlay_legs: null,
    tags: null,
    notes: null,
    upload_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const WHAT_IFS_BASE = {
  flat_stake: { median_stake: 50, hypothetical_profit: -1000 },
  no_long_parlays: { removed_count: 0, hypothetical_profit: -5000 },
  profitable_only: { categories: [] as string[], hypothetical_profit: -5000 },
  actual_profit: -5000,
};

// ── confidence ───────────────────────────────────────────────────────

describe('confidenceFor', () => {
  it('tiers on sample size', () => {
    expect(confidenceFor(10, 'high')).toBe('low');
    expect(confidenceFor(30, 'high')).toBe('medium');
    expect(confidenceFor(99, 'high')).toBe('medium');
    expect(confidenceFor(100, 'high')).toBe('high');
  });

  it('demotes one tier for a weak effect (severity low)', () => {
    expect(confidenceFor(150, 'low')).toBe('medium');
    expect(confidenceFor(50, 'low')).toBe('low');
    expect(confidenceFor(10, 'low')).toBe('low');
  });
});

describe('leakSeverityFromRoi', () => {
  it('maps ROI impact to deterministic tiers', () => {
    expect(leakSeverityFromRoi(-40)).toBe('critical');
    expect(leakSeverityFromRoi(-35)).toBe('critical');
    expect(leakSeverityFromRoi(-30)).toBe('high');
    expect(leakSeverityFromRoi(-20)).toBe('medium');
    expect(leakSeverityFromRoi(-10)).toBe('low');
    expect(leakSeverityFromRoi(-5)).toBe('low');
  });
});

// ── dedupeBiases ─────────────────────────────────────────────────────

describe('dedupeBiases', () => {
  const ids = (...n: number[]) => n.map((i) => `bet-${i}`);

  it('collapses the category pair when both name the same category', () => {
    const result = dedupeBiases([
      { bias_name: 'Category Concentration Leak', severity: 'high', data: 'NBA prop: 200 bets at -71.5% ROI ($-14300)', evidence_bet_ids: ids(1, 2, 3) },
      { bias_name: 'High-Volume Category Leak', severity: 'critical', data: 'NBA prop: 200 bets at -71.5% ROI ($-14300 lost). More prose.', evidence_bet_ids: ids(1, 2, 3) },
    ]);
    expect(result).toHaveLength(1);
    // higher severity wins
    expect(result[0].bias_name).toBe('High-Volume Category Leak');
  });

  it('keeps BOTH category detectors when they flag different categories (the engine:964 protection)', () => {
    const result = dedupeBiases([
      { bias_name: 'Category Concentration Leak', severity: 'high', data: 'NHL moneyline: 12 bets at -44% ROI ($-600)', evidence_bet_ids: ids(1, 2, 3) },
      { bias_name: 'High-Volume Category Leak', severity: 'medium', data: 'NBA prop: 200 bets at -12% ROI ($-2400 lost).', evidence_bet_ids: ids(10, 11, 12) },
    ]);
    expect(result).toHaveLength(2);
  });

  it('collapses any pair with near-identical evidence ids (Jaccard >= 0.6)', () => {
    const result = dedupeBiases([
      { bias_name: 'Late-Night Betting', severity: 'medium', data: '30% of bets after 11pm', evidence_bet_ids: ids(1, 2, 3, 4, 5) },
      { bias_name: 'Sustained Late-Night Concentration', severity: 'medium', data: '120 bets placed after 11pm', evidence_bet_ids: ids(1, 2, 3, 4, 6) },
    ]);
    expect(result).toHaveLength(1);
    // tie on severity -> earlier (established) detector wins
    expect(result[0].bias_name).toBe('Late-Night Betting');
    // evidence unioned
    expect(result[0].evidence_bet_ids).toEqual(expect.arrayContaining(ids(1, 2, 3, 4, 5, 6)));
  });

  it('does not collapse on thin evidence (< 3 ids per side) within a group', () => {
    const result = dedupeBiases([
      { bias_name: 'Late-Night Betting', severity: 'high', data: 'x', evidence_bet_ids: ids(1, 2) },
      { bias_name: 'Sustained Late-Night Concentration', severity: 'high', data: 'y', evidence_bet_ids: ids(1, 2) },
    ]);
    expect(result).toHaveLength(2);
  });

  it('NEVER collapses across signal dimensions, even on identical evidence', () => {
    // The 8 showcase ids are "top losing bets by stake" — unrelated signals
    // routinely showcase the same big losers. A favorites finding and a
    // category leak are distinct findings with different denominators.
    const result = dedupeBiases([
      { bias_name: 'Favorite-Heavy Lean', severity: 'high', data: '100% favorites, fav ROI: -20.1%', evidence_bet_ids: ids(1, 2, 3, 4, 5) },
      { bias_name: 'Category Concentration Leak', severity: 'high', data: 'NBA prop: 200 bets at -42% ROI', evidence_bet_ids: ids(1, 2, 3, 4, 5) },
      { bias_name: 'Post-Loss Escalation', severity: 'critical', data: 'ratio: 2.1x', evidence_bet_ids: ids(1, 2, 3, 4, 5) },
    ]);
    expect(result).toHaveLength(3);
  });

  it('the winner keeps its OWN sample_size (no cross-signal merging)', () => {
    const result = dedupeBiases([
      { bias_name: 'Category Concentration Leak', severity: 'critical', data: 'NBA prop: stuff', evidence_bet_ids: ids(1, 2, 3), sample_size: 50 },
      { bias_name: 'High-Volume Category Leak', severity: 'high', data: 'NBA prop: stuff', evidence_bet_ids: ids(1, 2, 3), sample_size: 200 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].bias_name).toBe('Category Concentration Leak');
    expect(result[0].sample_size).toBe(50);
  });
});

// ── recovery ─────────────────────────────────────────────────────────

describe('roundRecoveryRange', () => {
  it('rounds to magnitude-appropriate steps', () => {
    expect(roundRecoveryRange(7862)).toEqual({ rangeLow: 6000, rangeHigh: 9500 });
    expect(roundRecoveryRange(43163)).toEqual({ rangeLow: 34000, rangeHigh: 52000 });
    expect(roundRecoveryRange(450)).toEqual({ rangeLow: 300, rangeHigh: 600 });
  });

  it('never returns a zero-width or negative range', () => {
    const { rangeLow, rangeHigh } = roundRecoveryRange(40);
    expect(rangeLow).toBeGreaterThanOrEqual(0);
    expect(rangeHigh).toBeGreaterThan(rangeLow);
  });
});

describe('buildRecoveryModel', () => {
  it('picks the single largest counterfactual, never a sum', () => {
    const model = buildRecoveryModel(
      {
        ...WHAT_IFS_BASE,
        flat_stake: { median_stake: 50, hypothetical_profit: 2862 },     // +7862 vs actual
        no_long_parlays: { removed_count: 5, hypothetical_profit: -2000 }, // +3000
        profitable_only: { categories: ['NFL spread'], hypothetical_profit: -1000 }, // +4000
      },
      [{ category: 'NBA prop', roi: -50, count: 100, profit: -5000, staked: 10000 }],
    );
    expect(model).not.toBeNull();
    expect(model!.method).toBe('flat_staking');
    expect(model!.biggestSingleLeakUSD).toBe(7862);
    // explicitly NOT the 7862+3000+4000+5000 sum
    expect(model!.biggestSingleLeakUSD).toBeLessThan(7862 + 3000 + 4000 + 5000);
    expect(model!.overlapsExist).toBe(true);
    expect(model!.netUSD).toBe(-5000);
    expect(model!.rangeLow).toBe(6000);
    expect(model!.rangeHigh).toBe(9500);
  });

  it('uses exit_worst_category when it dominates, two-word combos only', () => {
    const model = buildRecoveryModel(
      WHAT_IFS_BASE,
      [
        // single-word sport key overlaps the combo dollars — must be ignored
        { category: 'NBA', roi: -60, count: 220, profit: -20000, staked: 33000 },
        { category: 'NBA prop', roi: -60, count: 200, profit: -12000, staked: 20000 },
      ],
    );
    expect(model).not.toBeNull();
    expect(model!.method).toBe('exit_worst_category');
    expect(model!.biggestSingleLeakUSD).toBe(12000);
  });

  it('returns null when no counterfactual is an improvement', () => {
    const model = buildRecoveryModel(
      {
        flat_stake: { median_stake: 50, hypothetical_profit: 900 },
        no_long_parlays: { removed_count: 0, hypothetical_profit: 1000 },
        profitable_only: { categories: [], hypothetical_profit: 1000 },
        actual_profit: 1000,
      },
      [{ category: 'NFL spread', roi: 5, count: 50, profit: 500, staked: 5000 }],
    );
    expect(model).toBeNull();
  });
});

// ── integration through the engine ───────────────────────────────────

function buildDualLeakCohort(): Bet[] {
  betSeq = 0;
  const bets: Bet[] = [];
  // 200 deeply negative NBA props: triggers BOTH Category Concentration Leak
  // (n>=10, roi<=-20) and High-Volume Category Leak (n>=100, roi<=-10,
  // settled>=500) on the same category.
  for (let i = 0; i < 200; i++) {
    bets.push(makeBet({
      sport: 'NBA', bet_type: 'prop',
      result: i < 30 ? 'win' : 'loss',
      profit: i < 30 ? 90 : -100,
      payout: i < 30 ? 190 : 0,
    }));
  }
  // 420 mixed-result NFL spreads to clear the 500-settled additive floor
  // without creating a second leaky category.
  for (let i = 0; i < 420; i++) {
    bets.push(makeBet({
      sport: 'NFL', bet_type: 'spread',
      result: i % 2 === 0 ? 'win' : 'loss',
      profit: i % 2 === 0 ? 90 : -100,
      payout: i % 2 === 0 ? 190 : 0,
    }));
  }
  return bets;
}

describe('engine integration (report-trust core)', () => {
  it('calculateMetrics dedupes the identical-category leak pair to one impact', () => {
    const metrics = calculateMetrics(buildDualLeakCohort());
    const pair = metrics.biases_detected.filter((b) =>
      b.bias_name === 'Category Concentration Leak' || b.bias_name === 'High-Volume Category Leak'
    );
    expect(pair).toHaveLength(1);
  });

  it('detector biases carry deterministic sample_size', () => {
    const metrics = calculateMetrics(buildDualLeakCohort());
    const leak = metrics.biases_detected.find((b) =>
      b.bias_name === 'Category Concentration Leak' || b.bias_name === 'High-Volume Category Leak'
    );
    expect(leak?.sample_size).toBe(200);
    expect(leak?.sub_splits?.[0]?.bets).toBe(200);
  });

  it('runSnapshot never attaches recovery and nulls sub_splits dollars', async () => {
    const { analysis } = await runSnapshot(buildDualLeakCohort());
    expect(analysis.recovery).toBeUndefined();
    for (const bias of analysis.biases_detected) {
      for (const split of bias.sub_splits ?? []) {
        expect(split.net_usd).toBeNull();
      }
      if (bias.sample_size != null) {
        expect(['low', 'medium', 'high']).toContain(bias.confidence);
      }
    }
    for (const finding of analysis.sport_specific_findings ?? []) {
      for (const split of finding.sub_splits ?? []) {
        expect(split.net_usd).toBeNull();
      }
    }
    // snapshot leaks carry deterministic severity + confidence
    for (const leak of analysis.strategic_leaks) {
      expect(['low', 'medium', 'high', 'critical']).toContain(leak.severity);
      expect(['low', 'medium', 'high']).toContain(leak.confidence);
    }
  });
});

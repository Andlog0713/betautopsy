/**
 * What-If counterfactuals — wire shaping.
 *
 * Transforms the engine's existing internal `metrics.what_ifs`
 * (lib/autopsy-engine.ts:835-872) into the `{label,actual,hypothetical}[]`
 * wire shape the iOS WhatIfCard renders. It reuses the engine's already-computed
 * what-if numbers as the single source of truth — the SAME numbers feed both
 * the LLM exec-diagnosis prompt (lib/autopsy-engine.ts:2845) and this wire
 * array, so narrative and UI stay internally consistent within a report.
 *
 * Conditional inclusion mirrors web's buildWhatIfs (components/AutopsyReport.tsx
 * 195-237): scenario 1 always; scenario 2 only when parlays over 3 legs exist;
 * scenario 3 only when the bettor's categories partition into both profitable
 * AND unprofitable buckets. Scenario 3 carries an extra guard (hypothetical !=
 * actual) so we never surface a "what-if" that equals the real result.
 *
 * v1.1 backlog (3675964c-daf2-8157): migrate web's client-side buildWhatIfs to
 * consume this server-shipped field, eliminating the web-vs-engine scenario-3
 * partition divergence entirely.
 */

import type { Bet, WhatIfScenario } from '@/types';

// Structural subset of CalculatedMetrics['what_ifs'] (lib/autopsy-engine.ts:85-88)
// — only the fields this transform reads. Full metrics.what_ifs is assignable.
export interface MetricsWhatIfsShape {
  flat_stake: { median_stake: number; hypothetical_profit: number };
  no_long_parlays: { hypothetical_profit: number };
  profitable_only: { hypothetical_profit: number };
  actual_profit: number;
}

export function buildWhatIfScenarios(
  whatIfs: MetricsWhatIfsShape,
  bets: Bet[],
): WhatIfScenario[] {
  const scenarios: WhatIfScenario[] = [];

  // Scenario 1: flat stake at median — always included.
  scenarios.push({
    label: `Flat-staked at $${Math.round(whatIfs.flat_stake.median_stake)} on every bet`,
    actual: whatIfs.actual_profit,
    hypothetical: whatIfs.flat_stake.hypothetical_profit,
  });

  const settled = bets.filter((b) => b.result === 'win' || b.result === 'loss');

  // Scenario 2: no parlays over 3 legs — only if any settled bet has >3 legs
  // (web's `noBigParlays.length < settled.length` condition).
  const hasBigParlays = settled.some((b) => (b.parlay_legs ?? 0) > 3);
  if (hasBigParlays) {
    scenarios.push({
      label: 'Eliminated all parlays over 3 legs',
      actual: whatIfs.actual_profit,
      hypothetical: whatIfs.no_long_parlays.hypothetical_profit,
    });
  }

  // Scenario 3: only profitable sports/types — only when categories partition
  // into both profitable AND unprofitable buckets (web's
  // `0 < profitableCats.size < catStats.size`), AND the engine's hypothetical
  // meaningfully differs from actual.
  const cats = new Map<string, { profit: number; staked: number }>();
  settled.forEach((b) => {
    const key = `${b.sport}-${b.bet_type}`;
    const c = cats.get(key) ?? { profit: 0, staked: 0 };
    c.profit += Number(b.profit);
    c.staked += Number(b.stake);
    cats.set(key, c);
  });
  const profitableCatCount = Array.from(cats.values()).filter(
    (c) => c.staked > 0 && c.profit / c.staked > 0,
  ).length;
  const hasMixedProfitability = profitableCatCount > 0 && profitableCatCount < cats.size;
  const meaningfulDiff = whatIfs.profitable_only.hypothetical_profit !== whatIfs.actual_profit;
  if (hasMixedProfitability && meaningfulDiff) {
    scenarios.push({
      label: 'Only bet your profitable sports/types',
      actual: whatIfs.actual_profit,
      hypothetical: whatIfs.profitable_only.hypothetical_profit,
    });
  }

  return scenarios;
}

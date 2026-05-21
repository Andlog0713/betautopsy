/**
 * Server-side port of web's What-If counterfactuals.
 *
 * Ported VERBATIM from components/AutopsyReport.tsx (calcProfit lines 123-127,
 * buildWhatIfs lines 197-237) so iOS receives byte-for-byte the same scenarios
 * the web report shows. Do not refactor or "improve" this logic: any change
 * here is a client-server divergence that is harder to debug than a known
 * quirk. Returns 1-3 scenarios (scenario 1 always; scenario 2 only when
 * parlays over 3 legs exist; scenario 3 only when the profitable-category
 * subset is non-empty and non-total) — matching web's conditional inclusion.
 *
 * NOTE: the engine also computes equivalent what-if math internally as
 * metrics.what_ifs (lib/autopsy-engine.ts) to feed the LLM prompt; that path
 * is intentionally left untouched. A v1.1 backlog item (3675964c-daf2-8157)
 * tracks collapsing the two paths after an equivalence audit.
 */

import type { Bet, WhatIfScenario } from '@/types';

function calcProfit(odds: number, stake: number, result: string): number {
  if (result === 'win') return odds > 0 ? stake * (odds / 100) : stake * (100 / Math.abs(odds));
  if (result === 'loss') return -stake;
  return 0;
}

export function buildWhatIfs(bets: Bet[]): WhatIfScenario[] {
  const settled = bets.filter((b) => b.result === 'win' || b.result === 'loss');
  if (settled.length === 0) return [];

  const actualPnL = settled.reduce((s, b) => s + Number(b.profit), 0);
  const stakes = settled.map((b) => Number(b.stake)).sort((a, b) => a - b);
  const medianStake = stakes[Math.floor(stakes.length / 2)];

  const whatIfs: WhatIfScenario[] = [];

  // 1. Flat stake at median
  const flatPnL = settled.reduce((s, b) => {
    return s + calcProfit(b.odds, medianStake, b.result);
  }, 0);
  whatIfs.push({ label: `Flat-staked at $${Math.round(medianStake)} on every bet`, actual: actualPnL, hypothetical: flatPnL });

  // 2. No parlays over 3 legs
  const noBigParlays = settled.filter((b) => !(b.parlay_legs && b.parlay_legs > 3));
  if (noBigParlays.length < settled.length) {
    const noParlayPnL = noBigParlays.reduce((s, b) => s + Number(b.profit), 0);
    whatIfs.push({ label: 'Eliminated all parlays over 3 legs', actual: actualPnL, hypothetical: noParlayPnL });
  }

  // 3. Only profitable categories
  const catStats = new Map<string, { profit: number; staked: number }>();
  settled.forEach((b) => {
    const key = `${b.sport}-${b.bet_type}`;
    const c = catStats.get(key) ?? { profit: 0, staked: 0 };
    c.profit += Number(b.profit);
    c.staked += Number(b.stake);
    catStats.set(key, c);
  });
  const profitableCats = new Set<string>();
  catStats.forEach((v, k) => { if (v.staked > 0 && v.profit / v.staked > 0) profitableCats.add(k); });
  if (profitableCats.size > 0 && profitableCats.size < catStats.size) {
    const onlyProfitable = settled.filter((b) => profitableCats.has(`${b.sport}-${b.bet_type}`));
    const profitablePnL = onlyProfitable.reduce((s, b) => s + Number(b.profit), 0);
    whatIfs.push({ label: 'Only bet your profitable sports/types', actual: actualPnL, hypothetical: profitablePnL });
  }

  return whatIfs;
}

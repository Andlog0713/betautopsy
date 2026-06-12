import type { RecoveryModel } from '@/types';
import { isPlatformCategory } from '@/lib/platform-filter';

/**
 * Non-additive recovery model. Replaces the summed-counterfactual "Total
 * Recoverable" (which added overlapping what-ifs into a number several times
 * the user's real net loss). Reports the SINGLE largest recoverable leak
 * alone, as a rounded range, plus the verified net result. Counterfactuals
 * overlap by construction — the same chased bet is counted by flat-staking
 * AND category-exit — so they must never be summed.
 *
 * Deterministic: reads only the engine's pre-computed what_ifs and
 * category_roi. No LLM involvement.
 */

// Structural subsets of CalculatedMetrics (mirrors lib/engine/whatIf.ts's
// MetricsWhatIfsShape pattern to avoid a circular import with autopsy-engine).
export interface RecoveryWhatIfsShape {
  flat_stake: { median_stake: number; hypothetical_profit: number };
  no_long_parlays: { removed_count: number; hypothetical_profit: number };
  profitable_only: { categories: string[]; hypothetical_profit: number };
  actual_profit: number;
}

export interface RecoveryCategoryRow {
  category: string;
  roi: number;
  count: number;
  profit: number;
  staked: number;
}

/**
 * Rounding for presentation ranges. Raw value -> [~0.8x, ~1.2x] snapped to a
 * magnitude-appropriate step so the range reads as an estimate, not a
 * false-precision dollar figure.
 */
export function roundRecoveryRange(value: number): { rangeLow: number; rangeHigh: number } {
  const step = value >= 10_000 ? 1_000 : value >= 2_000 ? 500 : 100;
  const rangeLow = Math.max(0, Math.floor((value * 0.8) / step) * step);
  const rangeHigh = Math.max(step, Math.ceil((value * 1.2) / step) * step);
  return { rangeLow, rangeHigh };
}

export function buildRecoveryModel(
  whatIfs: RecoveryWhatIfsShape,
  categoryRoi: RecoveryCategoryRow[],
): RecoveryModel | null {
  const actual = whatIfs.actual_profit;
  const candidates: { method: RecoveryModel['method']; value: number }[] = [];

  candidates.push({
    method: 'flat_staking',
    value: whatIfs.flat_stake.hypothetical_profit - actual,
  });
  if (whatIfs.no_long_parlays.removed_count > 0) {
    candidates.push({
      method: 'no_long_parlays',
      value: whatIfs.no_long_parlays.hypothetical_profit - actual,
    });
  }
  // Same inclusion guards as the What-If wire transform: only when profitable
  // categories exist and the hypothetical actually differs from reality.
  if (
    whatIfs.profitable_only.categories.length > 0 &&
    whatIfs.profitable_only.hypothetical_profit !== actual
  ) {
    candidates.push({
      method: 'profitable_categories_only',
      value: whatIfs.profitable_only.hypothetical_profit - actual,
    });
  }
  // exit_worst_category: dollars lost in the worst sport+bet_type combo.
  // Two-word filter mirrors what_ifs.profitable_only's heuristic and excludes
  // the sport-only / bet_type-only / sportsbook keys that overlap-count the
  // same dollars; platform categories excluded per the sportsbook rule.
  const worstCombo = categoryRoi
    .filter(
      (c) =>
        c.category.split(' ').length === 2 &&
        !isPlatformCategory(c.category) &&
        c.roi < 0 &&
        c.profit < 0,
    )
    .sort((a, b) => a.profit - b.profit)[0];
  if (worstCombo) {
    candidates.push({ method: 'exit_worst_category', value: Math.abs(worstCombo.profit) });
  }

  const best = candidates
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)[0];
  if (!best) return null;

  const { rangeLow, rangeHigh } = roundRecoveryRange(best.value);
  return {
    biggestSingleLeakUSD: Math.round(best.value),
    method: best.method,
    overlapsExist: true,
    rangeLow,
    rangeHigh,
    netUSD: Math.round(actual),
  };
}

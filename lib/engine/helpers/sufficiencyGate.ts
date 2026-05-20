/**
 * Gate-checking helper shared by every detector that has a minimum-sample
 * floor (sprint row 3655964c-daf2-8138). Detectors call checkSufficiency to
 * decide whether to emit real output or the betiq-style placeholder, and
 * gateArray for the array detectors that collapse to [] below threshold.
 */

export type Sufficiency = {
  sufficient: boolean;
  actual: number;
  required: number;
  interpretation: string;
};

/**
 * Mirrors the existing BetIQ wording: "Need at least N settled bets for a
 * meaningful X. You have M." `label` fills X (e.g. "discipline score").
 */
export function checkSufficiency(
  actual: number,
  required: number,
  label: string
): Sufficiency {
  return {
    sufficient: actual >= required,
    actual,
    required,
    interpretation: `Need at least ${required} settled bets for a meaningful ${label}. You have ${actual}.`,
  };
}

/**
 * Returns the array unchanged when there is enough sample, otherwise an
 * empty array. Used for biases_detected, behavioral_patterns, and
 * strategic_leaks (full mode), which collapse to [] below their floor.
 */
export function gateArray<T>(arr: T[], actual: number, required: number): T[] {
  return actual >= required ? arr : [];
}

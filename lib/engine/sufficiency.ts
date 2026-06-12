import type { GatedSurface, SufficiencyState, SeverityTier, SubSplit } from '@/types';
import { BET_COUNT_THRESHOLDS } from '@/lib/engine/constants/thresholds';

/**
 * SNAPSHOT-LOOSEN small-sample tier (schema_version 4).
 *
 * Before this, the bias floor was a cliff: < 100 settled bets emitted [],
 * which the UI rendered as "none detected" and the snapshot paywall counted
 * as nothing — the product audit's 4/10 small-sample experience. The band
 * replaces the cliff:
 *
 *   < 30 settled  -> no biases (below any honest signal)
 *   30-99 settled -> ALLOWLIST detectors only, severity capped at medium,
 *                    confidence forced 'low' at assembly
 *   >= 100        -> unchanged full pipeline
 *
 * The allowlist is the share/ratio detectors whose signals are meaningful at
 * small n. Category/late-night/volume detectors stay at the 100 floor —
 * category ROI under 100 settled bets is variance, and keeping them out is
 * what makes the tier honest.
 */

export const SMALL_SAMPLE_BIAS_ALLOWLIST = new Set([
  'Stake Volatility',
  'Heavy Parlay Tendency',
  'Favorite-Heavy Lean',
  'Post-Loss Escalation',
]);

// In-band per-bias guard: the detector's own denominator must clear this
// (e.g. Post-Loss Escalation needs >= 10 after-loss bets, not just 30 total).
const SMALL_SAMPLE_MIN_BIAS_SAMPLE = 10;

interface TierableBias {
  bias_name: string;
  severity: SeverityTier;
  data: string;
  evidence_bet_ids?: string[];
  sample_size?: number;
  sub_splits?: SubSplit[];
}

function capSeverity(severity: SeverityTier): SeverityTier {
  return severity === 'critical' || severity === 'high' ? 'medium' : severity;
}

/**
 * Applies the band to a detected-bias array. >= 100 settled returns the
 * array untouched; 30-99 filters to the allowlist (with the per-bias sample
 * guard) and caps severity; < 30 returns [].
 */
export function applySmallSampleBiasTier<T extends TierableBias>(
  biases: T[],
  settledBets: number,
): T[] {
  if (settledBets >= BET_COUNT_THRESHOLDS.biasesDetected) return biases;
  if (settledBets < BET_COUNT_THRESHOLDS.smallSampleBiases) return [];
  return biases
    .filter(
      (b) =>
        SMALL_SAMPLE_BIAS_ALLOWLIST.has(b.bias_name) &&
        (b.sample_size ?? 0) >= SMALL_SAMPLE_MIN_BIAS_SAMPLE,
    )
    .map((b) => ({ ...b, severity: capSeverity(b.severity) }));
}

/** True when the cohort sits in the 30-99 limited band. */
export function isLimitedSample(settledBets: number): boolean {
  return (
    settledBets >= BET_COUNT_THRESHOLDS.smallSampleBiases &&
    settledBets < BET_COUNT_THRESHOLDS.biasesDetected
  );
}

/**
 * The wire sufficiency state: every surface currently below its full floor.
 * Computed identically in both assembly paths (runAutopsy / runSnapshot).
 */
export function buildSufficiencyState(
  settledBets: number,
  totalSessions: number,
): SufficiencyState {
  const T = BET_COUNT_THRESHOLDS;
  const gated: GatedSurface[] = [];
  if (settledBets < T.smallSampleBiases) gated.push('biases');
  if (settledBets < T.biasesDetected) gated.push('biases_full_tier');
  if (settledBets < T.strategicLeaksFullTotal) gated.push('strategic_leaks');
  if (settledBets < T.behavioralPatterns) gated.push('behavioral_patterns');
  if (settledBets < T.enhancedTilt) gated.push('enhanced_tilt');
  if (settledBets < T.betIQ) gated.push('betiq');
  if (settledBets < T.bettingArchetype) gated.push('betting_archetype');
  if (settledBets < T.emotionScore) gated.push('emotion_score');
  if (settledBets < T.disciplineScore) gated.push('discipline_score');
  if (totalSessions < T.heatedSessionsMinSessions) gated.push('heated_aggregates');

  const tier: SufficiencyState['tier'] =
    settledBets >= T.biasesDetected
      ? 'full'
      : settledBets >= T.smallSampleBiases
        ? 'limited'
        : 'building';

  return { settledBets, tier, gated };
}

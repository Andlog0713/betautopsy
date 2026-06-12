import type { ConfidenceTier, SeverityTier } from '@/types';

/**
 * Deterministic confidence tier from sample size + effect size (the finding's
 * severity tier is the effect-size proxy). NOT LLM-chosen — this feeds the
 * per-finding evidence-disclosure block on both web and iOS.
 *
 *   n >= 100 -> high, n >= 30 -> medium, else low.
 *   A weak effect (severity 'low') demotes the result one tier: a large
 *   sample of a barely-there signal is not high-confidence evidence of a
 *   behavioral problem.
 */
export function confidenceFor(sampleSize: number, severity?: string): ConfidenceTier {
  const base: ConfidenceTier = sampleSize >= 100 ? 'high' : sampleSize >= 30 ? 'medium' : 'low';
  if (severity === 'low') {
    if (base === 'high') return 'medium';
    if (base === 'medium') return 'low';
  }
  return base;
}

/**
 * Deterministic severity for strategic leaks from their ROI impact. Mirrors
 * the Category Concentration Leak detector tiers in calculateMetrics
 * (-50/-35/-25 there; leaks use a slightly relaxed ladder because the leak
 * surface already floors on sample size). Never LLM-chosen.
 */
export function leakSeverityFromRoi(roiImpact: number): SeverityTier {
  if (roiImpact <= -35) return 'critical';
  if (roiImpact <= -25) return 'high';
  if (roiImpact <= -15) return 'medium';
  return 'low';
}

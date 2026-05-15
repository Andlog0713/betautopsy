import type {
  AutopsyAnalysis,
  BetIQDelta,
  ImpactDelta,
  WhatChanged,
} from '@/types';

// Longitudinal-memory deltas for Chapter 1. Pure compute — no DB access,
// no clock. The route handler at app/api/analyze pulls the prior
// autopsy_reports row, wraps it + the just-computed analysis as
// WhatChangedInput pairs, and feeds them in. Returns undefined when no
// substantive delta survives the stability thresholds: empty cards are
// not a useful signal.

export interface WhatChangedInput {
  analysis: AutopsyAnalysis;
  createdAt: string;        // ISO timestamp from autopsy_reports.created_at
  betCountAnalyzed: number; // autopsy_reports.bet_count_analyzed
}

const BETIQ_THRESHOLD = 3;
const IMPACT_REL_THRESHOLD = 0.2;   // 20% relative move
const IMPACT_ABS_THRESHOLD = 500;   // $500 absolute move
const MAX_IMPACT_DELTAS = 3;
const CONFIDENCE_HIGH_BETS = 100;
const CONFIDENCE_MEDIUM_BETS = 30;

function daysBetween(earlierIso: string, laterIso: string): number {
  const earlier = new Date(earlierIso).getTime();
  const later = new Date(laterIso).getTime();
  if (Number.isNaN(earlier) || Number.isNaN(later)) return 0;
  return Math.max(0, Math.floor((later - earlier) / 86_400_000));
}

function confidenceFor(prevBets: number, currBets: number): ImpactDelta['confidence'] {
  if (prevBets >= CONFIDENCE_HIGH_BETS && currBets >= CONFIDENCE_HIGH_BETS) return 'high';
  if (prevBets >= CONFIDENCE_MEDIUM_BETS && currBets >= CONFIDENCE_MEDIUM_BETS) return 'medium';
  return 'low';
}

function computeArchetypeChange(
  previous: AutopsyAnalysis,
  current: AutopsyAnalysis,
): WhatChanged['archetypeChange'] {
  const prev = previous.betting_archetype?.name;
  const curr = current.betting_archetype?.name;
  if (!prev || !curr) return undefined;
  if (prev === curr) return undefined;
  return { from: prev, to: curr };
}

function computeBetIQDelta(
  previous: AutopsyAnalysis,
  current: AutopsyAnalysis,
): BetIQDelta | undefined {
  const prev = previous.betiq?.score;
  const curr = current.betiq?.score;
  if (typeof prev !== 'number' || typeof curr !== 'number') return undefined;
  const delta = curr - prev;
  if (Math.abs(delta) < BETIQ_THRESHOLD) return undefined;
  const direction: BetIQDelta['direction'] =
    delta > 0 ? 'improved' : delta < 0 ? 'regressed' : 'stable';
  return { from: prev, to: curr, direction };
}

function computeTopImpactDeltas(
  previous: WhatChangedInput,
  current: WhatChangedInput,
): ImpactDelta[] {
  const prevBiases = previous.analysis.biases_detected ?? [];
  const currBiases = current.analysis.biases_detected ?? [];
  if (prevBiases.length === 0 || currBiases.length === 0) return [];

  const prevByName = new Map<string, number>();
  for (const b of prevBiases) {
    if (typeof b.estimated_cost === 'number' && b.bias_name) {
      prevByName.set(b.bias_name.toLowerCase(), b.estimated_cost);
    }
  }

  const confidence = confidenceFor(previous.betCountAnalyzed, current.betCountAnalyzed);
  const candidates: ImpactDelta[] = [];

  for (const c of currBiases) {
    if (typeof c.estimated_cost !== 'number' || !c.bias_name) continue;
    const prevImpact = prevByName.get(c.bias_name.toLowerCase());
    if (typeof prevImpact !== 'number' || prevImpact === 0) continue;

    const delta = c.estimated_cost - prevImpact;
    const passesRelative = Math.abs(delta) >= IMPACT_REL_THRESHOLD * Math.abs(prevImpact);
    const passesAbsolute = Math.abs(delta) >= IMPACT_ABS_THRESHOLD;
    if (!passesRelative && !passesAbsolute) continue;

    candidates.push({
      biasName: c.bias_name,
      previousImpact: prevImpact,
      currentImpact: c.estimated_cost,
      deltaPercent: Math.round((delta / prevImpact) * 100),
      confidence,
    });
  }

  candidates.sort((a, b) => {
    const aAbs = Math.abs(a.currentImpact - a.previousImpact);
    const bAbs = Math.abs(b.currentImpact - b.previousImpact);
    return bAbs - aAbs;
  });

  return candidates.slice(0, MAX_IMPACT_DELTAS);
}

export function computeWhatChanged(
  previous: WhatChangedInput,
  current: WhatChangedInput,
): WhatChanged | undefined {
  if (!previous.createdAt || Number.isNaN(Date.parse(previous.createdAt))) return undefined;

  const archetypeChange = computeArchetypeChange(previous.analysis, current.analysis);
  const betIQDelta = computeBetIQDelta(previous.analysis, current.analysis);
  const topImpactDeltas = computeTopImpactDeltas(previous, current);

  // Tighten: if no substantive deltas survive the thresholds, omit the
  // whole whatChanged field — empty cards are not a useful signal.
  if (!archetypeChange && !betIQDelta && topImpactDeltas.length === 0) {
    return undefined;
  }

  const result: WhatChanged = {
    previousReportDate: previous.createdAt.slice(0, 10),
    daysSincePrevious: daysBetween(previous.createdAt, current.createdAt),
  };
  if (archetypeChange) result.archetypeChange = archetypeChange;
  if (betIQDelta) result.betIQDelta = betIQDelta;
  if (topImpactDeltas.length > 0) result.topImpactDeltas = topImpactDeltas;

  return result;
}

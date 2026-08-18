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
  // Only bail when there's nothing on the current side to evaluate at all.
  // An empty prevBiases is NOT a reason to bail - a prior report with zero
  // detected biases, followed by a current report with real ones, is
  // exactly the "brand new bias" case below, not "nothing to compare."
  if (currBiases.length === 0) return [];

  // prevByName: bias name -> cost, only when the prior bias carried a real
  // numeric estimated_cost. prevNames: every bias name that appeared in the
  // prior report AT ALL, regardless of whether its cost was numeric - used
  // to tell "genuinely new bias" apart from "existed previously but with
  // missing/non-numeric cost data" (e.g. older LLM output predating this
  // field). The latter is a data-quality gap, not novelty, and must keep
  // being silently skipped rather than mislabeled isNew.
  const prevByName = new Map<string, number>();
  const prevNames = new Set<string>();
  for (const b of prevBiases) {
    if (!b.bias_name) continue;
    const key = b.bias_name.toLowerCase();
    prevNames.add(key);
    if (typeof b.estimated_cost === 'number') {
      prevByName.set(key, b.estimated_cost);
    }
  }

  const confidence = confidenceFor(previous.betCountAnalyzed, current.betCountAnalyzed);
  const candidates: ImpactDelta[] = [];

  for (const c of currBiases) {
    if (typeof c.estimated_cost !== 'number' || !c.bias_name) continue;
    const key = c.bias_name.toLowerCase();
    const prevImpact = prevByName.get(key);

    // Existed previously but with no numeric cost on record (older LLM
    // output predating this field) - unknown baseline, not a confirmed $0
    // or absent one. Skip rather than guess; do not mislabel isNew.
    if (typeof prevImpact !== 'number' && prevNames.has(key)) continue;

    // Zero-baseline case: a bias that either didn't exist last report, or
    // existed with a confirmed $0 impact, and now costs real money. There's
    // no meaningful percent to compute against a $0 (or absent) baseline -
    // the old code's `prevImpact === 0` guard skipped this case entirely to
    // dodge a division by zero, which silently dropped the single most
    // notable kind of change a bettor's report can show. isNew: true is a
    // new, purely additive field (same pattern as lateNightKnown) - iOS
    // decodes unknown fields as absent and ignores them, so this never
    // breaks an older client. deltaPercent stays a required number (not
    // widened to optional) - 100 here is a placeholder, not a computed
    // percentage; consumers must check isNew before reading it as one.
    if (typeof prevImpact !== 'number' || prevImpact === 0) {
      if (c.estimated_cost < IMPACT_ABS_THRESHOLD) continue;
      candidates.push({
        biasName: c.bias_name,
        previousImpact: 0,
        currentImpact: c.estimated_cost,
        deltaPercent: 100,
        isNew: true,
        confidence,
      });
      continue;
    }

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

  // Cross-version annotation: deltas spanning a schema_version boundary can
  // reflect the engine's shape change (e.g. v3 bias dedup collapsing a
  // finding) rather than user behavior. Absent version = 1 (pre-versioned
  // saved reports). This is schema_version's first actual reader.
  const prevVersion = previous.analysis.schema_version ?? 1;
  const currVersion = current.analysis.schema_version ?? 1;
  if (prevVersion !== currVersion) result.crossSchemaVersion = true;

  return result;
}

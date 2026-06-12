import type { SubSplit } from '@/types';

/**
 * Server-side dedup of biases that present the SAME underlying signal as
 * two separate impacts with two near-identical dollar narratives — the
 * visible double-count the report-trust audit flagged (Category
 * Concentration Leak + High-Volume Category Leak both naming NBA with
 * near-identical dollars).
 *
 * HISTORY / what the old no-dedupe comment was protecting: Mega-PR A's
 * additive detectors deliberately used a DISTINCT bias_name ("Distinct
 * bias_name from 'Category Concentration Leak' so it does not dedupe
 * against the existing detector", autopsy-engine ~:964) because downstream
 * logic is name-keyed (the Claude prose merge, BIAS_TO_RECOMMENDATION_TITLE,
 * what-changed deltas) — a shared name would have suppressed the relaxed-
 * threshold finding entirely, even when it flagged a DIFFERENT category
 * than the strict detector. This module preserves that protection by
 * deduping on EVIDENCE WITHIN A SIGNAL GROUP, not on name: when the two
 * detectors flag different categories, both findings survive.
 *
 * Scope is deliberately conservative: dedup only runs INSIDE a signal
 * group (detectors that measure the same dimension). Cross-dimension
 * collapses are explicitly NOT performed — the 8 showcase evidence_bet_ids
 * are "top losing bets by stake", so unrelated signals (Favorite-Heavy
 * Lean vs a category leak) routinely showcase the same big losers while
 * being genuinely distinct findings with different denominators.
 *
 * Within a group, two biases collapse when:
 *  - they name the same category (the leading "<category>:" token of their
 *    data strings), or
 *  - their evidence_bet_ids overlap at Jaccard >= 0.6 (both sides need
 *    >= 3 ids to be comparable).
 *
 * The winner is the higher-severity entry (tie -> the earlier entry, i.e.
 * the longer-established detector). Evidence ids are unioned (capped at 8,
 * matching detector emission). The winner KEEPS its own sample_size and
 * sub_splits — different detectors measure different denominators, so
 * merging samples would misstate the surviving signal's evidence base.
 */
export interface DedupableBias {
  bias_name: string;
  severity: string;
  data: string;
  evidence_bet_ids?: string[];
  sample_size?: number;
  sub_splits?: SubSplit[];
}

const SEVERITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

// Detectors that measure the same dimension. Only pairs within one group
// are dedup candidates.
const SIGNAL_GROUPS: Record<string, string[]> = {
  category: ['Category Concentration Leak', 'High-Volume Category Leak'],
  late_night: ['Late-Night Betting', 'Sustained Late-Night Concentration'],
};

const NAME_TO_GROUP = new Map<string, string>(
  Object.entries(SIGNAL_GROUPS).flatMap(([group, names]) => names.map((n) => [n, group] as const)),
);

function categoryToken(data: string): string | null {
  const idx = data.indexOf(':');
  return idx > 0 ? data.slice(0, idx).trim().toLowerCase() : null;
}

function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  setA.forEach((id) => { if (setB.has(id)) intersection++; });
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

export function dedupeBiases<T extends DedupableBias>(biases: T[]): T[] {
  const out: T[] = biases.map((b) => ({ ...b }));
  const removed = new Set<number>();

  for (let i = 0; i < out.length; i++) {
    if (removed.has(i)) continue;
    for (let j = i + 1; j < out.length; j++) {
      if (removed.has(j)) continue;
      const a = out[i];
      const b = out[j];

      // Same-dimension gate: distinct detectors from one signal group.
      const groupA = NAME_TO_GROUP.get(a.bias_name);
      const groupB = NAME_TO_GROUP.get(b.bias_name);
      if (!groupA || groupA !== groupB || a.bias_name === b.bias_name) continue;

      const sameCategory =
        groupA === 'category' &&
        categoryToken(a.data) !== null &&
        categoryToken(a.data) === categoryToken(b.data);

      const idsA = a.evidence_bet_ids ?? [];
      const idsB = b.evidence_bet_ids ?? [];
      const evidenceOverlap = idsA.length >= 3 && idsB.length >= 3 && jaccard(idsA, idsB) >= 0.6;

      if (!sameCategory && !evidenceOverlap) continue;

      const keepFirst = (SEVERITY_RANK[a.severity] ?? 0) >= (SEVERITY_RANK[b.severity] ?? 0);
      const winnerIdx = keepFirst ? i : j;
      const loserIdx = keepFirst ? j : i;
      const winner = out[winnerIdx];
      const loser = out[loserIdx];

      const mergedIds = [
        ...new Set([...(winner.evidence_bet_ids ?? []), ...(loser.evidence_bet_ids ?? [])]),
      ].slice(0, 8);

      out[winnerIdx] = {
        ...winner,
        ...(mergedIds.length > 0 ? { evidence_bet_ids: mergedIds } : {}),
      };
      removed.add(loserIdx);
      if (loserIdx === i) break; // current outer entry lost; move on
    }
  }

  return out.filter((_, idx) => !removed.has(idx));
}

import type { AutopsyAnalysis } from '@/types';

export interface Archetype {
  name: string;
  description: string;
  oneLiner: string;
  color: string;
}

/**
 * 5 data-driven behavioral archetypes, checked in waterfall order.
 * First match wins. Requires 20+ settled bets (50+ for Surgeon).
 */
export const ARCHETYPES: Record<string, Archetype> = {
  surgeon: {
    name: 'The Surgeon',
    description: 'Disciplined, profitable, data-backed. The numbers speak for themselves.',
    oneLiner: 'Disciplined. Profitable. Data-backed.',
    color: '#00C9A7', // scalpel teal
  },
  heat_chaser: {
    name: 'The Heat Chaser',
    description: 'Emotions are running the show. Losses trigger bigger bets, not better ones.',
    oneLiner: 'Emotions are running the show.',
    color: '#C4463A', // bleed red
  },
  parlay_dreamer: {
    name: 'The Parlay Dreamer',
    description: "Chasing the big hit. Heavy parlay volume, but the math isn't on your side.",
    oneLiner: 'Chasing the big hit.',
    color: '#C9A04E', // caution gold
  },
  grinder: {
    name: 'The Grinder',
    description: 'Consistent process and sizing. The discipline is there, now find the edge.',
    oneLiner: 'Disciplined process. Searching for edge.',
    color: '#8B95A5', // fg-muted
  },
  gut_bettor: {
    name: 'The Gut Bettor',
    description: 'Betting on instinct across the board. No clear edge in any category yet.',
    oneLiner: 'Betting on instinct. No clear edge.',
    color: '#7A8494', // fg-dim
  },
};

interface ClassifierInput {
  emotionScore: number;
  disciplineScore: number | null;
  roiPercent: number;
  lossChaseRatio: number;
  parlayPercent: number;
  parlayRoi: number;
  settledBets: number;
}

/**
 * Waterfall classifier. First match wins. Returns null if fewer than
 * 20 settled bets (not enough data for a behavioral profile).
 */
export function classifyArchetype(input: ClassifierInput): Archetype | null {
  const {
    emotionScore,
    disciplineScore,
    roiPercent,
    lossChaseRatio,
    parlayPercent,
    parlayRoi,
    settledBets,
  } = input;

  // Minimum data threshold
  if (settledBets < 20) return null;

  // 1. The Surgeon — profitable + disciplined + low emotion (50+ bets for confidence)
  if (
    settledBets >= 50 &&
    roiPercent > 0 &&
    (disciplineScore ?? 0) >= 60 &&
    emotionScore < 40
  ) {
    return ARCHETYPES.surgeon;
  }

  // 2. The Heat Chaser — emotional + loss chasing
  if (emotionScore >= 65 && lossChaseRatio >= 1.5) {
    return ARCHETYPES.heat_chaser;
  }

  // 3. The Parlay Dreamer — heavy parlay volume + negative parlay ROI
  if (parlayPercent >= 30 && parlayRoi < -15) {
    return ARCHETYPES.parlay_dreamer;
  }

  // 4. The Grinder — disciplined + controlled emotions
  if ((disciplineScore ?? 0) >= 60 && emotionScore < 45) {
    return ARCHETYPES.grinder;
  }

  // 5. The Gut Bettor — default fallback
  return ARCHETYPES.gut_bettor;
}

/** Look up an archetype by name (case-insensitive, used for display). */
export function getArchetypeByName(name: string): Archetype | undefined {
  return Object.values(ARCHETYPES).find(
    (a) => a.name.toLowerCase() === name.toLowerCase()
  );
}

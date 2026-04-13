import type { AutopsyAnalysis } from '@/types';

export interface Archetype {
  name: string;
  description: string;
  oneLiner: string;
  /**
   * 2–4 sentence narrative explaining what this archetype means, what the
   * pattern looks like in practice, and what to do about it. Surfaces on
   * quiz result screens (not on the full autopsy report, which renders an
   * LLM-generated per-user description instead, and not on share cards).
   */
  narrative: string;
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
    narrative:
      "Your data tells a rare story. You're betting with discipline most people never develop -- consistent sizing, controlled emotions, and a track record that holds up under the math. The edge you've built is real, and the autopsy confirms it. The work now is protecting it.",
    color: '#00C9A7', // scalpel teal
  },
  heat_chaser: {
    name: 'The Heat Chaser',
    description: 'Emotions are running the show. Losses trigger bigger bets, not better ones.',
    oneLiner: 'Emotions are running the show.',
    narrative:
      "The pattern is clear: losses don't slow you down. They speed you up. Your stakes climb after bad sessions, your volume spikes when you're down, and the decisions made in those moments are costing you more than the losing bets themselves. The problem isn't your picks -- it's what happens to your process when things go wrong.",
    color: '#C4463A', // bleed red
  },
  parlay_dreamer: {
    name: 'The Parlay Dreamer',
    description: "Chasing the big hit. Heavy parlay volume, but the math isn't on your side.",
    oneLiner: 'Chasing the big hit.',
    narrative:
      "You're betting for the big hit, and the math is working against you every time. Parlays feel like upside; they're actually a tax on optimism. The picks themselves are often defensible. It's the packaging that's killing you.",
    color: '#C9A04E', // caution gold
  },
  grinder: {
    name: 'The Grinder',
    description: 'Consistent process and sizing. The discipline is there, now find the edge.',
    oneLiner: 'Disciplined process. Searching for edge.',
    narrative:
      "You've figured out something most bettors haven't: process matters more than any single result. Your sizing is controlled, your emotions aren't running the show, and you're not blowing up on longshot volume. The discipline is already there. What you're looking for now is a sharper edge to apply it to.",
    color: '#8B95A5', // fg-muted
  },
  gut_bettor: {
    name: 'The Gut Bettor',
    description: 'Betting on instinct across the board. No clear edge in any category yet.',
    oneLiner: 'Betting on instinct. No clear edge.',
    narrative:
      "Your betting doesn't follow a pattern yet, and without one you can't tell whether your results are skill, variance, or luck. The autopsy gives you a baseline to measure against. Small adjustments to how you pick spots and size bets will tell you fast what's working -- but right now, nothing does.",
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

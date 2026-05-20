/**
 * Single source of truth for the minimum-sample floors that gate every
 * autopsy detector (sprint row 3655964c-daf2-8138). Detectors import from
 * here instead of scattering literals across the engine.
 *
 * All counts are in SETTLED bets (result === 'win' || 'loss') unless the
 * field name says sessions. The floors below match BetIQ's existing n>=50
 * skill-evaluation reasoning and the statistical rationale in the sprint
 * spec: bias/contradiction/tilt detection needs comparative volume; session
 * classification needs a session sample.
 */
export const BET_COUNT_THRESHOLDS = {
  betIQ: 50,
  disciplineScore: 50,
  bettingArchetype: 50,
  emotionScore: 50, // scalar: drives the sibling insufficient_data flags only
  enhancedTilt: 100, // object gate + worst_trigger string rewrite
  biasesDetected: 100,
  behavioralPatterns: 100, // bet-floor, not session-floor
  strategicLeaksPerCategory: 100,
  strategicLeaksFullTotal: 100,
  contradictions: 30, // EXISTING floor inside detectContradictions, unchanged
  heatedSessionsMinSessions: 20, // detectAndGradeSessions classifier floor
  additiveDetectors: 500, // Mega-PR A high-volume detectors, unchanged
  emotionalSessionPatternMinSessions: 5, // Mega-PR A, unchanged
} as const;

export type BetCountThresholds = typeof BET_COUNT_THRESHOLDS;

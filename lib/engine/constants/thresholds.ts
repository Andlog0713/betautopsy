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
  // FULL-tier bias floor (SNAPSHOT-LOOSEN reframed this from a cliff to a
  // band): >= 100 settled runs every detector uncapped; 30-99 settled runs
  // only the small-sample allowlist (share/ratio detectors) with severity
  // capped at medium and confidence forced low; < 30 emits no biases.
  biasesDetected: 100,
  // Lower edge of the small-sample band, in settled bets. 30 aligns the
  // tier boundary with confidenceFor's medium edge and the contradictions
  // floor so the confidence math and the tier always agree. 20 (the product
  // audit's lower bound) was considered and rejected: it would ship
  // findings the confidence machinery itself rates below its own floor;
  // the building-state progress copy covers the 20-29 gap instead.
  smallSampleBiases: 30,
  behavioralPatterns: 100, // bet-floor, not session-floor
  strategicLeaksPerCategory: 100,
  strategicLeaksFullTotal: 100,
  contradictions: 30, // EXISTING floor inside detectContradictions, unchanged
  heatedSessionsMinSessions: 20, // detectAndGradeSessions classifier floor
  additiveDetectors: 500, // Mega-PR A high-volume detectors, unchanged
  emotionalSessionPatternMinSessions: 5, // Mega-PR A, unchanged
  // Minimum SETTLED bets a session needs to form a meaningful hero-timeline
  // curve (charts.sessionTimeline / snapshot silhouette). Sessions below
  // this are skipped in hero selection; with no qualifying session the
  // timeline ships [] + heroSession null (report-trust, schema_version 3).
  heroTimelineMinBets: 4,
} as const;

export type BetCountThresholds = typeof BET_COUNT_THRESHOLDS;

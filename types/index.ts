// ── Database Models ──

export interface ProgressSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_bets: number;
  total_profit: number;
  roi_percent: number;
  win_rate: number;
  tilt_score: number;
  avg_stake: number;
  parlay_percent: number;
  loss_chase_ratio: number;
  bankroll_health: string;
  overall_grade: string;
  discipline_score: number | null;
  created_at: string;
}

export interface Upload {
  id: string;
  user_id: string;
  filename: string | null;
  display_name: string | null;
  bet_count: number;
  sportsbook: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  stripe_customer_id: string | null;
  subscription_tier: 'free' | 'pro';
  subscription_status: 'active' | 'inactive' | 'past_due' | 'canceled' | 'trial';
  trial_ends_at: string | null;
  bet_count: number;
  bankroll: number | null;
  streak_count: number;
  streak_last_date: string | null;
  streak_best: number;
  streak_freezes: number;
  login_count: number;
  is_admin: boolean;
  email_digest_enabled: boolean;
  last_digest_sent_at: string | null;
  reports_used_this_period: number;
  current_period_start: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bet {
  id: string;
  user_id: string;
  placed_at: string;
  sport: string;
  league: string | null;
  bet_type: string;
  description: string;
  odds: number; // American odds
  stake: number;
  result: 'win' | 'loss' | 'push' | 'void' | 'pending';
  payout: number;
  profit: number;
  sportsbook: string | null;
  is_bonus_bet: boolean;
  parlay_legs: number | null;
  tags: string[] | null;
  notes: string | null;
  upload_id: string | null;
  created_at: string;
}

// ── Autopsy Report ──

export interface AutopsyReport {
  id: string;
  user_id: string;
  report_type: 'snapshot' | 'full' | 'weekly' | 'quick';
  bet_count_analyzed: number;
  date_range_start: string | null;
  date_range_end: string | null;
  report_json: AutopsyAnalysis;
  report_markdown: string;
  model_used: string | null;
  tokens_used: number | null;
  cost_cents: number | null;
  is_paid: boolean;
  stripe_payment_intent_id: string | null;
  upgraded_from_snapshot_id: string | null;
  created_at: string;
}

// ── Snapshot Redaction (Spec v2) ──
// Per-field visibility discriminator. When != "visible", the companion field
// MUST be null in snapshot payloads. iOS V8.5+ reads these to decide blur
// treatment; older clients ignore unknown fields and degrade gracefully.
export type VisibilityTag =
  | 'visible'
  | 'redacted_dollar'
  | 'redacted_percent'
  | 'redacted_text'
  | 'hidden';

export interface TimingBucket {
  label: string;
  bets: number;
  wins: number;
  losses: number;
  staked: number;
  profit: number;
  roi: number;
  win_rate: number;
  // Snapshot redaction tag. Snapshot mode: profit nulled + tag = "redacted_dollar".
  // Full mode: profit visible + tag = "visible". Optional for backward-compat
  // with historical saved reports.
  profit_visibility?: VisibilityTag;
}

export interface TimingAnalysis {
  by_hour: TimingBucket[];     // 24 buckets (0-23)
  by_day: TimingBucket[];      // 7 buckets (Mon-Sun)
  best_window: { label: string; roi: number; count: number } | null;
  worst_window: { label: string; roi: number; count: number } | null;
  late_night_stats: { count: number; roi: number; pct_of_total: number } | null; // 11pm-4am
  has_time_data: boolean;      // false if all bets land at midnight (no real time info)
}

export interface OddsBucket {
  label: string;           // e.g. "Heavy Chalk (-300+)", "Slight Dog (+100 to +150)"
  range: string;           // e.g. "-300 or worse", "+100 to +150"
  bets: number;
  wins: number;
  losses: number;
  staked: number;
  profit: number;
  roi: number;
  win_rate: number;
  implied_prob: number;    // avg implied probability for this bucket
  actual_win_rate: number; // actual win rate — compare to implied_prob
  edge: number;            // actual_win_rate - implied_prob (positive = finding value)
  // Snapshot redaction tags. roi/win_rate/edge are direct leaks of the bucket's
  // edge; actual_win_rate + implied_prob can back-compute edge; profit + staked
  // can back-compute roi. All five locked in snapshot mode.
  profit_visibility?: VisibilityTag;
  roi_visibility?: VisibilityTag;
  win_rate_visibility?: VisibilityTag;
  implied_prob_visibility?: VisibilityTag;
  actual_win_rate_visibility?: VisibilityTag;
  edge_visibility?: VisibilityTag;
}

export interface OddsAnalysis {
  buckets: OddsBucket[];
  expected_wins: number;        // sum of implied probabilities across all settled bets
  actual_wins: number;          // actual win count
  luck_rating: number;          // actual_wins - expected_wins (positive = running hot)
  luck_label: string;           // "Running hot", "Running cold", "Right on track"
  total_settled: number;
  best_bucket: { label: string; edge: number; count: number } | null;
  worst_bucket: { label: string; edge: number; count: number } | null;
}

// ── Snapshot Redaction: new top-level structs (Spec v2) ──
// All four types are NEW. Existing fields on AutopsyAnalysis are unchanged.
// Engine emits these alongside legacy fields; iOS V8.5+ consumes them.

// Dual-emission with legacy `executive_diagnosis: string`:
// - Snapshot mode: only `executiveDiagnosis: { insightSnapshot }` is set.
//   `executive_diagnosis` (legacy string) stays undefined (no regression for
//   pre-V8.5 iOS clients).
// - Full mode: both shipped — `executive_diagnosis` unchanged, and
//   `executiveDiagnosis = { insightSnapshot: <templated>, insightFull: <same
//   string as legacy> }`. V8.5 reads insightFull; older clients read legacy.
export interface ExecutiveDiagnosis {
  insightSnapshot: string;
  insightFull?: string;
}

// One entry per Ch 6 pattern card. Engine pre-computes in snapshot mode so
// iOS never sees raw sessions / never computes patterns client-side. Five
// kinds shipped: biggest_loss, worst_day, worst_hour, longest_skid,
// biggest_win. biggest_win.dollarValue stays visible (D6); the other four
// have dollarValue=null + dollarVisibility="redacted_dollar".
export interface PatternSnapshotEntry {
  kind: 'biggest_loss' | 'worst_day' | 'worst_hour' | 'longest_skid' | 'biggest_win';
  entityLabel: string;   // e.g. "NBA props", "Tuesday", "11pm-2am"
  betCount: number;      // sample size — always visible (D12)
  roi: number;           // ROI percent — always visible (D15)
  dollarValue: number | null;
  dollarVisibility: VisibilityTag;
}

// Pre-aggregated counts shipped in BOTH snapshot and full mode. Drives Ch 6
// "IN YOUR FULL REPORT" footer + paywall conversion copy. All ints, always
// visible (counts are not dollars).
export interface SummaryCounts {
  sessionsAnalyzed: number;
  biasesDetected: number;
  patternsIdentified: number;
  leakPatternsFlagged: number;
  sportLevelFindings: number;
}

// Top-3 biases by abs(estimated_cost). Lives inside _snapshot_teaser.topDamages.
// Drives Ch 1 damage bars; severity_bar_ratio lets iOS render bar length
// without ever seeing the underlying cost.
export interface TopDamageEntry {
  biasName: string;
  severity: string;
  severityBarRatio: number;  // 0..1
  estimatedCost: number | null;
  estimatedCostVisibility: VisibilityTag;
}

export interface AutopsyAnalysis {
  /** Bumped when the saved report shape changes in a breaking way. */
  schema_version?: number;
  summary: AutopsySummary;
  biases_detected: BiasDetected[];
  strategic_leaks: StrategicLeak[];
  behavioral_patterns: BehavioralPattern[];
  recommendations: Recommendation[];
  emotion_score: number; // 0-100
  emotion_breakdown?: {
    stake_volatility: number;
    loss_chasing: number;
    streak_behavior: number;
    session_discipline: number;
  };
  /** @deprecated Use emotion_score — kept for backward compat with old saved reports */
  tilt_score?: number;
  /** @deprecated Use emotion_breakdown */
  tilt_breakdown?: {
    stake_volatility: number;
    loss_chasing: number;
    streak_behavior: number;
    session_discipline: number;
  };
  bankroll_health: 'healthy' | 'caution' | 'danger';
  personal_rules?: PersonalRule[];
  session_analysis?: SessionAnalysis;
  edge_profile?: EdgeProfile;
  betting_archetype?: { name: string; description: string };
  /** Quiz-estimated archetype name (from quiz_leads table, if the user took the quiz). */
  quiz_archetype?: string;
  timing_analysis?: TimingAnalysis;
  odds_analysis?: OddsAnalysis;
  dfs_mode?: boolean;
  dfs_platform?: string;
  dfs_metrics?: DFSMetrics;
  discipline_score?: {
    total: number;
    tracking: number;
    sizing: number;
    control: number;
    strategy: number;
    percentile?: number;
  };
  betiq?: BetIQResult;
  emotion_percentile?: number;
  enhanced_tilt?: EnhancedTiltResult;
  sport_specific_findings?: SportSpecificFinding[];
  session_detection?: SessionDetectionResult;
  bet_annotations?: AnnotationSummary;
  executive_diagnosis?: string;
  // Spec v2 dual-emission: new struct shipped alongside legacy snake string.
  // See ExecutiveDiagnosis docstring above for snapshot vs full semantics.
  executiveDiagnosis?: ExecutiveDiagnosis;
  pertinent_negatives?: PertinentNegative[];
  contradictions?: Contradiction[];
  // Snapshot-only pre-computed pattern cards (Ch 6). Engine produces these so
  // iOS doesn't compute patterns from raw sessions in snapshot mode.
  patternsSnapshot?: PatternSnapshotEntry[];
  // Pre-aggregated section counts. Ships in BOTH modes. Drives Ch 6 footer
  // copy + paywall conversion. Supersedes _snapshot_counts going forward but
  // does not replace it (kept for pre-V8.5 iOS).
  summaryCounts?: SummaryCounts;
  // Snapshot-only: counts for locked sections so paywall UI can show "3 leaks detected" etc.
  _snapshot_counts?: {
    leaks: number;
    patterns: number;
    sessions: number;
    sport_findings: number;
    total_biases: number;
  };
  _snapshot_teaser?: {
    biasNames: { name: string; severity: string }[];
    leakCategories: string[];
    sessionGrades: Record<string, number>;
    heatedSessionCount: number;
    // Spec v2: structured top-3 biases with redaction tags.
    topDamages?: TopDamageEntry[];
  };
  // Filled by /api/analyze when the user has at least one prior report.
  // Omitted entirely for first reports OR when no archetype / betIQ /
  // impact deltas survive the stability thresholds. iOS Chapter 1
  // renderer consumes this; web reports surface uses lib/report-comparison
  // separately.
  whatChanged?: WhatChanged;
}

// ── What Changed (longitudinal-memory deltas for Chapter 1) ──

export interface ArchetypeChange {
  from: string;
  to: string;
}

export interface BetIQDelta {
  from: number;
  to: number;
  direction: 'improved' | 'regressed' | 'stable';
}

export interface ImpactDelta {
  biasName: string;
  previousImpact: number;
  currentImpact: number;
  deltaPercent: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface WhatChanged {
  previousReportDate: string;
  daysSincePrevious: number;
  archetypeChange?: ArchetypeChange;
  betIQDelta?: BetIQDelta;
  topImpactDeltas?: ImpactDelta[];
}

export interface PersonalRule {
  rule: string;
  reason: string;
  based_on: string;
}

export interface SessionAnalysis {
  total_sessions: number;
  avg_bets_per_winning_session: number;
  avg_bets_per_losing_session: number;
  worst_session: SessionDetail;
  best_session: SessionDetail;
  insight: string;
}

export interface SessionDetail {
  date: string;
  bets: number;
  duration: string;
  starting_stake?: number;
  ending_stake?: number;
  net: number;
  description: string;
}

// ── Session Detection (first-class sessions) ──

export interface DetectedSession {
  id: string;
  date: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  bets: number;
  wins: number;
  losses: number;
  pushes: number;
  staked: number;
  profit: number;
  // Snapshot redaction tag for `profit`. camelCase to match DetectedSession's
  // existing convention. Snapshot: profit nulled + tag = "redacted_dollar".
  // Spec v2 scope covers session.profit only; other dollar fields on this
  // struct (staked, avgStake, startingStake, etc.) keep their current
  // zero-in-snapshot behavior (parked spec-v2 follow-up).
  profitVisibility?: VisibilityTag;
  roi: number;
  avgStake: number;
  startingStake: number;
  endingStake: number;
  stakeEscalation: number;
  maxStake: number;
  minStake: number;
  stakeCv: number;
  betsPerHour: number;
  longestLossStreak: number;
  chasedAfterLoss: boolean;
  chaseCount: number;
  lateNight: boolean;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  gradeReasons: string[];
  isHeated: boolean;
  heatSignals: string[];
  betIndices: number[];
  betSnapshots?: { placed_at: string; description: string; stake: number; profit: number; result: string }[];
}

export interface SessionDetectionResult {
  sessions: DetectedSession[];
  totalSessions: number;
  avgSessionLength: number;
  avgSessionDuration: number;
  sessionGradeDistribution: { grade: string; count: number; percent: number }[];
  heatedSessionCount: number;
  heatedSessionPercent: number;
  avgGradedROI: Record<string, number>;
  bestSession: DetectedSession | null;
  worstSession: DetectedSession | null;
  insight: string;
}

// ── Bet-by-Bet Annotations ──

export type BetClassification = 'disciplined' | 'emotional' | 'chasing' | 'impulsive' | 'neutral';

export interface BetSignal {
  name: string;
  weight: number;
  description: string;
  category: BetClassification;
}

export interface BetAnnotation {
  betIndex: number;
  betId: string;
  classification: BetClassification;
  confidence: number;
  signals: BetSignal[];
  primaryReason: string;
  sessionId: string | null;
  sessionGrade: string | null;
  isInHeatedSession: boolean;
  stakeVsMedian: number;
  timeSinceLastBet: number | null;
  currentStreak: number;
}

export interface AnnotationSummary {
  annotations: BetAnnotation[];
  distribution: Record<BetClassification, { count: number; percent: number; totalStaked: number; totalProfit: number; roi: number }>;
  emotionalCost: number;
  worstAnnotatedBet: BetAnnotation | null;
  bestAnnotatedBet: BetAnnotation | null;
  streakInfluence: {
    avgStakeAfterWinStreak3: number;
    avgStakeAfterLossStreak3: number;
    avgStakeNeutral: number;
  };
  insight: string;
}

export interface EdgeProfile {
  profitable_areas: EdgeArea[];
  unprofitable_areas: EdgeAreaUnprofitable[];
  reallocation_advice: string;
  sharp_score: number;
}

export interface EdgeArea {
  category: string;
  roi: number;
  sample_size: number;
  confidence: 'low' | 'medium' | 'high';
}

export interface EdgeAreaUnprofitable {
  category: string;
  roi: number;
  sample_size: number;
  estimated_loss: number;
}

export interface AutopsySummary {
  total_bets: number;
  record: string; // "W-L-P"
  total_profit: number;
  roi_percent: number;
  avg_stake: number;
  date_range: string;
  // Nullable: engine emits null until grade methodology is reconciled with
  // BetIQ deterministically (Snapshot Redaction Spec amendment, Phase 3).
  overall_grade: string | null;
}

export type DeltaDirection = 'up' | 'down' | 'flat';

export interface ScoreDelta {
  current: number;
  previous: number;
  delta: number;
  direction: DeltaDirection;
}

export interface BiasChange {
  name: string;
  previousSeverity: string | null;
  currentSeverity: string | null;
  direction: 'improved' | 'worsened' | 'new' | 'resolved';
}

export interface ReportComparison {
  disciplineScore: ScoreDelta | null;
  emotionScore: ScoreDelta;
  betiqScore: ScoreDelta | null;
  biasChanges: BiasChange[];
  sessionGradeShift: { previousAvg: number; currentAvg: number; direction: DeltaDirection } | null;
  heatedSessionChange: { previous: number; current: number; delta: number; direction: DeltaDirection } | null;
  topImprovement: string | null;
  topRegression: string | null;
}

export interface BiasDetected {
  bias_name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string;
  estimated_cost: number;
  fix: string;
  evidence_bet_ids?: string[];
  // Snapshot redaction tags. Snapshot mode nulls description/evidence/fix +
  // estimated_cost and sets these to hidden/redacted_dollar accordingly.
  // Phase 1: optional + additive. Phase 2 widens the value-field types to
  // nullable in lockstep with the runtime change. iOS V8.5+ reads these.
  description_visibility?: VisibilityTag;
  evidence_visibility?: VisibilityTag;
  fix_visibility?: VisibilityTag;
  estimated_cost_visibility?: VisibilityTag;
  // Pre-computed 0..1 ratio = abs(estimated_cost) / max(abs(all costs)).
  // Lets iOS render the severity bar without ever seeing the cost itself.
  severity_bar_ratio?: number;
}

export interface Contradiction {
  title: string;
  insight: string;
  volumeLabel: string;
  volumeData: string;
  edgeLabel: string;
  edgeData: string;
  annualCost?: number;
}

export interface PertinentNegative {
  pattern: string;
  finding: string;
  detail: string;
  populationPercent: number;
}

export interface StrategicLeak {
  category: string;
  detail: string;
  roi_impact: number;
  sample_size: number;
  suggestion: string;
}

export interface BehavioralPattern {
  pattern_name: string;
  description: string;
  frequency: string;
  impact: 'positive' | 'negative' | 'neutral';
  data_points: string;
}

export interface Recommendation {
  priority: number;
  title: string;
  description: string;
  expected_improvement: string;
  difficulty: 'easy' | 'medium' | 'hard';
  // Snapshot redaction tags. D10: snapshot ships title + difficulty +
  // tied-to-finding label visible; expected_improvement + description hidden.
  description_visibility?: VisibilityTag;
  expected_improvement_visibility?: VisibilityTag;
  // Optional link from a snapshot recommendation back to the bias it
  // addresses (drives "Tied to: [bias]" label in Ch 7).
  tied_to_finding?: string;
}

// ── Subscription Tiers ──

export interface TierConfig {
  name: string;
  price: number;
  annualPrice?: number;
  maxBets: number | null; // null = unlimited
  maxReports: number | null; // null = unlimited
  maxBetsPerReport: number | null; // null = unlimited
  reportsPerMonth?: number; // Pro: 3 included per billing cycle
  features: string[];
  stripePriceId?: string;
}

export type SubscriptionTier = 'free' | 'pro';

export type ReportType = 'snapshot' | 'full';

export const TIER_LIMITS: Record<SubscriptionTier, TierConfig> = {
  free: {
    name: 'Free Snapshot',
    price: 0,
    maxBets: null,
    maxReports: null, // unlimited snapshots
    maxBetsPerReport: null, // snapshots analyze all bets (Claude cost is fixed)
    features: [
      'Your overall grade + archetype',
      'Emotion + Discipline scores',
      'Top bias identified',
      'ROI by category breakdown',
      'P&L and stake charts',
    ],
  },
  pro: {
    name: 'Pro',
    price: 19.99,
    annualPrice: 149.99,
    maxBets: null,
    maxReports: null,
    maxBetsPerReport: 5000,
    reportsPerMonth: 3,
    features: [
      '3 full reports per month',
      'Track progress between reports',
      'Weekly email digest',
      'Streak tracking + milestones',
    ],
  },
};

// Limits for one-time $9.99 report purchases (non-Pro users)
export const REPORT_PURCHASE_LIMITS = {
  maxBetsPerReport: 5000,
  price: 9.99,
};

// Extra report price for Pro users who exceed their monthly allocation
export const EXTRA_REPORT_PRICE = 4.99;

// Launch promo: disabled. No free full reports for free-tier users.
export const LAUNCH_PROMO_DEADLINE = '2000-01-01T00:00:00Z';

export function isLaunchPromoActive(): boolean {
  return false;
}

export function userQualifiesForPromo(_userCreatedAt: string): boolean {
  return false;
}

// ── DFS Detection ──

export interface DFSDetection {
  isDFS: boolean;
  dfsPercent: number;
  primaryPlatform: string | null;
  isMixed: boolean;
}

export interface DFSMetrics {
  pickCountDistribution: { picks: number; count: number; roi: number; profit: number; winRate: number }[];
  powerVsFlex: {
    powerCount: number; powerROI: number; powerProfit: number;
    flexCount: number; flexROI: number; flexProfit: number;
  } | null;
  playerConcentration: { player: string; count: number; percent: number; roi: number }[];
  avgPickCount: number;
  lowPickROI: number;
  highPickROI: number;
  pickCountAfterLoss: number;
  pickCountAfterWin: number;
}

// ── BetIQ Score ──

export interface BetIQComponent {
  line_value: number;       // 0-25: Are they getting good odds?
  calibration: number;      // 0-20: Do they pick the right implied probabilities?
  sophistication: number;   // 0-15: Straight bets vs parlays ratio
  specialization: number;   // 0-15: Concentrated edge in 1-2 areas
  timing: number;           // 0-10: Avoiding bad time windows
  confidence: number;       // 0-15: Sample size adequacy
}

export interface BetIQResult {
  score: number;            // 0-100 composite
  components: BetIQComponent;
  // Nullable: hidden until an honest cohort baseline exists (Snapshot
  // Redaction Spec amendment, Phase 3). The fabricated estimatePercentile
  // value was producing impossible combinations like archetype="The Sharp"
  // + percentile=80 + grade="D" on the same report.
  percentile: number | null;
  interpretation: string;   // One-sentence summary
  insufficient_data: boolean; // True if < 50 settled bets
}

export interface PercentileBaselines {
  top_10: number;
  top_25: number;
  median: number;
  bottom_25: number;
  bottom_10: number;
}

// ── Enhanced Tilt Signals ──

export interface TiltSignals {
  bet_sizing_volatility: number;    // 0-25
  loss_reaction: number;            // 0-25
  streak_behavior: number;          // 0-25
  session_discipline: number;       // 0-25
  session_acceleration: number;     // 0-25: Does bet frequency increase within sessions?
  odds_drift_after_loss: number;    // 0-25: Do they shift to longer odds after losses?
}

export interface EnhancedTiltResult {
  score: number;                    // Same as emotion_score (backward compat)
  signals: TiltSignals;
  risk_level: 'low' | 'moderate' | 'elevated' | 'high' | 'critical';
  worst_trigger: string;
  percentile: number;
}

// ── Sport-Specific Findings ──

export interface SportSpecificFinding {
  id: string;
  name: string;
  sport: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence: string;
  estimated_cost: number | null;
  recommendation: string;
  // 1-sentence truncation of `description`. Visible in snapshot mode so the
  // teaser conveys topic without leaking the full finding body. Presence of
  // description_snapshot + null `description` is how snapshot mode signals
  // "there's more — unlock to read." No separate description_visibility tag.
  description_snapshot?: string;
  // Snapshot redaction tags. Snapshot ships sport + name + severity +
  // description_snapshot visible; evidence + recommendation hidden;
  // estimated_cost null + redacted_dollar.
  evidence_visibility?: VisibilityTag;
  estimated_cost_visibility?: VisibilityTag;
  recommendation_visibility?: VisibilityTag;
}

// ── CSV Parser ──

export interface ParsedBet {
  placed_at: string;
  sport: string;
  league?: string;
  bet_type: string;
  description: string;
  odds: number;
  stake: number;
  result: 'win' | 'loss' | 'push' | 'void' | 'pending';
  payout: number;
  profit: number;
  sportsbook?: string;
  is_bonus_bet: boolean;
  parlay_legs?: number;
  tags?: string[];
  notes?: string;
}

export interface CSVParseResult {
  bets: ParsedBet[];
  errors: string[];
  warnings: string[];
  column_mapping: Record<string, string>;
}

// ── API Request/Response ──

export interface AnalyzeRequest {
  report_type?: 'full' | 'weekly' | 'quick';
  date_range_start?: string;
  date_range_end?: string;
}

export interface AnalyzeResponse {
  report: AutopsyReport;
}

export interface UploadResponse {
  bets_imported: number;
  duplicates_skipped: number;
  upload_id: string | null;
  errors: string[];
  warnings: string[];
}

export interface CheckoutRequest {
  type: 'subscription' | 'report';
  interval?: 'monthly' | 'annual'; // for subscription
  snapshotReportId?: string; // for report purchase
}

// ── Behavioral Journal ──

export interface JournalEntry {
  id: string;
  user_id: string;
  created_at: string;
  confidence: number;
  emotional_state: 'calm' | 'excited' | 'frustrated' | 'anxious' | 'bored' | 'confident';
  research_time: 'none' | 'under_5' | '5_to_15' | '15_to_30' | 'over_30';
  had_alcohol: boolean;
  time_pressure: boolean;
  chasing_losses: boolean;
  notes: string | null;
  linked_bet_ids: string[];
  session_result_dollars: number | null;
}

export interface JournalEntryInput {
  confidence: number;
  emotional_state: JournalEntry['emotional_state'];
  research_time: JournalEntry['research_time'];
  had_alcohol: boolean;
  time_pressure: boolean;
  chasing_losses: boolean;
  notes?: string;
}

export interface APIError {
  error: string;
  code?: string;
}

// ── Feedback ──

export type FeedbackType = 'report_reaction' | 'bug' | 'feature_request' | 'general';
export type FeedbackRating = 'positive' | 'neutral' | 'negative';

export interface Feedback {
  id: string;
  user_id: string | null;
  type: FeedbackType;
  rating: FeedbackRating | null;
  message: string | null;
  report_id: string | null;
  page: string | null;
  metadata: { tier?: string; bet_count?: number; timestamp?: string } | null;
  created_at: string;
}

export interface FeedbackWithUser extends Feedback {
  user: {
    id: string;
    email: string;
    display_name: string | null;
    subscription_tier: string;
  } | null;
}

export interface FeedbackCounts {
  total: number;
  report_reaction: number;
  bug: number;
  feature_request: number;
  general: number;
}

// ── Pre-bet Check-in (deterministic scorer for iOS Phase 2 swap) ──
// Wire format is LOCKED by iOS PreBetCheckInModels.swift. Keys are
// camelCase on the wire; enum string values are snake_case to match
// iOS Codable raw values. Do not rename without coordinating an iOS
// release.

export type CheckInSeverity = 'high' | 'medium' | 'low' | 'info';
export type CheckInRecommendation = 'place_anyway' | 'wait_thirty' | 'place_bet';

export const CHECK_IN_SPORTS = [
  'nfl', 'nba', 'mlb', 'nhl', 'ncaaf', 'ncaab',
  'soccer', 'mma', 'tennis', 'golf', 'other',
] as const;
export type CheckInSport = (typeof CHECK_IN_SPORTS)[number];

export const CHECK_IN_BET_TYPES = [
  'moneyline', 'spread', 'total', 'parlay', 'prop', 'futures',
] as const;
export type CheckInBetType = (typeof CHECK_IN_BET_TYPES)[number];

export interface PreBetCheckInRequest {
  sport: string;
  stake: number;
  odds: number;
  betType: string;
  placedAt: string;
  // Optional 0-23 hour of day in the user's local timezone. iOS Phase 2
  // computes this via Calendar.current and sends it on every request.
  // Backend falls back to UTC parsing of placedAt when absent.
  localHour?: number;
}

export interface PreBetCheckInFlag {
  id: string;
  severity: CheckInSeverity;
  title: string;
  detail: string;
}

// Pure scorer output. lib/check-in-scorer.ts produces this; the route
// handler attaches `checkInId` from the pre_bet_checkins INSERT before
// returning the wire-format PreBetCheckInResponse below.
export interface CheckInScoreResult {
  betQualityScore: number;
  flags: PreBetCheckInFlag[];
  recommendation: CheckInRecommendation;
  summary: string;
}

export interface PreBetCheckInResponse {
  // Added Phase 3 (2026-05-16). Additive wire-format change: iOS Phase 2's
  // Codable ignores unknown keys, so the shipped iOS build continues to
  // work without decoding checkInId. iOS Phase 3 begins reading it and
  // sends it back via POST /api/check-in/outcome.
  checkInId: string;
  betQualityScore: number;
  flags: PreBetCheckInFlag[];
  recommendation: CheckInRecommendation;
  summary: string;
}

export type CheckInOutcome = 'placed_anyway' | 'waited' | 'placed_bet';

export const CHECK_IN_OUTCOMES = ['placed_anyway', 'waited', 'placed_bet'] as const;

export interface CheckInOutcomeRequest {
  checkInId: string;
  outcome: CheckInOutcome;
}

// ── Action item check-offs (Chapter 7 → dashboard progress ring) ──
// recommendation_id is "${report_id}:${priority}" where priority is
// the engine-assigned integer on Recommendation. iOS uses priority as
// Identifiable.id so the wire format matches the in-app id without a
// transform.

export type ActionCheckoffStatus = 'completed' | 'dismissed' | 'reset';

export const ACTION_CHECKOFF_STATUSES = ['completed', 'dismissed', 'reset'] as const;

export interface ActionCheckoffRequest {
  report_id: string;
  recommendation_id: string;
  status: ActionCheckoffStatus;
}

export interface ActionCheckoff {
  id: string;
  user_id: string;
  report_id: string;
  recommendation_id: string;
  completed_at: string | null;
  dismissed_at: string | null;
  created_at: string;
}

export interface ActionCheckoffListResponse {
  checkoffs: ActionCheckoff[];
}

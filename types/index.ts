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

export interface TimingBucket {
  label: string;
  bets: number;
  wins: number;
  losses: number;
  staked: number;
  profit: number;
  roi: number;
  win_rate: number;
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
  pertinent_negatives?: PertinentNegative[];
  contradictions?: Contradiction[];
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
  };
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

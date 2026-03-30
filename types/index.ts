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
  subscription_tier: 'free' | 'pro' | 'sharp';
  subscription_status: 'active' | 'inactive' | 'past_due' | 'canceled';
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
  report_type: 'full' | 'weekly' | 'quick';
  bet_count_analyzed: number;
  date_range_start: string | null;
  date_range_end: string | null;
  report_json: AutopsyAnalysis;
  report_markdown: string;
  model_used: string | null;
  tokens_used: number | null;
  cost_cents: number | null;
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
  overall_grade: string; // A through F
}

export interface BiasDetected {
  bias_name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string;
  estimated_cost: number;
  fix: string;
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
  features: string[];
  stripePriceId?: string;
}

export type SubscriptionTier = 'free' | 'pro' | 'sharp';

export const TIER_LIMITS: Record<SubscriptionTier, TierConfig> = {
  free: {
    name: 'Free',
    price: 0,
    maxBets: null,
    maxReports: 1,
    maxBetsPerReport: 50,
    features: ['1 autopsy report (50 most recent bets)', 'Basic bias detection', 'Summary stats'],
  },
  pro: {
    name: 'Pro',
    price: 9.99,
    annualPrice: 99,
    maxBets: null,
    maxReports: null,
    maxBetsPerReport: 2000,
    features: [
      'Full bias suite',
      'Strategic leaks',
      'Behavioral patterns',
      'Weekly reports',
      'PDF export',
    ],
  },
  sharp: {
    name: 'Sharp',
    price: 24.99,
    annualPrice: 199,
    maxBets: null,
    maxReports: null,
    maxBetsPerReport: 5000,
    features: [
      'Everything in Pro',
      'Leak Prioritizer — ranked by $ impact',
      'Full What-If Simulator',
      'Early access to new features',
    ],
  },
};

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
  percentile: number;       // Estimated population percentile (1-99)
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
  tier: 'pro' | 'sharp';
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

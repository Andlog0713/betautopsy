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
  login_count: number;
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

export interface AutopsyAnalysis {
  summary: AutopsySummary;
  biases_detected: BiasDetected[];
  strategic_leaks: StrategicLeak[];
  behavioral_patterns: BehavioralPattern[];
  recommendations: Recommendation[];
  tilt_score: number; // 0-100
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
  discipline_score?: {
    total: number;
    tracking: number;
    sizing: number;
    control: number;
    strategy: number;
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
    features: ['Unlimited bet uploads', '1 autopsy report (50 most recent bets)', 'Basic bias detection', 'Summary stats'],
  },
  pro: {
    name: 'Pro',
    price: 11,
    maxBets: null,
    maxReports: null,
    maxBetsPerReport: null,
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
    price: 22,
    maxBets: null,
    maxReports: null,
    maxBetsPerReport: null,
    features: [
      'Everything in Pro',
      'Live Bet Check',
      'Leak Prioritizer — ranked by $ impact',
      'Full What-If Simulator',
      'Early access to new features',
    ],
  },
};

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

export interface APIError {
  error: string;
  code?: string;
}

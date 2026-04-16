import type { AutopsyAnalysis, Bet } from '@/types';

// ── Demo Bets ──
// ~35 representative bets for charts. Tells a story: decent NFL bettor,
// parlay problem, clear loss-chasing sequence on Dec 14.

export const DEMO_BETS: Bet[] = [
  // === NFL SPREADS (strong category) ===
  { id: 'demo-1', user_id: 'demo', placed_at: '2025-11-02T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'spread', description: 'Chiefs -3.5', odds: -110, stake: 100, result: 'win', profit: 91, payout: 191, sportsbook: 'DraftKings', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2025-11-02T13:00:00Z' },
  { id: 'demo-2', user_id: 'demo', placed_at: '2025-11-02T16:30:00Z', sport: 'NFL', league: 'NFL', bet_type: 'spread', description: 'Bills +7', odds: -110, stake: 100, result: 'win', profit: 91, payout: 191, sportsbook: 'FanDuel', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2025-11-02T16:30:00Z' },
  { id: 'demo-3', user_id: 'demo', placed_at: '2025-11-09T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'spread', description: 'Eagles -3', odds: -110, stake: 100, result: 'win', profit: 91, payout: 191, sportsbook: 'Caesars', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2025-11-09T13:00:00Z' },
  { id: 'demo-4', user_id: 'demo', placed_at: '2025-11-16T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'spread', description: 'Ravens -6.5', odds: -110, stake: 100, result: 'loss', profit: -100, payout: 0, sportsbook: 'DraftKings', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2025-11-16T13:00:00Z' },
  { id: 'demo-5', user_id: 'demo', placed_at: '2025-11-23T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'spread', description: 'Lions -4', odds: -110, stake: 100, result: 'win', profit: 91, payout: 191, sportsbook: 'BetMGM', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2025-11-23T13:00:00Z' },
  { id: 'demo-6', user_id: 'demo', placed_at: '2025-12-07T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'moneyline', description: 'Packers ML', odds: 140, stake: 75, result: 'win', profit: 105, payout: 180, sportsbook: 'FanDuel', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2025-12-07T13:00:00Z' },
  { id: 'demo-31', user_id: 'demo', placed_at: '2026-01-05T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'spread', description: 'Steelers -3', odds: -110, stake: 100, result: 'win', profit: 91, payout: 191, sportsbook: 'DraftKings', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2026-01-05T13:00:00Z' },
  { id: 'demo-32', user_id: 'demo', placed_at: '2026-01-12T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'moneyline', description: 'Ravens ML', odds: -200, stake: 150, result: 'win', profit: 75, payout: 225, sportsbook: 'BetMGM', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2026-01-12T13:00:00Z' },

  // === NBA SPREADS (mixed results) ===
  { id: 'demo-7', user_id: 'demo', placed_at: '2025-11-05T19:30:00Z', sport: 'NBA', league: 'NBA', bet_type: 'spread', description: 'Celtics -6.5', odds: -110, stake: 75, result: 'loss', profit: -75, payout: 0, sportsbook: 'DraftKings', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2025-11-05T19:30:00Z' },
  { id: 'demo-8', user_id: 'demo', placed_at: '2025-11-07T20:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'spread', description: 'Knicks -4.5', odds: -110, stake: 100, result: 'win', profit: 91, payout: 191, sportsbook: 'BetMGM', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2025-11-07T20:00:00Z' },
  { id: 'demo-9', user_id: 'demo', placed_at: '2025-11-12T19:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'spread', description: 'Thunder -3', odds: -110, stake: 50, result: 'loss', profit: -50, payout: 0, sportsbook: 'FanDuel', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2025-11-12T19:00:00Z' },
  { id: 'demo-10', user_id: 'demo', placed_at: '2025-11-15T20:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'spread', description: 'Lakers +5.5', odds: -110, stake: 50, result: 'win', profit: 45, payout: 95, sportsbook: 'DraftKings', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2025-11-15T20:00:00Z' },
  { id: 'demo-29', user_id: 'demo', placed_at: '2025-12-25T12:30:00Z', sport: 'NBA', league: 'NBA', bet_type: 'spread', description: 'Knicks +2.5', odds: -110, stake: 75, result: 'win', profit: 68, payout: 143, sportsbook: 'FanDuel', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2025-12-25T12:30:00Z' },
  { id: 'demo-34', user_id: 'demo', placed_at: '2026-01-20T19:30:00Z', sport: 'NBA', league: 'NBA', bet_type: 'spread', description: 'Nuggets -4', odds: -110, stake: 75, result: 'loss', profit: -75, payout: 0, sportsbook: 'DraftKings', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2026-01-20T19:30:00Z' },
  { id: 'demo-35', user_id: 'demo', placed_at: '2026-01-25T20:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'spread', description: 'Celtics -7', odds: -110, stake: 100, result: 'win', profit: 91, payout: 191, sportsbook: 'BetMGM', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2026-01-25T20:00:00Z' },

  // === NBA PROPS (losing category) ===
  { id: 'demo-11', user_id: 'demo', placed_at: '2025-11-06T19:30:00Z', sport: 'NBA', league: 'NBA', bet_type: 'prop', description: 'Jokic Over 25.5 pts', odds: -115, stake: 50, result: 'loss', profit: -50, payout: 0, sportsbook: 'DraftKings', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2025-11-06T19:30:00Z' },
  { id: 'demo-12', user_id: 'demo', placed_at: '2025-11-10T20:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'prop', description: 'Curry Over 28.5 pts', odds: 100, stake: 75, result: 'loss', profit: -75, payout: 0, sportsbook: 'BetMGM', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2025-11-10T20:00:00Z' },
  { id: 'demo-13', user_id: 'demo', placed_at: '2025-11-18T19:30:00Z', sport: 'NBA', league: 'NBA', bet_type: 'prop', description: 'Tatum Over 27.5 pts', odds: -105, stake: 50, result: 'win', profit: 48, payout: 98, sportsbook: 'FanDuel', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2025-11-18T19:30:00Z' },
  { id: 'demo-14', user_id: 'demo', placed_at: '2025-12-02T20:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'prop', description: 'Edwards Over 24.5 pts', odds: -110, stake: 50, result: 'loss', profit: -50, payout: 0, sportsbook: 'DraftKings', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2025-12-02T20:00:00Z' },
  { id: 'demo-15', user_id: 'demo', placed_at: '2025-12-10T19:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'prop', description: 'Brunson Over 22.5 pts', odds: 105, stake: 60, result: 'loss', profit: -60, payout: 0, sportsbook: 'BetMGM', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2025-12-10T19:00:00Z' },
  { id: 'demo-33', user_id: 'demo', placed_at: '2026-01-15T20:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'prop', description: 'LeBron Over 25.5 pts', odds: -110, stake: 50, result: 'win', profit: 45, payout: 95, sportsbook: 'FanDuel', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2026-01-15T20:00:00Z' },

  // === PARLAYS (mostly losses, 1 hit) ===
  { id: 'demo-16', user_id: 'demo', placed_at: '2025-11-03T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: 'Chiefs ML + Eagles ML + Over 45', odds: 550, stake: 50, result: 'loss', profit: -50, payout: 0, sportsbook: 'FanDuel', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-11-03T13:00:00Z' },
  { id: 'demo-17', user_id: 'demo', placed_at: '2025-11-10T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '4-leg NFL parlay', odds: 1100, stake: 25, result: 'loss', profit: -25, payout: 0, sportsbook: 'DraftKings', is_bonus_bet: false, parlay_legs: 4, tags: null, notes: null, upload_id: null, created_at: '2025-11-10T13:00:00Z' },
  { id: 'demo-18', user_id: 'demo', placed_at: '2025-11-17T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: 'Ravens + Bengals + Under 42.5', odds: 600, stake: 40, result: 'win', profit: 240, payout: 280, sportsbook: 'BetMGM', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-11-17T13:00:00Z' },
  { id: 'demo-19', user_id: 'demo', placed_at: '2025-11-24T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '5-leg SGP', odds: 2500, stake: 20, result: 'loss', profit: -20, payout: 0, sportsbook: 'FanDuel', is_bonus_bet: false, parlay_legs: 5, tags: null, notes: null, upload_id: null, created_at: '2025-11-24T13:00:00Z' },
  { id: 'demo-20', user_id: 'demo', placed_at: '2025-12-01T13:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: 'Celtics + Knicks + Over 220', odds: 650, stake: 50, result: 'loss', profit: -50, payout: 0, sportsbook: 'DraftKings', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-12-01T13:00:00Z' },
  { id: 'demo-21', user_id: 'demo', placed_at: '2025-12-08T19:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '4-leg NBA parlay', odds: 1200, stake: 30, result: 'loss', profit: -30, payout: 0, sportsbook: 'FanDuel', is_bonus_bet: false, parlay_legs: 4, tags: null, notes: null, upload_id: null, created_at: '2025-12-08T19:00:00Z' },
  { id: 'demo-22', user_id: 'demo', placed_at: '2025-12-15T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '3-leg NFL parlay', odds: 500, stake: 60, result: 'loss', profit: -60, payout: 0, sportsbook: 'Caesars', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-12-15T13:00:00Z' },
  { id: 'demo-23', user_id: 'demo', placed_at: '2025-12-22T19:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '6-leg mega parlay', odds: 5000, stake: 10, result: 'loss', profit: -10, payout: 0, sportsbook: 'DraftKings', is_bonus_bet: false, parlay_legs: 6, tags: null, notes: null, upload_id: null, created_at: '2025-12-22T19:00:00Z' },

  // === LOSS CHASING SEQUENCE (Dec 14, visible stake escalation) ===
  { id: 'demo-24', user_id: 'demo', placed_at: '2025-12-14T19:30:00Z', sport: 'NBA', league: 'NBA', bet_type: 'spread', description: 'Bucks -5.5', odds: -110, stake: 50, result: 'loss', profit: -50, payout: 0, sportsbook: 'DraftKings', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2025-12-14T19:30:00Z' },
  { id: 'demo-25', user_id: 'demo', placed_at: '2025-12-14T20:15:00Z', sport: 'NBA', league: 'NBA', bet_type: 'spread', description: 'Heat +3.5', odds: -110, stake: 100, result: 'loss', profit: -100, payout: 0, sportsbook: 'DraftKings', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2025-12-14T20:15:00Z' },
  { id: 'demo-26', user_id: 'demo', placed_at: '2025-12-14T21:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'moneyline', description: 'Suns ML', odds: 160, stake: 200, result: 'loss', profit: -200, payout: 0, sportsbook: 'FanDuel', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2025-12-14T21:00:00Z' },
  { id: 'demo-27', user_id: 'demo', placed_at: '2025-12-14T22:30:00Z', sport: 'NBA', league: 'NBA', bet_type: 'spread', description: 'Warriors -2', odds: -110, stake: 250, result: 'loss', profit: -250, payout: 0, sportsbook: 'BetMGM', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2025-12-14T22:30:00Z' },

  // === A few more mixed ===
  { id: 'demo-28', user_id: 'demo', placed_at: '2025-12-20T19:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'moneyline', description: 'Thunder ML', odds: -180, stake: 90, result: 'win', profit: 50, payout: 140, sportsbook: 'DraftKings', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2025-12-20T19:00:00Z' },
  { id: 'demo-30', user_id: 'demo', placed_at: '2025-12-28T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'spread', description: 'Cowboys +6.5', odds: -110, stake: 100, result: 'loss', profit: -100, payout: 0, sportsbook: 'Caesars', is_bonus_bet: false, parlay_legs: null, tags: null, notes: null, upload_id: null, created_at: '2025-12-28T13:00:00Z' },
];

// ── Demo Analysis ──

export const DEMO_ANALYSIS: AutopsyAnalysis = {
  summary: {
    total_bets: 280,
    record: '118-147-15',
    total_profit: -1247,
    roi_percent: -6.8,
    avg_stake: 82,
    date_range: 'Nov 1, 2025 – Jan 31, 2026',
    overall_grade: 'C-',
  },

  emotion_score: 64,
  tilt_score: 64,
  emotion_breakdown: {
    stake_volatility: 18,
    loss_chasing: 22,
    streak_behavior: 16,
    session_discipline: 8,
  },
  tilt_breakdown: {
    stake_volatility: 18,
    loss_chasing: 22,
    streak_behavior: 16,
    session_discipline: 8,
  },

  bankroll_health: 'caution',

  betting_archetype: {
    name: 'The Parlay Dreamer',
    description: 'The big ticket is always calling. Your straight bet game is probably better than you think, but the parlay habit is dragging your numbers down hard.',
  },

  biases_detected: [
    {
      bias_name: 'Post-Loss Escalation',
      severity: 'high',
      description: 'Your average stake jumps from $72 to $134 after a loss. That\'s an 86% increase. After losing streaks of 3+, you placed 14 bets over $200. Nine of those lost.',
      evidence: 'Avg stake after loss: $134 vs $72 after win. 14 bets >$200 following 3+ loss streaks (9 lost, -$1,180).',
      estimated_cost: 480,
      fix: 'Set a hard ceiling: no bet can exceed 1.5x your average stake ($123). After 3 losses in a row, stop for the day.',
    },
    {
      bias_name: 'Heavy Parlay Tendency',
      severity: 'medium',
      description: '31% of your bets are parlays, but they account for 52% of your total losses. Your straight bet ROI is actually +2.1%. Parlays are the anchor dragging you underwater.',
      evidence: '87 parlays at -38.4% ROI vs 193 straight bets at +2.1% ROI. Parlays cost an estimated $620.',
      estimated_cost: 620,
      fix: 'Cap parlays at 10% of weekly volume. No parlays over 3 legs. Your 4+ leg parlays are 3-29.',
    },
    {
      bias_name: 'Favorite-Heavy Lean',
      severity: 'low',
      description: '68% of your bets are on favorites. You\'re paying premium juice for the comfort of siding with the better team, but your dog plays actually hit at a higher rate.',
      evidence: '68% favorites at -4.2% ROI. Underdogs at +6.1% ROI (42 bets).',
      estimated_cost: 140,
      fix: 'Track your underdog conviction plays separately. You have a real edge there. Lean into it.',
    },
  ],

  strategic_leaks: [
    {
      category: 'NBA Props',
      detail: 'Player props are your worst category by a wide margin. You\'re betting on name recognition, not matchup data.',
      roi_impact: -18.3,
      sample_size: 52,
      suggestion: 'Cut NBA prop volume by 50%. Focus on the games you actually watch and research.',
    },
    {
      category: 'NFL Parlays',
      detail: 'Your NFL parlays have a 14% win rate vs the 18% needed to break even at your average odds.',
      roi_impact: -38.4,
      sample_size: 44,
      suggestion: 'Take your NFL reads and make them straight bets. Your NFL spread game is +8.3% ROI as singles.',
    },
    {
      category: 'Late Night Bets',
      detail: 'Bets placed after 10pm have significantly worse results. Impulsive, under-researched decisions.',
      roi_impact: -22.7,
      sample_size: 38,
      suggestion: 'Set a hard 10pm betting cutoff. Review overnight lines in the morning instead.',
    },
  ],

  behavioral_patterns: [
    {
      pattern_name: 'Weekend Warrior',
      description: 'You place 63% of your bets on Saturday and Sunday. Your weekend ROI is -9.2% vs -2.1% on weekdays. More volume, less discipline.',
      frequency: 'Every week',
      impact: 'negative',
      data_points: '176 weekend bets at -9.2% ROI vs 104 weekday bets at -2.1% ROI.',
    },
    {
      pattern_name: 'NFL Edge',
      description: 'Your NFL spread picks are genuinely strong. You have a real eye for line value in divisional games.',
      frequency: 'Consistent across season',
      impact: 'positive',
      data_points: 'NFL spreads: 34-22, +8.3% ROI, $465 profit. Best category by far.',
    },
    {
      pattern_name: 'Heated Sequences',
      description: 'After 3+ consecutive losses, your betting frequency doubles and your stake size increases by 86%. You placed 14 bets over $200 in these sequences.',
      frequency: '4 instances in 3 months',
      impact: 'negative',
      data_points: '4 heated sequences identified. Combined cost: ~$1,180.',
    },
  ],

  recommendations: [
    {
      priority: 1,
      title: 'Stop the loss-chasing pattern',
      description: 'Your post-loss escalation is your single most expensive habit. Set a hard rule: after 3 consecutive losses, you\'re done for the day. No exceptions.',
      expected_improvement: 'Save ~$480/quarter',
      difficulty: 'medium',
    },
    {
      priority: 2,
      title: 'Cut parlay volume to 10%',
      description: 'Your straight bet ROI is positive. Every parlay dollar is a drag on your bankroll. Cap parlays at 10% of weekly bets, max 3 legs.',
      expected_improvement: 'Save ~$620/quarter',
      difficulty: 'hard',
    },
    {
      priority: 3,
      title: 'Double down on NFL spreads',
      description: 'This is your real edge. Shift volume from NBA props and parlays to NFL spread plays where you\'re actually profitable.',
      expected_improvement: '+$200-400/quarter',
      difficulty: 'easy',
    },
    {
      priority: 4,
      title: 'Set a 10pm cutoff',
      description: 'Your late-night bets are impulsive and unprofitable. Review lines in the morning instead of placing bets at midnight.',
      expected_improvement: 'Save ~$180/quarter',
      difficulty: 'easy',
    },
  ],

  personal_rules: [
    { rule: 'Never bet more than $125 on a single play', reason: 'Your bets over $150 are 8-19. That\'s a 30% win rate costing you $890.', based_on: 'Stake analysis' },
    { rule: 'No parlays over 3 legs', reason: 'Your 4+ leg parlays are 3-29. Three legs max, period.', based_on: 'Parlay breakdown' },
    { rule: 'After 3 losses in a row, stop for the day', reason: 'Your 4th+ bets in losing streaks hit at 28%. You\'re chasing, not betting.', based_on: 'Loss sequence analysis' },
    { rule: 'No bets after 10pm', reason: 'Your after-10pm bets have a -22.7% ROI. Sleep on it.', based_on: 'Timing analysis' },
  ],

  session_analysis: {
    total_sessions: 62,
    avg_bets_per_winning_session: 3.8,
    avg_bets_per_losing_session: 6.2,
    worst_session: {
      date: '2025-12-14',
      bets: 8,
      duration: '4 hours',
      net: -680,
      description: 'Classic heated cascade. Started with a $50 loss, ended with a $250 desperation bet on Warriors -2. Eight bets in four hours, each one bigger than the last.',
    },
    best_session: {
      date: '2025-11-02',
      bets: 3,
      duration: '6 hours',
      net: 282,
      description: 'Disciplined NFL Sunday. Three pre-researched spread plays, all winners. Didn\'t chase or add bets after going up.',
    },
    insight: 'Your winning sessions average 3.8 bets. Your losing sessions average 6.2. More bets = more losses. You\'re at your best when you\'re selective.',
  },

  edge_profile: {
    profitable_areas: [
      { category: 'NFL Spreads', roi: 8.3, sample_size: 56, confidence: 'high' },
      { category: 'NBA Underdogs', roi: 6.1, sample_size: 42, confidence: 'medium' },
    ],
    unprofitable_areas: [
      { category: 'NBA Props', roi: -18.3, sample_size: 52, estimated_loss: 340 },
      { category: 'All Parlays', roi: -38.4, sample_size: 87, estimated_loss: 620 },
      { category: 'Late Night Bets', roi: -22.7, sample_size: 38, estimated_loss: 180 },
    ],
    reallocation_advice: 'Shift 40% of your parlay and prop volume into NFL spreads and NBA underdog plays. Your profitable categories have high enough sample sizes to trust.',
    sharp_score: 38,
  },

  discipline_score: {
    total: 42,
    tracking: 14,
    sizing: 8,
    control: 9,
    strategy: 11,
    percentile: 35,
  },
  betiq: {
    score: 44,
    components: {
      line_value: 12,
      calibration: 8,
      sophistication: 6,
      specialization: 8,
      timing: 4,
      confidence: 6,
    },
    percentile: 55,
    interpretation: 'Moderate skill level. Some promising spots, but you\'re also making bets without clear edge.',
    insufficient_data: false,
  },
  emotion_percentile: 30,
  enhanced_tilt: {
    score: 64,
    signals: {
      bet_sizing_volatility: 18,
      loss_reaction: 22,
      streak_behavior: 16,
      session_discipline: 8,
      session_acceleration: 14,
      odds_drift_after_loss: 11,
    },
    risk_level: 'elevated',
    worst_trigger: 'Your stakes increase 1.9x after losses. Classic loss chasing.',
    percentile: 30,
  },
  sport_specific_findings: [
    {
      id: 'NBA-PROP-OVEREXPOSURE',
      name: 'NBA player prop overexposure',
      sport: 'NBA',
      severity: 'high',
      description: 'Heavy NBA player prop volume with negative returns.',
      evidence: '38% of NBA bets are props (52 bets). Props ROI: -18.3%, net -$340.',
      estimated_cost: -340,
      recommendation: 'Cut NBA prop volume by at least 50%.',
    },
    {
      id: 'NFL-PARLAY-DRAG',
      name: 'NFL parlay drag',
      sport: 'NFL',
      severity: 'medium',
      description: 'Your NFL straight bets are profitable, but NFL parlays are dragging your overall NFL ROI down.',
      evidence: 'NFL straight bets: +$465 profit. NFL parlays (31% of NFL bets): -$380.',
      estimated_cost: -380,
      recommendation: 'Take your NFL reads and make them singles.',
    },
  ],
  session_detection: {
    sessions: [
      { id: 'SESSION-001', date: '2025-11-03', dayOfWeek: 'Sunday', startTime: '12:30 PM', endTime: '5:15 PM', durationMinutes: 285, bets: 6, wins: 4, losses: 2, pushes: 0, staked: 450, profit: 185, roi: 41.1, avgStake: 75, startingStake: 50, endingStake: 75, stakeEscalation: 1.5, maxStake: 100, minStake: 50, stakeCv: 0.3, betsPerHour: 1.3, longestLossStreak: 1, chasedAfterLoss: false, chaseCount: 0, lateNight: false, grade: 'A', gradeReasons: ['Consistent sizing', 'No loss chasing'], isHeated: false, heatSignals: [], betIndices: [0,1,2,3,4,5] },
      { id: 'SESSION-014', date: '2025-12-14', dayOfWeek: 'Saturday', startTime: '7:45 PM', endTime: '11:52 PM', durationMinutes: 247, bets: 9, wins: 2, losses: 7, pushes: 0, staked: 1280, profit: -680, roi: -53.1, avgStake: 142, startingStake: 75, endingStake: 300, stakeEscalation: 4.0, maxStake: 300, minStake: 50, stakeCv: 0.72, betsPerHour: 2.2, longestLossStreak: 5, chasedAfterLoss: true, chaseCount: 4, lateNight: true, grade: 'F', gradeReasons: ['Stakes escalated 4x from start to finish', '4 chase bets after losses', '5-bet losing streak with no cooldown'], isHeated: true, heatSignals: ['Stakes quadrupled while chasing losses', 'Marathon losing session: 9 bets, -$680'], betIndices: [89,90,91,92,93,94,95,96,97] },
      { id: 'SESSION-022', date: '2025-12-28', dayOfWeek: 'Saturday', startTime: '1:00 PM', endTime: '3:30 PM', durationMinutes: 150, bets: 4, wins: 2, losses: 2, pushes: 0, staked: 320, profit: 45, roi: 14.1, avgStake: 80, startingStake: 80, endingStake: 80, stakeEscalation: 1.0, maxStake: 80, minStake: 80, stakeCv: 0.0, betsPerHour: 1.6, longestLossStreak: 1, chasedAfterLoss: false, chaseCount: 0, lateNight: false, grade: 'A', gradeReasons: ['Perfectly flat staking', 'No loss chasing'], isHeated: false, heatSignals: [], betIndices: [150,151,152,153] },
      { id: 'SESSION-035', date: '2026-01-12', dayOfWeek: 'Sunday', startTime: '12:00 PM', endTime: '6:45 PM', durationMinutes: 405, bets: 11, wins: 4, losses: 6, pushes: 1, staked: 920, profit: -340, roi: -37.0, avgStake: 84, startingStake: 50, endingStake: 200, stakeEscalation: 4.0, maxStake: 200, minStake: 50, stakeCv: 0.65, betsPerHour: 1.6, longestLossStreak: 4, chasedAfterLoss: true, chaseCount: 3, lateNight: false, grade: 'F', gradeReasons: ['11 bets in one session', 'Stakes escalated 4x', '3 chase bets after losses'], isHeated: true, heatSignals: ['Stakes quadrupled during extended losing session', '11 bets over 6.75 hours'], betIndices: [180,181,182,183,184,185,186,187,188,189,190] },
    ],
    totalSessions: 44,
    avgSessionLength: 6.4,
    avgSessionDuration: 162,
    sessionGradeDistribution: [
      { grade: 'A', count: 8, percent: 18 },
      { grade: 'B', count: 10, percent: 23 },
      { grade: 'C', count: 12, percent: 27 },
      { grade: 'D', count: 8, percent: 18 },
      { grade: 'F', count: 6, percent: 14 },
    ],
    heatedSessionCount: 8,
    heatedSessionPercent: 18,
    avgGradedROI: { A: 12.4, B: 3.1, C: -4.2, D: -14.8, F: -38.7 },
    bestSession: { id: 'SESSION-001', date: '2025-11-03', dayOfWeek: 'Sunday', startTime: '12:30 PM', endTime: '5:15 PM', durationMinutes: 285, bets: 6, wins: 4, losses: 2, pushes: 0, staked: 450, profit: 185, roi: 41.1, avgStake: 75, startingStake: 50, endingStake: 75, stakeEscalation: 1.5, maxStake: 100, minStake: 50, stakeCv: 0.3, betsPerHour: 1.3, longestLossStreak: 1, chasedAfterLoss: false, chaseCount: 0, lateNight: false, grade: 'A', gradeReasons: ['Consistent sizing', 'No loss chasing'], isHeated: false, heatSignals: [], betIndices: [] },
    worstSession: { id: 'SESSION-014', date: '2025-12-14', dayOfWeek: 'Saturday', startTime: '7:45 PM', endTime: '11:52 PM', durationMinutes: 247, bets: 9, wins: 2, losses: 7, pushes: 0, staked: 1280, profit: -680, roi: -53.1, avgStake: 142, startingStake: 75, endingStake: 300, stakeEscalation: 4.0, maxStake: 300, minStake: 50, stakeCv: 0.72, betsPerHour: 2.2, longestLossStreak: 5, chasedAfterLoss: true, chaseCount: 4, lateNight: true, grade: 'F', gradeReasons: ['Stakes escalated 4x', '4 chase bets', '5-bet losing streak'], isHeated: true, heatSignals: ['Stakes quadrupled while chasing losses'], betIndices: [] },
    insight: 'Your A-graded sessions average +12.4% ROI. Your F sessions average -38.7%. The math is clear. Discipline pays.',
  },
  bet_annotations: {
    annotations: [
      { betIndex: 0, betId: 'demo-1', classification: 'disciplined', confidence: 82, signals: [{ name: 'flat_stake', weight: -4, description: 'Stake within normal range (0.9x median)', category: 'disciplined' }, { name: 'reasonable_pace', weight: -2, description: 'Placed 2h after last bet, deliberate timing', category: 'disciplined' }], primaryReason: 'Stake within normal range (0.9x median)', sessionId: 'SESSION-001', sessionGrade: 'A', isInHeatedSession: false, stakeVsMedian: 0.9, timeSinceLastBet: null, currentStreak: 0 },
      { betIndex: 24, betId: 'demo-24', classification: 'chasing', confidence: 88, signals: [{ name: 'post_loss_escalation', weight: 8, description: 'Stake increased 1.8x after previous loss', category: 'chasing' }, { name: 'heated_session_context', weight: 3, description: 'Part of a heated session (Grade F)', category: 'emotional' }], primaryReason: 'Stake increased 1.8x after previous loss', sessionId: 'SESSION-014', sessionGrade: 'F', isInHeatedSession: true, stakeVsMedian: 1.6, timeSinceLastBet: 12, currentStreak: -2 },
      { betIndex: 25, betId: 'demo-25', classification: 'chasing', confidence: 91, signals: [{ name: 'post_loss_escalation', weight: 9, description: 'Stake increased 2.1x after previous loss', category: 'chasing' }, { name: 'rapid_session_bet', weight: 4, description: 'Only 4 minutes after last bet. Rapid fire', category: 'emotional' }, { name: 'heated_session_context', weight: 3, description: 'Part of a heated session (Grade F)', category: 'emotional' }], primaryReason: 'Stake increased 2.1x after previous loss', sessionId: 'SESSION-014', sessionGrade: 'F', isInHeatedSession: true, stakeVsMedian: 2.4, timeSinceLastBet: 4, currentStreak: -3 },
      { betIndex: 27, betId: 'demo-27', classification: 'chasing', confidence: 95, signals: [{ name: 'post_loss_escalation', weight: 10, description: 'Stake increased 3.3x after previous loss', category: 'chasing' }, { name: 'oversized_bet', weight: 6, description: 'Stake is 3.0x your median. Outsized position', category: 'emotional' }, { name: 'loss_streak_continuation', weight: 3, description: 'Betting through a 5-loss streak', category: 'chasing' }, { name: 'heated_session_context', weight: 3, description: 'Part of a heated session (Grade F)', category: 'emotional' }], primaryReason: 'Stake increased 3.3x after previous loss', sessionId: 'SESSION-014', sessionGrade: 'F', isInHeatedSession: true, stakeVsMedian: 3.0, timeSinceLastBet: 8, currentStreak: -5 },
      { betIndex: 150, betId: 'demo-150', classification: 'disciplined', confidence: 85, signals: [{ name: 'flat_stake', weight: -4, description: 'Stake within normal range (1.0x median)', category: 'disciplined' }, { name: 'consistent_after_loss', weight: -5, description: 'Maintained discipline after previous loss', category: 'disciplined' }, { name: 'controlled_in_good_session', weight: -2, description: 'Part of a well-managed session (Grade A)', category: 'disciplined' }], primaryReason: 'Maintained discipline after previous loss', sessionId: 'SESSION-022', sessionGrade: 'A', isInHeatedSession: false, stakeVsMedian: 1.0, timeSinceLastBet: 45, currentStreak: -1 },
    ],
    distribution: {
      disciplined: { count: 126, percent: 45, totalStaked: 9450, totalProfit: 680, roi: 7.2 },
      neutral: { count: 56, percent: 20, totalStaked: 4200, totalProfit: -120, roi: -2.9 },
      emotional: { count: 50, percent: 18, totalStaked: 5100, totalProfit: -890, roi: -17.5 },
      chasing: { count: 34, percent: 12, totalStaked: 4800, totalProfit: -1240, roi: -25.8 },
      impulsive: { count: 14, percent: 5, totalStaked: 850, totalProfit: -310, roi: -36.5 },
    },
    emotionalCost: 1420,
    worstAnnotatedBet: { betIndex: 27, betId: 'demo-27', classification: 'chasing', confidence: 95, signals: [{ name: 'post_loss_escalation', weight: 10, description: 'Stake increased 3.3x after previous loss', category: 'chasing' }], primaryReason: 'Stake increased 3.3x after previous loss + 3.0x median outsized position', sessionId: 'SESSION-014', sessionGrade: 'F', isInHeatedSession: true, stakeVsMedian: 3.0, timeSinceLastBet: 8, currentStreak: -5 },
    bestAnnotatedBet: { betIndex: 150, betId: 'demo-150', classification: 'disciplined', confidence: 85, signals: [{ name: 'consistent_after_loss', weight: -5, description: 'Maintained discipline after previous loss', category: 'disciplined' }], primaryReason: 'Maintained discipline after previous loss', sessionId: 'SESSION-022', sessionGrade: 'A', isInHeatedSession: false, stakeVsMedian: 1.0, timeSinceLastBet: 45, currentStreak: -1 },
    streakInfluence: {
      avgStakeAfterWinStreak3: 95,
      avgStakeAfterLossStreak3: 145,
      avgStakeNeutral: 82,
    },
    insight: '35% of your bets show emotional or chasing behavior, costing you an estimated $1,420. Your disciplined bets return +7.2% ROI vs -22.4% on everything else.',
  },
};

// ── DFS Demo Bets (PrizePicks) ──
// 38 entries telling a PrizePicks story: solid 2-pick game,
// multiplier chasing problem, Dec 14 pick-count escalation sequence.

// Part 1: 2-pick (7) + 3-pick (10) entries
const DEMO_DFS_BETS_PART1: Bet[] = [
  // === 2-PICK ENTRIES (7 total: 2P + 5F, 4W + 3L) ===
  { id: 'demo-dfs-1', user_id: 'demo', placed_at: '2025-11-02T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '2-pick Flex: Josh Allen O 245.5 pass yds | Jalen Hurts O 55.5 rush yds', odds: -150, stake: 10, result: 'win', profit: 6.67, payout: 16.67, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 2, tags: null, notes: null, upload_id: null, created_at: '2025-11-02T13:00:00Z' },
  { id: 'demo-dfs-2', user_id: 'demo', placed_at: '2025-11-03T16:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '2-pick Flex: LeBron James O 25.5 pts | Curry O 24.5 pts', odds: -150, stake: 10, result: 'win', profit: 6.67, payout: 16.67, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 2, tags: null, notes: null, upload_id: null, created_at: '2025-11-03T16:00:00Z' },
  { id: 'demo-dfs-3', user_id: 'demo', placed_at: '2025-11-08T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '2-pick Flex: Josh Allen O 250.5 pass yds | Jalen Hurts O 1.5 pass TDs', odds: -150, stake: 15, result: 'win', profit: 10, payout: 25, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 2, tags: null, notes: null, upload_id: null, created_at: '2025-11-08T13:00:00Z' },
  { id: 'demo-dfs-4', user_id: 'demo', placed_at: '2025-11-12T19:30:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '2-pick Flex: Doncic O 28.5 pts | Giannis O 30.5 pts', odds: -150, stake: 15, result: 'loss', profit: -15, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 2, tags: null, notes: null, upload_id: null, created_at: '2025-11-12T19:30:00Z' },
  { id: 'demo-dfs-5', user_id: 'demo', placed_at: '2025-11-19T19:30:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '2-pick Flex: LeBron James O 7.5 ast | Tatum O 26.5 pts', odds: -150, stake: 25, result: 'loss', profit: -25, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 2, tags: null, notes: null, upload_id: null, created_at: '2025-11-19T19:30:00Z' },
  { id: 'demo-dfs-6', user_id: 'demo', placed_at: '2025-12-13T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '2-pick Power: Josh Allen O 252.5 pass yds | Jalen Hurts O 57.5 rush yds', odds: 200, stake: 10, result: 'win', profit: 20, payout: 30, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 2, tags: null, notes: null, upload_id: null, created_at: '2025-12-13T13:00:00Z' },
  { id: 'demo-dfs-7', user_id: 'demo', placed_at: '2025-12-14T18:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '2-pick Power: Josh Allen O 248.5 pass yds | Mahomes O 272.5 pass yds', odds: 200, stake: 10, result: 'loss', profit: -10, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 2, tags: null, notes: null, upload_id: null, created_at: '2025-12-14T18:00:00Z' },

  // === 3-PICK ENTRIES (10 total: 6P + 4F, 3W + 7L) ===
  { id: 'demo-dfs-8', user_id: 'demo', placed_at: '2025-11-05T19:30:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '3-pick Power: Mahomes O 275.5 pass yds | Lamar Jackson O 65.5 rush yds | Lamb O 74.5 rec yds', odds: 500, stake: 30, result: 'loss', profit: -30, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-11-05T19:30:00Z' },
  { id: 'demo-dfs-9', user_id: 'demo', placed_at: '2025-11-09T19:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '3-pick Flex: LeBron James O 7.5 reb | Jokic O 10.5 reb | Tatum O 25.5 pts', odds: 150, stake: 10, result: 'win', profit: 15, payout: 25, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-11-09T19:00:00Z' },
  { id: 'demo-dfs-10', user_id: 'demo', placed_at: '2025-11-10T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '3-pick Power: Jalen Hurts O 60.5 rush yds | Purdy O 240.5 pass yds | Mahomes O 268.5 pass yds', odds: 500, stake: 30, result: 'loss', profit: -30, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-11-10T13:00:00Z' },
  { id: 'demo-dfs-11', user_id: 'demo', placed_at: '2025-11-16T19:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '3-pick Power: LeBron James O 26.5 pts | Curry O 5.5 3pt | Brunson O 22.5 pts', odds: 500, stake: 10, result: 'win', profit: 50, payout: 60, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-11-16T19:00:00Z' },
  { id: 'demo-dfs-12', user_id: 'demo', placed_at: '2025-11-22T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '3-pick Power: Josh Allen O 1.5 pass TDs | Jalen Hurts O 225.5 pass yds | Purdy O 1.5 pass TDs', odds: 500, stake: 35, result: 'loss', profit: -35, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-11-22T13:00:00Z' },
  { id: 'demo-dfs-13', user_id: 'demo', placed_at: '2025-11-26T19:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '3-pick Flex: LeBron James O 25.5 pts | Curry O 25.5 pts | Tatum O 4.5 ast', odds: 150, stake: 15, result: 'loss', profit: -15, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-11-26T19:00:00Z' },
  { id: 'demo-dfs-14', user_id: 'demo', placed_at: '2025-12-01T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '3-pick Flex: Mahomes O 272.5 pass yds | Lamar Jackson O 62.5 rush yds | Lamb O 76.5 rec yds', odds: 150, stake: 30, result: 'loss', profit: -30, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-12-01T13:00:00Z' },
  { id: 'demo-dfs-15', user_id: 'demo', placed_at: '2025-12-09T19:30:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '3-pick Flex: LeBron James O 6.5 reb | Doncic O 27.5 pts | Giannis O 29.5 pts', odds: 150, stake: 15, result: 'loss', profit: -15, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-12-09T19:30:00Z' },
  { id: 'demo-dfs-16', user_id: 'demo', placed_at: '2025-12-17T19:30:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '3-pick Flex: Tatum O 25.5 pts | Doncic O 30.5 pts | Jokic O 9.5 ast', odds: 150, stake: 30, result: 'loss', profit: -30, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-12-17T19:30:00Z' },
  { id: 'demo-dfs-17', user_id: 'demo', placed_at: '2025-12-27T19:30:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '3-pick Flex: Jokic O 10.5 ast | Giannis O 12.5 reb | Brunson O 24.5 pts', odds: 150, stake: 10, result: 'win', profit: 15, payout: 25, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-12-27T19:30:00Z' },
];

// Part 2: 4-pick (8) + first half of 5-pick entries
const DEMO_DFS_BETS_PART2: Bet[] = [
  // === 4-PICK ENTRIES (8 total: 8P + 0F, 1W + 7L) ===
  { id: 'demo-dfs-18', user_id: 'demo', placed_at: '2025-11-15T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '4-pick Power: Josh Allen O 255.5 pass yds | Mahomes O 280.5 pass yds | Lamar Jackson O 1.5 pass TDs | Lamb O 75.5 rec yds', odds: 900, stake: 35, result: 'loss', profit: -35, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 4, tags: null, notes: null, upload_id: null, created_at: '2025-11-15T13:00:00Z' },
  { id: 'demo-dfs-19', user_id: 'demo', placed_at: '2025-11-23T16:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '4-pick Power: Jokic O 25.5 pts | Doncic O 8.5 reb | Giannis O 11.5 reb | Brunson O 7.5 ast', odds: 900, stake: 20, result: 'loss', profit: -20, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 4, tags: null, notes: null, upload_id: null, created_at: '2025-11-23T16:00:00Z' },
  { id: 'demo-dfs-20', user_id: 'demo', placed_at: '2025-12-03T19:30:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '4-pick Power: Curry O 27.5 pts | Jokic O 11.5 reb | Doncic O 29.5 pts | Giannis O 28.5 pts', odds: 900, stake: 30, result: 'loss', profit: -30, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 4, tags: null, notes: null, upload_id: null, created_at: '2025-12-03T19:30:00Z' },
  { id: 'demo-dfs-21', user_id: 'demo', placed_at: '2025-12-06T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '4-pick Power: Mahomes O 270.5 pass yds | Purdy O 238.5 pass yds | Lamb O 82.5 rec yds | Lamar Jackson O 68.5 rush yds', odds: 900, stake: 35, result: 'loss', profit: -35, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 4, tags: null, notes: null, upload_id: null, created_at: '2025-12-06T13:00:00Z' },
  { id: 'demo-dfs-22', user_id: 'demo', placed_at: '2025-12-11T19:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '4-pick Power: Curry O 5.5 3pt | Tatum O 26.5 pts | Jokic O 9.5 ast | Brunson O 23.5 pts', odds: 900, stake: 10, result: 'win', profit: 90, payout: 100, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 4, tags: null, notes: null, upload_id: null, created_at: '2025-12-11T19:00:00Z' },
  { id: 'demo-dfs-23', user_id: 'demo', placed_at: '2025-12-14T19:30:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '4-pick Power: Josh Allen O 1.5 pass TDs | Jalen Hurts O 60.5 rush yds | Lamar Jackson O 67.5 rush yds | Lamb O 76.5 rec yds', odds: 900, stake: 20, result: 'loss', profit: -20, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 4, tags: null, notes: null, upload_id: null, created_at: '2025-12-14T19:30:00Z' },
  { id: 'demo-dfs-24', user_id: 'demo', placed_at: '2026-01-04T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '4-pick Power: Mahomes O 282.5 pass yds | Lamar Jackson O 69.5 rush yds | Lamb O 83.5 rec yds | Purdy O 243.5 pass yds', odds: 900, stake: 20, result: 'loss', profit: -20, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 4, tags: null, notes: null, upload_id: null, created_at: '2026-01-04T13:00:00Z' },
  { id: 'demo-dfs-25', user_id: 'demo', placed_at: '2026-01-15T19:30:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '4-pick Power: Curry O 24.5 pts | Jokic O 27.5 pts | Doncic O 8.5 ast | Giannis O 30.5 pts', odds: 900, stake: 15, result: 'loss', profit: -15, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 4, tags: null, notes: null, upload_id: null, created_at: '2026-01-15T19:30:00Z' },

  // === 5-PICK ENTRIES first half (entries 26-29) ===
  { id: 'demo-dfs-26', user_id: 'demo', placed_at: '2025-11-17T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '5-pick Power: Josh Allen O 245.5 pass yds | Mahomes O 270.5 pass yds | Lamar Jackson O 70.5 rush yds | Lamb O 80.5 rec yds | Purdy O 236.5 pass yds', odds: 1900, stake: 30, result: 'loss', profit: -30, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 5, tags: null, notes: null, upload_id: null, created_at: '2025-11-17T13:00:00Z' },
  { id: 'demo-dfs-27', user_id: 'demo', placed_at: '2025-11-24T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '5-pick Power: Mahomes O 285.5 pass yds | Jalen Hurts O 62.5 rush yds | Lamar Jackson O 1.5 pass TDs | Purdy O 245.5 pass yds | Lamb O 80.5 rec yds', odds: 1900, stake: 35, result: 'loss', profit: -35, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 5, tags: null, notes: null, upload_id: null, created_at: '2025-11-24T13:00:00Z' },
  { id: 'demo-dfs-28', user_id: 'demo', placed_at: '2025-12-07T19:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '5-pick Power: Curry O 26.5 pts | Tatum O 27.5 pts | Jokic O 24.5 pts | Brunson O 21.5 pts | Doncic O 28.5 pts', odds: 1900, stake: 15, result: 'loss', profit: -15, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 5, tags: null, notes: null, upload_id: null, created_at: '2025-12-07T19:00:00Z' },
  { id: 'demo-dfs-29', user_id: 'demo', placed_at: '2025-12-14T21:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '5-pick Power: Josh Allen O 255.5 pass yds | Mahomes O 280.5 pass yds | Lamar Jackson O 1.5 pass TDs | Purdy O 242.5 pass yds | Lamb O 76.5 rec yds', odds: 1900, stake: 30, result: 'loss', profit: -30, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 5, tags: null, notes: null, upload_id: null, created_at: '2025-12-14T21:00:00Z' },
];

// Part 3: remaining 5-pick (5) + 6-pick (4) entries
const DEMO_DFS_BETS_PART3: Bet[] = [
  // === 5-PICK ENTRIES continued (entries 30-34) ===
  { id: 'demo-dfs-30', user_id: 'demo', placed_at: '2025-12-20T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '5-pick Power: Mahomes O 268.5 pass yds | Lamar Jackson O 64.5 rush yds | Purdy O 238.5 pass yds | Lamb O 79.5 rec yds | Saquon Barkley O 78.5 rush yds', odds: 1900, stake: 35, result: 'loss', profit: -35, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 5, tags: null, notes: null, upload_id: null, created_at: '2025-12-20T13:00:00Z' },
  { id: 'demo-dfs-31', user_id: 'demo', placed_at: '2025-12-29T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '5-pick Power: Mahomes O 276.5 pass yds | Lamar Jackson O 66.5 rush yds | Lamb O 79.5 rec yds | Purdy O 241.5 pass yds | Derrick Henry O 82.5 rush yds', odds: 1900, stake: 30, result: 'loss', profit: -30, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 5, tags: null, notes: null, upload_id: null, created_at: '2025-12-29T13:00:00Z' },
  { id: 'demo-dfs-32', user_id: 'demo', placed_at: '2026-01-07T19:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '5-pick Power: Curry O 26.5 pts | Tatum O 24.5 pts | Jokic O 25.5 pts | Doncic O 27.5 pts | Giannis O 29.5 pts', odds: 1900, stake: 15, result: 'loss', profit: -15, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 5, tags: null, notes: null, upload_id: null, created_at: '2026-01-07T19:00:00Z' },
  { id: 'demo-dfs-33', user_id: 'demo', placed_at: '2026-01-11T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '5-pick Power: Josh Allen O 249.5 pass yds | Mahomes O 274.5 pass yds | Lamar Jackson O 66.5 rush yds | Lamb O 77.5 rec yds | Purdy O 239.5 pass yds', odds: 1900, stake: 10, result: 'win', profit: 190, payout: 200, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 5, tags: null, notes: null, upload_id: null, created_at: '2026-01-11T13:00:00Z' },
  { id: 'demo-dfs-34', user_id: 'demo', placed_at: '2026-01-25T16:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '5-pick Power: Curry O 24.5 pts | Tatum O 26.5 pts | Jokic O 23.5 pts | Brunson O 22.5 pts | Giannis O 30.5 pts', odds: 1900, stake: 30, result: 'loss', profit: -30, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 5, tags: null, notes: null, upload_id: null, created_at: '2026-01-25T16:00:00Z' },

  // === 6-PICK ENTRIES (4 total: 4P + 0F, 0W + 4L) ===
  { id: 'demo-dfs-35', user_id: 'demo', placed_at: '2025-11-29T19:30:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '6-pick Power: Mahomes O 275.5 pass yds | Lamar Jackson O 68.5 rush yds | Lamb O 78.5 rec yds | Purdy O 235.5 pass yds | Saquon Barkley O 80.5 rush yds | Derrick Henry O 85.5 rush yds', odds: 3500, stake: 25, result: 'loss', profit: -25, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 6, tags: null, notes: null, upload_id: null, created_at: '2025-11-29T19:30:00Z' },
  { id: 'demo-dfs-36', user_id: 'demo', placed_at: '2025-12-14T23:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '6-pick Power: Josh Allen O 260.5 pass yds | Mahomes O 278.5 pass yds | Lamar Jackson O 72.5 rush yds | Lamb O 85.5 rec yds | Purdy O 250.5 pass yds | Saquon Barkley O 76.5 rush yds', odds: 3500, stake: 50, result: 'loss', profit: -50, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 6, tags: null, notes: null, upload_id: null, created_at: '2025-12-14T23:00:00Z' },
  { id: 'demo-dfs-37', user_id: 'demo', placed_at: '2025-12-22T19:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '6-pick Power: Curry O 27.5 pts | Jokic O 26.5 pts | Tatum O 28.5 pts | Doncic O 29.5 pts | Giannis O 31.5 pts | Brunson O 23.5 pts', odds: 3500, stake: 15, result: 'loss', profit: -15, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 6, tags: null, notes: null, upload_id: null, created_at: '2025-12-22T19:00:00Z' },
  { id: 'demo-dfs-38', user_id: 'demo', placed_at: '2026-01-19T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '6-pick Power: Mahomes O 277.5 pass yds | Lamar Jackson O 71.5 rush yds | Lamb O 81.5 rec yds | Purdy O 247.5 pass yds | Saquon Barkley O 82.5 rush yds | Derrick Henry O 88.5 rush yds', odds: 3500, stake: 35, result: 'loss', profit: -35, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 6, tags: null, notes: null, upload_id: null, created_at: '2026-01-19T13:00:00Z' },
];

export const DEMO_DFS_BETS: Bet[] = [...DEMO_DFS_BETS_PART1, ...DEMO_DFS_BETS_PART2, ...DEMO_DFS_BETS_PART3];

// ── DFS Demo Analysis (PrizePicks) ──

export const DEMO_DFS_ANALYSIS: AutopsyAnalysis = {
  summary: {
    total_bets: 200,
    record: '64-136-0',
    total_profit: -1480,
    roi_percent: -8.2,
    avg_stake: 18,
    date_range: 'Nov 1, 2025 – Jan 31, 2026',
    overall_grade: 'C-',
  },

  emotion_score: 68,
  tilt_score: 68,
  emotion_breakdown: {
    stake_volatility: 14,
    loss_chasing: 24,
    streak_behavior: 20,
    session_discipline: 10,
  },
  tilt_breakdown: {
    stake_volatility: 14,
    loss_chasing: 24,
    streak_behavior: 20,
    session_discipline: 10,
  },

  bankroll_health: 'caution',

  betting_archetype: {
    name: 'The Multiplier Chaser',
    description: 'Bigger payout always calling. Your 2-pick game is actually solid. The 5-6 pick entries are where your bankroll goes to die, and you reach for them more after losses, not less.',
  },

  dfs_mode: true,
  dfs_platform: 'Prizepicks',

  discipline_score: {
    total: 42,
    tracking: 14,
    sizing: 10,
    control: 8,
    strategy: 10,
    percentile: 32,
  },

  emotion_percentile: 72,

  biases_detected: [
    {
      bias_name: 'High-Pick Addiction',
      severity: 'critical',
      description: '51% of your entries are 5-6 picks. Those hit at under 12%. Your 2-3 pick entries hit at 48%, but those are only 45% of your volume.',
      evidence: '22 entries at 5-6 picks (51%) with -34% ROI vs 17 entries at 2-3 picks with +6% ROI.',
      estimated_cost: 620,
      fix: 'Cap your entries at 3 picks. Your hit rate at 2-3 picks is real. At 5-6 picks, the multiplier is doing the work your research is not.',
    },
    {
      bias_name: 'Multiplier Chasing',
      severity: 'high',
      description: 'Your average pick count jumps from 2.8 after wins to 4.4 after losses. You are not researching more players, you are buying a bigger lottery ticket to recover.',
      evidence: 'Avg picks after loss: 4.4 vs after win: 2.8 (57% increase). 3 of your worst 5 sessions started with a loss at 2-3 picks followed by 5-6 pick entries.',
      estimated_cost: 490,
      fix: 'Pre-commit to a pick count before your session starts. Losing a 2-pick entry is not a signal to go bigger, it is a signal to stop.',
    },
    {
      bias_name: 'Power Play Preference',
      severity: 'high',
      description: 'You default to Power Play 71% of the time. Flex gives you partial payouts on near-misses. Your Flex ROI is positive. Your Power ROI is not.',
      evidence: '27 Power entries (71%) at -12% ROI vs 11 Flex entries at +4% ROI.',
      estimated_cost: 370,
      fix: 'Switch to Flex as your default. Reserve Power for rare max-conviction entries. Flex smooths variance and keeps your bankroll in play longer.',
    },
    {
      bias_name: 'Player Concentration Risk',
      severity: 'medium',
      description: 'Josh Allen appears in 29% of your entries. When he has an off game, multiple entries go down together. You have built correlation into what should be independent picks.',
      evidence: 'Josh Allen in 11 of 38 entries (29%) with -18% ROI. Jalen Hurts second at 18% exposure, -24% ROI.',
      estimated_cost: 180,
      fix: 'No single player in more than 15% of your entries. Forced diversification eliminates correlation risk.',
    },
  ],
  strategic_leaks: [
    {
      category: '5-6 pick entries',
      detail: 'Volume concentrated where hit rate collapses. Over half your entries are 5-6 picks, but they hit at under 12%.',
      roi_impact: -34,
      sample_size: 22,
      suggestion: 'Cap at 3 picks. Your research pays at low pick counts.',
    },
    {
      category: 'Power Plays',
      detail: 'Default format has worse EV than the available alternative. Flex partial payouts absorb variance that Power does not.',
      roi_impact: -12,
      sample_size: 27,
      suggestion: 'Make Flex your default. Reserve Power for max-conviction entries.',
    },
    {
      category: 'Josh Allen entries',
      detail: 'Over-concentrated exposure to single player variance. When Allen has an off game, multiple entries collapse.',
      roi_impact: -18,
      sample_size: 11,
      suggestion: 'Cap single-player exposure at 15% of entries.',
    },
    {
      category: 'Post-loss entries',
      detail: 'Pick count escalates after losses. You respond to a 2-pick loss by building a 5-pick entry, not by stopping.',
      roi_impact: -26,
      sample_size: 14,
      suggestion: 'Lock pick count before session starts. Never adjust based on intermediate results.',
    },
  ],
  behavioral_patterns: [
    {
      pattern_name: 'Pick Count Escalation',
      description: 'Pick count escalates after losses, not wins. Your average pick count jumps from 2.8 after a win to 4.4 after a loss.',
      frequency: '3 of 5 losing sessions',
      impact: 'negative',
      data_points: 'Avg picks after loss: 4.4 vs after win: 2.8. Dec 14 sequence: 2-pick to 4-pick to 5-pick to 6-pick.',
    },
    {
      pattern_name: 'Weekend Heavy',
      description: 'Saturday and Sunday represent 58% of your entries, with lower discipline and higher pick counts than weekday entries.',
      frequency: 'Every week',
      impact: 'negative',
      data_points: '116 weekend entries at -11.4% ROI vs 84 weekday entries at -3.8% ROI.',
    },
    {
      pattern_name: '2-3 Pick Discipline',
      description: 'When you stick to 2-3 picks, your research actually pays. Your hit rate at low pick counts is where your edge lives.',
      frequency: 'Consistent across sample',
      impact: 'positive',
      data_points: '2-3 pick entries: 48% hit rate, +6% ROI. Your best category by far.',
    },
  ],
  recommendations: [
    {
      priority: 1,
      title: 'Cap entries at 3 picks maximum',
      description: 'Your 2-3 pick hit rate at 48% is where your research actually pays. 5-6 pick entries are effectively lottery tickets disguised as analysis.',
      expected_improvement: 'Recover ~$620/quarter',
      difficulty: 'easy',
    },
    {
      priority: 2,
      title: 'Make Flex your default, Power your exception',
      description: 'Flex partial payouts absorb near-miss variance. Reserve Power for max-conviction entries only.',
      expected_improvement: 'Recover ~$370/quarter',
      difficulty: 'easy',
    },
    {
      priority: 3,
      title: 'Lock pick count before each session',
      description: 'Write down your pick count for the night before you log in. Never deviate based on intermediate results.',
      expected_improvement: 'Recover ~$490/quarter',
      difficulty: 'medium',
    },
    {
      priority: 4,
      title: 'No player in more than 15% of entries',
      description: 'Diversification is baked into your pick process, not an afterthought. Rotate star players instead of stacking them.',
      expected_improvement: 'Recover ~$180/quarter',
      difficulty: 'medium',
    },
  ],
  personal_rules: [
    { rule: 'Never build an entry with more than 3 picks', reason: 'Your 4+ pick entries are 3-24. That is a 11% hit rate costing you $640.', based_on: 'Pick count analysis' },
    { rule: 'Default to Flex, not Power', reason: 'Your Power entries have -12% ROI. Flex entries have +4% ROI. The math is clear.', based_on: 'Power vs Flex breakdown' },
    { rule: 'After a loss, do not increase pick count', reason: 'Your pick count jumps 57% after losses. That is chasing with extra steps.', based_on: 'Loss sequence analysis' },
    { rule: 'No single player in more than 3 entries per week', reason: 'Josh Allen in 29% of entries at -18% ROI. Concentration is killing you.', based_on: 'Player concentration analysis' },
  ],
  sport_specific_findings: [
    {
      id: 'NBA-PLAYER-CONCENTRATION',
      name: 'NBA player prop overexposure',
      sport: 'NBA',
      severity: 'medium',
      description: 'LeBron James appears in 16% of entries. When he has an off shooting night, multiple entries collapse together.',
      evidence: 'LeBron in 6 of 38 entries (16%). 4 of those 6 were losses. Combined ROI on LeBron entries: +8%, but variance is high.',
      estimated_cost: -120,
      recommendation: 'Spread NBA prop exposure across more players. No single NBA player in more than 10% of entries.',
    },
    {
      id: 'NFL-PICK-STACKING',
      name: 'NFL pick concentration',
      sport: 'NFL',
      severity: 'high',
      description: 'Josh Allen and Jalen Hurts appear together in 18% of your entries. When one has a bad game, the other often does too because you are picking correlated game scripts.',
      evidence: 'Allen + Hurts stacked in 7 entries. Combined ROI on stacked entries: -22%.',
      estimated_cost: -240,
      recommendation: 'Avoid stacking QB props from the same slate. Diversify across positions and games.',
    },
  ],

  session_analysis: {
    total_sessions: 38,
    avg_bets_per_winning_session: 3.2,
    avg_bets_per_losing_session: 5.8,
    worst_session: {
      date: '2025-12-14',
      bets: 4,
      duration: '5 hours',
      net: -110,
      description: 'Classic pick-count escalation. Started with a 2-pick loss, ended with a $50 6-pick Power Play. Four entries in five hours, each one with more picks than the last.',
    },
    best_session: {
      date: '2025-11-02',
      bets: 3,
      duration: '4 hours',
      net: 23.34,
      description: 'Disciplined 2-pick day. Three Flex entries on researched props. No escalation after the first win.',
    },
    insight: 'Your winning sessions average 3.2 entries. Your losing sessions average 5.8. More entries means more picks per entry means more losses. You are at your best when you keep it to 2-3 picks and walk away.',
  },

  edge_profile: {
    profitable_areas: [
      { category: '2-pick entries', roi: 12, sample_size: 7, confidence: 'medium' },
      { category: '3-pick Flex', roi: 8, sample_size: 4, confidence: 'low' },
      { category: 'NFL props (low pick)', roi: 6, sample_size: 18, confidence: 'medium' },
    ],
    unprofitable_areas: [
      { category: '5-pick Power', roi: -38, sample_size: 9, estimated_loss: 280 },
      { category: '6-pick Power', roi: -100, sample_size: 4, estimated_loss: 125 },
      { category: 'Josh Allen entries', roi: -18, sample_size: 11, estimated_loss: 140 },
    ],
    reallocation_advice: 'Shift volume from 5-6 pick Power entries into 2-3 pick Flex entries. Your profitable categories have enough sample size to trust.',
    sharp_score: 35,
  },

  betiq: {
    score: 55,
    components: {
      line_value: 14,
      calibration: 10,
      sophistication: 6,
      specialization: 10,
      timing: 7,
      confidence: 8,
    },
    percentile: 48,
    interpretation: 'Moderate skill at low pick counts. Your 2-3 pick research translates to real edge. At 5-6 picks, skill dissolves into variance.',
    insufficient_data: false,
  },

  enhanced_tilt: {
    score: 68,
    signals: {
      bet_sizing_volatility: 14,
      loss_reaction: 24,
      streak_behavior: 20,
      session_discipline: 10,
      session_acceleration: 16,
      odds_drift_after_loss: 12,
    },
    risk_level: 'elevated',
    worst_trigger: 'Pick count jumps from 2.8 to 4.4 after losses. You are not adding research, you are adding lottery tickets.',
    percentile: 28,
  },

  session_detection: {
    sessions: [
      { id: 'SESSION-001', date: '2025-11-02', dayOfWeek: 'Sunday', startTime: '1:00 PM', endTime: '5:00 PM', durationMinutes: 240, bets: 3, wins: 2, losses: 1, pushes: 0, staked: 35, profit: 23.34, roi: 66.7, avgStake: 12, startingStake: 10, endingStake: 15, stakeEscalation: 1.5, maxStake: 15, minStake: 10, stakeCv: 0.2, betsPerHour: 0.75, longestLossStreak: 1, chasedAfterLoss: false, chaseCount: 0, lateNight: false, grade: 'A', gradeReasons: ['Consistent low pick count', 'No escalation after loss'], isHeated: false, heatSignals: [], betIndices: [0, 1, 2] },
      { id: 'SESSION-007', date: '2025-11-16', dayOfWeek: 'Saturday', startTime: '1:00 PM', endTime: '4:30 PM', durationMinutes: 210, bets: 4, wins: 1, losses: 3, pushes: 0, staked: 85, profit: -25, roi: -29.4, avgStake: 21, startingStake: 10, endingStake: 30, stakeEscalation: 3.0, maxStake: 30, minStake: 10, stakeCv: 0.45, betsPerHour: 1.1, longestLossStreak: 2, chasedAfterLoss: false, chaseCount: 0, lateNight: false, grade: 'C', gradeReasons: ['Moderate stake escalation', 'Mixed pick counts'], isHeated: false, heatSignals: [], betIndices: [38, 39, 40, 41] },
      { id: 'SESSION-012', date: '2025-12-14', dayOfWeek: 'Saturday', startTime: '6:00 PM', endTime: '11:00 PM', durationMinutes: 300, bets: 4, wins: 0, losses: 4, pushes: 0, staked: 110, profit: -110, roi: -100, avgStake: 28, startingStake: 10, endingStake: 50, stakeEscalation: 5.0, maxStake: 50, minStake: 10, stakeCv: 0.68, betsPerHour: 0.8, longestLossStreak: 4, chasedAfterLoss: true, chaseCount: 3, lateNight: true, grade: 'F', gradeReasons: ['Pick count escalated from 2 to 6', '3 chase entries after losses', 'Stakes increased 5x from start to finish'], isHeated: true, heatSignals: ['Pick count escalated 2 to 4 to 5 to 6 across session', 'Stakes quintupled while chasing losses'], betIndices: [89, 90, 91, 92] },
      { id: 'SESSION-018', date: '2026-01-11', dayOfWeek: 'Sunday', startTime: '1:00 PM', endTime: '3:00 PM', durationMinutes: 120, bets: 2, wins: 1, losses: 1, pushes: 0, staked: 25, profit: 160, roi: 640, avgStake: 13, startingStake: 15, endingStake: 10, stakeEscalation: 0.67, maxStake: 15, minStake: 10, stakeCv: 0.24, betsPerHour: 1.0, longestLossStreak: 1, chasedAfterLoss: false, chaseCount: 0, lateNight: false, grade: 'B', gradeReasons: ['Controlled pick count', 'No escalation after loss'], isHeated: false, heatSignals: [], betIndices: [155, 156] },
    ],
    totalSessions: 38,
    avgSessionLength: 5.3,
    avgSessionDuration: 148,
    sessionGradeDistribution: [
      { grade: 'A', count: 6, percent: 16 },
      { grade: 'B', count: 8, percent: 21 },
      { grade: 'C', count: 12, percent: 32 },
      { grade: 'D', count: 7, percent: 18 },
      { grade: 'F', count: 5, percent: 13 },
    ],
    heatedSessionCount: 7,
    heatedSessionPercent: 18,
    avgGradedROI: { A: 14.2, B: 4.8, C: -5.6, D: -18.2, F: -42.1 },
    bestSession: { id: 'SESSION-001', date: '2025-11-02', dayOfWeek: 'Sunday', startTime: '1:00 PM', endTime: '5:00 PM', durationMinutes: 240, bets: 3, wins: 2, losses: 1, pushes: 0, staked: 35, profit: 23.34, roi: 66.7, avgStake: 12, startingStake: 10, endingStake: 15, stakeEscalation: 1.5, maxStake: 15, minStake: 10, stakeCv: 0.2, betsPerHour: 0.75, longestLossStreak: 1, chasedAfterLoss: false, chaseCount: 0, lateNight: false, grade: 'A', gradeReasons: ['Consistent low pick count', 'No escalation after loss'], isHeated: false, heatSignals: [], betIndices: [] },
    worstSession: { id: 'SESSION-012', date: '2025-12-14', dayOfWeek: 'Saturday', startTime: '6:00 PM', endTime: '11:00 PM', durationMinutes: 300, bets: 4, wins: 0, losses: 4, pushes: 0, staked: 110, profit: -110, roi: -100, avgStake: 28, startingStake: 10, endingStake: 50, stakeEscalation: 5.0, maxStake: 50, minStake: 10, stakeCv: 0.68, betsPerHour: 0.8, longestLossStreak: 4, chasedAfterLoss: true, chaseCount: 3, lateNight: true, grade: 'F', gradeReasons: ['Pick count escalated from 2 to 6', '3 chase entries', 'Stakes 5x'], isHeated: true, heatSignals: ['Pick count escalated while chasing losses'], betIndices: [] },
    insight: 'Your A-graded sessions average +14.2% ROI. Your F sessions average -42.1%. The pattern is clear: low pick count and no escalation pays. Everything else costs you.',
  },

  bet_annotations: {
    annotations: [
      { betIndex: 0, betId: 'demo-dfs-1', classification: 'disciplined', confidence: 84, signals: [{ name: 'flat_pick_count', weight: -5, description: 'Stayed at 2 picks, within disciplined range', category: 'disciplined' }, { name: 'reasonable_pace', weight: -2, description: 'First entry of session, deliberate timing', category: 'disciplined' }], primaryReason: 'Stayed at 2 picks, within disciplined range', sessionId: 'SESSION-001', sessionGrade: 'A', isInHeatedSession: false, stakeVsMedian: 0.7, timeSinceLastBet: null, currentStreak: 0 },
      { betIndex: 2, betId: 'demo-dfs-3', classification: 'disciplined', confidence: 80, signals: [{ name: 'flat_pick_count', weight: -5, description: 'Maintained 2 picks after previous win', category: 'disciplined' }, { name: 'controlled_sizing', weight: -3, description: 'Modest stake increase to $15, within normal range', category: 'disciplined' }], primaryReason: 'Maintained 2 picks after previous win', sessionId: 'SESSION-001', sessionGrade: 'A', isInHeatedSession: false, stakeVsMedian: 1.0, timeSinceLastBet: 120, currentStreak: 2 },
      { betIndex: 8, betId: 'demo-dfs-9', classification: 'disciplined', confidence: 82, signals: [{ name: 'flat_pick_count', weight: -4, description: 'Kept to 3 picks Flex after mixed results', category: 'disciplined' }, { name: 'reasonable_pace', weight: -2, description: 'Spaced entry with research time', category: 'disciplined' }], primaryReason: 'Kept to 3 picks Flex after mixed results', sessionId: 'SESSION-007', sessionGrade: 'C', isInHeatedSession: false, stakeVsMedian: 0.7, timeSinceLastBet: 90, currentStreak: -1 },
      { betIndex: 89, betId: 'demo-dfs-7', classification: 'neutral', confidence: 60, signals: [{ name: 'session_opener', weight: 0, description: 'First entry of session, no prior context', category: 'neutral' }], primaryReason: 'Session opener at 2 picks, reasonable start', sessionId: 'SESSION-012', sessionGrade: 'F', isInHeatedSession: true, stakeVsMedian: 0.7, timeSinceLastBet: null, currentStreak: 0 },
      { betIndex: 90, betId: 'demo-dfs-23', classification: 'chasing', confidence: 88, signals: [{ name: 'pick_count_escalation', weight: 8, description: 'Pick count jumped from 2 to 4 after previous loss', category: 'chasing' }, { name: 'heated_session_context', weight: 3, description: 'Part of a heated session (Grade F)', category: 'emotional' }], primaryReason: 'Pick count jumped from 2 to 4 after previous loss', sessionId: 'SESSION-012', sessionGrade: 'F', isInHeatedSession: true, stakeVsMedian: 1.4, timeSinceLastBet: 90, currentStreak: -1 },
      { betIndex: 91, betId: 'demo-dfs-29', classification: 'chasing', confidence: 92, signals: [{ name: 'pick_count_escalation', weight: 9, description: 'Pick count jumped from 4 to 5 after previous loss', category: 'chasing' }, { name: 'stake_escalation', weight: 4, description: 'Stake increased from $20 to $30 after loss', category: 'chasing' }, { name: 'heated_session_context', weight: 3, description: 'Part of a heated session (Grade F)', category: 'emotional' }], primaryReason: 'Pick count jumped from 4 to 5 after previous loss', sessionId: 'SESSION-012', sessionGrade: 'F', isInHeatedSession: true, stakeVsMedian: 2.1, timeSinceLastBet: 90, currentStreak: -2 },
      { betIndex: 92, betId: 'demo-dfs-36', classification: 'chasing', confidence: 96, signals: [{ name: 'pick_count_escalation', weight: 10, description: 'Pick count jumped from 5 to 6 after previous loss', category: 'chasing' }, { name: 'stake_escalation', weight: 6, description: 'Stake increased from $30 to $50, largest of session', category: 'chasing' }, { name: 'max_pick_count', weight: 4, description: '6-pick Power Play, maximum multiplier chasing', category: 'emotional' }, { name: 'heated_session_context', weight: 3, description: 'Part of a heated session (Grade F)', category: 'emotional' }], primaryReason: 'Pick count jumped from 5 to 6 after previous loss, stake 5x session start', sessionId: 'SESSION-012', sessionGrade: 'F', isInHeatedSession: true, stakeVsMedian: 3.5, timeSinceLastBet: 120, currentStreak: -3 },
      { betIndex: 155, betId: 'demo-dfs-33', classification: 'disciplined', confidence: 78, signals: [{ name: 'controlled_sizing', weight: -4, description: 'Minimum stake $10 on a 5-pick entry', category: 'disciplined' }, { name: 'recovery_discipline', weight: -3, description: 'Did not escalate after prior session losses', category: 'disciplined' }], primaryReason: 'Minimum stake on higher pick count, showing restraint', sessionId: 'SESSION-018', sessionGrade: 'B', isInHeatedSession: false, stakeVsMedian: 0.7, timeSinceLastBet: 60, currentStreak: -1 },
    ],
    distribution: {
      disciplined: { count: 90, percent: 45, totalStaked: 1620, totalProfit: 220, roi: 13.6 },
      neutral: { count: 42, percent: 21, totalStaked: 756, totalProfit: -40, roi: -5.3 },
      emotional: { count: 36, percent: 18, totalStaked: 900, totalProfit: -480, roi: -53.3 },
      chasing: { count: 22, percent: 11, totalStaked: 660, totalProfit: -520, roi: -78.8 },
      impulsive: { count: 10, percent: 5, totalStaked: 200, totalProfit: -160, roi: -80.0 },
    },
    emotionalCost: 280,
    worstAnnotatedBet: { betIndex: 92, betId: 'demo-dfs-36', classification: 'chasing', confidence: 96, signals: [{ name: 'pick_count_escalation', weight: 10, description: 'Pick count jumped from 5 to 6 after previous loss', category: 'chasing' }], primaryReason: 'Pick count jumped from 5 to 6 after previous loss, stake 5x session start', sessionId: 'SESSION-012', sessionGrade: 'F', isInHeatedSession: true, stakeVsMedian: 3.5, timeSinceLastBet: 120, currentStreak: -3 },
    bestAnnotatedBet: { betIndex: 0, betId: 'demo-dfs-1', classification: 'disciplined', confidence: 84, signals: [{ name: 'flat_pick_count', weight: -5, description: 'Stayed at 2 picks, within disciplined range', category: 'disciplined' }], primaryReason: 'Stayed at 2 picks, within disciplined range', sessionId: 'SESSION-001', sessionGrade: 'A', isInHeatedSession: false, stakeVsMedian: 0.7, timeSinceLastBet: null, currentStreak: 0 },
    streakInfluence: {
      avgStakeAfterWinStreak3: 12,
      avgStakeAfterLossStreak3: 32,
      avgStakeNeutral: 15,
    },
    insight: '34% of your entries show emotional or chasing behavior, costing you an estimated $280 in recoverable profit. Your disciplined entries return +13.6% ROI vs -60%+ on chasing entries.',
  },

  dfs_metrics: {
    pickCountDistribution: [
      { picks: 2, count: 7, winRate: 57, roi: 12, profit: 28 },
      { picks: 3, count: 10, winRate: 30, roi: 2, profit: 8 },
      { picks: 4, count: 8, winRate: 12, roi: -28, profit: -85 },
      { picks: 5, count: 9, winRate: 11, roi: -38, profit: -125 },
      { picks: 6, count: 4, winRate: 0, roi: -100, profit: -200 },
    ],
    powerVsFlex: {
      powerCount: 27, powerROI: -12, powerProfit: -580,
      flexCount: 11, flexROI: 4, flexProfit: 60,
    },
    playerConcentration: [
      { player: 'Josh Allen', count: 11, percent: 29, roi: -18 },
      { player: 'Jalen Hurts', count: 7, percent: 18, roi: -24 },
      { player: 'LeBron James', count: 6, percent: 16, roi: 8 },
    ],
    avgPickCount: 3.8,
    lowPickROI: 6.0,
    highPickROI: -34.0,
    pickCountAfterLoss: 4.4,
    pickCountAfterWin: 2.8,
  },
};

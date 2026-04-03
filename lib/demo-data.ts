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

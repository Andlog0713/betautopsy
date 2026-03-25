// ── Question Definitions ──

export interface QuizQuestion {
  id: string;
  question: string;
  subtext?: string;
  options: QuizOption[];
}

export interface QuizOption {
  label: string;
  value: string;
  scores: {
    emotion?: number;
    parlay_lean?: number;
    chase_tendency?: number;
    fav_lean?: number;
    volume?: number;
    discipline?: number;
    variance?: number;
    selectivity?: number;
  };
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'You just lost 3 bets in a row. What do you do?',
    options: [
      { label: 'Take a break and come back tomorrow', value: 'break', scores: { discipline: 9, chase_tendency: 1, emotion: 2 } },
      { label: 'Stick to my plan — the next bet is independent', value: 'plan', scores: { discipline: 7, chase_tendency: 2, emotion: 3 } },
      { label: 'Bet bigger on the next one to make it back', value: 'bigger', scores: { discipline: 1, chase_tendency: 9, emotion: 8, variance: 8 } },
      { label: 'Throw a parlay together to get even fast', value: 'parlay', scores: { discipline: 2, chase_tendency: 8, emotion: 7, parlay_lean: 9 } },
    ],
  },
  {
    id: 'q2',
    question: 'What percentage of your bets are parlays?',
    options: [
      { label: 'Rarely — under 10%', value: 'rare', scores: { parlay_lean: 1, discipline: 8 } },
      { label: 'Some — maybe 20-30%', value: 'some', scores: { parlay_lean: 5, discipline: 5 } },
      { label: 'A lot — probably 40-50%', value: 'alot', scores: { parlay_lean: 8, discipline: 3 } },
      { label: 'Almost everything is a parlay', value: 'everything', scores: { parlay_lean: 10, discipline: 1 } },
    ],
  },
  {
    id: 'q3',
    question: 'How many bets do you place in a typical week?',
    options: [
      { label: '1-3 — only when I see something I love', value: 'few', scores: { volume: 2, selectivity: 9 } },
      { label: '5-10 — a few per day on game days', value: 'moderate', scores: { volume: 5, selectivity: 5 } },
      { label: '15-25 — I bet most games I watch', value: 'high', scores: { volume: 8, selectivity: 3 } },
      { label: '30+ — if there\'s a line, I\'m on it', value: 'max', scores: { volume: 10, selectivity: 1 } },
    ],
  },
  {
    id: 'q4',
    question: 'Your team is a -300 favorite. Do you bet them?',
    options: [
      { label: 'Absolutely — they\'re going to win', value: 'yes', scores: { fav_lean: 9, discipline: 3 } },
      { label: 'Only if I think the line is off', value: 'value', scores: { fav_lean: 4, discipline: 8 } },
      { label: 'I\'d rather take the dog at +250', value: 'dog', scores: { fav_lean: 1, discipline: 6 } },
      { label: 'I\'d parlay them with something else', value: 'parlay', scores: { fav_lean: 7, parlay_lean: 7 } },
    ],
  },
  {
    id: 'q5',
    question: 'Be honest — do your bet sizes stay consistent?',
    options: [
      { label: 'Yes — every bet is basically the same size', value: 'flat', scores: { variance: 1, discipline: 9, emotion: 2 } },
      { label: 'Mostly, with occasional bigger plays', value: 'mostly', scores: { variance: 4, discipline: 6, emotion: 4 } },
      { label: 'They swing a lot based on how I\'m feeling', value: 'swing', scores: { variance: 8, discipline: 2, emotion: 8 } },
      { label: 'I go big when I\'m confident, small when I\'m not', value: 'confidence', scores: { variance: 6, discipline: 4, emotion: 6 } },
    ],
  },
  {
    id: 'q6',
    question: 'It\'s 11pm and there\'s a random international soccer game on. Do you bet it?',
    options: [
      { label: 'No — I only bet sports I follow closely', value: 'no', scores: { discipline: 9, selectivity: 9, emotion: 1 } },
      { label: 'Maybe if I\'m bored and the line looks interesting', value: 'maybe', scores: { discipline: 4, emotion: 5, volume: 5 } },
      { label: 'If I\'ve had a bad day and need some action', value: 'action', scores: { discipline: 1, emotion: 9, chase_tendency: 7 } },
      { label: 'Absolutely — action is action', value: 'yes', scores: { discipline: 2, emotion: 7, volume: 8 } },
    ],
  },
  {
    id: 'q7',
    question: 'You hit a big parlay for +800. What\'s your next move?',
    options: [
      { label: 'Withdraw the winnings and reset', value: 'withdraw', scores: { discipline: 9, emotion: 2 } },
      { label: 'Keep my normal routine — the win doesn\'t change anything', value: 'normal', scores: { discipline: 8, emotion: 3 } },
      { label: 'Ride the hot streak — bet bigger for a few days', value: 'ride', scores: { discipline: 2, emotion: 7, variance: 7 } },
      { label: 'Roll it into an even bigger parlay', value: 'roll', scores: { discipline: 1, emotion: 8, parlay_lean: 9, variance: 9 } },
    ],
  },
  {
    id: 'q8',
    question: 'How many sportsbooks do you use?',
    subtext: 'Line shopping = using multiple books to find the best odds.',
    options: [
      { label: 'Just one — I\'m loyal', value: 'one', scores: { discipline: 3, selectivity: 4 } },
      { label: '2-3 — I check a couple', value: 'few', scores: { discipline: 6, selectivity: 6 } },
      { label: '4+ — I always shop for the best line', value: 'many', scores: { discipline: 9, selectivity: 8 } },
      { label: 'Whatever\'s on my phone when I\'m watching', value: 'whatever', scores: { discipline: 2, emotion: 5 } },
    ],
  },
  {
    id: 'q9',
    question: 'You\'ve lost money 4 weeks in a row. How do you feel?',
    options: [
      { label: 'I review my bets to find what went wrong', value: 'review', scores: { discipline: 9, emotion: 3, chase_tendency: 2 } },
      { label: 'Frustrated but I stick to the process', value: 'frustrated', scores: { discipline: 6, emotion: 5, chase_tendency: 4 } },
      { label: 'I\'m due — variance has to swing back', value: 'due', scores: { discipline: 3, emotion: 6, chase_tendency: 7 } },
      { label: 'Time to change everything up', value: 'change', scores: { discipline: 2, emotion: 8, chase_tendency: 6, variance: 7 } },
    ],
  },
  {
    id: 'q10',
    question: 'What\'s your primary reason for betting?',
    options: [
      { label: 'I genuinely think I can beat the market long-term', value: 'edge', scores: { discipline: 7, selectivity: 7 } },
      { label: 'It makes watching games way more fun', value: 'fun', scores: { discipline: 4, emotion: 5, volume: 5 } },
      { label: 'The rush of winning — there\'s nothing like it', value: 'rush', scores: { discipline: 2, emotion: 9 } },
      { label: 'Mix of everything — entertainment plus a chance to make money', value: 'mix', scores: { discipline: 5, emotion: 5 } },
    ],
  },
  {
    id: 'q11',
    question: 'Do you track your bets?',
    options: [
      { label: 'Every single one in a spreadsheet or app', value: 'every', scores: { discipline: 10, selectivity: 6 } },
      { label: 'Most of them — I try to keep records', value: 'most', scores: { discipline: 7 } },
      { label: 'I check my sportsbook balance to see how I\'m doing', value: 'balance', scores: { discipline: 3, emotion: 4 } },
      { label: 'Not really — I bet for fun, not accounting', value: 'no', scores: { discipline: 1, emotion: 5 } },
    ],
  },
  {
    id: 'q12',
    question: 'Your friend tells you about a "lock" — a bet they\'re sure about. What do you do?',
    options: [
      { label: 'I do my own research before deciding', value: 'research', scores: { discipline: 9, selectivity: 8, emotion: 2 } },
      { label: 'I\'ll tail it if the line looks right', value: 'tail_value', scores: { discipline: 6, emotion: 4 } },
      { label: 'I\'m in — my friend knows what they\'re talking about', value: 'tail', scores: { discipline: 3, emotion: 6 } },
      { label: 'I bet it AND add it to a parlay', value: 'parlay', scores: { discipline: 1, emotion: 7, parlay_lean: 8 } },
    ],
  },
];

// ── Scoring Engine ──

export interface QuizResult {
  archetype: {
    name: string;
    description: string;
    emoji: string;
    color: string;
  };
  emotion_estimate: number;
  biases: {
    name: string;
    severity: 'low' | 'medium' | 'high';
    one_liner: string;
  }[];
  strengths: string[];
  watch_outs: string[];
}

export function calculateQuizResult(answers: Record<string, string>): QuizResult {
  const totals: Record<string, number> = {
    emotion: 0, parlay_lean: 0, chase_tendency: 0, fav_lean: 0,
    volume: 0, discipline: 0, variance: 0, selectivity: 0,
  };
  const counts: Record<string, number> = { ...totals };

  for (const [questionId, answerValue] of Object.entries(answers)) {
    const question = QUIZ_QUESTIONS.find((q) => q.id === questionId);
    if (!question) continue;
    const option = question.options.find((o) => o.value === answerValue);
    if (!option) continue;

    for (const [dim, score] of Object.entries(option.scores)) {
      totals[dim] = (totals[dim] || 0) + score;
      counts[dim] = (counts[dim] || 0) + 1;
    }
  }

  const avg: Record<string, number> = {};
  for (const dim of Object.keys(totals)) {
    avg[dim] = counts[dim] > 0 ? totals[dim] / counts[dim] : 5;
  }

  // ── Determine archetype ──
  let archetype: QuizResult['archetype'];

  if (avg.discipline >= 7.5 && avg.emotion <= 3.5 && avg.selectivity >= 6) {
    archetype = { name: 'The Natural', emoji: '🧊', color: '#00C853', description: 'Cool, calculated, and data-driven. You treat betting like a business, not a game. Your discipline is your edge — most bettors would kill for your self-control.' };
  } else if (avg.discipline >= 6 && avg.variance >= 6 && avg.selectivity >= 5) {
    archetype = { name: 'Sharp Sleeper', emoji: '🎯', color: '#00C853', description: 'You\'ve got real instincts and some genuine edges, but your sizing is all over the place. Lock in your stake strategy and you could be dangerous.' };
  } else if (avg.emotion >= 6 && avg.chase_tendency >= 6 && avg.discipline <= 4) {
    archetype = { name: 'Heated Bettor', emoji: '🔥', color: '#f97316', description: 'Your reads aren\'t bad — but your emotions turn winners into losing weeks. The bets after losses are where your bankroll goes to die.' };
  } else if (avg.fav_lean >= 7 && avg.discipline >= 4) {
    archetype = { name: 'Chalk Grinder', emoji: '📋', color: '#fbbf24', description: 'You play it safe with favorites and that feels smart — but you\'re paying a tax on every bet. The juice is eating you alive.' };
  } else if (avg.parlay_lean >= 7) {
    archetype = { name: 'Parlay Dreamer', emoji: '🎰', color: '#8b5cf6', description: 'The big ticket is always calling. Your straight bet game is probably solid — the parlays are where the dream meets reality (and reality usually wins).' };
  } else if (avg.selectivity >= 7 && avg.volume <= 4) {
    archetype = { name: 'Sniper', emoji: '🎯', color: '#60a5fa', description: 'You pick your spots carefully and don\'t bet just to bet. Selective and focused — now it\'s about sharpening the edge on the shots you do take.' };
  } else if (avg.volume >= 7 && avg.variance <= 4) {
    archetype = { name: 'Volume Warrior', emoji: '⚔️', color: '#a78bfa', description: 'You grind it out with consistent sizing across a lot of bets. The approach is sustainable — the question is whether there are leaks hiding in the volume.' };
  } else if (avg.variance >= 7 && avg.parlay_lean >= 5 && avg.emotion >= 5) {
    archetype = { name: 'Degen King', emoji: '👑', color: '#f87171', description: 'You\'re here for the ride and you own it. High variance, high energy, high entertainment value. But somewhere in the chaos, there might be real edges — if you can find them.' };
  } else {
    archetype = { name: 'The Grinder', emoji: '💪', color: '#94a3b8', description: 'Steady and consistent without any extreme tendencies. You\'re not making the big mistakes most bettors make — the question is whether you\'re leaving edges on the table.' };
  }

  // ── Emotion estimate (0-100) ──
  const emotionEstimate = Math.round(Math.min(100, Math.max(0,
    (avg.emotion * 7) + (avg.chase_tendency * 5) + (avg.variance * 3) - (avg.discipline * 4) + 30
  )));

  // ── Top biases ──
  const biasPool: QuizResult['biases'] = [];

  if (avg.chase_tendency >= 6) {
    biasPool.push({
      name: 'Loss Chasing',
      severity: avg.chase_tendency >= 8 ? 'high' : 'medium',
      one_liner: 'You bet bigger or more frequently after losses to "get even." This is the most expensive habit in sports betting.',
    });
  }
  if (avg.parlay_lean >= 6) {
    biasPool.push({
      name: 'Parlay Addiction',
      severity: avg.parlay_lean >= 8 ? 'high' : 'medium',
      one_liner: 'The lure of big payouts keeps you stacking legs. Mathematically, each leg you add makes the sportsbook\'s edge bigger.',
    });
  }
  if (avg.fav_lean >= 6) {
    biasPool.push({
      name: 'Favorite Bias',
      severity: avg.fav_lean >= 8 ? 'high' : 'medium',
      one_liner: 'You gravitate toward favorites because winning feels safer — but you\'re paying premium juice for that comfort.',
    });
  }
  if (avg.emotion >= 6 && avg.variance >= 5) {
    biasPool.push({
      name: 'Emotional Sizing',
      severity: avg.variance >= 8 ? 'high' : 'medium',
      one_liner: 'Your bet sizes swing based on feelings, not strategy. Big after a win, bigger after a loss. This amplifies every mistake.',
    });
  }
  if (avg.discipline <= 3 && avg.volume >= 6) {
    biasPool.push({
      name: 'Action Hunger',
      severity: 'medium',
      one_liner: 'You bet because you want action, not because you see value. Late-night random lines, sports you don\'t follow — sound familiar?',
    });
  }
  if (avg.selectivity <= 3) {
    biasPool.push({
      name: 'Overexposure',
      severity: avg.volume >= 7 ? 'high' : 'medium',
      one_liner: 'Betting on too many games dilutes your edge. The sharps are selective for a reason.',
    });
  }

  if (biasPool.length === 0) {
    biasPool.push({
      name: 'Confirmation Bias',
      severity: 'low',
      one_liner: 'Everyone has it — you tend to seek information that confirms bets you already want to make.',
    });
  }

  const severityOrder = { high: 3, medium: 2, low: 1 };
  biasPool.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);
  const topBiases = biasPool.slice(0, 3);

  // ── Strengths ──
  const strengths: string[] = [];
  if (avg.discipline >= 7) strengths.push('Strong discipline — you have rules and you stick to them.');
  if (avg.selectivity >= 7) strengths.push('Selective bettor — you don\'t bet just to bet.');
  if (avg.variance <= 3) strengths.push('Consistent sizing — your stakes don\'t swing on emotion.');
  if (avg.chase_tendency <= 3) strengths.push('Loss resilience — you don\'t chase after bad beats.');
  if (avg.emotion <= 3) strengths.push('Cool under pressure — emotions don\'t drive your decisions.');
  if (strengths.length === 0) strengths.push('Self-awareness — taking this quiz means you care about improving.');

  // ── Watch outs ──
  const watchOuts: string[] = [];
  if (avg.chase_tendency >= 6) watchOuts.push('Post-loss escalation is likely your most expensive pattern.');
  if (avg.parlay_lean >= 7) watchOuts.push('Your parlay volume is probably costing more than you realize.');
  if (avg.emotion >= 7) watchOuts.push('Your emotions have too much influence on when and how much you bet.');
  if (avg.fav_lean >= 7) watchOuts.push('Leaning on favorites feels safe but the juice adds up fast.');
  if (avg.discipline <= 3) watchOuts.push('Without a consistent process, you\'re gambling — not betting.');
  if (watchOuts.length === 0) watchOuts.push('Even disciplined bettors have blind spots. A data analysis would reveal yours.');

  return {
    archetype,
    emotion_estimate: emotionEstimate,
    biases: topBiases,
    strengths: strengths.slice(0, 2),
    watch_outs: watchOuts.slice(0, 2),
  };
}

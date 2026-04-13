export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  readTime: string;
  tags: string[];
}

export const BLOG_POSTS: BlogPostMeta[] = [
  {
    slug: 'why-am-i-losing-at-sports-betting',
    title: 'Why Am I Losing at Sports Betting? A Behavioral Analysis',
    description: 'Most bettors lose money, but not for the reasons they think. Here are the 5 behavioral patterns that silently drain your bankroll.',
    publishedAt: '2026-02-10',
    readTime: '7 min read',
    tags: ['betting psychology', 'behavioral analysis', 'bankroll management'],
  },
  {
    slug: 'parlay-addiction-the-real-math',
    title: 'The Real Math Behind Parlay Addiction',
    description: 'Parlays are the most popular bet type in America, and the most profitable for sportsbooks. Here\'s what the math actually says.',
    publishedAt: '2026-02-17',
    readTime: '6 min read',
    tags: ['parlays', 'expected value', 'sportsbook edge'],
  },
  {
    slug: 'cognitive-biases-destroying-your-bankroll',
    title: '7 Cognitive Biases That Are Destroying Your Bankroll',
    description: 'Loss chasing, favorite bias, and 5 other cognitive traps that cost recreational bettors hundreds every month, and how to spot them.',
    publishedAt: '2026-02-24',
    readTime: '8 min read',
    tags: ['cognitive biases', 'loss chasing', 'favorite bias', 'betting psychology'],
  },
  {
    slug: 'psychology-of-loss-chasing',
    title: 'The Psychology of Loss Chasing: Why You Can\'t Stop',
    description: 'After a losing streak, something in your brain says "bet bigger." Here\'s the neuroscience behind it, and a practical framework to stop.',
    publishedAt: '2026-03-03',
    readTime: '7 min read',
    tags: ['loss chasing', 'betting psychology', 'behavioral patterns'],
  },
  {
    slug: 'am-i-a-bad-sports-bettor',
    title: 'Am I a Bad Sports Bettor? A Self-Assessment',
    description: 'Take an honest look at your betting habits with this 10-point self-assessment. Most bettors score worse than they expect.',
    publishedAt: '2026-03-10',
    readTime: '5 min read',
    tags: ['self-assessment', 'betting habits', 'sports betting'],
  },
  {
    slug: 'how-to-analyze-your-betting-history',
    title: 'How to Analyze Your Betting History (Beyond Win/Loss Record)',
    description: 'Win rate tells you almost nothing. Here are the 5 metrics that actually explain where your money is going, and how to calculate them from your own data.',
    publishedAt: '2026-03-17',
    readTime: '8 min read',
    tags: ['betting history', 'bet tracking', 'ROI analysis', 'behavioral analysis'],
  },
  {
    slug: 'what-is-behavioral-betting-analysis',
    title: 'What Is Behavioral Betting Analysis? The Definitive Guide',
    description: 'Behavioral betting analysis examines how you bet, not what you bet on. Learn the science, the metrics, and why it matters more than picks.',
    publishedAt: '2026-03-24',
    readTime: '10 min read',
    tags: ['behavioral analysis', 'betting psychology', 'cognitive biases', 'loss aversion'],
  },
  {
    slug: 'why-am-i-losing-on-prizepicks',
    title: 'Why Am I Losing on PrizePicks? 5 Behavioral Mistakes',
    description: 'PrizePicks losses come from different behavioral traps than sportsbook losses. Here are the 5 mistakes costing you money, and what to do about them.',
    publishedAt: '2026-03-24',
    readTime: '8 min read',
    tags: ['prizepicks', 'DFS', 'behavioral analysis', 'pick\'em'],
  },
  {
    slug: 'sunk-cost-fallacy-sports-betting',
    title: 'The Sunk Cost Fallacy in Sports Betting: Why You Can\'t Walk Away',
    description: 'You\'re down $200 and feel like you have to keep betting to "get it back." That\'s the sunk cost fallacy, and it\'s one of the most expensive patterns in sports betting.',
    publishedAt: '2026-04-10',
    readTime: '7 min read',
    tags: ['sunk cost fallacy', 'betting psychology', 'behavioral analysis', 'loss chasing'],
  },
  {
    slug: 'betting-archetypes-behavioral-profiles',
    title: 'What\'s Your Betting Archetype? 5 Behavioral Profiles Every Bettor Falls Into',
    description: 'Every bettor has a behavioral profile shaped by their emotions, discipline, and habits. Here are the 5 archetypes we see in the data, and what each one means for your bankroll.',
    publishedAt: '2026-04-14',
    readTime: '8 min read',
    tags: ['betting archetype', 'behavioral profile', 'betting personality', 'sports betting psychology'],
  },
  {
    slug: 'complete-guide-betting-psychology',
    title: 'The Complete Guide to Betting Psychology: How Your Mind Costs You Money',
    description: 'A comprehensive guide to the psychology behind sports betting. Cognitive biases, emotional patterns, and how to fix the behavioral leaks draining your bankroll.',
    publishedAt: '2026-04-11',
    readTime: '15 min read',
    tags: ['betting psychology', 'cognitive biases', 'behavioral analysis', 'sports betting guide'],
  },
  {
    slug: 'how-sportsbooks-use-parlays-against-you',
    title: 'How Sportsbooks Use Parlays Against You',
    description: 'Same Game Parlays, boost promos, bet-slip design, and limits on sharp bettors. The six tactics sportsbooks use to steer you into their highest-margin product.',
    publishedAt: '2026-04-13',
    readTime: '9 min read',
    tags: ['parlays', 'same game parlay', 'sportsbook edge', 'sports betting', 'betting strategy'],
  },
];

// ── Future DFS/Pick'em Posts (to be written) ──
// { slug: 'why-am-i-losing-on-prizepicks', title: 'Why Am I Losing on PrizePicks?', ... }
// { slug: 'pick-em-behavioral-mistakes', title: '5 Behavioral Mistakes Every Pick\'em Player Makes', ... }
// { slug: 'prizepicks-5-pick-trap', title: 'The 5-Pick Trap: Why Your PrizePicks Entries Keep Losing', ... }

// ── Future Prediction Market Posts (to be written) ──
// { slug: 'kalshi-behavioral-analysis', title: 'Behavioral Analysis for Kalshi Traders: The Biases Killing Your P&L', ... }
// { slug: 'prediction-market-loss-chasing', title: 'Loss Chasing on Prediction Markets: Same Pattern, Different Platform', ... }
// { slug: 'am-i-a-bad-kalshi-trader', title: 'Am I a Bad Kalshi Trader? A Behavioral Self-Assessment', ... }

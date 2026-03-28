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
    description: 'Most bettors lose money — but not for the reasons they think. Here are the 5 behavioral patterns that silently drain your bankroll.',
    publishedAt: '2026-03-25',
    readTime: '7 min read',
    tags: ['betting psychology', 'behavioral analysis', 'bankroll management'],
  },
  {
    slug: 'parlay-addiction-the-real-math',
    title: 'The Real Math Behind Parlay Addiction',
    description: 'Parlays are the most popular bet type in America — and the most profitable for sportsbooks. Here\'s what the math actually says.',
    publishedAt: '2026-03-25',
    readTime: '6 min read',
    tags: ['parlays', 'expected value', 'sportsbook edge'],
  },
  {
    slug: 'cognitive-biases-destroying-your-bankroll',
    title: '7 Cognitive Biases That Are Destroying Your Bankroll',
    description: 'Loss chasing, favorite bias, and 5 other cognitive traps that cost recreational bettors hundreds every month — and how to spot them.',
    publishedAt: '2026-03-25',
    readTime: '8 min read',
    tags: ['cognitive biases', 'loss chasing', 'favorite bias', 'betting psychology'],
  },
  {
    slug: 'psychology-of-loss-chasing',
    title: 'The Psychology of Loss Chasing: Why You Can\'t Stop',
    description: 'After a losing streak, something in your brain says "bet bigger." Here\'s the neuroscience behind it — and a practical framework to stop.',
    publishedAt: '2026-03-25',
    readTime: '7 min read',
    tags: ['loss chasing', 'betting psychology', 'behavioral patterns'],
  },
  {
    slug: 'am-i-a-bad-sports-bettor',
    title: 'Am I a Bad Sports Bettor? A Self-Assessment',
    description: 'Take an honest look at your betting habits with this 10-point self-assessment. Most bettors score worse than they expect.',
    publishedAt: '2026-03-25',
    readTime: '5 min read',
    tags: ['self-assessment', 'betting habits', 'sports betting'],
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

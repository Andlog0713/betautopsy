export interface BiasExplainer {
  what: string;
  why: string;
  fix: string;
}

/**
 * Each entry has a `keywords` array used for substring matching against bias
 * names and behavioral pattern names. A match triggers if ANY keyword appears
 * in the lowercase name.
 */
const EXPLAINER_ENTRIES: { keywords: string[]; explainer: BiasExplainer }[] = [
  // ── Engine-detected biases (deterministic names from autopsy-engine.ts) ──
  {
    keywords: ['post-loss', 'loss escalation', 'loss chasing', 'chasing losses'],
    explainer: {
      what: 'Your stake sizes increase after losses. The bigger the losing streak, the bigger the bets that follow it.',
      why: 'Loss aversion makes the pain of losing feel twice as intense as an equivalent win. Your brain tries to "fix" the loss by betting bigger to recover faster. The result is that a $50 bad day becomes a $300 catastrophe.',
      fix: 'Hard ceiling: no bet over 1.5x your average stake after a loss. Mandatory break after 3 consecutive losses. Track your "chase bets" separately and compute their ROI.',
    },
  },
  {
    keywords: ['parlay', 'accumulator'],
    explainer: {
      what: 'A high percentage of your bets are parlays. Parlays have significantly worse expected value than straight bets.',
      why: 'Sportsbooks design parlays to feel exciting (small stake, big payout) while building in massive margin. Each added leg multiplies the house edge. A 3-leg parlay at -110 each carries roughly double the vig of a straight bet.',
      fix: 'Cap parlays at 10% of your weekly volume. Max 3 legs. Compare your parlay ROI to your straight bet ROI in your report. The gap is real money.',
    },
  },
  {
    keywords: ['stake volatility', 'sizing inconsisten', 'bet size swing', 'erratic sizing'],
    explainer: {
      what: 'Your bet sizes vary widely from one wager to the next, swinging between small and large with no consistent pattern.',
      why: 'Inconsistent sizing usually reflects emotional state leaking into bet decisions. Confidence (or desperation) drives the amount, not analysis. A 2x stake on a "lock" that loses hurts twice as much as it should.',
      fix: 'Flat-stake betting: set a standard unit (1-3% of bankroll) and use it for every bet. Deviate only with a written reason before placing the bet, not after seeing the line.',
    },
  },
  {
    keywords: ['favorite', 'chalk', 'heavy lean'],
    explainer: {
      what: 'You bet on favorites disproportionately, paying premium juice on shorter odds.',
      why: 'Favorites feel safer because they win more often. But the vig on favorites is higher, so you need a higher win rate just to break even. Winning 60% of -200 bets still loses money.',
      fix: 'Track your underdog plays separately. Many bettors have hidden edge on underdogs that they never realize because they under-bet them. Your report shows ROI by odds range.',
    },
  },
  {
    keywords: ['late night', 'late-night', 'after hours', 'night betting', 'midnight'],
    explainer: {
      what: 'Bets placed late at night (after 10pm) show worse results than your daytime bets.',
      why: 'Less research, more impulse, cognitive fatigue. Late-night bets are often reactive (chasing the day, bored, or fueled by a game you just watched) rather than planned.',
      fix: 'Hard 10pm cutoff. If you see a line you like at night, save it and review in the morning. If it still looks good with fresh eyes, bet it then.',
    },
  },
  {
    keywords: ['weekend', 'saturday', 'sunday spike'],
    explainer: {
      what: 'Your betting volume spikes on weekends with a worse ROI than your weekday bets.',
      why: 'More games means more temptation. Weekends offer a full slate across every sport, which makes it harder to be selective. Volume goes up and discipline goes down.',
      fix: 'Pre-set a weekend bet limit before Saturday morning. Decide on a number (e.g., 5 bets max) and stick to it regardless of how many games are on.',
    },
  },
  {
    keywords: ['bigger payout', 'longer odds', 'odds drift', 'payout chasing'],
    explainer: {
      what: 'After losses, you shift toward longer odds and bigger potential payouts instead of sticking to your normal range.',
      why: 'Your brain wants to recover the loss in one shot, so it gravitates toward higher-payout bets. But longer odds have lower win probability and higher vig. You are trading a recoverable loss for an even less likely recovery.',
      fix: 'Stick to your normal odds range regardless of recent results. If you usually bet -110 to +150, do not shift to +300 after a losing streak.',
    },
  },
  {
    keywords: ['loss aversion', 'holding losing', 'cutting losses'],
    explainer: {
      what: 'You hold losing futures or positions too long instead of accepting the loss and moving on.',
      why: 'Realizing a loss feels worse than the loss itself. As long as the position is open, your brain treats it as "not yet lost." This leads to holding clearly dead futures and missing opportunities to redeploy that capital.',
      fix: 'Set exit criteria before entering any position. If conditions change (injury, team performance), execute the exit. The money is already effectively lost; the only question is whether you redeploy it well.',
    },
  },
  {
    keywords: ['high-pick', 'high pick', 'max pick', '5-pick', '6-pick', 'pick count'],
    explainer: {
      what: 'In DFS/pick\'em, you consistently max out your pick count, choosing 5-6 picks when lower counts are available.',
      why: 'Higher pick counts offer bigger multipliers, which is seductive. But win probability drops exponentially with each added pick. The math is identical to parlay math: the house edge compounds with every leg.',
      fix: 'Track your ROI by pick count tier. Most players are more profitable at 2-3 picks than 5-6. Bet your profitable tier, not the exciting one.',
    },
  },
  {
    keywords: ['power play', 'flex play', 'multiplier chasing', 'multiplier'],
    explainer: {
      what: 'You choose higher-multiplier entry types (Power Play, Flex Play) instead of standard entries.',
      why: 'Same principle as parlays: higher multiplier means higher house edge. The platform is not giving you a better deal. It is giving itself a wider margin.',
      fix: 'Standard entries until you have 50+ results proving edge at the higher multiplier. Track ROI by entry type in your report.',
    },
  },
  {
    keywords: ['player concentration', 'overexposure', 'same player'],
    explainer: {
      what: 'A small number of players appear in a large share of your picks, creating concentrated exposure.',
      why: 'Familiarity bias: you bet players you know and watch, not necessarily the best statistical plays. If your top player has a bad week, it takes out multiple entries at once.',
      fix: 'Diversify across players and positions. Cap any single player to 20% of your entries in a given week.',
    },
  },
  // ── Common Claude-generated behavioral pattern names ──
  {
    keywords: ['session discipline', 'session control', 'session length'],
    explainer: {
      what: 'Your betting sessions tend to run long, with declining bet quality as the session progresses.',
      why: 'Decision fatigue is real. After 10+ bets in a session, your ability to evaluate value drops. Stakes often creep up toward the end of sessions as urgency builds.',
      fix: 'Set a max session length (time or bet count) before you start. When you hit it, close the app. The best bet is often the one you do not place.',
    },
  },
  {
    keywords: ['recency', 'recent results', 'hot hand', 'cold streak'],
    explainer: {
      what: 'Your bet selection is disproportionately influenced by recent results rather than underlying analysis.',
      why: 'Three wins in a row makes a team look unstoppable. Three losses makes them look hopeless. Both are statistical noise. The spread already accounts for recent form.',
      fix: 'Before every bet, ask: would I bet this if I did not know the last 3 results? If the answer is no, the bet is based on recency, not analysis.',
    },
  },
  {
    keywords: ['confirmation', 'selective information', 'cherry-pick'],
    explainer: {
      what: 'You seek out information that confirms picks you have already decided on, and ignore contradicting data.',
      why: 'Confirmation bias is one of the most studied cognitive biases. Once you have a lean, your brain filters incoming information to support it. By the time you bet, your confidence is manufactured.',
      fix: 'Before placing a bet, actively search for the best argument against it. If you cannot find one, that is a red flag, not a green light.',
    },
  },
  {
    keywords: ['overconfiden', 'inflated confidence', 'winning streak'],
    explainer: {
      what: 'After a stretch of wins, you increase stakes or take riskier bets because you feel "hot."',
      why: 'Confidence is not evidence of skill, especially over small samples. A 5-bet winning streak is statistically meaningless. The vig does not care how you feel.',
      fix: 'Keep stakes flat regardless of recent results. If you want to increase your unit size, do it quarterly based on bankroll growth, not based on a good week.',
    },
  },
  {
    keywords: ['timing', 'early line', 'line movement', 'closing line'],
    explainer: {
      what: 'Your bet timing patterns suggest you are not capturing the best available lines.',
      why: 'Lines move for a reason. Betting too early means you miss information. Betting too late means the value has been taken by sharper money. Optimal timing depends on the sport and market.',
      fix: 'Track your closing line value (CLV). If you consistently get worse numbers than the closing line, you are betting too late. If you get better numbers but lose at the same rate, your edge is in timing, not selection.',
    },
  },
  {
    keywords: ['gambler.s fallacy', 'due', 'regression', 'mean reversion'],
    explainer: {
      what: 'You bet on outcomes because you believe they are "due" based on recent contrary results.',
      why: 'Each game is an independent event. A team that has lost 5 straight ATS is not more likely to cover next time. The spread already adjusts for performance trends.',
      fix: 'Remove the word "due" from your betting vocabulary. Evaluate each game on its own merits, not on what happened last week.',
    },
  },
  {
    keywords: ['anchor', 'opening line', 'initial number'],
    explainer: {
      what: 'You fixate on the opening line or an early number and evaluate current lines relative to that anchor.',
      why: 'Your brain treats the first number it sees as the "real" value. When the line moves, you perceive it as mispriced, even though the new line reflects updated information.',
      fix: 'Evaluate the current line against your own projection, not against the opening number. The opening line is yesterday\'s information.',
    },
  },
  {
    keywords: ['availability', 'tv bias', 'primetime', 'national tv'],
    explainer: {
      what: 'You bet disproportionately on teams and games you recently watched, especially primetime and nationally televised games.',
      why: 'The availability heuristic: events that are easy to recall feel more likely and more analyzable. But the games you watch are not a representative sample of where you have edge.',
      fix: 'Track your ROI on primetime bets vs. non-primetime. If primetime is worse (it usually is), reduce that volume and redirect it to markets where your analysis actually has edge.',
    },
  },
];

/**
 * Find the best matching explainer for a bias or pattern name. Returns
 * undefined if no keyword matches (no broken affordance in the UI).
 */
export function findExplainer(name: string): BiasExplainer | undefined {
  const lower = name.toLowerCase().trim();
  const entry = EXPLAINER_ENTRIES.find((e) =>
    e.keywords.some((kw) => lower.includes(kw))
  );
  return entry?.explainer;
}

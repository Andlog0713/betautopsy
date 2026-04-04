'use client';

import { useState } from 'react';
import Link from 'next/link';

interface FAQItem {
  q: string;
  a: string;
}

interface FAQSection {
  title: string;
  items: FAQItem[];
}

const FAQ_DATA: FAQSection[] = [
  {
    title: 'What Is BetAutopsy?',
    items: [
      { q: 'What is BetAutopsy?', a: 'BetAutopsy is a behavioral analysis tool for sports bettors. You upload your bet history and we analyze it for cognitive biases, emotional patterns, and strategic leaks. The stuff your basic tracker can\'t tell you. Think of it like a sports psychologist reviewing your game tape, except it takes 20 seconds and costs less than a bad parlay.' },
      { q: 'Is BetAutopsy a bet tracker?', a: 'No. We\'re the intelligence layer on top of your tracker. Tools like Pikkit track your bets. We tell you what your betting behavior actually means: why you keep doubling your stake after losses, which sports are quietly bleeding your bankroll, and what biases are driving your worst decisions.' },
      { q: 'Does BetAutopsy give me picks or tell me what to bet?', a: 'Never. We are not a picks service and we never predict outcomes. BetAutopsy analyzes your behavior, not the games. Our goal is to help you understand yourself as a bettor so you can make smarter decisions on your own. Any tool that claims to tell you what to bet is selling you something we\'re not willing to sell.' },
      { q: 'Who is BetAutopsy for?', a: 'Anyone who takes their betting seriously enough to want real feedback, not just a win/loss record. If you\'ve ever wondered why you seem to always blow good runs, why certain sports consistently bleed you, or why your stakes creep up when you\'re on a bad streak, this tool, not gambling advice. You don\'t need to be a "sharp" bettor. You just need to be honest about wanting to improve.' },
      { q: 'What makes this different from just looking at my own stats?', a: 'Your stats show you what happened. BetAutopsy shows you why. We detect patterns your brain actively hides from you (recency bias, loss chasing, the gambler\'s fallacy) because these are by definition things you\'re not conscious of when you\'re doing them. A spreadsheet can\'t call out your emotional triggers. We can.' },
    ],
  },
  {
    title: 'Getting Started & Uploading Data',
    items: [
      { q: 'How do I get my betting history into BetAutopsy?', a: 'The easiest way is through Pikkit. Download Pikkit, connect your sportsbook accounts, activate their free 7-day Pro trial, go to Settings → Data Exports, and email yourself the CSV. The whole process takes about 3 minutes. Once you have the file, drag and drop it into the upload page. Pikkit works with DraftKings, FanDuel, BetMGM, Caesars, theScore Bet, bet365. Alternatively, you can use a manual CSV if you track bets in a spreadsheet.' },
      { q: 'What CSV format does BetAutopsy accept?', a: 'We auto-detect columns from Pikkit exports and most standard bet tracker CSVs. We look for: date, sport, bet_type, description, odds, stake, result, profit, and sportsbook. You don\'t need every column. We\'ll infer what we can. We also convert decimal odds to American odds automatically and detect sports from bet descriptions if no sport column is present.' },
      { q: 'What sportsbooks are supported?', a: 'Any sportsbook that exports to CSV or is supported by Pikkit. That includes DraftKings, FanDuel, BetMGM, Caesars, PointsBet, and many more. BetAutopsy doesn\'t connect directly to sportsbooks. You export from your tracker and upload here. This keeps your sportsbook credentials completely private.' },
      { q: 'I don\'t use a tracker. Can I still use BetAutopsy?', a: 'Yes. You can manually enter bets or build a spreadsheet with our template. There\'s also a guide on the upload page that lets you paste your betting data into any AI chatbot (like ChatGPT or Claude) and ask it to format it into our CSV template. It usually takes about 2 minutes.' },
      { q: 'How many bets do I need for a meaningful analysis?', a: 'The more the better, but you\'ll start seeing patterns with as few as 30–50 bets. Free snapshots analyze all your bets. Full reports go 5,000 bets deep with detailed bias analysis, strategic leaks, and a personalized action plan. Analyses based on very small samples will note where statistical confidence is limited.' },
      { q: 'Do I need to clean up my CSV before uploading?', a: 'Usually not. Our parser handles common formatting issues: varied date formats, decimal vs. American odds, inconsistent result labels (W/L/win/loss/hit), and quoted fields with commas. If something can\'t be parsed, we\'ll flag it with a specific warning rather than silently dropping the row.' },
    ],
  },
  {
    title: 'The Analysis & Reports',
    items: [
      { q: 'What does an Autopsy Report include?', a: 'Your report includes: a summary card (record, P&L, ROI, avg stake, overall grade), an Emotion Score (0–100 measuring your emotional volatility), bias detection cards (loss chasing, parlay addiction, favorite bias, recency bias, gambler\'s fallacy, and more, each with evidence, estimated dollar cost, and a fix), strategic leaks (ROI broken down by sport, bet type, odds range, and sportsbook), behavioral patterns (both positive and negative), an action plan with specific rules, and a bettor archetype profile.' },
      { q: 'What is the Emotion Score?', a: 'It\'s a 0–100 rating of how emotionally-driven your betting is. A low score means your decisions are relatively disciplined and consistent. A high score indicates significant emotional volatility: things like stake spikes after losses, chasing runs, or betting more frequently when tilted. It\'s calculated from patterns across your whole history, not any single bet.' },
      { q: 'What biases does BetAutopsy detect?', a: 'We scan for: loss chasing (stake increases after losses), favorite bias (systematically backing favorites regardless of value), recency bias (overweighting recent results in your selections), parlay addiction (heavy parlay volume with poor ROI relative to straight bets), gambler\'s fallacy (expecting streaks to reverse), availability bias (over-betting on memorable outcomes), and sunk cost behavior (returning to the same losing teams or markets). Each bias is backed by specific evidence from your data, not generic advice.' },
      { q: 'What are "strategic leaks"?', a: 'Strategic leaks are the specific markets, sports, or bet types where your ROI is consistently negative in a way that suggests a structural problem, not just bad luck. For example, if you\'re +8% ROI on NFL spreads but -31% ROI on NBA props, the props are a leak. We surface these with ROI, sample size, and a plain-English explanation of what might be driving it.' },
      { q: 'How long does a report take to generate?', a: 'About 20 seconds from upload to finished report.' },
      { q: 'Can I run multiple reports?', a: 'Free snapshot reports are unlimited. You can run as many snapshots as you want to see your grade, archetype, and top bias. Full reports can be purchased individually for $9.99, or Pro subscribers get 3 full reports per month included (extra reports are $4.99 each).' },
      { q: 'What is the Leak Prioritizer?', a: 'The Leak Prioritizer takes all your detected leaks and ranks them by estimated dollar impact, so you know exactly which behavior to fix first for the biggest financial improvement. Instead of working on everything at once, you get a ranked action list with the most expensive leaks at the top. Available in full reports.' },
      { q: 'What is the What-If Simulator?', a: 'The What-If Simulator lets you model how your P&L would change if you removed specific behaviors. For example: "What if I had never placed a parlay?" or "What if I had flat-staked every bet?" It runs the calculation against your actual history and shows you the counterfactual result. Available in full reports.' },
      { q: 'What is the Weekly Digest?', a: 'A weekly email that recaps your recent betting activity, flags any new patterns, and tracks whether your behavioral metrics are improving week over week. It\'s a lightweight accountability layer so you don\'t have to remember to log in and check. Available with Pro subscription.' },
    ],
  },
  {
    title: 'DFS, Prediction Markets & Pick\'em',
    items: [
      { q: 'Does BetAutopsy support DFS platforms like PrizePicks or Underdog Fantasy?', a: 'Yes. We analyze DFS pick\'em data with a separate framework built for how those platforms actually work. DFS analysis focuses on pick count distribution, Power vs. Flex play preferences, multiplier chasing, and player concentration, rather than sportsbook-specific metrics like parlay ROI. The recommended data path is Pikkit, which normalizes DFS data into a format we can analyze.' },
      { q: 'Does BetAutopsy support prediction markets like Kalshi?', a: 'Yes. Kalshi event contracts are binary bets at their core (yes/no at some odds) and the behavioral patterns are identical to sports betting. Loss chasing, emotional sizing, and overconfidence bias all show up in prediction market trading. Upload your Kalshi history via Pikkit (which syncs with Kalshi) and we\'ll analyze it like any other betting data. Kalshi is CFTC-regulated and legal in all 50 states.' },
      { q: 'I live in California, Texas, or Florida where sports betting is illegal. Can I still use BetAutopsy?', a: 'Absolutely. You have two options: DFS pick\'em platforms like PrizePicks and Underdog Fantasy (legal in most states), or prediction markets like Kalshi (federally regulated, legal in all 50 states). Both are supported. Upload via Pikkit and we\'ll automatically detect your platform type and apply the right analysis framework.' },
    ],
  },
  {
    title: 'Plans & Pricing',
    items: [
      { q: 'What\'s free vs. paid?', a: 'Free: unlimited snapshot reports analyzing all your bets, showing your overall grade, archetype, top bias fully explained, and BetIQ score. Full Report ($9.99 one-time): complete 5-chapter analysis going 5,000 bets deep with all biases, strategic leaks, behavioral patterns, Leak Prioritizer, What-If Simulator, and a personalized action plan. Pro ($19.99/month or $149.99/year): 3 full reports per month, weekly email digest, and progress tracking.' },
      { q: 'Is there a free trial?', a: 'No trial needed. Free snapshots are always free with no credit card required. You can run unlimited snapshots to see your grade, top bias, and BetIQ score. When you want the complete analysis, buy a single report for $9.99 or subscribe to Pro.' },
      { q: 'Can I cancel anytime?', a: 'Yes. No contracts, no cancellation fees. You can cancel directly from your account settings and you\'ll retain access through the end of your billing period.' },
      { q: 'Do you offer annual billing?', a: 'Yes. Pro is $149.99/year (vs. $19.99/month), saving you about 37%.' },
      { q: 'What payment methods do you accept?', a: 'All major credit and debit cards via Stripe. We never see or store your full card number. Stripe handles all payment processing.' },
    ],
  },
  {
    title: 'Privacy & Data Security',
    items: [
      { q: 'Who can see my betting data?', a: 'Only you. Your bet history is stored under your account with row-level security, meaning even at the database level, your data is only accessible when authenticated as you. We do not sell your data, share it with third parties, or use it for advertising.' },
      { q: 'Does BetAutopsy connect to my sportsbook accounts?', a: 'No. We never ask for your sportsbook credentials. You export data from your tracker (like Pikkit) and upload the file here. Your sportsbook login is never involved.' },
      { q: 'How is my data used to generate reports?', a: 'Your bet history is passed to the Claude AI model to generate your behavioral analysis. That data is used solely for the purpose of generating your report. We do not use your betting data to train AI models or share it with Anthropic or any other third party.' },
      { q: 'Can I delete my data?', a: 'Yes. You can delete your account and all associated data at any time from your account settings. We will permanently remove your bet history, reports, and profile.' },
    ],
  },
  {
    title: 'Responsible Gambling',
    items: [
      { q: 'Is BetAutopsy gambling advice?', a: 'No. BetAutopsy is a behavioral analysis and educational tool, not gambling advice. We help you understand your own betting patterns, not predict game outcomes or recommend bets. Nothing in our reports should be interpreted as a recommendation to bet or increase your betting activity.' },
      { q: 'What if my report shows signs of problem gambling?', a: 'We take this seriously. If your data shows patterns consistent with problem gambling (extreme loss chasing, rapidly escalating stakes, very high Emotion Scores), your report will include a direct wellness flag with links to support resources. We\'ll never frame these patterns as something to "optimize." If you or someone you know has a gambling problem, call 1-800-GAMBLER.' },
      { q: 'Is BetAutopsy only for people who bet a lot?', a: 'No. If anything, casual bettors often get the most out of it because they\'re less likely to have reflected on their patterns at all. Even a few months of data can reveal consistent biases you\'d never notice just by looking at your win/loss record.' },
    ],
  },
];

function FAQItemComponent({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className={`border-l-2 transition-colors ${isOpen ? 'border-scalpel' : 'border-transparent'}`}>
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-4 flex justify-between items-start gap-4 hover:bg-white/[0.02] transition-colors"
      >
        <span className="font-medium text-fg-bright text-base">{item.q}</span>
        <span className={`text-fg-muted text-lg shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}>+</span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-out ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <p className="text-sm text-fg-muted leading-relaxed px-4 pb-4">{item.a}</p>
      </div>
    </div>
  );
}

export default function FAQPage() {
  const [openItem, setOpenItem] = useState<string | null>(null);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is BetAutopsy?',
        acceptedAnswer: { '@type': 'Answer', text: 'BetAutopsy is a behavioral analysis tool for sports bettors. You upload your bet history and we analyze it for cognitive biases, emotional patterns, and strategic leaks. The stuff your basic tracker can\'t tell you.' },
      },
      {
        '@type': 'Question',
        name: 'Does BetAutopsy give me picks or tell me what to bet?',
        acceptedAnswer: { '@type': 'Answer', text: 'Never. We are not a picks service and we never predict outcomes. BetAutopsy analyzes your behavior, not the games. Our goal is to help you understand yourself as a bettor so you can make smarter decisions on your own.' },
      },
      {
        '@type': 'Question',
        name: 'How do I get my betting history into BetAutopsy?',
        acceptedAnswer: { '@type': 'Answer', text: 'The easiest way is through Pikkit. Download Pikkit, connect your sportsbook accounts, activate their free 7-day Pro trial, go to Settings → Data Exports, and email yourself the CSV. The whole process takes about 3 minutes.' },
      },
      {
        '@type': 'Question',
        name: 'What does an Autopsy Report include?',
        acceptedAnswer: { '@type': 'Answer', text: 'Your report includes: a summary card (record, P&L, ROI, avg stake, overall grade), an Emotion Score (0–100 measuring your emotional volatility), bias detection cards, strategic leaks, behavioral patterns, an action plan with specific rules, and a bettor archetype profile.' },
      },
      {
        '@type': 'Question',
        name: 'What biases does BetAutopsy detect?',
        acceptedAnswer: { '@type': 'Answer', text: 'We scan for: loss chasing, favorite bias, recency bias, parlay addiction, gambler\'s fallacy, availability bias, and sunk cost behavior. Each bias is backed by specific evidence from your data, not generic advice.' },
      },
      {
        '@type': 'Question',
        name: 'How many bets do I need for a meaningful analysis?',
        acceptedAnswer: { '@type': 'Answer', text: 'You\'ll start seeing patterns with as few as 30–50 bets. Free snapshots analyze all your bets. Full reports go 5,000 bets deep with detailed bias analysis, strategic leaks, and a personalized action plan.' },
      },
      {
        '@type': 'Question',
        name: 'What\'s free vs. paid?',
        acceptedAnswer: { '@type': 'Answer', text: 'Free: unlimited snapshot reports analyzing all your bets, showing grade, archetype, and top bias. Full Report ($9.99 one-time): complete 5-chapter analysis going 5,000 bets deep. Pro ($19.99/month or $149.99/year): 3 full reports per month, weekly digest, and progress tracking.' },
      },
      {
        '@type': 'Question',
        name: 'Who can see my betting data?',
        acceptedAnswer: { '@type': 'Answer', text: 'Only you. Your bet history is stored with row-level security. We do not sell your data, share it with third parties, or use it for advertising.' },
      },
    ],
  };

  return (
    <div className="space-y-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="mb-12">
        <h1 className="font-bold text-4xl mb-3">Frequently Asked Questions</h1>
        <p className="text-fg-muted">Everything you need to know about BetAutopsy.</p>
      </div>

      {FAQ_DATA.map((section, si) => (
        <div key={section.title}>
          {si > 0 && <div className="border-t border-white/[0.04] my-10" />}
          <h2 className="text-xs uppercase tracking-widest text-scalpel mb-4 font-semibold">{section.title}</h2>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const key = `${si}-${item.q}`;
              return (
                <FAQItemComponent
                  key={key}
                  item={item}
                  isOpen={openItem === key}
                  onToggle={() => setOpenItem(openItem === key ? null : key)}
                />
              );
            })}
          </div>
        </div>
      ))}

      {/* Still have questions */}
      <div className="border-t border-white/[0.04] my-10" />
      <div className="text-center space-y-3 py-8">
        <p className="text-fg-bright font-medium text-lg">Still have questions?</p>
        <p className="text-fg-muted text-sm">We&apos;re happy to help.</p>
        <a href="mailto:support@betautopsy.com" className="btn-primary inline-block text-sm">
          Contact Support
        </a>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-4 justify-center text-sm text-fg-muted pb-4">
        <Link href="/quiz" className="hover:text-scalpel transition-colors">Take the Quiz</Link>
        <Link href="/how-to-upload" className="hover:text-scalpel transition-colors">How to Upload</Link>
        <Link href="/pricing" className="hover:text-scalpel transition-colors">Pricing</Link>
        <Link href="/blog" className="hover:text-scalpel transition-colors">Blog</Link>
      </div>
    </div>
  );
}

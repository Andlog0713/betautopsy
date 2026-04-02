'use client';

import Link from 'next/link';
import NavBar from '@/components/NavBar';
import { useState } from 'react';

const AI_PROMPT = `Convert my betting data into a CSV with exactly these columns in this order: date, sport, bet_type, description, odds, stake, result, profit, sportsbook.

Rules:
- date: YYYY-MM-DD format
- sport: NFL, NBA, MLB, NHL, Soccer, Tennis, etc.
- bet_type: spread, moneyline, total, prop, parlay, or other
- odds: American format (e.g. -110, +150)
- stake: number only, no dollar sign
- result: win, loss, or push
- profit: positive for wins, negative for losses (number only)
- sportsbook: DraftKings, FanDuel, BetMGM, etc.

Output ONLY the CSV with a header row, no explanation. Here is my data:`;

export default function HowToUploadPage() {
  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Upload Your Betting History to BetAutopsy',
    description: 'Get your sports betting data into BetAutopsy for AI-powered behavioral analysis — three methods from easiest to most involved.',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Download Pikkit',
        text: 'Download the Pikkit app and connect your sportsbook accounts (DraftKings, FanDuel, BetMGM, Caesars, and more).',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Activate Free Pro Trial',
        text: 'Activate the free 7-day Pro trial in Pikkit to unlock data export functionality.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Export Your CSV',
        text: 'Go to Pro tab, then Settings, then Data Exports. Set your date range and tap Send CSV to email it to yourself.',
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: 'Upload to BetAutopsy',
        text: 'Drag and drop your CSV file into the BetAutopsy upload page.',
      },
      {
        '@type': 'HowToStep',
        position: 5,
        name: 'Get Your Autopsy Report',
        text: 'Your AI-powered behavioral analysis will be generated in about 20 seconds, revealing cognitive biases, strategic leaks, and emotional patterns.',
      },
    ],
  };

  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <NavBar />

      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-28 pb-16">
        <h1 className="font-bold text-4xl mb-3">How to get your betting history</h1>
        <p className="text-fg-muted text-lg mb-12">
          Three ways to get your data in, from easiest to most involved.
        </p>

        {/* ── METHOD 1: Pikkit ── */}
        <div className="card p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-sm bg-scalpel-muted text-scalpel font-mono font-bold text-lg">1</span>
            <h2 className="font-bold text-2xl">Import full history with Pikkit</h2>
            <span className="text-xs font-medium bg-win/10 text-win px-2 py-0.5 rounded-sm">RECOMMENDED FOR NEW USERS</span>
          </div>
          <span className="case-header block mb-4">BEST FOR: Getting your complete sportsbook history in one shot</span>

          <p className="text-fg-muted text-sm mb-6">
            Pikkit connects directly to your sportsbook accounts and pulls your full bet
            history automatically — no manual logging needed, even if you&apos;ve never used
            a tracker before.
          </p>

          <div className="bg-surface-raised rounded-sm p-4">
            <ol className="space-y-2.5 text-sm text-fg-muted">
              <li className="flex gap-3">
                <span className="font-mono text-scalpel font-bold shrink-0">01</span>
                <span><a href="https://links.pikkit.com/invite/surf40498" target="_blank" rel="noopener noreferrer" className="text-scalpel hover:underline">Download Pikkit</a> and connect your sportsbooks</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-scalpel font-bold shrink-0">02</span>
                <span>Activate the free Pro trial (tap the Pro tab &rarr; start trial)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-scalpel font-bold shrink-0">03</span>
                <span>Go to Pro tab &rarr; Settings (top-right) &rarr; Data Exports</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-scalpel font-bold shrink-0">04</span>
                <span>Set your date range and tap <span className="text-fg-bright">Send CSV</span> — it&apos;ll be emailed to you</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-scalpel font-bold shrink-0">05</span>
                <span>Upload that CSV here and you&apos;re done</span>
              </li>
            </ol>

            <a href="https://links.pikkit.com/invite/surf40498" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium bg-scalpel-muted hover:bg-scalpel/20 text-scalpel px-4 py-2.5 rounded-sm transition-colors mt-4">
              Get Pikkit &rarr;
            </a>

            <div className="finding-card border-l-scalpel mt-4">
              <p className="text-xs text-fg-muted">
                This is a one-time import. Once your history is in BetAutopsy, you won&apos;t need Pikkit anymore.
              </p>
              <p className="text-xs text-fg-muted mt-1.5">
                Pikkit Pro gives you 7 free days to export — plenty of time to get your complete history.
              </p>
            </div>

            <p className="text-xs text-fg-muted mt-3">
              Get <span className="text-fg-bright">$3&ndash;$100 cash</span> when you sign up through our link and sync a sportsbook with 10+ bets.
            </p>

            <p className="text-xs text-fg-muted mt-2">
              Takes less than 5 minutes total. Works with DraftKings, FanDuel, BetMGM, Caesars, and more.
            </p>

            <div className="bg-win/5 border border-win/20 rounded-sm p-4 mt-4">
              <p className="text-sm text-fg-bright font-medium mb-1">Play DFS or trade prediction markets?</p>
              <p className="text-sm text-fg-muted">
                Pikkit syncs with <span className="text-fg-bright">PrizePicks, Underdog, Sleeper, Thrive Fantasy, and Kalshi</span> too.
                Your pick&apos;em entries and prediction market trades get pulled in alongside your sportsbook bets — one export covers everything.
              </p>
            </div>
          </div>
        </div>

        {/* ── METHOD 2: Paste from Sportsbook ── */}
        <div className="card p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-sm bg-scalpel-muted text-scalpel font-mono font-bold text-lg">2</span>
            <h2 className="font-bold text-2xl">Paste from your sportsbook</h2>
            <span className="text-xs font-medium bg-scalpel-muted text-scalpel px-2 py-0.5 rounded-sm">BEST FOR ONGOING UPDATES</span>
          </div>
          <span className="case-header block mb-4">BEST FOR: Adding recent bets after your initial import</span>

          <p className="text-fg-muted text-sm mb-6">
            Copy your settled bet history straight from your sportsbook&apos;s website and paste it into BetAutopsy.
            Our AI figures out the format automatically.
          </p>

          <div className="bg-surface-raised rounded-sm p-4">
            <ol className="space-y-2.5 text-sm text-fg-muted">
              <li className="flex gap-3">
                <span className="font-mono text-scalpel font-bold shrink-0">01</span>
                <span>Log into your sportsbook on desktop</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-scalpel font-bold shrink-0">02</span>
                <span>Navigate to My Bets &rarr; Settled</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-scalpel font-bold shrink-0">03</span>
                <span>Select all (<span className="font-mono text-fg-bright">Ctrl+A</span> / <span className="font-mono text-fg-bright">Cmd+A</span>)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-scalpel font-bold shrink-0">04</span>
                <span>Copy (<span className="font-mono text-fg-bright">Ctrl+C</span> / <span className="font-mono text-fg-bright">Cmd+C</span>)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-scalpel font-bold shrink-0">05</span>
                <span>Go to the <Link href="/upload" className="text-scalpel hover:underline">BetAutopsy Upload page</Link> &rarr; &quot;Paste from sportsbook&quot; tab</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-scalpel font-bold shrink-0">06</span>
                <span>Paste and click <span className="text-fg-bright">&quot;Parse Bets&quot;</span></span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-scalpel font-bold shrink-0">07</span>
                <span>Review, uncheck any bad parses, and import</span>
              </li>
            </ol>

            <div className="finding-card border-l-scalpel mt-4">
              <p className="text-xs text-fg-bright font-medium">Works with every sportsbook.</p>
              <p className="text-xs text-fg-muted mt-0.5">Our AI figures out the format automatically.</p>
            </div>

            {/* Per-sportsbook navigation paths */}
            <div className="mt-4">
              <span className="case-header block mb-2">QUICK NAVIGATION PATHS</span>
              <div className="space-y-1.5 text-sm text-fg-muted">
                <div className="flex gap-3">
                  <span className="font-mono text-fg-bright w-24 shrink-0">DraftKings</span>
                  <span>My Bets &rarr; Settled</span>
                </div>
                <div className="flex gap-3">
                  <span className="font-mono text-fg-bright w-24 shrink-0">FanDuel</span>
                  <span>My Bets &rarr; Settled</span>
                </div>
                <div className="flex gap-3">
                  <span className="font-mono text-fg-bright w-24 shrink-0">BetMGM</span>
                  <span>My Bets &rarr; Settled</span>
                </div>
                <div className="flex gap-3">
                  <span className="font-mono text-fg-bright w-24 shrink-0">Caesars</span>
                  <span>Profile &rarr; Betting History</span>
                </div>
                <div className="flex gap-3">
                  <span className="font-mono text-fg-bright w-24 shrink-0">theScore Bet</span>
                  <span>My Bets &rarr; Settled</span>
                </div>
              </div>
            </div>

            <Link href="/upload" className="inline-flex items-center gap-1.5 text-sm font-medium bg-scalpel-muted hover:bg-scalpel/20 text-scalpel px-4 py-2.5 rounded-sm transition-colors mt-4">
              Go to Upload Page &rarr;
            </Link>
          </div>
        </div>

        {/* ── METHOD 3: Manual CSV / Spreadsheet ── */}
        <div className="card p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-sm bg-scalpel-muted text-scalpel font-mono font-bold text-lg">3</span>
            <h2 className="font-bold text-2xl">Manual CSV or spreadsheet</h2>
          </div>
          <span className="case-header block mb-4">BEST FOR: People who track in spreadsheets or need full control</span>

          <p className="text-fg-muted text-sm mb-4">
            For people who track in spreadsheets or don&apos;t use any tracker.
          </p>

          <div className="space-y-4">
            <div>
              <a href="/api/template" className="text-sm text-scalpel hover:underline">
                &darr; Download our CSV template
              </a>
            </div>

            <div>
              <h3 className="text-sm font-medium text-fg-muted mb-2">Required columns:</h3>
              <div className="flex flex-wrap gap-2">
                {['date', 'sport', 'bet_type', 'description', 'odds', 'stake', 'result', 'profit', 'sportsbook'].map(
                  (col) => (
                    <span key={col} className="font-mono text-xs bg-base border border-white/[0.04] rounded px-2 py-1">
                      {col}
                    </span>
                  )
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-fg-muted mb-2">Example rows:</h3>
              <pre className="font-mono text-xs text-fg-muted bg-base border border-white/[0.04] rounded-sm p-4 overflow-x-auto">
{`date,sport,bet_type,description,odds,stake,result,profit,sportsbook
2025-01-05,NFL,spread,Chiefs -3.5,-110,100,win,91,DraftKings
2025-01-06,NBA,prop,Jokic Over 25.5 pts,+100,50,loss,-50,BetMGM
2025-01-07,NBA,parlay,3-leg parlay,+550,25,loss,-25,FanDuel`}
              </pre>
            </div>

            <div className="bg-surface-raised rounded-sm p-4 text-sm text-fg-muted space-y-2">
              <p>
                If you track bets in Google Sheets or Excel, just make sure your columns
                roughly match these names and save as .csv. Our parser is flexible — it
                auto-detects most column naming variations.
              </p>
              <p>
                You can also add bets one at a time using the{' '}
                <Link href="/bets" className="text-scalpel hover:underline">manual entry form</Link>{' '}
                on the Bet History page.
              </p>
            </div>

            <AiPromptBlock />
          </div>
        </div>

        {/* Still stuck */}
        <div className="card p-6 text-center space-y-3">
          <h3 className="font-bold text-lg">Still stuck?</h3>
          <p className="text-fg-muted text-sm">
            Can&apos;t figure out how to get your data? We&apos;re happy to help.
          </p>
          <a
            href="mailto:support@betautopsy.com"
            className="text-sm text-scalpel hover:underline"
          >
            Email support@betautopsy.com
          </a>
        </div>

        {/* Disclaimer */}
        <p className="text-fg-muted text-xs text-center mt-12">
          BetAutopsy provides behavioral analysis and educational insights — not gambling or financial advice. Past results don&apos;t guarantee future outcomes. 21+. If you or someone you know has a gambling problem, call 1-800-GAMBLER.
        </p>
      </div>
    </main>
  );
}

function AiPromptBlock() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(AI_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-scalpel-muted border border-scalpel/20 rounded-sm p-4">
      <p className="text-sm text-fg-bright font-medium mb-2">Already have a spreadsheet in a different format?</p>
      <p className="text-sm text-fg-muted mb-3">
        Copy and paste this prompt into ChatGPT, Claude, or any AI assistant along with your data to convert it automatically:
      </p>
      <div className="relative">
        <pre className="font-mono text-xs text-fg-muted bg-base border border-white/[0.04] rounded-sm p-4 pr-12 overflow-x-auto whitespace-pre-wrap">
          {AI_PROMPT}
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 text-fg-muted hover:text-fg-bright transition-colors"
          title="Copy prompt"
        >
          {copied ? (
            <svg className="w-4 h-4 text-win" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>
      <p className="text-xs text-fg-muted mt-2">
        Paste the AI&apos;s output into a text file, save as .csv, and upload it here.
      </p>
    </div>
  );
}

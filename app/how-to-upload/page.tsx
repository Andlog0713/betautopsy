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
  return (
    <main className="min-h-screen">
      <NavBar />

      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-28 pb-16">
        <h1 className="font-bold text-4xl mb-3">How to get your bet &amp; pick&apos;em history</h1>
        <p className="text-ink-600 text-lg mb-12">
          Two ways to get your data in, from easiest to most involved.
        </p>

        {/* Method 1 */}
        <div className="card p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-flame-500/10 text-flame-500 font-bold text-lg font-bold">1</span>
            <h2 className="font-bold text-2xl">Use a bet tracker</h2>
            <span className="text-xs font-medium bg-mint-500/10 text-mint-500 px-2 py-0.5 rounded-full">RECOMMENDED</span>
          </div>
          <p className="text-ink-600 text-sm mb-6">
            Pikkit connects directly to your sportsbook accounts and pulls your full bet
            history automatically — no manual logging needed, even if you&apos;ve never used
            a tracker before.
          </p>

          <div className="space-y-4">
            {/* Pikkit */}
            <div className="bg-ink-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-medium">Pikkit</h3>
                <span className="text-xs font-medium bg-flame-500/10 text-flame-500 px-2 py-0.5 rounded-full">RECOMMENDED FOR MOST PEOPLE</span>
              </div>
              <p className="text-sm text-ink-600 mb-3">
                Pikkit <span className="text-[#F0F0F0]">connects directly to your sportsbook accounts</span> and
                pulls your full bet history automatically — even if you&apos;ve never tracked a bet before.
                New users get a free 7-day Pro trial, no payment upfront.
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-sm text-ink-600">
                <li><a href="https://links.pikkit.com/invite/bullseye90350" target="_blank" rel="noopener noreferrer" className="text-flame-500 hover:underline">Download Pikkit</a> and connect your sportsbooks</li>
                <li>Activate the free Pro trial (tap the Pro tab → start trial)</li>
                <li>Go to Pro tab → Settings (top-right) → Data Exports</li>
                <li>Set your date range and tap <span className="text-[#F0F0F0]">Send CSV</span> — it&apos;ll be emailed to you</li>
                <li>Upload that CSV here and you&apos;re done</li>
              </ol>
              <div className="flex flex-wrap gap-2 mt-4">
                <a href="https://apps.apple.com/us/app/pikkit-bet-tracker/id1644823816" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium bg-ink-900 hover:bg-ink-900/70 text-[#F0F0F0] px-3 py-2 rounded-lg transition-colors">
                  🍎 Download on App Store
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.pikkit" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium bg-ink-900 hover:bg-ink-900/70 text-[#F0F0F0] px-3 py-2 rounded-lg transition-colors">
                  ▶️ Get on Google Play
                </a>
                <a href="https://links.pikkit.com/invite/bullseye90350" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-[#F0F0F0] px-3 py-2 rounded-lg transition-colors">
                  🌐 pikkit.com
                </a>
              </div>
              <p className="text-xs text-ink-700 mt-3">
                Takes less than 5 minutes total. Works with DraftKings, FanDuel, BetMGM, Caesars, and more.
              </p>
              <div className="bg-mint-500/5 border border-mint-500/20 rounded-lg p-4 mt-4">
                <p className="text-sm text-[#F0F0F0] font-medium mb-1">Play DFS pick&apos;em?</p>
                <p className="text-sm text-ink-600">
                  Pikkit syncs with <span className="text-[#F0F0F0]">PrizePicks, Underdog, Sleeper, and Thrive Fantasy</span> too.
                  Your pick&apos;em entries get pulled in alongside your sportsbook bets — one export covers everything.
                </p>
              </div>
            </div>

            {/* Don't use any tracker? */}
            <div className="bg-flame-500/5 border border-flame-500/20 rounded-lg p-4">
              <p className="text-sm text-[#F0F0F0] font-medium mb-1">Don&apos;t use a tracker?</p>
              <p className="text-sm text-ink-600">
                Start with Pikkit — it pulls your full history from sportsbooks AND DFS apps like PrizePicks and Underdog automatically.
                No manual logging needed. <span className="text-flame-500">Less than 5 minutes to set up.</span>
              </p>
              <a href="https://links.pikkit.com/invite/bullseye90350" target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-flame-500 hover:underline mt-2">
                Get Pikkit →
              </a>
            </div>
          </div>
        </div>

        {/* Method 2 */}
        <div className="card p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-flame-500/10 text-flame-500 font-bold text-lg font-bold">2</span>
            <h2 className="font-bold text-2xl">Manual entry or spreadsheet</h2>
          </div>
          <p className="text-ink-600 text-sm mb-4">
            For people who track in spreadsheets or don&apos;t use any tracker.
          </p>

          <div className="space-y-4">
            <div>
              <a href="/api/template" className="text-sm text-flame-500 hover:underline">
                ↓ Download our CSV template
              </a>
            </div>

            <div>
              <h3 className="text-sm font-medium text-ink-600 mb-2">Required columns:</h3>
              <div className="flex flex-wrap gap-2">
                {['date', 'sport', 'bet_type', 'description', 'odds', 'stake', 'result', 'profit', 'sportsbook'].map(
                  (col) => (
                    <span key={col} className="font-mono text-xs bg-ink-900 border border-white/[0.08] rounded px-2 py-1">
                      {col}
                    </span>
                  )
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-ink-600 mb-2">Example rows:</h3>
              <pre className="font-mono text-xs text-ink-500 bg-ink-900 border border-white/[0.08] rounded-lg p-4 overflow-x-auto">
{`date,sport,bet_type,description,odds,stake,result,profit,sportsbook
2025-01-05,NFL,spread,Chiefs -3.5,-110,100,win,91,DraftKings
2025-01-06,NBA,prop,Jokic Over 25.5 pts,+100,50,loss,-50,BetMGM
2025-01-07,NBA,parlay,3-leg parlay,+550,25,loss,-25,FanDuel`}
              </pre>
            </div>

            <div className="bg-ink-900/50 rounded-lg p-4 text-sm text-ink-600 space-y-2">
              <p>
                If you track bets in Google Sheets or Excel, just make sure your columns
                roughly match these names and save as .csv. Our parser is flexible — it
                auto-detects most column naming variations.
              </p>
              <p>
                You can also add bets one at a time using the{' '}
                <Link href="/bets" className="text-flame-500 hover:underline">manual entry form</Link>{' '}
                on the Bet History page.
              </p>
            </div>

            <AiPromptBlock />
          </div>
        </div>

        {/* Still stuck */}
        <div className="card p-6 text-center space-y-3">
          <h3 className="font-bold text-lg">Still stuck?</h3>
          <p className="text-ink-600 text-sm">
            Can&apos;t figure out how to get your data? We&apos;re happy to help.
          </p>
          <a
            href="mailto:support@betautopsy.com"
            className="text-sm text-flame-500 hover:underline"
          >
            Email support@betautopsy.com
          </a>
        </div>

        {/* Disclaimer */}
        <p className="text-ink-700 text-xs text-center mt-12">
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
    <div className="bg-flame-500/5 border border-flame-500/20 rounded-lg p-4">
      <p className="text-sm text-[#F0F0F0] font-medium mb-2">Already have a spreadsheet in a different format?</p>
      <p className="text-sm text-ink-600 mb-3">
        Copy and paste this prompt into ChatGPT, Claude, or any AI assistant along with your data to convert it automatically:
      </p>
      <div className="relative">
        <pre className="font-mono text-xs text-ink-400 bg-ink-900 border border-white/[0.08] rounded-lg p-4 pr-12 overflow-x-auto whitespace-pre-wrap">
          {AI_PROMPT}
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 text-ink-600 hover:text-[#F0F0F0] transition-colors"
          title="Copy prompt"
        >
          {copied ? (
            <svg className="w-4 h-4 text-mint-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>
      <p className="text-xs text-ink-700 mt-2">
        Paste the AI&apos;s output into a text file, save as .csv, and upload it here.
      </p>
    </div>
  );
}

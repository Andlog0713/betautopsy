'use client';

import { useState } from 'react';
import Link from 'next/link';
import NavBar from '@/components/NavBar';

const sportsbooks = [
  {
    name: 'DraftKings',
    steps: [
      'No built-in CSV export is available.',
      'Install the free "Bet Downloader" Chrome extension by Sportsbook Scout (sportsbookscout.com/tools/bet-downloader-extension).',
      'Log into DraftKings in Chrome, click the extension icon, hit Scrape.',
      'Export as CSV and upload it here.',
    ],
    note: 'This extension also works for FanDuel.',
  },
  {
    name: 'FanDuel',
    steps: [
      'No built-in CSV export is available.',
      'Use the same Sportsbook Scout "Bet Downloader" Chrome extension as DraftKings.',
      'Log into FanDuel in Chrome, click the extension, scrape your bets.',
      'Export as CSV and upload here.',
    ],
  },
  {
    name: 'BetMGM',
    steps: [
      'Log in → My Account → Settings → Win/Loss Statement → Download.',
    ],
    note: 'This gives you a yearly summary, not individual bets. For detailed bet history with odds and descriptions, use Pikkit or Juice Reel instead.',
  },
  {
    name: 'Caesars',
    steps: [
      'No self-serve export available.',
      'Contact support via email or live chat and request a detailed bet history statement.',
    ],
    note: 'This can take several days. Using Pikkit or Juice Reel to sync is much faster.',
  },
  {
    name: 'bet365',
    steps: [
      'Does not allow any bet history download.',
      'You can only view bets on their website — no export option.',
    ],
    note: 'Use Pikkit or Juice Reel to sync your bet365 account and export from there.',
  },
  {
    name: 'BetRivers',
    steps: [
      'Log in → Account Settings → Win/Loss Statement → Download.',
      'Upload the CSV here.',
    ],
  },
  {
    name: 'Fanatics',
    steps: [
      'No built-in export.',
      'Use Pikkit to sync your Fanatics bets, then export from Pikkit.',
    ],
  },
];

function SportsbookItem({ book }: { book: typeof sportsbooks[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-ink-700/20 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-ink-800/30 transition-colors"
      >
        <span className="font-medium text-sm">{book.name}</span>
        <span className="text-ink-600 text-xs">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          <ol className="list-decimal list-inside space-y-1 text-sm text-ink-600">
            {book.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          {book.note && (
            <p className="text-xs text-amber-400/80 mt-2">Note: {book.note}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function HowToUploadPage() {
  return (
    <main className="min-h-screen">
      <NavBar />

      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-28 pb-16">
        <h1 className="font-serif text-4xl mb-3">How to get your bet history</h1>
        <p className="text-ink-600 text-lg mb-12">
          Three ways to upload your data, from easiest to most involved.
        </p>

        {/* Method 1 */}
        <div className="card p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-flame-500/10 text-flame-500 font-serif text-lg font-bold">1</span>
            <h2 className="font-serif text-2xl">Use a bet tracker you already have</h2>
            <span className="text-xs font-medium bg-mint-500/10 text-mint-500 px-2 py-0.5 rounded-full">RECOMMENDED</span>
          </div>
          <p className="text-ink-600 text-sm mb-6">
            If you already track bets in an app, this is the fastest path. Export your history
            as CSV and upload it here. We auto-detect the format.
          </p>

          <div className="space-y-4">
            {/* Pikkit */}
            <div className="bg-ink-900/50 rounded-lg p-4">
              <h3 className="font-medium mb-2">Pikkit <span className="text-xs text-ink-600">(Pro required for export)</span></h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-ink-600">
                <li>Open Pikkit app → Profile → Settings</li>
                <li>Tap &quot;Export Bet History&quot;</li>
                <li>Choose CSV format</li>
                <li>Save the file and upload it here</li>
              </ol>
              <p className="text-xs text-amber-400/80 mt-2">
                Note: Export requires Pikkit Pro ($4.99/mo). Free Pikkit does not support CSV export.
              </p>
            </div>

            {/* Juice Reel */}
            <div className="bg-ink-900/50 rounded-lg p-4">
              <h3 className="font-medium mb-2">Juice Reel <span className="text-xs text-mint-500">(free)</span></h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-ink-600">
                <li>Open Juice Reel app or web</li>
                <li>Go to your bet history / tracked bets</li>
                <li>Look for the export or download option</li>
                <li>Export as CSV and upload here</li>
              </ol>
            </div>

            {/* BetStamp */}
            <div className="bg-ink-900/50 rounded-lg p-4">
              <h3 className="font-medium mb-2">BetStamp</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-ink-600">
                <li>Open BetStamp → Bet History</li>
                <li>Export your tracked bets as CSV</li>
                <li>Upload the file here</li>
              </ol>
            </div>

            {/* Action Network */}
            <div className="bg-ink-900/50 rounded-lg p-4">
              <h3 className="font-medium mb-2">Action Network</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-ink-600">
                <li>Log in to Action Network on desktop</li>
                <li>Go to your tracked bets</li>
                <li>Export bet history</li>
                <li>Upload CSV here</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Method 2 */}
        <div className="card p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-flame-500/10 text-flame-500 font-serif text-lg font-bold">2</span>
            <h2 className="font-serif text-2xl">Export from your sportsbook</h2>
          </div>
          <p className="text-ink-600 text-sm mb-6">
            Most sportsbooks make this harder than it should be. Here&apos;s what&apos;s
            possible for each one. Click to expand.
          </p>

          <div className="bg-ink-900/50 rounded-lg overflow-hidden">
            {sportsbooks.map((book) => (
              <SportsbookItem key={book.name} book={book} />
            ))}
          </div>
        </div>

        {/* Method 3 */}
        <div className="card p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-flame-500/10 text-flame-500 font-serif text-lg font-bold">3</span>
            <h2 className="font-serif text-2xl">Manual entry or spreadsheet</h2>
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
                    <span key={col} className="font-mono text-xs bg-ink-900 border border-ink-700 rounded px-2 py-1">
                      {col}
                    </span>
                  )
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-ink-600 mb-2">Example rows:</h3>
              <pre className="font-mono text-xs text-ink-500 bg-ink-900 border border-ink-700 rounded-lg p-4 overflow-x-auto">
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
          </div>
        </div>

        {/* Still stuck */}
        <div className="card p-6 text-center space-y-3">
          <h3 className="font-serif text-lg">Still stuck?</h3>
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

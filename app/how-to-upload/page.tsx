import Link from 'next/link';
import NavBar from '@/components/NavBar';

export default function HowToUploadPage() {
  return (
    <main className="min-h-screen">
      <NavBar />

      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-28 pb-16">
        <h1 className="font-bold text-4xl mb-3">How to get your bet history</h1>
        <p className="text-ink-600 text-lg mb-12">
          Two ways to get your data in, from easiest to most involved.
        </p>

        {/* Method 1 */}
        <div className="card p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-flame-500/10 text-flame-500 font-bold text-lg font-bold">1</span>
            <h2 className="font-bold text-2xl">Use a bet tracker you already have</h2>
            <span className="text-xs font-medium bg-mint-500/10 text-mint-500 px-2 py-0.5 rounded-full">RECOMMENDED</span>
          </div>
          <p className="text-ink-600 text-sm mb-6">
            Pikkit is the only app that auto-syncs directly from your sportsbooks — even if
            you&apos;ve never tracked a bet before. The others only work if you&apos;ve already
            been logging bets there.
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
                <li>Download Pikkit and connect your sportsbooks</li>
                <li>Activate the free Pro trial (tap the Pro tab → start trial)</li>
                <li>Go to Pro tab → Settings (top-right) → Data Exports</li>
                <li>Set your date range and tap <span className="text-[#F0F0F0]">Send CSV</span> — it&apos;ll be emailed to you</li>
                <li>Upload that CSV here and you&apos;re done</li>
              </ol>
              <p className="text-xs text-ink-700 mt-3">
                Takes about 3 minutes total. Works with DraftKings, FanDuel, BetMGM, Caesars, and more.
              </p>
            </div>

            {/* Don't use any tracker? */}
            <div className="bg-flame-500/5 border border-flame-500/20 rounded-lg p-4">
              <p className="text-sm text-[#F0F0F0] font-medium mb-1">Don&apos;t use a tracker?</p>
              <p className="text-sm text-ink-600">
                Start with Pikkit — it&apos;ll pull your full history from any sportsbook automatically.
                No manual logging needed. <span className="text-flame-500">3 minutes to set up.</span>
              </p>
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

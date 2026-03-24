import Link from 'next/link';
import NavBar from '@/components/NavBar';

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* ── Fixed Nav ── */}
      <NavBar />

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 pt-36 pb-28 text-center">
        <h1 className="font-serif text-5xl md:text-7xl leading-tight mb-6 animate-fade-in">
          Your bets,{' '}
          <span className="text-flame-500">dissected.</span>
        </h1>
        <p className="text-ink-600 text-lg md:text-xl max-w-2xl mx-auto mb-10 animate-fade-in-d2">
          Upload your bet history. Find out which habits are costing you, which plays are actually sharp, and what to do about it.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up-d3">
          <Link href="/signup" className="btn-primary text-lg !px-8 !py-3.5 animate-pulse-glow">
            Upload Your Bets — It&apos;s Free
          </Link>
          <a href="#sample" className="btn-secondary text-lg !px-8 !py-3.5">
            See a Sample Report
          </a>
        </div>
        <p className="text-ink-700 text-xs mt-6 animate-fade-in-d5">
          No credit card required · Works with Pikkit, Juice Reel, BetStamp, and any CSV export
        </p>
      </section>

      {/* ── Problem / Solution ── */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Left: the problem */}
          <div className="card p-8 md:p-10">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-600 mb-4 block">
              The problem
            </span>
            <h2 className="font-serif text-2xl md:text-3xl mb-4">
              You know <span className="text-ink-600">what</span> happened.
              <br />
              You don&apos;t know <span className="text-flame-500">why.</span>
            </h2>
            <div className="text-ink-600 space-y-4 text-sm leading-relaxed">
              <p>
                You know your record. You know your P&amp;L. You&apos;ve got spreadsheets,
                trackers, dashboards.
              </p>
              <p>
                But none of that explains why you doubled your stake after three straight
                losses last Sunday. Or why you keep firing on NBA player props when
                you&apos;ve never been profitable on them. Or why your $50 &quot;fun parlay&quot;
                turned into a $400 chase by the end of the night.
              </p>
              <p className="text-[#e7e6e1]">
                The numbers show you what happened. They don&apos;t show you what
                you&apos;re doing to yourself.
              </p>
            </div>
          </div>

          {/* Right: the solution */}
          <div className="card p-8 md:p-10 border-flame-500/30">
            <span className="text-xs font-medium uppercase tracking-wider text-flame-500 mb-4 block">
              The solution
            </span>
            <h2 className="font-serif text-2xl md:text-3xl mb-4">
              BetAutopsy reads your history like a{' '}
              <span className="text-flame-500">case file.</span>
            </h2>
            <div className="text-ink-600 space-y-4 text-sm leading-relaxed">
              <p>
                We find the patterns you can&apos;t see from inside your own head —
                the emotional triggers, the unconscious habits, the leaks that are
                quietly draining your bankroll while you focus on your next bet.
              </p>
              <p>
                Then we hand you a plan: specific rules, dollar amounts, and progress
                tracking so you can actually prove to yourself you&apos;re getting sharper.
              </p>
              <p className="text-[#e7e6e1] font-medium">
                Upload your bets. Get your autopsy in 20 seconds. See what you&apos;ve
                been missing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="max-w-4xl mx-auto px-4 md:px-8 py-20">
        <h2 className="font-serif text-3xl md:text-4xl text-center mb-16">
          Three steps to{' '}
          <span className="text-flame-500">clarity</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-10">
          {[
            {
              step: '1',
              title: 'Upload',
              desc: 'Export from your tracker or sportsbook. We handle Pikkit, Juice Reel, DraftKings, FanDuel — whatever you\'ve got.',
              delay: 'animate-slide-up-d1',
            },
            {
              step: '2',
              title: 'Analyze',
              desc: 'We scan every bet for patterns you can\'t see from inside your own head — the chasing, the sizing, the leaks.',
              delay: 'animate-slide-up-d3',
            },
            {
              step: '3',
              title: 'Improve',
              desc: 'Get a game plan with real numbers. Not \'bet smarter\' — actual rules like \'stop laying -150+ chalk on NFL, it\'s costing you $40/week.\'',
              delay: 'animate-slide-up-d5',
            },
          ].map((s) => (
            <div key={s.step} className={`text-center ${s.delay}`}>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-flame-500/10 text-flame-500 font-serif text-2xl font-bold mb-5 border border-flame-500/20">
                {s.step}
              </div>
              <h3 className="font-serif text-xl mb-3">{s.title}</h3>
              <p className="text-ink-600 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sample Report Preview ── */}
      <section id="sample" className="max-w-4xl mx-auto px-4 md:px-8 py-20">
        <h2 className="font-serif text-3xl md:text-4xl text-center mb-3">
          Sample <span className="text-flame-500">Autopsy</span>
        </h2>
        <p className="text-ink-600 text-center mb-12 max-w-lg mx-auto">
          Here&apos;s what a real report looks like. This user has 280 bets across
          NFL and NBA over 3 months.
        </p>

        {/* Summary card */}
        <div className="card p-6 md:p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-xs text-ink-600 uppercase tracking-wider">Full Autopsy</span>
              <h3 className="font-serif text-xl mt-1">Report Summary</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-ink-600 text-sm">Overall Grade</span>
              <span className="font-serif text-5xl font-bold text-orange-400">C-</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-ink-600 text-xs mb-0.5">Record</p>
              <p className="font-mono font-semibold text-lg">142-131-7</p>
            </div>
            <div>
              <p className="text-ink-600 text-xs mb-0.5">Net P&amp;L</p>
              <p className="font-mono font-semibold text-lg text-red-400">-$840</p>
            </div>
            <div>
              <p className="text-ink-600 text-xs mb-0.5">ROI</p>
              <p className="font-mono font-semibold text-lg text-red-400">-3.2%</p>
            </div>
            <div>
              <p className="text-ink-600 text-xs mb-0.5">Avg Stake</p>
              <p className="font-mono font-semibold text-lg">$94</p>
            </div>
            <div>
              <p className="text-ink-600 text-xs mb-0.5">Emotion Score</p>
              <p className="font-mono font-semibold text-lg text-orange-400">72/100</p>
            </div>
          </div>

          {/* Tilt bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-ink-600 mb-1.5">
              <span>Emotion Score</span>
              <span className="text-orange-400 font-mono">72/100</span>
            </div>
            <div className="w-full h-2.5 bg-ink-900 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full" style={{ width: '72%' }} />
            </div>
            <p className="text-ink-600 text-xs mt-1.5">
              Elevated — emotional betting patterns are costing you money.
            </p>
          </div>
        </div>

        {/* Bias cards */}
        <div className="space-y-4 mb-6">
          {/* Post-Loss Escalation — HIGH */}
          <div className="card p-5 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
              <h3 className="font-medium text-lg">Post-Loss Escalation</h3>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full border bg-orange-400/10 text-orange-400 border-orange-400/20 self-start">
                HIGH
              </span>
            </div>
            <p className="text-[#e7e6e1] text-sm mb-4">
              Your average stake jumps from $82 to $134 after a loss — a 63%
              increase. After losing streaks of 3+, you placed 11 bets over $200.
              Seven of those lost, compounding the damage. This is your most
              expensive behavioral pattern.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div className="bg-ink-900/50 rounded-lg p-3">
                <p className="text-ink-600 text-xs mb-1">Evidence</p>
                <p className="text-[#e7e6e1]">
                  Avg stake after loss: $134 vs $82 after win. 11 bets &gt;$200
                  following 3+ loss streaks (7 lost).
                </p>
              </div>
              <div className="bg-ink-900/50 rounded-lg p-3">
                <p className="text-ink-600 text-xs mb-1">Estimated Cost</p>
                <p className="text-red-400 font-mono font-medium">-$480</p>
              </div>
              <div className="bg-ink-900/50 rounded-lg p-3">
                <p className="text-ink-600 text-xs mb-1">How to Fix</p>
                <p className="text-[#e7e6e1]">
                  Set a hard rule: no bet can exceed 2x your average stake. If you
                  lose 3 in a row, stop betting for the day.
                </p>
              </div>
            </div>
          </div>

          {/* Heavy Parlay Tendency — MEDIUM */}
          <div className="card p-5 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
              <h3 className="font-medium text-lg">Heavy Parlay Tendency</h3>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full border bg-amber-400/10 text-amber-400 border-amber-400/20 self-start">
                MEDIUM
              </span>
            </div>
            <p className="text-[#e7e6e1] text-sm mb-4">
              34% of your bets are parlays (96 of 280), but they carry a combined
              ROI of -38.4%. Meanwhile, your straight bet ROI is +4.1%. Your
              parlays have a 14% win rate vs the 18% you&apos;d need to break even
              at your average parlay odds of +450.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div className="bg-ink-900/50 rounded-lg p-3">
                <p className="text-ink-600 text-xs mb-1">Evidence</p>
                <p className="text-[#e7e6e1]">
                  96 parlays at -38.4% ROI vs 184 straight bets at +4.1%.
                  14% parlay win rate, needed 18%.
                </p>
              </div>
              <div className="bg-ink-900/50 rounded-lg p-3">
                <p className="text-ink-600 text-xs mb-1">Estimated Cost</p>
                <p className="text-red-400 font-mono font-medium">-$620</p>
              </div>
              <div className="bg-ink-900/50 rounded-lg p-3">
                <p className="text-ink-600 text-xs mb-1">How to Fix</p>
                <p className="text-[#e7e6e1]">
                  Cap parlays at 10% of total bets. Limit to 2-3 legs max. Your
                  straight bets are profitable — lean into that.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Faded hint of more content */}
        <div className="relative">
          <div className="card p-5 opacity-40 blur-[1px]">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium">Favorite-Heavy Lean</span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full border bg-mint-500/10 text-mint-500 border-mint-500/20">LOW</span>
            </div>
            <p className="text-ink-600 text-sm">71% of moneyline bets are on favorites with a combined ROI of...</p>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Link href="/signup" className="btn-primary shadow-xl">
              Get Your Full Report — Free
            </Link>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="max-w-5xl mx-auto px-4 md:px-8 py-20">
        <h2 className="font-serif text-3xl md:text-4xl text-center mb-4">
          Simple <span className="text-flame-500">pricing</span>
        </h2>
        <p className="text-ink-600 text-center mb-14 max-w-md mx-auto">
          Start free. Upgrade when you want deeper analysis and unlimited reports.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Free */}
          <div className="card p-7 flex flex-col animate-slide-up-d1">
            <h3 className="font-serif text-2xl">Free</h3>
            <div className="mt-2 mb-5">
              <span className="font-mono text-4xl font-bold">$0</span>
            </div>
            <ul className="space-y-2.5 flex-1 mb-7">
              {['Unlimited bet uploads', '1 autopsy report (50 most recent bets)', 'Basic bias detection', 'Summary stats'].map((f) => (
                <li key={f} className="text-sm text-ink-600 flex items-start gap-2.5">
                  <span className="text-mint-500 mt-0.5 shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="btn-secondary text-center w-full">
              Start Free
            </Link>
          </div>

          {/* Pro */}
          <div className="card p-7 flex flex-col border-flame-500/50 shadow-lg shadow-flame-500/10 relative animate-slide-up-d3">
            <span className="text-xs font-medium text-flame-500 bg-flame-500/10 rounded-full px-3 py-1 self-start mb-4">
              Most Popular
            </span>
            <h3 className="font-serif text-2xl">Pro</h3>
            <div className="mt-2 mb-5">
              <span className="font-mono text-4xl font-bold">$19</span>
              <span className="text-ink-600 text-sm">/mo</span>
            </div>
            <ul className="space-y-2.5 flex-1 mb-7">
              {[
                'Unlimited bets',
                'Unlimited reports',
                'Full bias suite',
                'Strategic leak analysis',
                'Behavioral patterns',
                'Weekly reports',
                'PDF export',
              ].map((f) => (
                <li key={f} className="text-sm text-ink-600 flex items-start gap-2.5">
                  <span className="text-mint-500 mt-0.5 shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="btn-primary text-center w-full">
              Get Pro
            </Link>
          </div>

          {/* Sharp */}
          <div className="card p-7 flex flex-col animate-slide-up-d5">
            <h3 className="font-serif text-2xl">Sharp</h3>
            <div className="mt-2 mb-5">
              <span className="font-mono text-4xl font-bold">$39</span>
              <span className="text-ink-600 text-sm">/mo</span>
            </div>
            <ul className="space-y-2.5 flex-1 mb-7">
              {[
                'Everything in Pro',
                'Real-time bet annotation',
                'Custom emotional pattern alerts',
                'API access',
              ].map((f) => (
                <li key={f} className="text-sm text-ink-600 flex items-start gap-2.5">
                  <span className="text-mint-500 mt-0.5 shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="btn-secondary text-center w-full">
              Get Sharp
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-ink-700/30">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <span className="font-serif text-lg">
                Bet<span className="text-flame-500">Autopsy</span>
              </span>
              <p className="text-ink-700 text-xs mt-2 max-w-sm">
                AI-powered behavioral analysis for sports bettors.
                Understand your patterns. Improve your process.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm">
              <a href="#pricing" className="text-ink-600 hover:text-[#e7e6e1] transition-colors">Pricing</a>
              <Link href="/login" className="text-ink-600 hover:text-[#e7e6e1] transition-colors">Log in</Link>
              <Link href="/signup" className="text-ink-600 hover:text-[#e7e6e1] transition-colors">Sign up</Link>
              <span className="text-ink-700 cursor-default">Privacy</span>
              <span className="text-ink-700 cursor-default">Terms</span>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-ink-700/20">
            <p className="text-ink-700 text-xs text-center">
              BetAutopsy provides behavioral analysis and educational insights — not
              gambling or financial advice. Past results don&apos;t guarantee future outcomes.
              21+. If you or someone you know has a gambling problem, call 1-800-GAMBLER.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

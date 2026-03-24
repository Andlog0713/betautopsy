import Link from 'next/link';
import NavBar from '@/components/NavBar';

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* ── Fixed Nav ── */}
      <NavBar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Subtle radial gradient behind hero */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-flame-500/[0.04] rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-36 pb-28 text-center relative">
          <h1 className="font-extrabold text-5xl md:text-7xl leading-[1.08] tracking-tight mb-6 animate-fade-in">
            Your bets,{' '}
            <span className="text-flame-500">dissected.</span>
          </h1>
          <p className="text-ink-600 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-d2">
            Upload your bet history. Find out which habits are costing you, which
            plays are actually sharp, and what to do about it.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up-d3">
            <Link href="/signup" className="btn-primary text-lg !px-8 !py-3.5 shadow-lg shadow-flame-500/20">
              Upload Your Bets — It&apos;s Free
            </Link>
          </div>
          <p className="text-ink-700 text-xs mt-6 animate-fade-in-d5">
            No credit card required · Works with Pikkit and any CSV export
          </p>
        </div>
      </section>

      {/* ── Problem / Solution ── */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Left: the problem */}
          <div className="card p-8 md:p-10">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-700 mb-4 block">
              The problem
            </span>
            <h2 className="font-bold text-2xl md:text-3xl leading-snug mb-4">
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
              <p className="text-[#F0F0F0]">
                The numbers show you what happened. They don&apos;t show you what
                you&apos;re doing to yourself.
              </p>
            </div>
          </div>

          {/* Right: the solution */}
          <div className="card p-8 md:p-10 border-flame-500/20 bg-flame-500/[0.02]">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-flame-500 mb-4 block">
              The solution
            </span>
            <h2 className="font-bold text-2xl md:text-3xl leading-snug mb-4">
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
              <p className="text-[#F0F0F0] font-medium">
                Upload your bets. Get your autopsy in 20 seconds. See what you&apos;ve
                been missing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="max-w-4xl mx-auto px-4 md:px-8 py-20">
        <h2 className="font-bold text-3xl md:text-4xl text-center tracking-tight mb-16">
          Three steps to{' '}
          <span className="text-flame-500">clarity</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-10">
          {[
            {
              step: '1',
              title: 'Upload',
              desc: 'Export from your tracker or sportsbook. We handle Pikkit, DraftKings, FanDuel — whatever you\'ve got.',
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
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-flame-500/10 text-flame-500 font-bold text-xl mb-5 border border-flame-500/20">
                {s.step}
              </div>
              <h3 className="font-bold text-xl mb-3">{s.title}</h3>
              <p className="text-ink-600 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sample Report Preview ── */}
      <section id="sample" className="max-w-4xl mx-auto px-4 md:px-8 py-20">
        <h2 className="font-bold text-3xl md:text-4xl text-center tracking-tight mb-3">
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
              <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-700">Full Autopsy</span>
              <h3 className="font-bold text-xl mt-1">Report Summary</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-ink-600 text-sm">Overall Grade</span>
              <span className="font-extrabold text-5xl text-orange-400">C-</span>
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
            <p className="text-ink-700 text-xs mt-1.5">
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
            <p className="text-[#F0F0F0] text-sm mb-4 leading-relaxed">
              Your average stake jumps from $82 to $134 after a loss — a 63%
              increase. After losing streaks of 3+, you placed 11 bets over $200.
              Seven of those lost, compounding the damage. This is your most
              expensive behavioral pattern.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div className="bg-ink-900/50 rounded-lg p-3">
                <p className="text-ink-700 text-[11px] font-medium uppercase tracking-wider mb-1">Evidence</p>
                <p className="text-ink-500 text-[13px]">
                  Avg stake after loss: $134 vs $82 after win. 11 bets &gt;$200
                  following 3+ loss streaks (7 lost).
                </p>
              </div>
              <div className="bg-ink-900/50 rounded-lg p-3">
                <p className="text-ink-700 text-[11px] font-medium uppercase tracking-wider mb-1">Estimated Cost</p>
                <p className="text-red-400 font-mono font-medium">-$480</p>
              </div>
              <div className="bg-ink-900/50 rounded-lg p-3">
                <p className="text-ink-700 text-[11px] font-medium uppercase tracking-wider mb-1">How to Fix</p>
                <p className="text-ink-500 text-[13px]">
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
            <p className="text-[#F0F0F0] text-sm mb-4 leading-relaxed">
              34% of your bets are parlays (96 of 280), but they carry a combined
              ROI of -38.4%. Meanwhile, your straight bet ROI is +4.1%. Your
              parlays have a 14% win rate vs the 18% you&apos;d need to break even
              at your average parlay odds of +450.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div className="bg-ink-900/50 rounded-lg p-3">
                <p className="text-ink-700 text-[11px] font-medium uppercase tracking-wider mb-1">Evidence</p>
                <p className="text-ink-500 text-[13px]">
                  96 parlays at -38.4% ROI vs 184 straight bets at +4.1%.
                  14% parlay win rate, needed 18%.
                </p>
              </div>
              <div className="bg-ink-900/50 rounded-lg p-3">
                <p className="text-ink-700 text-[11px] font-medium uppercase tracking-wider mb-1">Estimated Cost</p>
                <p className="text-red-400 font-mono font-medium">-$620</p>
              </div>
              <div className="bg-ink-900/50 rounded-lg p-3">
                <p className="text-ink-700 text-[11px] font-medium uppercase tracking-wider mb-1">How to Fix</p>
                <p className="text-ink-500 text-[13px]">
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
            <Link href="/signup" className="btn-primary shadow-xl shadow-flame-500/20">
              Get Your Full Report — Free
            </Link>
          </div>
        </div>
      </section>

      {/* ── Track Your Progress ── */}
      <section className="max-w-5xl mx-auto px-4 md:px-8 py-20">
        <h2 className="font-bold text-3xl md:text-4xl text-center tracking-tight mb-4">
          One report is a <span className="text-ink-600">snapshot</span>.
          <br />
          Five reports is <span className="text-flame-500">proof</span>.
        </h2>
        <p className="text-ink-600 text-center mb-14 max-w-lg mx-auto">
          BetAutopsy gets sharper the more you use it. Every autopsy tracks your
          progress — so you can see if you&apos;re actually getting better or just
          telling yourself you are.
        </p>

        {/* Mock progress dashboard */}
        <div className="card p-6 md:p-8 mb-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Emotion Score dropping */}
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-ink-700 mb-4">Emotion Score Over Time</h3>
              <div className="space-y-3">
                {[
                  { label: 'Report 1', score: 72, date: 'Week 1' },
                  { label: 'Report 2', score: 58, date: 'Week 2' },
                  { label: 'Report 3', score: 47, date: 'Week 4' },
                  { label: 'Report 4', score: 41, date: 'Week 6' },
                ].map((r) => (
                  <div key={r.label} className="flex items-center gap-3">
                    <span className="text-xs text-ink-600 w-16 shrink-0">{r.date}</span>
                    <div className="flex-1 h-3 bg-ink-900 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${r.score}%`,
                          background: r.score <= 45 ? '#00C853' : r.score <= 60 ? '#fbbf24' : '#f97316',
                        }}
                      />
                    </div>
                    <span className={`font-mono text-sm w-8 text-right ${r.score <= 45 ? 'text-mint-500' : r.score <= 60 ? 'text-amber-400' : 'text-orange-400'}`}>
                      {r.score}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-mint-500 text-xs mt-3 font-mono">↓ 31 points in 6 weeks</p>
            </div>

            {/* Right: Key metrics improving */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-ink-700 mb-2">Your Numbers Over Time</h3>
              {[
                { label: 'Discipline Score', from: '34', to: '67', color: 'text-mint-500', arrow: '↑' },
                { label: 'Loss Chase Ratio', from: '1.8x', to: '1.1x', color: 'text-mint-500', arrow: '↓' },
                { label: 'Parlay %', from: '42%', to: '18%', color: 'text-mint-500', arrow: '↓' },
                { label: 'ROI', from: '-8.2%', to: '-1.4%', color: 'text-mint-500', arrow: '↑' },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between py-1">
                  <span className="text-sm text-ink-600">{m.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-ink-700">{m.from}</span>
                    <span className={`${m.color}`}>{m.arrow}</span>
                    <span className={`font-mono text-sm font-medium ${m.color}`}>{m.to}</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                <span className="text-lg">🔥</span>
                <span className="text-sm text-[#F0F0F0]">4-report streak</span>
                <span className="text-xs text-ink-600">(Best: 4)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Social proof stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <div className="text-center">
            <p className="font-mono text-2xl font-bold text-flame-500">7 days</p>
            <p className="text-ink-700 text-xs mt-1">Average time to second autopsy</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-2xl font-bold text-mint-500">-18 pts</p>
            <p className="text-ink-700 text-xs mt-1">Average emotion score drop after 3 reports</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-2xl font-bold text-[#F0F0F0]">5 min</p>
            <p className="text-ink-700 text-xs mt-1">Upload, run, review — that&apos;s it</p>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="max-w-5xl mx-auto px-4 md:px-8 py-20">
        <h2 className="font-bold text-3xl md:text-4xl text-center tracking-tight mb-4">
          Simple <span className="text-flame-500">pricing</span>
        </h2>
        <p className="text-ink-600 text-center mb-14 max-w-md mx-auto">
          Start free. Upgrade when you want to track your progress and go deeper.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Free */}
          <div className="card p-7 flex flex-col animate-slide-up-d1">
            <h3 className="font-bold text-2xl">Free</h3>
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
          <div className="card p-7 flex flex-col border-flame-500/30 shadow-lg shadow-flame-500/[0.08] relative animate-slide-up-d3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-flame-500 bg-flame-500/10 rounded-full px-3 py-1 self-start mb-4">
              Most Popular
            </span>
            <h3 className="font-bold text-2xl">Pro</h3>
            <div className="mt-2 mb-5">
              <span className="font-mono text-4xl font-bold">$11</span>
              <span className="text-ink-600 text-sm">/mo</span>
            </div>
            <ul className="space-y-2.5 flex-1 mb-7">
              {[
                'Unlimited bets & reports',
                'Progress tracking over time',
                'Emotion Score + Discipline Score',
                'Full bias & leak analysis',
                'Personal rules & action plans',
                'Bet DNA archetype',
                'Shareable report cards',
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
            <h3 className="font-bold text-2xl">Sharp</h3>
            <div className="mt-2 mb-5">
              <span className="font-mono text-4xl font-bold">$22</span>
              <span className="text-ink-600 text-sm">/mo</span>
            </div>
            <ul className="space-y-2.5 flex-1 mb-7">
              {[
                'Everything in Pro',
                'Leak Prioritizer — ranked by $ impact',
                'Full What-If Simulator',
                'Early access to new features',
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

      {/* ── Final CTA ── */}
      <section className="max-w-3xl mx-auto px-4 md:px-8 py-20 text-center">
        <h2 className="font-bold text-3xl md:text-4xl tracking-tight mb-4">
          Stop guessing. Start <span className="text-flame-500">knowing.</span>
        </h2>
        <p className="text-ink-600 mb-8 max-w-lg mx-auto">
          Your next bet is coming. Know what your patterns say before you place it.
        </p>
        <Link href="/signup" className="btn-primary text-lg !px-10 !py-3.5 shadow-lg shadow-flame-500/20">
          Get Your Free Autopsy
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <span className="font-bold text-lg tracking-tight">
                Bet<span className="text-flame-500">Autopsy</span>
              </span>
              <p className="text-ink-700 text-xs mt-2 max-w-sm">
                AI-powered sports betting behavioral analysis.
                Understand your patterns. Improve your process.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm">
              <a href="#pricing" className="text-ink-600 hover:text-[#F0F0F0] transition-colors">Pricing</a>
              <Link href="/login" className="text-ink-600 hover:text-[#F0F0F0] transition-colors">Log in</Link>
              <Link href="/signup" className="text-ink-600 hover:text-[#F0F0F0] transition-colors">Sign up</Link>
              <Link href="/how-to-upload" className="text-ink-600 hover:text-[#F0F0F0] transition-colors">How to Upload</Link>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/[0.06] space-y-3">
            <div className="flex justify-center gap-4">
              <Link href="/privacy" className="text-ink-700 text-xs hover:text-ink-500 transition-colors">
                Privacy Policy
              </Link>
            </div>
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

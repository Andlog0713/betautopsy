import Link from 'next/link';
import NavBar from '@/components/NavBar';
import DemoReportWrapper from '@/components/DemoReportWrapper';

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
            plays are actually winning, and what to do about it.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up-d3">
            <Link href="/signup" className="btn-primary text-lg !px-8 !py-3.5 shadow-lg shadow-flame-500/20">
              Upload Your Bets — It&apos;s Free
            </Link>
          </div>
          <Link
            href="/how-to-upload"
            className="inline-block text-sm text-flame-500 hover:text-flame-400 transition-colors mt-6 animate-fade-in-d5"
          >
            Not sure how to get your data? We&apos;ll walk you through it →
          </Link>
          <p className="text-ink-700 text-xs mt-3 animate-fade-in-d5">
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
              desc: 'Get a game plan with real numbers. Not \'bet smarter\' — actual rules like \'stop betting heavy favorites on NFL, it\'s costing you $40/week.\'',
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

      {/* ── Interactive Demo Report ── */}
      <section id="sample" className="max-w-4xl mx-auto px-4 md:px-8 py-20">
        <h2 className="font-bold text-3xl md:text-4xl text-center tracking-tight mb-3">
          See a real <span className="text-flame-500">autopsy report</span>
        </h2>
        <p className="text-ink-600 text-center mb-10 max-w-lg mx-auto">
          280 bets. NFL &amp; NBA. 3 months. This bettor thought they were doing fine.
          Scroll through their full report — then get yours.
        </p>
        <DemoReportWrapper />
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
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-ink-700 mb-1">Emotion Score Over Time</h3>
              <p className="text-ink-700 text-xs mb-4">Measures how much emotions drive your bets. Lower is better — under 40 means strong discipline.</p>
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
                { label: 'Discipline Score', hint: 'How consistently you follow your own rules', from: '34', to: '67', color: 'text-mint-500', arrow: '↑' },
                { label: 'Loss Chase Ratio', hint: 'How much bigger your bets get after a loss (1.0x = no change)', from: '1.8x', to: '1.1x', color: 'text-mint-500', arrow: '↓' },
                { label: 'Parlay %', hint: 'Portion of bets that are multi-leg combos', from: '42%', to: '18%', color: 'text-mint-500', arrow: '↓' },
                { label: 'ROI', hint: 'Return on investment — profit as % of total wagered', from: '-8.2%', to: '-1.4%', color: 'text-mint-500', arrow: '↑' },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between py-1 group relative">
                  <span className="text-sm text-ink-600">{m.label} <span className="text-ink-700 text-xs">({m.hint})</span></span>
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
              {['1 autopsy report (50 most recent bets)', 'Basic bias detection', 'Summary stats'].map((f) => (
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
              <span className="text-4xl font-bold tracking-tight">$9.99</span>
              <span className="text-ink-600 text-sm">/mo</span>
              <p className="text-ink-700 text-xs mt-1">Less than one bad parlay</p>
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
              <span className="text-4xl font-bold tracking-tight">$24.99</span>
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

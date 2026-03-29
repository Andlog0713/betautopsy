import Link from 'next/link';
import NavBar from '@/components/NavBar';
import DemoReportWrapper from '@/components/DemoReportWrapper';
import { Logo } from '@/components/logo';

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <NavBar />

      {/* ── Hero — grid-paper background ── */}
      <section className="relative grid-paper">
        <div className="max-w-5xl mx-auto px-6 pt-28 pb-24 relative">
          <div className="flex items-center gap-3 mb-8 animate-fade-in">
            <span className="evidence-tag border-scalpel/30 text-scalpel">Behavioral Analysis</span>
            <span className="evidence-tag border-bleed/30 text-bleed">AI-Powered</span>
          </div>
          <h1 className="font-bold text-4xl md:text-6xl leading-[1.1] tracking-tight mb-6 text-fg-bright animate-fade-in">
            Your bets aren&apos;t the problem.{' '}
            <span className="text-scalpel">Your behavior is.</span>
          </h1>
          <p className="text-fg-muted text-base md:text-lg max-w-2xl mb-4 leading-relaxed animate-fade-in-d1">
            Upload your betting, pick&apos;em, or prediction market history and get an AI-powered behavioral analysis — loss chasing detection,
            emotional betting patterns, cognitive bias identification, and a personalized plan to fix
            what&apos;s costing you money.
          </p>
          <p className="font-mono text-[11px] text-fg-dim tracking-wider mb-8 animate-fade-in-d2">
            NOT A BET TRACKER. NOT A PICKS SERVICE. A SPORTS PSYCHOLOGIST FOR YOUR BETTING DATA.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 animate-slide-up-d2">
            <Link href="/signup" className="btn-primary text-base !px-8 !py-3">
              Upload Your Bets — It&apos;s Free
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mt-6 animate-fade-in-d3">
            <Link
              href="/how-to-upload"
              className="font-mono text-[11px] text-scalpel hover:text-scalpel/80 transition-colors tracking-wider"
            >
              NOT SURE HOW TO GET YOUR DATA? →
            </Link>
            <span className="font-mono text-[10px] text-fg-dim tracking-wider">
              NO CREDIT CARD · WORKS WITH PIKKIT + ANY CSV
            </span>
          </div>
        </div>
      </section>

      {/* ── Problem / Solution — split panel ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-px bg-white/[0.04]">
          {/* Left: the problem */}
          <div className="bg-base p-8 md:p-10">
            <span className="case-header block mb-6">The Problem</span>
            <h2 className="font-bold text-2xl md:text-3xl leading-snug mb-5 text-fg-bright">
              You know <span className="text-fg-muted">what</span> happened.
              <br />
              You don&apos;t know <span className="text-scalpel">why.</span>
            </h2>
            <div className="text-fg-muted space-y-4 text-sm leading-relaxed">
              <p>
                You know your record. You know your P&amp;L. You&apos;ve got spreadsheets,
                trackers, dashboards.
              </p>
              <p>
                But none of that explains why you doubled your stake after three straight
                losses last Sunday. Or why you keep firing on NBA player props when
                you&apos;ve never been profitable on them. Or why your $50 &quot;fun parlay&quot;
                turned into a $400 chase by the end of the night. Or why you keep stacking
                5-pick entries when your 2-picks hit at twice the rate.
              </p>
              <p className="text-fg-bright">
                The numbers show you what happened. They don&apos;t show you what
                you&apos;re doing to yourself.
              </p>
            </div>
          </div>

          {/* Right: the solution */}
          <div className="bg-base p-8 md:p-10 border-l border-scalpel/10">
            <span className="case-header block mb-6 text-scalpel">The Solution</span>
            <h2 className="font-bold text-2xl md:text-3xl leading-snug mb-5 text-fg-bright">
              BetAutopsy reads your history like a{' '}
              <span className="text-scalpel">case file.</span>
            </h2>
            <div className="text-fg-muted space-y-4 text-sm leading-relaxed">
              <p>
                We find the patterns you can&apos;t see from inside your own head —
                the emotional triggers, the unconscious habits, the leaks that are
                quietly draining your bankroll while you focus on your next bet.
              </p>
              <p>
                Then we hand you a plan: specific rules, dollar amounts, and progress
                tracking so you can actually prove to yourself you&apos;re getting sharper.
              </p>
              <p className="text-fg-bright font-medium">
                Upload your bets, pick&apos;em entries, or prediction market trades. Get your autopsy in 20 seconds. See what you&apos;ve
                been missing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works — horizontal steps strip ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <span className="case-header block text-center mb-10">Procedure</span>
        <div className="vitals-strip grid-cols-3">
          {[
            {
              step: '01',
              title: 'Upload',
              desc: 'Export from Pikkit — it syncs your sportsbooks, DFS apps (PrizePicks, Underdog, Sleeper), and prediction markets (Kalshi) into one place. Or upload any CSV.',
            },
            {
              step: '02',
              title: 'Analyze',
              desc: 'AI scans your history for cognitive biases, emotional patterns, and strategic leaks — then generates an Emotion Score, Bet DNA archetype, and Discipline Score.',
            },
            {
              step: '03',
              title: 'Improve',
              desc: 'Get a game plan with real numbers. Not \'bet smarter\' — actual rules like \'stop betting heavy favorites on NFL, it\'s costing you $40/week.\'',
            },
          ].map((s) => (
            <div key={s.step} className="vitals-cell p-6 md:p-8">
              <span className="font-mono text-3xl font-bold text-scalpel/30 block mb-3">{s.step}</span>
              <h3 className="font-bold text-lg text-fg-bright mb-2">{s.title}</h3>
              <p className="text-fg-muted text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Quiz CTA — finding card ── */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <div className="finding-card border-l-scalpel p-8">
          <span className="case-header block mb-4">Quick Assessment</span>
          <h3 className="font-bold text-2xl text-fg-bright mb-2">What&apos;s your Bet DNA?</h3>
          <p className="text-fg-muted text-sm mb-5 max-w-md">
            Take the free 2-minute quiz to discover your betting personality type — the
            cognitive biases and emotional patterns that shape every bet you place. No signup. No data needed.
          </p>
          <Link href="/quiz" className="btn-secondary inline-block font-mono text-sm">
            Take the Quiz
          </Link>
        </div>
      </section>

      {/* ── Interactive Demo Report — browser frame ── */}
      <section id="sample" className="max-w-4xl mx-auto px-6 py-20">
        <span className="case-header block text-center mb-3">Exhibit A</span>
        <h2 className="font-bold text-3xl md:text-4xl text-center tracking-tight mb-3 text-fg-bright">
          See a real <span className="text-scalpel">autopsy report</span>
        </h2>
        <p className="text-fg-muted text-center mb-10 max-w-lg mx-auto text-sm">
          280 bets. NFL &amp; NBA. 3 months. We found 3 cognitive biases, a loss-chasing habit costing $480/quarter, and a parlay addiction erasing their entire edge.
        </p>
        {/* Browser frame */}
        <div className="border border-white/[0.04] rounded-sm overflow-hidden">
          <div className="h-8 bg-surface-raised border-b border-white/[0.04] flex items-center px-4 gap-2">
            <span className="w-2 h-2 rounded-full bg-bleed/40" />
            <span className="w-2 h-2 rounded-full bg-caution/40" />
            <span className="w-2 h-2 rounded-full bg-win/40" />
            <span className="font-mono text-[9px] text-fg-dim ml-3">betautopsy.com/reports</span>
          </div>
          <DemoReportWrapper />
        </div>
      </section>

      {/* ── Track Progress — vitals display ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <span className="case-header block text-center mb-3">Longitudinal Study</span>
        <h2 className="font-bold text-3xl md:text-4xl text-center tracking-tight mb-4 text-fg-bright">
          One report is a <span className="text-fg-muted">snapshot</span>.
          <br />
          Five reports is <span className="text-scalpel">proof</span>.
        </h2>
        <p className="text-fg-muted text-center mb-14 max-w-lg mx-auto text-sm">
          Watch your loss-chasing habit shrink. See your emotional betting patterns fade.
          Track the behavioral changes that actually save you money.
        </p>

        <div className="case-card p-6 md:p-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Emotion Score dropping */}
            <div>
              <span className="case-header block mb-1">Emotion Score Over Time</span>
              <p className="text-fg-dim text-xs mb-4 font-mono">Lower = stronger discipline. Under 40 = controlled.</p>
              <div className="space-y-3">
                {[
                  { label: 'Report 1', score: 72, date: 'Week 1' },
                  { label: 'Report 2', score: 58, date: 'Week 2' },
                  { label: 'Report 3', score: 47, date: 'Week 4' },
                  { label: 'Report 4', score: 41, date: 'Week 6' },
                ].map((r) => (
                  <div key={r.label} className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-fg-dim w-14 shrink-0">{r.date}</span>
                    <div className="flex-1 h-2 bg-surface-raised overflow-hidden rounded-sm">
                      <div
                        className="h-full transition-all rounded-sm"
                        style={{
                          width: `${r.score}%`,
                          background: r.score <= 45 ? '#00C9A7' : r.score <= 60 ? '#D29922' : '#E8453C',
                        }}
                      />
                    </div>
                    <span className={`font-mono text-sm w-8 text-right ${r.score <= 45 ? 'text-scalpel' : r.score <= 60 ? 'text-caution' : 'text-bleed'}`}>
                      {r.score}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-scalpel text-xs mt-3 font-mono">↓ 31 points in 6 weeks</p>
            </div>

            {/* Right: Key metrics improving */}
            <div className="space-y-4">
              <span className="case-header block mb-2">Vital Signs</span>
              {[
                { label: 'Discipline Score', hint: 'Rule adherence', from: '34', to: '67', arrow: '↑' },
                { label: 'Loss Chase Ratio', hint: 'Post-loss sizing (1.0x = none)', from: '1.8x', to: '1.1x', arrow: '↓' },
                { label: 'Parlay %', hint: 'Multi-leg combos', from: '42%', to: '18%', arrow: '↓' },
                { label: 'ROI', hint: 'Return on wagered', from: '-8.2%', to: '-1.4%', arrow: '↑' },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between py-1">
                  <span className="text-sm text-fg-muted">{m.label} <span className="text-fg-dim text-xs font-mono">({m.hint})</span></span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-fg-dim">{m.from}</span>
                    <span className="text-scalpel">{m.arrow}</span>
                    <span className="font-mono text-sm font-medium text-scalpel">{m.to}</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
                <span className="text-lg">🔥</span>
                <span className="text-sm text-fg-bright">4-report streak</span>
                <span className="font-mono text-[10px] text-fg-dim">(Best: 4)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing — vitals strip ── */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 py-20">
        <span className="case-header block text-center mb-3">Fee Schedule</span>
        <h2 className="font-bold text-3xl md:text-4xl text-center tracking-tight mb-4 text-fg-bright">
          Simple <span className="text-scalpel">pricing</span>
        </h2>
        <p className="text-fg-muted text-center mb-14 max-w-md mx-auto text-sm">
          Try it free with your latest 50 bets. Upgrade for unlimited bets, deeper analysis, progress tracking, and more.
        </p>
        <div className="grid md:grid-cols-3 gap-px bg-white/[0.04] border border-white/[0.04] rounded-sm overflow-hidden">
          {/* Free */}
          <div className="bg-base p-7 flex flex-col">
            <span className="case-header block mb-4">Free</span>
            <div className="mb-5">
              <span className="font-mono text-4xl font-bold text-fg-bright">$0</span>
            </div>
            <ul className="space-y-2.5 flex-1 mb-7">
              {['1 autopsy report (50 most recent bets)', 'Basic bias detection', 'Summary stats'].map((f) => (
                <li key={f} className="text-sm text-fg-muted flex items-start gap-2.5">
                  <span className="text-scalpel mt-0.5 shrink-0 font-mono text-xs">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="btn-secondary text-center w-full font-mono text-sm">
              Start Free
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-base p-7 flex flex-col relative border-x border-scalpel/10">
            <div className="flex items-center gap-3 mb-4">
              <span className="case-header">Pro</span>
              <span className="evidence-tag border-scalpel/30 text-scalpel">Most Popular</span>
            </div>
            <div className="mb-5">
              <span className="font-mono text-4xl font-bold text-fg-bright">$9.99</span>
              <span className="text-fg-dim text-sm font-mono">/mo</span>
              <p className="font-mono text-[10px] text-fg-dim mt-1">LESS THAN ONE BAD PARLAY</p>
            </div>
            <ul className="space-y-2.5 flex-1 mb-7">
              {[
                'Unlimited bets & reports',
                'Full cognitive bias detection — loss chasing, favorite bias, parlay addiction, and more',
                'Strategic leak analysis — ROI by sport, bet type, odds range, and time of day',
                'Behavioral pattern identification — heated sequences, emotional sizing',
                'Emotion Score + Discipline Score + Bet DNA archetype',
                'Personal rules & action plans',
                'Progress tracking over time',
              ].map((f) => (
                <li key={f} className="text-sm text-fg-muted flex items-start gap-2.5">
                  <span className="text-scalpel mt-0.5 shrink-0 font-mono text-xs">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="btn-primary text-center w-full font-mono text-sm">
              Get Pro
            </Link>
          </div>

          {/* Sharp */}
          <div className="bg-base p-7 flex flex-col">
            <span className="case-header block mb-4">Sharp</span>
            <div className="mb-5">
              <span className="font-mono text-4xl font-bold text-fg-bright">$24.99</span>
              <span className="text-fg-dim text-sm font-mono">/mo</span>
            </div>
            <ul className="space-y-2.5 flex-1 mb-7">
              {[
                'Everything in Pro',
                'Leak Prioritizer — ranked by $ impact',
                'Full What-If Simulator',
                'Early access to new features',
              ].map((f) => (
                <li key={f} className="text-sm text-fg-muted flex items-start gap-2.5">
                  <span className="text-scalpel mt-0.5 shrink-0 font-mono text-xs">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="btn-secondary text-center w-full font-mono text-sm">
              Get Sharp
            </Link>
          </div>
        </div>
        <p className="text-fg-dim text-xs text-center mt-6 font-mono">
          Have questions? <Link href="/faq" className="text-scalpel hover:underline">Check our FAQ</Link>
        </p>
      </section>

      {/* ── Final CTA ── */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="font-bold text-3xl md:text-4xl tracking-tight mb-4 text-fg-bright">
          Stop betting on autopilot. Start <span className="text-scalpel">understanding your behavior.</span>
        </h2>
        <p className="text-fg-muted mb-8 max-w-lg mx-auto text-sm">
          Your next bet is coming. Know what your patterns say before you place it.
        </p>
        <Link href="/signup" className="btn-primary text-base !px-10 !py-3">
          Get Your Free Autopsy
        </Link>
      </section>

      {/* ── Footer — minimal ── */}
      <footer className="border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <Logo size="xs" variant="horizontal" theme="dark" />
              <p className="font-mono text-[10px] text-fg-dim mt-2 max-w-sm tracking-wider">
                AI-POWERED BEHAVIORAL ANALYSIS FOR SPORTS BETTORS, DFS PLAYERS, AND PREDICTION MARKET TRADERS.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              {[
                { href: '/#pricing', label: 'Pricing', external: true },
                { href: '/login', label: 'Log in' },
                { href: '/signup', label: 'Sign up' },
                { href: '/how-to-upload', label: 'How to Upload' },
                { href: '/blog', label: 'Blog' },
                { href: '/quiz', label: 'Quiz' },
                { href: '/faq', label: 'FAQ' },
              ].map((link) => (
                'external' in link ? (
                  <a key={link.href} href={link.href} className="font-mono text-[11px] text-fg-dim hover:text-fg transition-colors tracking-wider">
                    {link.label}
                  </a>
                ) : (
                  <Link key={link.href} href={link.href} className="font-mono text-[11px] text-fg-dim hover:text-fg transition-colors tracking-wider">
                    {link.label}
                  </Link>
                )
              ))}
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/[0.04] space-y-3">
            <div className="flex justify-center">
              <Link href="/privacy" className="font-mono text-[10px] text-fg-dim hover:text-fg transition-colors tracking-wider">
                Privacy Policy
              </Link>
            </div>
            <p className="font-mono text-[9px] text-fg-dim text-center tracking-wider leading-relaxed max-w-2xl mx-auto">
              BETAUTOPSY PROVIDES BEHAVIORAL ANALYSIS AND EDUCATIONAL INSIGHTS — NOT
              GAMBLING OR FINANCIAL ADVICE. PAST RESULTS DON&apos;T GUARANTEE FUTURE OUTCOMES.
              21+. IF YOU OR SOMEONE YOU KNOW HAS A GAMBLING PROBLEM, CALL 1-800-GAMBLER.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

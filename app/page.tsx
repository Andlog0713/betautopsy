import Link from 'next/link';
import NavBar from '@/components/NavBar';
import DemoReportWrapper from '@/components/DemoReportWrapper';
import { Logo } from '@/components/logo';

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <NavBar />

      {/* ══════════════════════════════════════ */}
      {/* HERO — grid-paper bg                  */}
      {/* ══════════════════════════════════════ */}
      <section className="relative grid-paper">
        <div className="max-w-5xl mx-auto px-6 pt-10 pb-8 relative">
          <div className="case-header mb-8 animate-fade-in">
            CASE FILE — BEHAVIORAL ANALYSIS UNIT
          </div>
          <h1 className="font-bold text-4xl md:text-6xl leading-[1.08] tracking-tight text-fg-bright mb-2 animate-fade-in">
            Your bets aren&apos;t the problem.
          </h1>
          <div className="font-light text-4xl md:text-6xl leading-[1.08] tracking-tight text-scalpel mb-8 animate-fade-in-d1">
            Your behavior is.
          </div>
          <p className="text-fg-muted text-base md:text-lg max-w-2xl mb-4 leading-relaxed animate-fade-in-d2">
            Find out exactly which habits are costing you money — and how much. BetAutopsy
            detects loss chasing, parlay addiction, emotional sizing, sport-specific leaks,
            and much more. Then gives you a concrete plan to fix them with real dollar amounts.
          </p>
          <p className="text-fg-muted text-sm max-w-2xl mb-8 leading-relaxed animate-fade-in-d2">
            Powered by proprietary scoring models — your analysis gets more accurate every time
            you upload, benchmarked against thousands of real bettors.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 animate-slide-up-d2">
            <Link href="/signup" className="btn-primary text-base !px-8 !py-3">
              Upload Your Bets — It&apos;s Free
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mt-6 animate-fade-in-d3">
            <Link href="/how-to-upload" className="font-mono text-[11px] text-scalpel hover:text-scalpel/80 transition-colors tracking-wider">
              NOT SURE HOW TO GET YOUR DATA? →
            </Link>
            <span className="font-mono text-[10px] text-fg-dim tracking-wider">
              NO CREDIT CARD · WORKS WITH PIKKIT + ANY CSV
            </span>
          </div>
          {/* EKG heartbeat line */}
          <div className="mt-8 animate-fade-in-d4 relative h-10 overflow-hidden">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 60" preserveAspectRatio="none">
              <defs>
                <linearGradient id="ekg-full" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stopColor="#00C9A7" stopOpacity="0"/><stop offset="0.06" stopColor="#00C9A7" stopOpacity="0.35"/><stop offset="0.5" stopColor="#00C9A7" stopOpacity="0.35"/><stop offset="0.94" stopColor="#00C9A7" stopOpacity="0.35"/><stop offset="1" stopColor="#00C9A7" stopOpacity="0"/>
                </linearGradient>
                <linearGradient id="ekg-glow" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stopColor="#00C9A7" stopOpacity="0"/><stop offset="0.06" stopColor="#00C9A7" stopOpacity="0.12"/><stop offset="0.5" stopColor="#00C9A7" stopOpacity="0.12"/><stop offset="0.94" stopColor="#00C9A7" stopOpacity="0.12"/><stop offset="1" stopColor="#00C9A7" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <polyline points="0,30 60,30 80,30 95,28 105,30 130,30 160,30 178,30 186,22 192,30 198,12 204,48 210,4 216,56 222,18 228,42 234,30 250,30 270,28 280,30 320,30 400,30 420,30 435,28 445,30 470,30 500,30 518,30 526,22 532,30 538,12 544,48 550,4 556,56 562,18 568,42 574,30 590,30 610,28 620,30 660,30 740,30 760,30 775,28 785,30 810,30 840,30 858,30 866,22 872,30 878,12 884,48 890,4 896,56 902,18 908,42 914,30 930,30 950,28 960,30 1000,30 1080,30 1100,30 1115,28 1125,30 1200,30" fill="none" stroke="url(#ekg-glow)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="0,30 60,30 80,30 95,28 105,30 130,30 160,30 178,30 186,22 192,30 198,12 204,48 210,4 216,56 222,18 228,42 234,30 250,30 270,28 280,30 320,30 400,30 420,30 435,28 445,30 470,30 500,30 518,30 526,22 532,30 538,12 544,48 550,4 556,56 562,18 568,42 574,30 590,30 610,28 620,30 660,30 740,30 760,30 775,28 785,30 810,30 840,30 858,30 866,22 872,30 878,12 884,48 890,4 896,56 902,18 908,42 914,30 930,30 950,28 960,30 1000,30 1080,30 1100,30 1115,28 1125,30 1200,30" fill="none" stroke="url(#ekg-full)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════ */}
      {/* PROBLEM / SOLUTION — same bg as hero  */}
      {/* ══════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-6 pt-4 pb-10 md:pt-8 md:pb-14">
        <div className="grid md:grid-cols-2 gap-px bg-white/[0.04]">
          <div className="bg-base p-6 md:p-8">
            <span className="case-header block mb-4">The Problem</span>
            <h2 className="font-bold text-xl md:text-2xl leading-snug mb-4 text-fg-bright">
              You know <span className="text-fg-muted">what</span> happened.
              <br />You don&apos;t know <span className="text-scalpel">why.</span>
            </h2>
            <p className="text-fg-muted text-sm leading-relaxed mb-3">
              Why you doubled your stake after three straight losses. Why your $50 parlay
              turned into a $400 chase. Why you keep betting NBA props at a -18% ROI.
            </p>
            <p className="text-fg-bright text-sm font-medium">
              The numbers show what happened. They don&apos;t show what you&apos;re doing to yourself.
            </p>
          </div>
          <div className="bg-base p-6 md:p-8 border-l border-scalpel/10">
            <span className="case-header block mb-4 text-scalpel">The Solution</span>
            <h2 className="font-bold text-xl md:text-2xl leading-snug mb-4 text-fg-bright">
              BetAutopsy reads your history like a{' '}
              <span className="text-scalpel">case file.</span>
            </h2>
            <p className="text-fg-muted text-sm leading-relaxed mb-3">
              Your Tuesday night parlays cost $340 last quarter. Your stakes jump 1.8x after
              a loss. You&apos;re profitable on NFL spreads but bleeding on props. Specific patterns,
              specific dollars, specific fixes.
            </p>
            <p className="text-fg-bright text-sm font-medium">
              Month 1, you see what&apos;s costing you. Month 6, you see how much you&apos;ve saved.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════ */}
      {/* HOW IT WORKS — raised bg-surface      */}
      {/* ══════════════════════════════════════ */}
      <section className="bg-surface border-y border-white/[0.04] py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="case-header mb-8">PROTOCOL — THREE STEPS</div>
          <div className="vitals-strip grid-cols-1 md:grid-cols-3">
            {[
              { step: '01', title: 'Upload', desc: 'Export from Pikkit, any sportsbook, DFS app, or prediction market. Or upload any CSV.' },
              { step: '02', title: 'Analyze', desc: 'Proprietary engine scans for cognitive biases, emotional patterns, and sport-specific leaks. Get your Emotion Score, BetIQ, and Discipline Score in 20 seconds.' },
              { step: '03', title: 'Improve', desc: "Get rules with real numbers — 'stop betting heavy favorites on NFL, it's costing you $40/week.' Track whether you actually change." },
            ].map(item => (
              <div key={item.step} className="vitals-cell !p-6 md:!p-8">
                <div className="font-mono text-3xl font-bold text-scalpel/20 mb-3">{item.step}</div>
                <h3 className="text-lg font-semibold text-fg-bright mb-2">{item.title}</h3>
                <p className="text-sm text-fg-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════ */}
      {/* PROGRESS TRACKING — why ongoing       */}
      {/* value matters (before the demo)       */}
      {/* ══════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-6 py-16 md:py-20">
        <span className="case-header block mb-3">Longitudinal Study</span>
        <h2 className="font-bold text-2xl md:text-3xl tracking-tight mb-4 text-fg-bright">
          One report is a <span className="text-fg-muted">snapshot</span>.
          Five reports is <span className="text-scalpel">proof</span>.
        </h2>
        <p className="text-fg-muted mb-10 max-w-lg text-sm">
          Track the behavioral changes that actually save you money.
        </p>
        <div className="case-card p-5 md:p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <span className="case-header block mb-1">Emotion Score Over Time</span>
              <p className="text-fg-dim text-xs mb-3 font-mono">Lower = better. Under 40 = controlled.</p>
              <div className="space-y-2.5">
                {[
                  { score: 72, date: 'Week 1' },
                  { score: 58, date: 'Week 2' },
                  { score: 47, date: 'Week 4' },
                  { score: 41, date: 'Week 6' },
                ].map((r) => (
                  <div key={r.date} className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-fg-dim w-14 shrink-0">{r.date}</span>
                    <div className="flex-1 h-2 bg-surface-raised overflow-hidden rounded-sm">
                      <div className="h-full rounded-sm" style={{ width: `${r.score}%`, background: r.score <= 45 ? '#00C9A7' : r.score <= 60 ? '#D29922' : '#E8453C' }} />
                    </div>
                    <span className={`font-mono text-sm w-8 text-right ${r.score <= 45 ? 'text-scalpel' : r.score <= 60 ? 'text-caution' : 'text-bleed'}`}>{r.score}</span>
                  </div>
                ))}
              </div>
              <p className="text-scalpel text-xs mt-2 font-mono">↓ 31 points in 6 weeks</p>
            </div>
            <div className="space-y-3">
              <span className="case-header block mb-1">Vital Signs</span>
              {[
                { label: 'Discipline', from: '34', to: '67', arrow: '↑' },
                { label: 'Loss Chase Ratio', from: '1.8x', to: '1.1x', arrow: '↓' },
                { label: 'Parlay %', from: '42%', to: '18%', arrow: '↓' },
                { label: 'ROI', from: '-8.2%', to: '-1.4%', arrow: '↑' },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between py-0.5">
                  <span className="text-sm text-fg-muted">{m.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-fg-dim">{m.from}</span>
                    <span className="text-scalpel">{m.arrow}</span>
                    <span className="font-mono text-sm font-medium text-scalpel">{m.to}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════ */}
      {/* DEMO REPORT — proof, see it yourself  */}
      {/* ══════════════════════════════════════ */}
      <section className="bg-surface-raised border-y border-white/[0.04] py-16 md:py-20" id="sample">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="case-header">EXHIBIT A — PRO TIER SAMPLE</div>
            <span className="evidence-tag border-scalpel/30 text-scalpel">DEMO</span>
          </div>
          <h2 className="font-bold text-2xl md:text-3xl text-fg-bright mb-3">
            This is what a Pro autopsy looks like
          </h2>
          <p className="text-fg-muted text-sm mb-4 max-w-xl">
            280 bets. NFL &amp; NBA. 3 months. We found 3 cognitive biases, a loss-chasing habit costing $480/quarter, and a parlay addiction erasing their entire edge.
          </p>
          <p className="text-fg-dim text-xs mb-8 max-w-xl font-mono">
            THIS IS A PRO REPORT. SHARP TIER UNLOCKS EVEN MORE — LEAK PRIORITIZER, WHAT-IF SIMULATOR, AND BETIQ SKILL ASSESSMENT.
          </p>
          <div className="border border-white/[0.06] rounded-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04] bg-surface">
              <div className="w-2 h-2 rounded-full bg-loss" />
              <div className="w-2 h-2 rounded-full bg-caution" />
              <div className="w-2 h-2 rounded-full bg-win" />
              <span className="flex-1 text-center font-mono text-[10px] text-fg-dim tracking-wider">betautopsy.com/reports</span>
            </div>
            <DemoReportWrapper />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════ */}
      {/* QUIZ CTA — low-commitment alternative */}
      {/* after they've seen the product        */}
      {/* ══════════════════════════════════════ */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <div className="finding-card border-l-scalpel p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg text-fg-bright mb-1">Not ready to upload? Try the quiz first.</h3>
              <p className="text-fg-muted text-sm">Discover your Bet DNA in 2 minutes. No signup, no data needed.</p>
            </div>
            <Link href="/quiz" className="btn-secondary font-mono text-sm shrink-0">
              Take the Quiz
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════ */}
      {/* PRICING — surface bg, visually        */}
      {/* separated as the "decision" section   */}
      {/* ══════════════════════════════════════ */}
      <section id="pricing" className="bg-surface border-y border-white/[0.04] py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="case-header mb-2">PRICING — ACCESS LEVELS</div>
          <p className="text-fg-muted mb-10 max-w-md text-sm">
            Try it free with your latest 50 bets. Upgrade for unlimited bets, deeper analysis, progress tracking, and more.
          </p>
          <div className="grid md:grid-cols-3 gap-px bg-white/[0.06] border border-white/[0.06] rounded-sm overflow-hidden">
            <div className="bg-base p-6 flex flex-col">
              <span className="case-header block mb-3">Free</span>
              <div className="mb-4">
                <span className="font-mono text-3xl font-bold text-fg-bright">$0</span>
              </div>
              <ul className="space-y-2 flex-1 mb-6">
                {['1 report (50 most recent bets)', 'Basic bias detection', 'Summary stats'].map((f) => (
                  <li key={f} className="text-sm text-fg-muted flex items-start gap-2">
                    <span className="text-scalpel mt-0.5 shrink-0 font-mono text-xs">✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn-secondary text-center w-full font-mono text-sm">Start Free</Link>
            </div>
            <div className="bg-base p-6 flex flex-col relative border-x border-scalpel/10">
              <div className="absolute -top-3 right-4 border border-scalpel/30 px-2 py-0.5 -rotate-2 bg-base">
                <span className="font-mono text-[9px] text-scalpel tracking-widest font-bold">RECOMMENDED</span>
              </div>
              <span className="case-header block mb-3">Pro</span>
              <div className="mb-4">
                <span className="font-mono text-3xl font-bold text-fg-bright">$9.99</span>
                <span className="text-fg-dim text-sm font-mono">/mo</span>
              </div>
              <ul className="space-y-2 flex-1 mb-6">
                {[
                  'Unlimited bets & reports',
                  'Full bias detection + dollar costs',
                  'BetIQ score + sport-specific leaks',
                  'Emotion + Discipline tracking',
                  'Personal rules & action plans',
                  'Progress tracking over time',
                ].map((f) => (
                  <li key={f} className="text-sm text-fg-muted flex items-start gap-2">
                    <span className="text-scalpel mt-0.5 shrink-0 font-mono text-xs">✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn-primary text-center w-full font-mono text-sm">Get Pro</Link>
            </div>
            <div className="bg-base p-6 flex flex-col">
              <span className="case-header block mb-3">Sharp</span>
              <div className="mb-4">
                <span className="font-mono text-3xl font-bold text-fg-bright">$24.99</span>
                <span className="text-fg-dim text-sm font-mono">/mo</span>
              </div>
              <ul className="space-y-2 flex-1 mb-6">
                {['Everything in Pro', 'Leak Prioritizer (ranked by $ impact)', 'What-If Simulator', 'Early access to new features'].map((f) => (
                  <li key={f} className="text-sm text-fg-muted flex items-start gap-2">
                    <span className="text-scalpel mt-0.5 shrink-0 font-mono text-xs">✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn-secondary text-center w-full font-mono text-sm">Get Sharp</Link>
            </div>
          </div>
          <p className="text-fg-dim text-xs mt-6 font-mono">
            Have questions? <Link href="/faq" className="text-scalpel hover:underline">Check our FAQ</Link>
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════ */}
      {/* BLOG — pass PageRank to content       */}
      {/* ══════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="case-header mb-3">FROM THE POST-MORTEM</div>
        <p className="text-fg-muted text-sm mb-6">Deep dives into the behavioral side of sports betting.</p>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: 'Why Am I Losing at Sports Betting?', slug: 'why-am-i-losing-at-sports-betting', time: '7 min' },
            { title: 'The Real Math Behind Parlay Addiction', slug: 'parlay-addiction-the-real-math', time: '6 min' },
            { title: '7 Cognitive Biases Destroying Your Bankroll', slug: 'cognitive-biases-destroying-your-bankroll', time: '8 min' },
          ].map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="case-card p-5 hover:border-white/[0.08] transition-colors group">
              <h3 className="font-medium text-sm text-fg-bright group-hover:text-scalpel transition-colors mb-2 leading-snug">{post.title}</h3>
              <span className="font-mono text-[10px] text-fg-dim">{post.time}</span>
            </Link>
          ))}
        </div>
        <div className="text-center mt-6">
          <Link href="/blog" className="font-mono text-[11px] text-scalpel hover:underline tracking-wider">VIEW ALL POSTS →</Link>
        </div>
      </section>

      {/* ══════════════════════════════════════ */}
      {/* FINAL CTA — base bg                   */}
      {/* ══════════════════════════════════════ */}
      <section className="max-w-3xl mx-auto px-6 py-16 md:py-20 text-center">
        <h2 className="font-bold text-2xl md:text-3xl tracking-tight mb-4 text-fg-bright">
          Stop betting on autopilot. Start <span className="text-scalpel">understanding your behavior.</span>
        </h2>
        <p className="text-fg-muted mb-8 max-w-lg mx-auto text-sm">
          Your next bet is coming. Know what your patterns say before you place it.
        </p>
        <Link href="/signup" className="btn-primary text-base !px-10 !py-3">
          Get Your Free Autopsy
        </Link>
      </section>

      {/* ══════════════════════════════════════ */}
      {/* FOOTER                                */}
      {/* ══════════════════════════════════════ */}
      <footer className="border-t border-white/[0.04] bg-surface py-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
            <Logo size="xs" variant="horizontal" theme="dark" />
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {[
                { label: 'Pricing', href: '/#pricing' },
                { label: 'Blog', href: '/blog' },
                { label: 'FAQ', href: '/faq' },
                { label: 'Quiz', href: '/quiz' },
                { label: 'How to Upload', href: '/how-to-upload' },
                { label: 'Privacy', href: '/privacy' },
                { label: 'Log in', href: '/login' },
                { label: 'Sign up', href: '/signup' },
              ].map(link => (
                <Link key={link.href} href={link.href} className="font-mono text-[11px] text-fg-dim hover:text-fg transition-colors tracking-wider">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <p className="text-fg-dim text-[11px] font-mono leading-relaxed">
            BetAutopsy provides behavioral analysis and educational insights — not gambling or financial advice.
            Past results don&apos;t guarantee future outcomes. 21+. If you or someone you know has a gambling problem, call 1-800-GAMBLER.
          </p>
        </div>
      </footer>
    </main>
  );
}

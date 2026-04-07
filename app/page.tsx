import Link from 'next/link';
import NavBar from '@/components/NavBar';
import DemoReportWrapper from '@/components/DemoReportWrapper';
import { Logo } from '@/components/logo';
import AnimatedSection from '@/components/AnimatedSection';
import HeroHeadline from '@/components/HeroHeadline';
import AnimatedCounter from '@/components/AnimatedCounter';
import { ProductShowcase } from '@/components/ProductShowcase';
import ResponsibleGambling from '@/components/ResponsibleGambling';
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text';
import { NumberTicker } from '@/components/ui/number-ticker';
import LogoScroll from '@/components/LogoScroll';
import { BorderBeam } from '@/components/ui/border-beam';

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <NavBar />

      {/* ══════════════════════════════════════ */}
      {/* HERO — grid-paper bg                  */}
      {/* ══════════════════════════════════════ */}
      <section className="relative grid-paper overflow-hidden">
        {/* Glow behind hero text */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#00C9A7]/10 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="max-w-5xl mx-auto px-6 pt-10 pb-8 relative z-10">
          <div className="mb-8 animate-fade-in">
            <AnimatedShinyText className="font-mono text-[10px] text-fg-dim tracking-[3px] uppercase inline-block">
              CASE FILE // BEHAVIORAL ANALYSIS UNIT
            </AnimatedShinyText>
          </div>
          <HeroHeadline />
          <p className="text-fg text-base md:text-lg max-w-2xl mb-8 leading-relaxed animate-fade-in-d2">
            Upload your bet history. See exactly which habits are costing you money, how much, and how to fix them.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-start animate-slide-up-d2">
            <Link href="/signup" className="btn-primary text-base !px-8 !py-3">
              Get Your Full Report Free
            </Link>
            <span className="text-fg-muted text-xs mt-3 sm:mt-4">Limited time: first full report free. No credit card.</span>
          </div>
          {/* Social proof counter strip */}
          <div className="flex flex-wrap gap-8 mt-8 animate-fade-in-d3">
            <div>
              <span className="font-mono text-2xl font-bold text-fg-bright"><NumberTicker value={47000} delay={0.3} />+</span>
              <span className="block font-mono text-[10px] text-fg-dim tracking-widest uppercase mt-1">Bets Analyzed</span>
            </div>
            <div>
              <span className="font-mono text-2xl font-bold text-fg-bright"><NumberTicker value={2100} delay={0.5} />+</span>
              <span className="block font-mono text-[10px] text-fg-dim tracking-widest uppercase mt-1">Reports Generated</span>
            </div>
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
      {/* TRUST BAR — integration logos         */}
      {/* ══════════════════════════════════════ */}
      <section className="border-y border-border-subtle py-5 overflow-hidden">
        <div className="relative">
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-base to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-base to-transparent z-10" />
          <LogoScroll />
        </div>
      </section>

      {/* ══════════════════════════════════════ */}
      {/* PROBLEM / SOLUTION — same bg as hero  */}
      {/* ══════════════════════════════════════ */}
      <AnimatedSection>
      <section className="max-w-5xl mx-auto px-6 pt-4 pb-10 md:pt-8 md:pb-14">
        <div className="grid md:grid-cols-2 gap-px bg-border-subtle">
          <div className="bg-base p-6 md:p-8">
            <span className="case-header block mb-4">The Problem</span>
            <h2 className="font-bold text-xl md:text-2xl leading-snug mb-4 text-fg-bright">
              You know <span className="text-fg-muted">what</span> happened.
              <br />You don&apos;t know <span className="text-scalpel">why.</span>
            </h2>
            <p className="text-fg text-sm leading-relaxed">
              Why your $50 parlay turned into a $400 chase. Why you keep betting NBA props at -18% ROI.
            </p>
          </div>
          <div className="bg-base p-6 md:p-8 border-l border-scalpel/10">
            <span className="case-header block mb-4 text-scalpel">The Solution</span>
            <h2 className="font-bold text-xl md:text-2xl leading-snug mb-4 text-fg-bright">
              BetAutopsy reads your history like a{' '}
              <span className="text-scalpel">case file.</span>
            </h2>
            <p className="text-fg text-sm leading-relaxed">
              Your Tuesday night parlays cost $340 last quarter. Your stakes jump 1.8x after a loss. Specific patterns, specific dollars, specific fixes.
            </p>
          </div>
        </div>
      </section>
      </AnimatedSection>

      {/* ══════════════════════════════════════ */}
      {/* HOW IT WORKS — interactive walkthrough */}
      {/* ══════════════════════════════════════ */}
      <AnimatedSection delay={0.05}>
      <section className="bg-surface-1 border-y border-border-subtle py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="case-header mb-8">PROTOCOL // HOW IT WORKS</div>
          <ProductShowcase />
        </div>
      </section>
      </AnimatedSection>

      {/* ══════════════════════════════════════ */}
      {/* DEMO REPORT — proof, see it yourself  */}
      {/* ══════════════════════════════════════ */}
      <AnimatedSection delay={0.1}>
      <section className="bg-surface-2 border-y border-border-subtle py-16 md:py-20 relative overflow-hidden" id="sample">
        <div className="absolute -top-10 -left-20 w-[400px] h-[300px] bg-cyan-500/[0.08] rounded-full blur-[100px] pointer-events-none z-0" />
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="case-header mb-3">EXHIBIT A // PRO TIER SAMPLE</div>
          <h2 className="font-bold text-2xl md:text-3xl tracking-tight text-fg-bright mb-3">
            See a real autopsy report
          </h2>
          <p className="text-fg-muted text-sm mb-8 max-w-xl">
            280 bets. 3 months. 3 biases found. $480/quarter in recoverable losses.
          </p>
          <div className="border border-border-subtle rounded-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-subtle bg-surface-1">
              <div className="w-2 h-2 rounded-full bg-loss" />
              <div className="w-2 h-2 rounded-full bg-caution" />
              <div className="w-2 h-2 rounded-full bg-win" />
              <span className="flex-1 text-center font-mono text-[10px] text-fg-dim tracking-wider">betautopsy.com/reports</span>
            </div>
            <DemoReportWrapper />
          </div>
        </div>
      </section>
      </AnimatedSection>

      {/* ══════════════════════════════════════ */}
      {/* TESTIMONIALS — social proof            */}
      {/* ══════════════════════════════════════ */}
      <AnimatedSection>
      <section className="max-w-5xl mx-auto px-6 py-12 md:py-16">
        <div className="case-header mb-8">CASE NOTES // WHAT USERS SAY</div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              quote: "Had no idea parlays were costing me $1,200 in 3 months. Cut my parlay spending by 80%.",
              name: 'Mike R.',
              detail: '340 bets analyzed',
            },
            {
              quote: "Seeing a 78/100 emotion score next to my loss-chasing pattern made it real. ROI improved within a month.",
              name: 'Jordan T.',
              detail: 'Full Report user',
            },
            {
              quote: "Thought I was sharp. BetAutopsy showed me I was profitable on NFL spreads but bleeding on everything else.",
              name: 'Chris D.',
              detail: '500+ bets analyzed',
            },
          ].map(t => (
            <div key={t.name} className="case-card p-5">
              <p className="text-sm text-fg leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-fg-bright">{t.name}</span>
                <span className="text-fg-dim">&middot;</span>
                <span className="font-mono text-[10px] text-fg-dim tracking-wider">{t.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
      </AnimatedSection>

      {/* ══════════════════════════════════════ */}
      {/* PRICING — surface bg, visually        */}
      {/* separated as the "decision" section   */}
      {/* ══════════════════════════════════════ */}
      <AnimatedSection delay={0.05}>
      <section id="pricing" className="bg-surface-1 border-y border-border-subtle py-16 md:py-20 relative overflow-hidden">
        {/* Pricing glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#00C9A7]/[0.08] rounded-full blur-[100px] pointer-events-none z-0" />
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="case-header mb-2">PRICING // ACCESS LEVELS</div>
          <p className="text-fg-muted mb-10 max-w-md text-sm">
            Start free. Upgrade for the full report with dollar costs and action plans.
          </p>
          <div className="grid gap-4 md:grid-cols-3 md:gap-px bg-border-subtle md:border border-border-subtle rounded-sm md:overflow-hidden">
            <div className="bg-base p-6 flex flex-col">
              <span className="case-header block mb-3">Free Snapshot</span>
              <div className="mb-4">
                <span className="font-mono text-3xl font-bold text-fg-bright">$0</span>
              </div>
              <ul className="space-y-2 flex-1 mb-6">
                {['Unlimited snapshot reports', 'Overall grade + archetype', 'Top bias fully explained', 'BetIQ score'].map((f) => (
                  <li key={f} className="text-sm text-fg-muted flex items-start gap-2">
                    <span className="text-scalpel mt-0.5 shrink-0 font-mono text-xs">&#10003;</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn-secondary text-center w-full font-mono text-sm min-h-[44px] flex items-center justify-center">Start Free</Link>
            </div>
            <div className="bg-base p-6 flex flex-col relative overflow-hidden md:border-x border-scalpel/20 rounded-md" style={{ background: 'linear-gradient(180deg, rgba(0,201,167,0.04) 0%, transparent 40%)' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="case-header text-scalpel">Full Report</span>
                <span className="border border-scalpel/30 px-2 py-0.5 bg-scalpel/10 font-mono text-[9px] text-scalpel tracking-widest font-bold">FIRST ONE FREE</span>
              </div>
              <div className="mb-4">
                <span className="font-mono text-3xl font-bold text-fg-bright">$9.99</span>
                <p className="text-scalpel text-xs font-medium mt-1">Pay once. No subscription.</p>
              </div>
              <ul className="space-y-2 flex-1 mb-6">
                {[
                  'Analyzes 5,000 bets deep',
                  'Complete 5-chapter report',
                  'All biases with dollar costs',
                  'Full action plan + personal rules',
                  'BetIQ + Emotion + Discipline',
                ].map((f) => (
                  <li key={f} className="text-sm text-fg-muted flex items-start gap-2">
                    <span className="text-scalpel mt-0.5 shrink-0 font-mono text-xs">&#10003;</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn-primary text-center w-full font-mono text-sm min-h-[44px] flex items-center justify-center">Get Your Report</Link>
              <BorderBeam colorFrom="#00C9A7" colorTo="#00C9A7" className="hidden md:block" />
            </div>
            <div className="bg-base p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="case-header">Pro</span>
                <span className="border border-scalpel/30 px-2 py-0.5 bg-base font-mono text-[9px] text-scalpel tracking-widest font-bold">BEST VALUE</span>
              </div>
              <div className="mb-4">
                <span className="font-mono text-3xl font-bold text-fg-bright">$19.99</span>
                <span className="text-fg-muted text-sm font-mono">/mo</span>
              </div>
              <ul className="space-y-2 flex-1 mb-6">
                {['3 full reports per month', 'Leak Prioritizer + What-If Simulator', 'Weekly email digest', 'Progress tracking over time'].map((f) => (
                  <li key={f} className="text-sm text-fg-muted flex items-start gap-2">
                    <span className="text-scalpel mt-0.5 shrink-0 font-mono text-xs">&#10003;</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/signup?next=/pricing" className="btn-secondary text-center w-full font-mono text-sm min-h-[44px] flex items-center justify-center">Go Pro</Link>
            </div>
          </div>
          {/* Trust block */}
          <div className="mt-10 border border-border-subtle rounded px-4 py-3 max-w-3xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-scalpel shrink-0" viewBox="0 0 16 16" fill="none"><rect x="2" y="7" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M5 7V4.5a3 3 0 0 1 6 0V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <span className="font-mono text-xs text-fg-muted">Data never sold or shared</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-scalpel shrink-0" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><line x1="2" y1="6" x2="14" y2="6" stroke="currentColor" strokeWidth="1.5"/><line x1="2" y1="10" x2="14" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="6" y1="6" x2="6" y2="14" stroke="currentColor" strokeWidth="1.5"/></svg>
                <span className="font-mono text-xs text-fg-muted">Row-level security on all data</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-scalpel shrink-0" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M4 4l.7 9.1a1.5 1.5 0 0 0 1.5 1.4h3.6a1.5 1.5 0 0 0 1.5-1.4L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <span className="font-mono text-xs text-fg-muted">Delete your data anytime</span>
              </div>
            </div>
          </div>
          <p className="text-fg-muted text-xs mt-6 text-center">
            Have questions? <Link href="/faq" className="text-scalpel hover:underline">Check our FAQ</Link>
          </p>
        </div>
      </section>
      </AnimatedSection>

      {/* ══════════════════════════════════════ */}
      {/* BLOG — pass PageRank to content       */}
      {/* ══════════════════════════════════════ */}
      <AnimatedSection delay={0.1}>
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="case-header mb-3">FROM THE POST-MORTEM</div>
        <p className="text-fg-muted text-sm mb-6">The behavioral side of sports betting.</p>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: 'Why Am I Losing at Sports Betting?', slug: 'why-am-i-losing-at-sports-betting', time: '7 min' },
            { title: 'The Real Math Behind Parlay Addiction', slug: 'parlay-addiction-the-real-math', time: '6 min' },
            { title: '7 Cognitive Biases Destroying Your Bankroll', slug: 'cognitive-biases-destroying-your-bankroll', time: '8 min' },
          ].map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="case-card p-5 hover:border-border transition-colors group">
              <h3 className="font-medium text-sm text-fg-bright group-hover:text-scalpel transition-colors mb-2 leading-snug">{post.title}</h3>
              <span className="font-mono text-xs text-fg-muted">{post.time}</span>
            </Link>
          ))}
        </div>
        <div className="text-center mt-6">
          <Link href="/blog" className="font-mono text-xs text-scalpel hover:underline tracking-wider">VIEW ALL POSTS →</Link>
        </div>
      </section>
      </AnimatedSection>

      {/* ══════════════════════════════════════ */}
      {/* FINAL CTA — base bg                   */}
      {/* ══════════════════════════════════════ */}
      <AnimatedSection>
      <section className="max-w-3xl mx-auto px-6 py-16 md:py-20 text-center">
        <h2 className="font-bold text-2xl md:text-3xl tracking-tight mb-4 text-fg-bright">
          Stop betting on autopilot. Start <span className="text-scalpel">understanding your behavior.</span>
        </h2>
        <p className="text-fg-muted mb-8 max-w-lg mx-auto text-sm">
          Your next bet is coming. Know what your patterns say before you place it.
        </p>
        <Link href="/signup" className="btn-primary text-base !px-10 !py-3">
          Get Your Full Report Free
        </Link>
      </section>
      </AnimatedSection>

      {/* ══════════════════════════════════════ */}
      {/* FOOTER                                */}
      {/* ══════════════════════════════════════ */}
      <footer className="border-t border-border-subtle bg-surface-1 py-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
            <Logo size="xs" variant="horizontal" theme="dark" />
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {[
                { label: 'Pricing', href: '/#pricing' },
                { label: 'Blog', href: '/blog' },
                { label: 'FAQ', href: '/faq' },
                { label: 'Privacy', href: '/privacy' },
                { label: 'Terms', href: '/terms' },
                { label: 'Log in', href: '/login' },
                { label: 'Sign up', href: '/signup' },
              ].map(link => (
                <Link key={link.href} href={link.href} className="font-mono text-xs text-fg-muted hover:text-fg transition-colors tracking-wider">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <ResponsibleGambling />
      </footer>
    </main>
  );
}

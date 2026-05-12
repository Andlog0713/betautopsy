import type { Metadata } from 'next';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import AnimatedSection from '@/components/AnimatedSection';

export const metadata: Metadata = {
  title: 'Case Study — Andrew | BetAutopsy',
  description:
    'Growth operator with 2.5 years at PrizePicks who shipped BetAutopsy end-to-end. Creative strategy, lifecycle, paid social, incrementality — applied to a category I know.',
  alternates: { canonical: '/case-study' },
  openGraph: {
    title: 'Case Study — Andrew | BetAutopsy',
    description:
      'Growth operator with 2.5 years at PrizePicks who shipped BetAutopsy end-to-end.',
    url: 'https://www.betautopsy.com/case-study',
    images: [{ url: '/og', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Case Study — Andrew | BetAutopsy',
    description:
      'Growth operator with 2.5 years at PrizePicks who shipped BetAutopsy end-to-end.',
    images: ['/og'],
  },
  robots: { index: true, follow: true },
};

// Replace this with the actual hosted demo video URL (Loom, Mux, Vimeo, or
// /public/case-study/demo.mp4). Keep the aspect ratio container intact.
const DEMO_VIDEO_URL = ''; // TK

// Drop product screenshots into /public/case-study/ and reference them
// by path here. Each slot below is wired with descriptive alt text and
// the right aspect ratio — just swap the `src` in once the assets exist.
const SCREENSHOTS = {
  report: '', // TK — full autopsy report (ROI, Tilt Index, Discipline Score)
  archetype: '', // TK — Bet DNA archetype reveal
  pricing: '', // TK — three-tier pricing card
};

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="font-mono text-[10px] text-fg-dim tracking-[3px] uppercase mb-4">
      {children}
    </p>
  );
}

function ScreenshotSlot({
  src,
  alt,
  caption,
  aspect = 'aspect-[16/10]',
}: {
  src: string;
  alt: string;
  caption: string;
  aspect?: string;
}) {
  return (
    <figure className="space-y-2">
      <div
        className={`${aspect} w-full rounded-md border border-border-subtle bg-surface-2 overflow-hidden flex items-center justify-center`}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        ) : (
          <div className="text-center px-6">
            <p className="font-mono text-[10px] text-fg-dim tracking-[3px] uppercase">
              Screenshot slot
            </p>
            <p className="font-mono text-xs text-fg-muted mt-2">{alt}</p>
          </div>
        )}
      </div>
      <figcaption className="font-mono text-[11px] text-fg-muted tracking-wider">
        {caption}
      </figcaption>
    </figure>
  );
}

export default function CaseStudyPage() {
  return (
    <main id="main-content" className="min-h-screen bg-base text-fg">
      <NavBar />

      {/* ── 1. Hero ───────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <SectionLabel>Case file / 001</SectionLabel>
            <h1 className="font-sans text-4xl md:text-6xl font-bold tracking-tight text-fg-bright leading-[1.05]">
              Andrew.
              <br />
              <span className="text-scalpel">Growth operator</span> at the
              intersection of creative strategy, incrementality testing, and
              growth experimentation in regulated DFS.
            </h1>
            <p className="mt-8 text-lg md:text-xl text-fg-muted max-w-2xl leading-relaxed">
              2.5 years inside PrizePicks running paid social, lifecycle, and
              CRM experiments. Then I built and shipped BetAutopsy end-to-end —
              product, brand, distribution, monetization — for the bettors my
              old employer couldn&rsquo;t reach.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link href="/" className="btn-primary font-mono text-sm tracking-wider uppercase">
                Try BetAutopsy
              </Link>
              <a
                href="mailto:andlog0713@gmail.com"
                className="btn-secondary font-mono text-sm tracking-wider uppercase"
              >
                Email
              </a>
              <a
                href="https://www.linkedin.com/in/andrew-tk/" /* TK — replace with actual LinkedIn URL */
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary font-mono text-sm tracking-wider uppercase"
              >
                LinkedIn
              </a>
            </div>

            <div className="mt-12 flex flex-wrap gap-2">
              {['Meta', 'TikTok', 'Snapchat', 'Reddit', 'Braze', 'Lifecycle', 'CRM', 'Incrementality'].map(
                (tag) => (
                  <span key={tag} className="evidence-tag border-border-subtle text-fg-muted">
                    {tag}
                  </span>
                )
              )}
            </div>
          </AnimatedSection>
        </div>
      </section>

      <div className="border-t border-border-subtle" />

      {/* ── 2. The bet ────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <SectionLabel>02 / The bet</SectionLabel>
            <h2 className="font-sans text-3xl md:text-4xl font-bold tracking-tight text-fg-bright">
              The acquisition target is the bettor who isn&rsquo;t tracking
              themselves.
            </h2>
            <div className="mt-8 space-y-5 text-fg-muted leading-relaxed text-[17px]">
              <p>
                Roughly <span className="text-fg-bright font-semibold">70%</span>{' '}
                of bettors don&rsquo;t track their bets in any meaningful way.
                <span className="text-fg-dim"> [TK — source / refine]</span> They
                have a story about how they&rsquo;re doing and a real number,
                and the two don&rsquo;t agree. Every other product in this
                category sells them a ledger and asks them to do the work.
              </p>
              <p>
                BetAutopsy doesn&rsquo;t. Upload a CSV, get a forensic report
                back in under two minutes. The product is the insight, not the
                data entry. That&rsquo;s a different acquisition funnel, a
                different creative angle, and a different LTV curve than every
                tracker on the market.
              </p>
              <p>
                Why a regulated-DFS background matters: the bettor I&rsquo;m
                targeting is the same bettor I spent 2.5 years acquiring,
                reactivating, and re-engaging at PrizePicks. I know the
                creative that converts them, the channels they actually live
                on, and the lifecycle stages where they churn. That&rsquo;s the
                edge, not the tech stack.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: 'TAM signal', value: '~70%', sub: 'of bettors don’t track' },
                { label: 'Time-to-insight', value: '<2 min', sub: 'CSV → full report' },
                { label: 'Operator experience', value: '2.5 yrs', sub: 'regulated DFS, PrizePicks' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="border border-border-subtle rounded-md p-5 bg-surface-1"
                >
                  <p className="data-label">{stat.label}</p>
                  <p className="data-value text-scalpel mt-2">{stat.value}</p>
                  <p className="font-mono text-xs text-fg-muted mt-1">{stat.sub}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      <div className="border-t border-border-subtle" />

      {/* ── 3. What I built ───────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <SectionLabel>03 / What I built</SectionLabel>
            <h2 className="font-sans text-3xl md:text-4xl font-bold tracking-tight text-fg-bright">
              BetAutopsy: a forensic report on how you actually bet.
            </h2>
            <p className="mt-6 text-fg-muted text-[17px] leading-relaxed max-w-3xl">
              Not a tracker. Not a picks service. A diagnostic. You upload a
              CSV of your bet history from any major book or DFS operator, and
              within a couple of minutes you get back a personalized
              breakdown — written in the voice of a slightly grim coroner.
            </p>

            {/* Demo video slot */}
            <div className="mt-12">
              <SectionLabel>Demo</SectionLabel>
              {/*
                Drop the hosted demo video here. Replace this entire
                <div> with a <video> tag pointing at the file, or an
                <iframe> for Loom / Mux / YouTube. Keep the
                aspect-video container so layout doesn't shift.
              */}
              <div className="aspect-video w-full rounded-md border border-border-subtle bg-surface-2 overflow-hidden flex items-center justify-center">
                {DEMO_VIDEO_URL ? (
                  <video
                    src={DEMO_VIDEO_URL}
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center px-6">
                    <p className="font-mono text-[10px] text-fg-dim tracking-[3px] uppercase">
                      Demo video slot
                    </p>
                    <p className="font-mono text-xs text-fg-muted mt-2">
                      90-second product walkthrough — replace DEMO_VIDEO_URL at top of file.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Product feature grid */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  label: 'Upload',
                  title: 'CSV in, report out',
                  body: 'DraftKings, FanDuel, PrizePicks, Underdog, any sportsbook export. No manual logging. No friction at the top of the funnel.',
                },
                {
                  label: 'Behavioral analysis',
                  title: 'Reads patterns, not just outcomes',
                  body: 'ROI is table stakes. The product surfaces tilt windows, stake creep after losses, parlay overuse, sport-specific leaks, and odds drift — the stuff bettors feel but can’t name.',
                },
                {
                  label: 'Scores',
                  title: 'Tilt Index, Discipline Score, ROI',
                  body: 'Three numbers a bettor can argue with their friends about. Designed to be screenshot-worthy and re-runnable next month.',
                },
                {
                  label: 'Bet DNA',
                  title: 'Archetypes that travel',
                  body: 'Each user gets pegged to a behavioral archetype — Tilt Merchant, Public Square, Sharp-In-Training. Built for organic share, not just analysis.',
                },
              ].map((feature) => (
                <div
                  key={feature.label}
                  className="border border-border-subtle rounded-md p-6 bg-surface-1"
                >
                  <p className="case-header">{feature.label}</p>
                  <h3 className="mt-3 font-semibold text-lg text-fg-bright">{feature.title}</h3>
                  <p className="mt-2 text-fg-muted text-sm leading-relaxed">{feature.body}</p>
                </div>
              ))}
            </div>

            {/* Pricing summary */}
            <div className="mt-12 border border-border-subtle rounded-md p-6 bg-surface-1">
              <p className="case-header">Pricing</p>
              <h3 className="mt-3 font-semibold text-lg text-fg-bright">
                Three tiers, priced for the curve I&rsquo;m actually selling to.
              </h3>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { name: 'Free', price: '$0', sub: 'Snapshot — top-of-funnel hook' },
                  { name: 'Pro', price: '$19', sub: 'Full report — the workhorse SKU' },
                  { name: 'Sharp', price: '$39', sub: 'Power user — recurring lifecycle' },
                ].map((tier) => (
                  <div key={tier.name} className="border border-border-subtle rounded-md p-4 bg-base">
                    <p className="font-mono text-[10px] tracking-[3px] uppercase text-fg-dim">
                      {tier.name}
                    </p>
                    <p className="font-mono text-2xl font-bold text-scalpel mt-2">{tier.price}</p>
                    <p className="font-mono text-xs text-fg-muted mt-1">{tier.sub}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm text-fg-muted leading-relaxed">
                Free exists to fill the top of the funnel and prove the
                insight. Pro is the workhorse — priced where a bettor will
                expense it against one bad weekend. Sharp is the recurring
                tier for the bettor who&rsquo;s actually trying to fix
                something, and the one I&rsquo;m optimizing lifecycle around.
              </p>
            </div>

            {/* Screenshot slots */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
              <ScreenshotSlot
                src={SCREENSHOTS.report}
                alt="Full autopsy report with ROI, Tilt Index, Discipline Score"
                caption="01 / Full report — scores and findings"
                aspect="aspect-[3/4]"
              />
              <ScreenshotSlot
                src={SCREENSHOTS.archetype}
                alt="Bet DNA archetype reveal screen"
                caption="02 / Bet DNA archetype reveal"
                aspect="aspect-[3/4]"
              />
              <ScreenshotSlot
                src={SCREENSHOTS.pricing}
                alt="Free / Pro / Sharp pricing card"
                caption="03 / Three-tier pricing"
                aspect="aspect-[3/4]"
              />
            </div>
          </AnimatedSection>
        </div>
      </section>

      <div className="border-t border-border-subtle" />

      {/* ── 4. Distribution ───────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <SectionLabel>04 / Distribution</SectionLabel>
            <h2 className="font-sans text-3xl md:text-4xl font-bold tracking-tight text-fg-bright">
              I went to market like an operator, not a founder.
            </h2>
            <p className="mt-6 text-fg-muted text-[17px] leading-relaxed">
              The thesis: PrizePicks-style creative outperforms sportsbook
              creative on Meta because it sells outcome (a bigger payout, a
              cleaner story) instead of feature (boost, parlay, same-game).
              I&rsquo;ve watched it work for two and a half years. So I built
              the BetAutopsy ad library around that insight, not around
              &ldquo;upload your bets.&rdquo;
            </p>

            <div className="mt-10 space-y-4">
              {[
                {
                  channel: 'Meta — paid social',
                  body: 'Primary acquisition channel. Creative built in the PrizePicks ad-library voice (high-contrast, single-frame, outcome-led) rather than the sportsbook house style (offer-led, logo-heavy). Hypothesis: same audience, different conversion intent — the diagnostic frame outperforms the deposit frame.',
                },
                {
                  channel: 'TikTok — organic + paid',
                  body: 'Organic-first to learn what hooks land before spending. Posting reaction-style breakdowns of bettors’ own data with the forensic voice. Paid spend follows whichever organic angles get pickup, not the other way around.',
                },
                {
                  channel: 'Reddit — r/prizepicks GTM',
                  body: 'I worked at PrizePicks. That earns one credibility-led launch post in r/prizepicks, not a marketing blast — the moderator team and the community both know how to smell a paid campaign. The angle is "former PP employee shipped a tool to read your own play." Honest, on-brand, and the only place where my employer history is a distribution asset rather than a liability.',
                },
                {
                  channel: 'Cold email — 5K bettors',
                  body: 'A targeted 5,000-bettor outbound sequence, sourced from public sports-betting communities and DFS leaderboards. Three-touch sequence, opt-out respected on first request, single CTA: run your autopsy free. CRM hygiene > volume.',
                },
              ].map((row) => (
                <div
                  key={row.channel}
                  className="border-l-2 border-scalpel/50 pl-5 py-3 bg-white/[0.02] rounded-r-md"
                >
                  <p className="font-mono text-xs tracking-wider uppercase text-scalpel">
                    {row.channel}
                  </p>
                  <p className="mt-2 text-fg-muted leading-relaxed">{row.body}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      <div className="border-t border-border-subtle" />

      {/* ── 5. PrizePicks chapter ─────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <SectionLabel>05 / The PrizePicks chapter</SectionLabel>
            <h2 className="font-sans text-3xl md:text-4xl font-bold tracking-tight text-fg-bright">
              2.5 years running paid social, lifecycle, and CRM at a regulated
              DFS operator.
            </h2>
            <p className="mt-6 text-fg-muted text-[17px] leading-relaxed">
              Primary KPIs were CPA, CAC, and ROAS, against{' '}
              <span className="text-fg-bright font-semibold">
                Placed a Lineup
              </span>{' '}
              as the primary conversion event. I ran Meta as the primary
              channel, plus TikTok, Snapchat, and Reddit. Creative strategy
              and audience strategy on the paid side. Lifecycle and
              reactivation on the CRM side, in Braze.
            </p>

            <div className="mt-10 border border-border-subtle rounded-md bg-surface-1 p-6 md:p-8">
              <p className="case-header">Signature win — lifecycle reactivation</p>
              <h3 className="mt-3 font-semibold text-xl text-fg-bright">
                The reactivation creative wasn&rsquo;t built for the user it was
                being served to.
              </h3>

              <div className="mt-6 space-y-5 text-fg-muted leading-relaxed">
                <p>
                  <span className="text-fg-bright font-semibold">Diagnosis.</span>{' '}
                  The Braze reactivation push was reusing new-user-offer
                  creative — first-deposit framing, &ldquo;welcome to
                  PrizePicks,&rdquo; the kind of copy a lapsed existing user
                  reads as either condescending or irrelevant. Open rates and
                  reactivation lift were soft and trending in the wrong
                  direction.
                </p>
                <p>
                  <span className="text-fg-bright font-semibold">Rebuild.</span>{' '}
                  I rewrote the creative for the existing-user context:
                  acknowledge that the user already knows the product,
                  reference the specific sports calendar they last played, no
                  acquisition-style offer. The voice shifted from &ldquo;come
                  try this&rdquo; to &ldquo;you&rsquo;re missing the slate
                  you usually play.&rdquo;
                </p>
                <p>
                  <span className="text-fg-bright font-semibold">Test.</span> A/B
                  against the incumbent creative on a shorter lapsed window
                  than the previous evergreen — the hypothesis being that
                  recently-lapsed users had higher reactivation intent and
                  shorter recall, so the existing-user framing would
                  compound. The new creative won on{' '}
                  <span className="text-fg-bright">
                    [TK — primary metric: reactivation rate / open / placed-a-lineup lift]
                  </span>
                  .
                </p>
                <p>
                  <span className="text-fg-bright font-semibold">Outcome.</span>{' '}
                  It went evergreen and is{' '}
                  <span className="text-fg-bright">
                    still running today, after I left the company
                  </span>
                  . The strongest signal I could ask for that the diagnosis
                  was right — the org kept the work in market without me
                  there to defend it.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Tenure', value: '2.5 yrs' },
                  { label: 'Primary channel', value: 'Meta' },
                  { label: 'Also ran', value: 'TT / Snap / Reddit' },
                  { label: 'Primary CVR event', value: 'Placed Lineup' },
                ].map((kpi) => (
                  <div key={kpi.label} className="border border-border-subtle rounded-md p-3 bg-base">
                    <p className="data-label">{kpi.label}</p>
                    <p className="mt-1 font-mono text-base font-semibold text-fg-bright">
                      {kpi.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-8 text-fg-muted leading-relaxed">
              The reason that case study matters for a CRM / lifecycle role:
              it wasn&rsquo;t a copywriting fix. The actual diagnosis was that
              the segmentation model was wrong — the team was serving lapsed
              users an acquisition message because the audience was defined
              by recency, not by user state. The creative was the symptom.
              That&rsquo;s the kind of pattern I look for first.
            </p>
          </AnimatedSection>
        </div>
      </section>

      <div className="border-t border-border-subtle" />

      {/* ── 6. Background ─────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <SectionLabel>06 / Background</SectionLabel>
            <h2 className="font-sans text-3xl md:text-4xl font-bold tracking-tight text-fg-bright">
              I&rsquo;ve been building in sports since I was a teenager.
            </h2>
            <p className="mt-6 text-fg-muted text-[17px] leading-relaxed">
              In high school I started{' '}
              <span className="text-fg-bright font-semibold">In Mets We Trust</span>
              , a Mets fan brand. It grew to roughly{' '}
              <span className="text-fg-bright font-semibold">20K Twitter followers</span>{' '}
              and{' '}
              <span className="text-fg-bright font-semibold">100K+ app downloads</span>{' '}
              before ending the only way a teenager-run unofficial fan brand
              can end: a cease-and-desist from the Mets organization. Mets
              and Knicks fan since long before that. Not a tourist in this
              category.
            </p>
          </AnimatedSection>
        </div>
      </section>

      <div className="border-t border-border-subtle" />

      {/* ── 7. Built with ─────────────────────────────────────── */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="font-mono text-[11px] text-fg-dim tracking-wider">
            Built with Next.js, Supabase, Stripe, the Anthropic API, and
            Vercel. Solo build. The stack is the boring part — the work is in
            the GTM.
          </p>
        </div>
      </section>

      <div className="border-t border-border-subtle" />

      {/* ── 8. Contact ────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <SectionLabel>08 / Contact</SectionLabel>
            <h2 className="font-sans text-3xl md:text-4xl font-bold tracking-tight text-fg-bright">
              If you&rsquo;re hiring for CRM, lifecycle, paid social, or
              growth — let&rsquo;s talk.
            </h2>
            <p className="mt-6 text-fg-muted text-[17px] leading-relaxed max-w-2xl">
              Specifically interested in roles at operators where the category
              is the moat: FanDuel, DraftKings, ESPN, SeatGeek, Fanatics,
              bet365. Happy to walk through any of the above in more detail —
              the lifecycle work, the Meta creative thesis, or BetAutopsy&rsquo;s
              GTM plan.
            </p>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="mailto:andlog0713@gmail.com"
                className="border border-border-subtle rounded-md p-5 bg-surface-1 hover:bg-white/[0.04] transition-colors block"
              >
                <p className="case-header">Email</p>
                <p className="mt-2 font-mono text-sm text-scalpel break-all">
                  andlog0713@gmail.com
                </p>
              </a>
              <a
                href="https://www.linkedin.com/in/andrew-tk/" /* TK — replace with actual LinkedIn URL */
                target="_blank"
                rel="noopener noreferrer"
                className="border border-border-subtle rounded-md p-5 bg-surface-1 hover:bg-white/[0.04] transition-colors block"
              >
                <p className="case-header">LinkedIn</p>
                <p className="mt-2 font-mono text-sm text-scalpel">
                  /in/andrew-[TK]
                </p>
              </a>
              <Link
                href="/"
                className="border border-border-subtle rounded-md p-5 bg-surface-1 hover:bg-white/[0.04] transition-colors block"
              >
                <p className="case-header">Live product</p>
                <p className="mt-2 font-mono text-sm text-scalpel">
                  betautopsy.com
                </p>
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </main>
  );
}

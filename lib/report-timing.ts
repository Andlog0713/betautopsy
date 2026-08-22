// Single source of truth for the "how long does a full report take to
// generate" marketing claim.
//
// Previously hand-authored independently in ~9 places, split into two
// conflicting numbers for the same fact: "60 seconds" (app/go/page.tsx,
// components/HeroABTest.tsx, components/SamplePageClient.tsx) and "20
// seconds" (app/faq/page.tsx, app/(auth)/layout.tsx,
// app/(dashboard)/dashboard/page.tsx) - all describing the same thing, the
// full ($19.99) report's generation time (bias dollar costs, "every leak,
// every bias, every dollar amount" - paid-tier content, confirmed by
// reading each site's surrounding copy). Same pattern that produced the
// pricing mess: one fact, hand-typed in multiple places, no source of
// truth, drifts silently.
//
// Verified, not guessed: two independent real runAutopsy() calls this
// session (real Claude API, not mocked) - a 200-entry DFS dataset and a
// 304-bet sportsbook dataset - both landed at ~90 seconds wall-clock.
// Neither existing marketing number survives that: 20s undersells it by
// 4.5x, 60s by 1.5x. "Under 2 minutes" leaves margin above the measured
// ~90s for larger datasets (the product's own claimed cap is 5,000 bets,
// not tested at that size - a much larger bet table as prompt input could
// plausibly take longer) without overselling speed the way the old
// numbers did.
//
// runSnapshot() (the free tier) is a different, much faster case: it never
// calls Claude at all (fully deterministic JS, $0 API cost - see its own
// comment in lib/autopsy-engine.ts) and isn't what any of the sites above
// were describing. Don't reuse this constant for snapshot-speed claims.
export const REPORT_GENERATION_TIME = 'under 2 minutes';
export const REPORT_GENERATION_TIME_CAPITALIZED = 'Under 2 minutes';
// No compact stat-tile variant: SamplePageClient.tsx used to show this as
// a third "<2min to generate" tile next to "5 chapters"/"47 behavioral
// signals" - dropped per review. Next to two quantity claims building
// momentum toward "look how much you get," a wait-time duration reads as
// a tonal shift into "here's how long you'll wait" instead. The sentence-
// form constants above still carry the honest figure everywhere it's
// informative context rather than a bragging stat.

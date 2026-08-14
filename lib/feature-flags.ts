// Feature flags for beta/launch phases.
//
// Pricing is ON by default — the paywall, the pricing grid, the price copy,
// and real tier enforcement are the normal production state. It was
// previously opt-IN (`=== 'true'`), which meant an unset variable silently
// served every user the Pro tier for free; the launch beta ended, so the
// default now matches the live product.
//
// To turn monetization back off (another free beta, a demo environment, a
// local run without Stripe keys) set the variable explicitly:
//
//   NEXT_PUBLIC_PRICING_ENABLED=false
//
// It is a NEXT_PUBLIC_* variable, so it is inlined at build time — changing
// it in Vercel requires a redeploy to take effect, not just a restart.
export const PRICING_ENABLED = process.env.NEXT_PUBLIC_PRICING_ENABLED !== 'false';

// Loud warning if we ship to prod with pricing turned off — every free user
// would silently get Pro features and we'd never realize until MRR flatlined.
// Logs once per cold start; no-op outside production.
//
// SERVER ONLY (`typeof window === 'undefined'`). This module is imported by
// client components (NavBar, Footer, AutopsyReport, …), so without the guard
// the warning is bundled into the client chunks and prints the internal
// monetization state — "all users are being treated as Pro" — into the
// devtools console of every visitor. The signal we actually want is in the
// Vercel runtime logs, which the server-side branch still covers.
if (
  typeof window === 'undefined' &&
  typeof process !== 'undefined' &&
  process.env.NODE_ENV === 'production' &&
  !PRICING_ENABLED
) {
  // eslint-disable-next-line no-console
  console.warn(
    '[feature-flags] PRICING_ENABLED is false in production. ' +
      'All users are being treated as Pro tier and the paywall is hidden. ' +
      'Unset NEXT_PUBLIC_PRICING_ENABLED (or set it to "true") to restore monetization.'
  );
}

// With pricing off, every user is treated as 'pro' so nothing is gated.
export function getEffectiveTier(actualTier: string): string {
  if (!PRICING_ENABLED) return 'pro';
  return actualTier;
}

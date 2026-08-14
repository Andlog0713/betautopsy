// Feature flags for beta/launch phases
// Set NEXT_PUBLIC_PRICING_ENABLED=true in env to re-enable pricing

export const PRICING_ENABLED = process.env.NEXT_PUBLIC_PRICING_ENABLED === 'true';

// Loud warning if we accidentally ship to prod with pricing turned off — every
// free user would silently get Pro features and we'd never realize until MRR
// flatlined. Logs once per cold start; no-op outside production.
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
      'Set NEXT_PUBLIC_PRICING_ENABLED=true to restore monetization.'
  );
}

// During beta, treat all users as 'pro' tier for full access
export function getEffectiveTier(actualTier: string): string {
  if (!PRICING_ENABLED) return 'pro';
  return actualTier;
}

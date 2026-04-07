// Feature flags for beta/launch phases
// Set NEXT_PUBLIC_PRICING_ENABLED=true in env to re-enable pricing

export const PRICING_ENABLED = process.env.NEXT_PUBLIC_PRICING_ENABLED === 'true';

// During beta, treat all users as 'pro' tier for full access
export function getEffectiveTier(actualTier: string): string {
  if (!PRICING_ENABLED) return 'pro';
  return actualTier;
}

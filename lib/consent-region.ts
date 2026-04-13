import { headers } from 'next/headers';

/**
 * ISO-3166 alpha-2 codes for the region where GDPR (or an effectively
 * identical regime) applies. We treat a request as "consent-required" if
 * Vercel's geo header resolves to any of these, or if we cannot resolve
 * a country at all — fail-closed.
 *
 * Scope: EU member states + EEA (Iceland/Liechtenstein/Norway) + UK + CH.
 * Switzerland's FADP is GDPR-aligned; UK-GDPR is effectively identical.
 */
export const CONSENT_REQUIRED_COUNTRIES: ReadonlySet<string> = new Set([
  // EU-27
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  // EEA non-EU
  'IS', 'LI', 'NO',
  // UK + Switzerland
  'GB', 'CH',
]);

/**
 * Returns true if the current request should default analytics consent to
 * DENIED (EU/EEA/UK/CH or unknown origin). Returns false if we can
 * confidently say the request is from a non-consent-required region (US,
 * CA, AU, etc.) and it's safe to default to GRANTED.
 *
 * Reads Vercel's geo-IP header `x-vercel-ip-country`, which Vercel sets on
 * every edge/serverless request at the platform level — no paid add-on
 * required. Locally (no header) we fail closed.
 */
export function shouldRequireConsent(): boolean {
  try {
    const h = headers();
    const country = h.get('x-vercel-ip-country')?.toUpperCase() ?? '';
    if (!country) return true; // Fail-closed: no geo data → require consent
    return CONSENT_REQUIRED_COUNTRIES.has(country);
  } catch {
    // headers() can throw in edge cases (e.g. static generation) — require consent
    return true;
  }
}

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
 * Pure-function counterpart to the old request-time `shouldRequireConsent()`.
 * Caller is responsible for sourcing the country code (middleware reads
 * `x-vercel-ip-country`; client reads the `ba-geo-eu` cookie set by middleware).
 * Fail-closed on missing/unknown country.
 */
export function isConsentRequiredCountry(country: string | null | undefined): boolean {
  if (!country) return true;
  return CONSENT_REQUIRED_COUNTRIES.has(country.toUpperCase());
}

/** Cookie name written by middleware. Value is `"1"` (require consent) or `"0"`. */
export const GEO_COOKIE_NAME = 'ba-geo-eu';

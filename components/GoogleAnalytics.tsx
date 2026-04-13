import Script from 'next/script';
import { shouldRequireConsent } from '@/lib/consent-region';

/**
 * GA4 loader.
 *
 * Consent default is geo-gated: EU/EEA/UK/CH traffic gets
 * `analytics_storage: denied` and must click Accept in the cookie banner
 * before any events flow. Everyone else defaults to `granted` so we
 * actually capture analytics on US / CA / AU / rest-of-world traffic
 * instead of losing ~50% of it to banner abandonment.
 *
 * This is a server component so it can read Vercel's geo-IP header at
 * request time — the consent default is baked into the inline script
 * that's served with the HTML, before any analytics call fires.
 */
export default function GoogleAnalytics() {
  const requireConsent = shouldRequireConsent();
  const analyticsStorage = requireConsent ? 'denied' : 'granted';

  return (
    <>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-KSPJZVJ9CF"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('consent', 'default', { analytics_storage: '${analyticsStorage}' });
          gtag('config', 'G-KSPJZVJ9CF');
        `}
      </Script>
    </>
  );
}

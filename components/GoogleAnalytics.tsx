import Script from 'next/script';
import { isMobileBuild } from '@/lib/platform';
import { GEO_COOKIE_NAME } from '@/lib/consent-region';

/**
 * GA4 loader.
 *
 * Consent default is geo-gated, but the geo decision lives entirely on the
 * client now: middleware writes `ba-geo-eu={"1"|"0"}` into a cookie at the
 * edge, and the inline init script below reads that cookie before any
 * analytics call fires. EU/EEA/UK/CH (or missing cookie) → consent default
 * `denied`; everyone else → `granted`. Same product behavior as the old
 * server-side `shouldRequireConsent()` path; the difference is that this
 * server component no longer reads `headers()`, so the route tree can flip
 * from ƒ Dynamic to fully prerendered.
 *
 * Mobile (Capacitor) builds run as `output: 'export'` with no middleware,
 * and ship to app stores with their own consent flows. `isMobileBuild()` is
 * a compile-time check (NEXT_PUBLIC_BUILD_TARGET) so the unused branch is
 * tree-shaken away.
 */
export default function GoogleAnalytics() {
  const initScript = isMobileBuild()
    ? `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('consent', 'default', { analytics_storage: 'granted' });
      gtag('config', 'G-KSPJZVJ9CF');
    `
    : `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      var __baGeoCookie = (document.cookie || '').split('; ').find(function(c){return c.indexOf('${GEO_COOKIE_NAME}=')===0;});
      var __baGeoValue = __baGeoCookie ? __baGeoCookie.split('=')[1] : null;
      var __baAnalyticsStorage = (__baGeoValue === '0') ? 'granted' : 'denied';
      gtag('consent', 'default', { analytics_storage: __baAnalyticsStorage });
      gtag('config', 'G-KSPJZVJ9CF');
    `;

  return (
    <>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-KSPJZVJ9CF"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {initScript}
      </Script>
    </>
  );
}

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { Analytics } from '@vercel/analytics/next';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import MetaPixel from '@/components/MetaPixel';
import CookieConsent from '@/components/CookieConsent';
import { isMobileBuild } from '@/lib/platform';
import { PRICING_ENABLED } from '@/lib/feature-flags';
import { REPORT_PURCHASE_LIMITS } from '@/types';
import NextTopLoader from 'nextjs-toploader';
import { Toaster } from 'sonner';
import { jakarta, ibmPlexMono } from './fonts';
import { NoiseOverlay } from '@/components/NoiseOverlay';
import { ScrollToTop } from '@/components/ScrollToTop';
import SplashHider from '@/components/SplashHider';
import ZoomGate from '@/components/ZoomGate';
import AuthProvider from '@/components/AuthProvider';
import AIConsentModal from '@/components/AIConsentModal';
import JsonLd from '@/components/JsonLd';
import { CSP_NONCE_HEADER } from '@/lib/content-security-policy';
import { CspNonceProvider } from '@/components/CspNonceProvider';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.betautopsy.com'),
  title: 'BetAutopsy | Sports Betting Behavioral Analysis',
  description:
    'Upload your sports betting, DFS pick\'em, or prediction market history and get a full behavioral analysis. Identify cognitive biases, strategic leaks, and emotional patterns.',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'BetAutopsy | Sports Betting Behavioral Analysis',
    description: 'Upload your sports betting, DFS pick\'em, or prediction market history and get a full behavioral analysis. Identify cognitive biases, strategic leaks, and emotional patterns.',
    url: 'https://www.betautopsy.com',
    siteName: 'BetAutopsy',
    images: [{ url: '/og', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BetAutopsy | Sports Betting Behavioral Analysis',
    description: 'Upload your sports betting, DFS pick\'em, or prediction market history and get a full behavioral analysis.',
    images: ['/og'],
  },
  alternates: {
    canonical: '/',
  },
  verification: {
    other: {
      'facebook-domain-verification': '0ch3o93veje4wxu90cj4xvdclpbq6g',
    },
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BetAutopsy',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Web documents are rendered per request so the CSP nonce in the response
  // always matches the framework and app-owned scripts in the HTML. The
  // legacy Capacitor export has no middleware and must remain fully static.
  const nonce = isMobileBuild()
    ? undefined
    : headers().get(CSP_NONCE_HEADER) ?? undefined;

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'BetAutopsy',
    url: 'https://www.betautopsy.com',
    logo: 'https://www.betautopsy.com/icon.png',
    description: 'Sports betting behavioral analysis. Identify cognitive biases, strategic leaks, and emotional patterns in your betting.',
    sameAs: [],
  };

  const appJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'BetAutopsy',
    url: 'https://www.betautopsy.com',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    description: 'Upload your sports betting, DFS pick\'em, or prediction market history and get a full behavioral analysis: cognitive biases, strategic leaks, emotional patterns, and a personalized action plan.',
    // Paid offers are advertised only while the paywall is actually live.
    // With `PRICING_ENABLED` false every user is served the Pro tier for
    // free, and structured data quoting a price would put a price into
    // search results that nobody is charged. Single report price, no Pro
    // offer - Pro is no longer marketed on web (2026-08-17).
    offers: PRICING_ENABLED
      ? [
          { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Free Snapshot' },
          { '@type': 'Offer', price: String(REPORT_PURCHASE_LIMITS.price), priceCurrency: 'USD', name: 'Full Report' },
        ]
      : [{ '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Free Snapshot' }],
  };

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'BetAutopsy',
    url: 'https://www.betautopsy.com',
    description: 'Sports betting behavioral analysis.',
  };

  return (
    <html lang="en" className={`${jakarta.variable} ${ibmPlexMono.variable}`} data-build-target={isMobileBuild() ? 'mobile' : 'web'}>
      <head>
        {/*
         * `viewport-fit=cover` is required for iOS to populate the
         * `env(safe-area-inset-*)` CSS tokens with real notch / home
         * indicator values. Without it they stay zero and the
         * DashboardShell's mobile header sits under the status bar.
         * Kept for both build targets.
         *
         * `maximum-scale=1.0, user-scalable=no` blocks pinch-to-zoom
         * outright, which is a WCAG 1.4.4 (Resize Text) violation —
         * "accessibility-zoom still works at the OS level" is not an
         * equivalent substitute; browser pinch-zoom and OS-level
         * magnification are different mechanisms serving different
         * low-vision users, and disabling the former isn't excused by
         * the latter existing. The stated reason (pinch-to-zoom
         * breaking app chrome) is specific to the Capacitor webview,
         * not the web build, so it's scoped to the mobile build only.
         * Web visitors get standard pinch-zoom back.
         */}
        <meta name="viewport" content={`viewport-fit=cover, width=device-width, initial-scale=1.0${isMobileBuild() ? ', maximum-scale=1.0, user-scalable=no' : ''}`} />
        <link rel="preconnect" href="https://o4511186679365632.ingest.us.sentry.io" />
        <link rel="alternate" type="application/rss+xml" title="BetAutopsy Blog" href="/blog/feed.xml" />
        <JsonLd data={orgJsonLd} />
        <JsonLd data={appJsonLd} />
        <JsonLd data={websiteJsonLd} />
      </head>
      <body>
        <CspNonceProvider nonce={nonce}>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:bg-scalpel focus:text-base focus:px-4 focus:py-2 focus:rounded-sm focus:text-sm focus:font-medium">
            Skip to content
          </a>
        {/*
         * Fires `hideSplashScreen()` exactly once on first mount
         * (Capacitor only — no-op on web). Must sit above
         * `{children}` so it mounts as part of the initial React
         * tree, not gated behind route transitions.
         */}
        <SplashHider />
        {/*
         * iOS-PR-1 fix-forward: WKWebView ignores
         * `user-scalable=no` since iOS 10. ZoomGate calls
         * `preventDefault` on Apple's `gesturestart` /
         * `gesturechange` / `gestureend` events as a JS
         * belt-and-suspenders on top of `touch-action: pan-x pan-y`
         * in globals.css. No-op on non-iOS browsers.
         */}
        <ZoomGate />
        <ScrollToTop />
        <NextTopLoader nonce={nonce} color="#FACC15" height={2} showSpinner={false} shadow={false} />
        <NoiseOverlay />
        <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { background: '#131A20', border: '1px solid rgba(255,255,255,0.08)', color: '#EDEDF3', fontFamily: 'var(--font-jakarta)' } }} />
        {process.env.NODE_ENV === 'production' && (
          <>
            <GoogleAnalytics nonce={nonce} />
            <Analytics />
            {/*
             * Meta ad pixel is web-only. Skipped on the mobile build
             * because pixels don't function inside a Capacitor WebView
             * (conversion attribution depends on web cookies and
             * third-party-cookie context the iOS app doesn't have).
             * `isMobileBuild()` is a compile-time check
             * (NEXT_PUBLIC_BUILD_TARGET) so Next inlines the boolean
             * and tree-shakes the component tree out of the mobile
             * bundle entirely. Web tracking is unchanged.
             */}
            {!isMobileBuild() && (
              <>
                <MetaPixel nonce={nonce} />
                <CookieConsent />
              </>
            )}
          </>
        )}
        <AuthProvider>{children}</AuthProvider>
        {/*
         * Mobile-only AI processing disclosure (App Store Review
         * Guideline 5.1.2(i), Nov 2025 update). The component
         * itself self-gates on `isMobileApp()` at runtime, but
         * `isMobileBuild()` here lets webpack tree-shake it out of
         * the web bundle entirely.
         */}
          {isMobileBuild() && <AIConsentModal />}
        </CspNonceProvider>
      </body>
    </html>
  );
}

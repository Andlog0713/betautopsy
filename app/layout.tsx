import type { Metadata } from 'next';
import './globals.css';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import TikTokPixel from '@/components/TikTokPixel';
import CookieConsent from '@/components/CookieConsent';
import NextTopLoader from 'nextjs-toploader';
import { Toaster } from 'sonner';
import { jakarta, ibmPlexMono } from './fonts';
import { NoiseOverlay } from '@/components/NoiseOverlay';
import { ScrollToTop } from '@/components/ScrollToTop';

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
    images: [{ url: '/api/og', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BetAutopsy | Sports Betting Behavioral Analysis',
    description: 'Upload your sports betting, DFS pick\'em, or prediction market history and get a full behavioral analysis.',
    images: ['/api/og'],
  },
  alternates: {
    canonical: '/',
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
    offers: [
      { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Free Snapshot' },
      { '@type': 'Offer', price: '9.99', priceCurrency: 'USD', name: 'Full Report' },
      { '@type': 'Offer', price: '19.99', priceCurrency: 'USD', name: 'Pro', billingIncrement: 'P1M' },
    ],
  };

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'BetAutopsy',
    url: 'https://www.betautopsy.com',
    description: 'Sports betting behavioral analysis.',
  };

  return (
    <html lang="en" className={`${jakarta.variable} ${ibmPlexMono.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="alternate" type="application/rss+xml" title="BetAutopsy Blog" href="/blog/feed.xml" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:bg-scalpel focus:text-base focus:px-4 focus:py-2 focus:rounded-sm focus:text-sm focus:font-medium">
          Skip to content
        </a>
        <ScrollToTop />
        <NextTopLoader color="#00C9A7" height={2} showSpinner={false} shadow="0 0 10px #00C9A7,0 0 5px #00C9A7" />
        <NoiseOverlay />
        <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { background: '#12121c', border: '1px solid rgba(255,255,255,0.08)', color: '#e5e5e5', fontFamily: 'var(--font-jakarta)' } }} />
        {process.env.NODE_ENV === 'production' && <><GoogleAnalytics /><TikTokPixel /><CookieConsent /></>}
        {children}
      </body>
    </html>
  );
}

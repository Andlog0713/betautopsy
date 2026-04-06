import type { Metadata } from 'next';
import './globals.css';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import TikTokPixel from '@/components/TikTokPixel';
import NextTopLoader from 'nextjs-toploader';

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
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
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
        <NextTopLoader color="#00C9A7" height={2} showSpinner={false} shadow="0 0 10px #00C9A7,0 0 5px #00C9A7" />
        {process.env.NODE_ENV === 'production' && <><GoogleAnalytics /><TikTokPixel /></>}
        {children}
      </body>
    </html>
  );
}

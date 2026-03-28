import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.betautopsy.com'),
  title: 'BetAutopsy — AI-Powered Sports Betting Behavioral Analysis',
  description:
    'Upload your sports betting or DFS pick\'em history and get an AI-powered behavioral analysis. Identify cognitive biases, strategic leaks, and emotional patterns.',
  icons: {
    icon: '/favicon.svg',
  },
  alternates: {
    canonical: '/',
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
    description: 'AI-powered sports betting behavioral analysis. Identify cognitive biases, strategic leaks, and emotional patterns in your betting.',
    sameAs: [],
  };

  const appJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'BetAutopsy',
    url: 'https://www.betautopsy.com',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    description: 'Upload your sports betting or DFS pick\'em history and get an AI-powered behavioral analysis — cognitive biases, strategic leaks, emotional patterns, and a personalized action plan.',
    offers: [
      { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Free' },
      { '@type': 'Offer', price: '9.99', priceCurrency: 'USD', name: 'Pro', billingIncrement: 'P1M' },
      { '@type': 'Offer', price: '24.99', priceCurrency: 'USD', name: 'Sharp', billingIncrement: 'P1M' },
    ],
  };

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'BetAutopsy',
    url: 'https://www.betautopsy.com',
    description: 'AI-powered sports betting behavioral analysis.',
  };

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-KSPJZVJ9CF" />
        <script
          dangerouslySetInnerHTML={{ __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-KSPJZVJ9CF');
          `}}
        />
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
      <body>{children}</body>
    </html>
  );
}

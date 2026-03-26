import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BetAutopsy — AI-Powered Sports Betting Behavioral Analysis',
  description:
    'Upload your bet history and get an AI-powered sports betting behavioral analysis. Identify cognitive biases, strategic leaks, and emotional betting patterns.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'BetAutopsy',
    url: 'https://www.betautopsy.com',
    description: 'AI-powered sports betting behavioral analysis. Upload your bet history, identify cognitive biases, strategic leaks, and emotional betting patterns.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://www.betautopsy.com/blog?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'BetAutopsy',
    url: 'https://www.betautopsy.com',
    logo: 'https://www.betautopsy.com/favicon.svg',
    sameAs: [],
  };

  const siteLinksJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'BetAutopsy — AI-Powered Sports Betting Behavioral Analysis',
    url: 'https://www.betautopsy.com',
    mainEntity: {
      '@type': 'SoftwareApplication',
      name: 'BetAutopsy',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
  };

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLinksJsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

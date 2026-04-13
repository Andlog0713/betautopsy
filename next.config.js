const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@anthropic-ai/sdk'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy-Report-Only',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.anthropic.com https://www.google-analytics.com https://*.sentry.io; frame-src https://js.stripe.com https://challenges.cloudflare.com;",
          },
        ],
      },
      {
        source: '/blog/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200' },
        ],
      },
      {
        source: '/faq',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200' },
        ],
      },
      {
        source: '/how-to-upload',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Force apex domain → www with a permanent (308) redirect so Google
      // consolidates ranking signals onto the canonical www host. Vercel's
      // default apex-to-www redirect uses 307 (temporary), which causes
      // Google to keep both URLs independently indexed and prevents the
      // homepage from ranking under the canonical www.betautopsy.com.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'betautopsy.com' }],
        destination: 'https://www.betautopsy.com/:path*',
        permanent: true,
      },
      // /whats-inside was replaced by /sample (which shows the actual
      // ungated demo report instead of a marketing breakdown).
      {
        source: '/whats-inside',
        destination: '/sample',
        permanent: true,
      },
    ];
  },
};

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
  hideSourceMaps: true,
});

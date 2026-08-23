const { withSentryConfig } = require('@sentry/nextjs');

const isMobileBuild = process.env.NEXT_PUBLIC_BUILD_TARGET === 'mobile';

async function headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
    {
      // CORS: allow the Capacitor native webview (served from a
      // `capacitor://` or `https://localhost` origin, depending on
      // platform) to call the hosted API over cross-origin fetch.
      // Auth is still enforced per-request by
      // `getAuthenticatedClient()` — either via the session cookie
      // (web) or the `Authorization: Bearer <token>` header
      // (mobile). `*` for the origin is intentional: the API is
      // stateless per request and every endpoint authenticates on
      // its own, so there is no cookie/session to protect via a
      // narrow allowlist.
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
      ],
    },
  ];
}

async function redirects() {
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
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@anthropic-ai/sdk'],
  },
  // Mobile (Capacitor) build target: fully static export.
  //
  //   - `headers()` and `redirects()` are unsupported under
  //     `output: 'export'`, so they are omitted for mobile builds.
  //
  //   - `trailingSlash: true` makes Next emit `out/signup/index.html`
  //     (directory layout) instead of `out/signup.html` (flat
  //     layout), and rewrites every internal `<Link>` href to end
  //     with `/`. Capacitor's local file server at
  //     `betautopsy://localhost` serves the directory layout
  //     reliably; the flat layout silently fails client-side
  //     navigation because the Next router and the file server
  //     disagree on where each route's chunk lives, and
  //     `router.push('/signup')` ends up as a no-op.
  //
  // The web build keeps its default behavior (flat paths, no
  // trailing slash) so existing URLs, canonical tags, and the
  // Vercel route table are byte-for-byte unchanged.
  ...(isMobileBuild
    ? { output: 'export', trailingSlash: true }
    : { headers, redirects }),
};

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
  hideSourceMaps: true,
});

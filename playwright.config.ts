import { defineConfig, devices } from '@playwright/test';

/**
 * Mobile regression suite for BetAutopsy.
 *
 * Stops the recurring class of bugs that produced six fixes in
 * 2026-04-15..16 (horizontal overflow in WKWebView, tracking-wider
 * clipping, tab bar under home indicator, splash race, etc.). Runs
 * on every PR via `.github/workflows/mobile-regression.yml`.
 *
 * Uses WebKit (Safari engine) for the closest parity to the iOS
 * WKWebView the Capacitor app actually ships. Three iPhone
 * viewports cover the full screen-size range Apple sells today.
 *
 * `webServer.command` boots Next on `localhost:3000` — the bundled
 * static export at `out/` would also work, but `next dev`/`next
 * start` is closer to the production WebView's runtime conditions.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'iphone-se',
      use: { ...devices['iPhone SE (3rd gen)'] },
    },
    {
      name: 'iphone-16-pro',
      use: { ...devices['iPhone 15 Pro'], viewport: { width: 393, height: 852 } },
    },
    {
      name: 'iphone-pro-max',
      use: { ...devices['iPhone 15 Pro Max'], viewport: { width: 430, height: 932 } },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        // `next dev` JIT-compiles Tailwind on demand and races React
        // hydration on first request — measurements taken under it
        // can fire before the buttons' CSS classes resolve, so e.g.
        // a `min-h-[44px] inline-flex` button reads as its 18-line-
        // height inline text bounds. `next build && next start` uses
        // the production CSS bundle, which matches what ships in the
        // Capacitor iOS static export.
        //
        // `reuseExistingServer: false` everywhere — including local —
        // because silently piggybacking on whatever node process
        // happens to own port 3000 (commonly a stale `next dev` from
        // an earlier session) produces test results measured against
        // stale source. Better to fail fast with EADDRINUSE than to
        // silently lie. If a dev server is running, kill it first:
        //   lsof -tiTCP:3000 -sTCP:LISTEN | xargs kill -9
        command: 'npm run build && npm run start',
        url: 'http://localhost:3000',
        reuseExistingServer: false,
        timeout: 240_000,
      },
});

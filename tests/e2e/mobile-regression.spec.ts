import { test, expect, Page, type BrowserContext, type Route } from '@playwright/test';

/**
 * Three assertions per route, three viewports, run on every PR:
 *
 *   1. No horizontal overflow.
 *      `documentElement.scrollWidth > innerWidth` is what produces
 *      the "page scrolls sideways inside the WKWebView" bug we
 *      shipped four times in mid-April. A single fixed-width child
 *      anywhere in the tree breaks this.
 *
 *   2. Every interactive element has a tap target >= 44x44 pt.
 *      Apple HIG minimum. Most violations will be icon-only buttons
 *      (modal close X, info circles) that look 24-32px but should
 *      have padding to meet 44pt. **Do not lower this threshold** —
 *      the fix is always padding on the offender, never a relaxed
 *      assertion. If a real edge case emerges (inline text-link,
 *      etc.) exempt it explicitly by selector with a comment.
 *
 *   3. No `position: fixed` element bottom-edge overlapping the
 *      home indicator without safe-area padding. Catches the
 *      tab-bar-under-home-indicator regression class.
 *
 * Auth-protected routes (`/dashboard/*`) need a seeded session +
 * storageState — that lands in a follow-up branch; this suite
 * covers the public/auth surface where the recurring bug spike
 * originated.
 */

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/reset-password',
  '/privacy',
  '/terms',
  '/faq',
];

const PRICING_USER_ID = '44444444-4444-4444-8444-444444444444';
const PRICING_USER = {
  id: PRICING_USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'pricing-e2e@example.com',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  identities: [],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  is_anonymous: false,
};
const PRICING_PROFILE = {
  id: PRICING_USER_ID,
  email: PRICING_USER.email,
  display_name: 'Pricing E2E',
  subscription_tier: 'free',
  subscription_status: 'inactive',
  stripe_customer_id: null,
  streak_count: 0,
  is_admin: false,
};
const PRICING_CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': [
    'accept-profile',
    'apikey',
    'authorization',
    'content-profile',
    'content-type',
    'prefer',
    'x-client-info',
    'x-supabase-api-version',
  ].join(', '),
  'access-control-allow-methods': 'GET, HEAD, POST, PATCH, DELETE, OPTIONS',
};

const TAP_TARGET_MIN = 44;

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function makePricingAccessToken(expiresAt: number): string {
  return [
    base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    base64Url(JSON.stringify({ sub: PRICING_USER_ID, role: 'authenticated', exp: expiresAt })),
    'pricing-e2e-signature',
  ].join('.');
}

async function prepareAuthenticatedPricing(
  context: BrowserContext,
  appOrigin: string,
): Promise<void> {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  const session = {
    access_token: makePricingAccessToken(expiresAt),
    refresh_token: 'pricing-e2e-refresh-token',
    expires_in: 3600,
    expires_at: expiresAt,
    token_type: 'bearer',
    user: PRICING_USER,
  };
  await context.addCookies([{
    name: 'sb-stub-auth-token',
    value: `base64-${base64Url(JSON.stringify(session))}`,
    url: appOrigin,
    sameSite: 'Lax',
  }]);

  await context.route('https://stub.supabase.co/**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: PRICING_CORS_HEADERS });
      return;
    }

    const acceptsObject = request.headers().accept?.includes('application/vnd.pgrst.object');
    let body: unknown = [];
    if (url.pathname === '/auth/v1/user') {
      body = PRICING_USER;
    } else if (url.pathname === '/rest/v1/profiles') {
      body = acceptsObject ? PRICING_PROFILE : [PRICING_PROFILE];
    } else if (url.pathname === '/rest/v1/autopsy_reports') {
      body = acceptsObject ? null : [];
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: PRICING_CORS_HEADERS,
      body: JSON.stringify(body),
    });
  });
}

// Selectors that may legitimately be smaller than 44pt — typically
// inline text links/buttons inside paragraphs, or accessibility
// helpers that aren't actually tap targets in normal use. Keep this
// list short and specific; never widen it to make a failing test
// pass.
//
// `p button` covers the inline-button-as-link pattern (e.g. signup's
// "TRY AGAIN" word inside a sentence). When that's the only way to
// trigger a behavior, expanding the button to 44pt visually breaks
// the surrounding text flow.
//
// `.sr-only` and `[class*="sr-only"]` skip the accessibility
// "skip-to-content" link and similar visually-hidden controls. They
// only appear on keyboard focus, not as tap targets.
//
// `footer a` exempts the small mono-style text-link list that lives
// in the footer (Privacy, Terms, Blog, FAQ). That's a documented
// design pattern (text-link list, not a button row) and Apple HIG
// treats it as inline text, not standalone tap targets.
const TAP_TARGET_EXEMPT_SELECTORS = [
  'p a',                  // text-link inside a paragraph
  'li a',                 // text-link inside a list item
  'span a',               // text-link inside inline span
  '[role="link"]',        // explicitly-marked text link
  'p button',             // inline button-as-link inside a paragraph
  '.sr-only',             // a11y skip link (visually hidden by default)
  '[class*="sr-only"]',   // tailwind sr-only utility composed with focus:
  'footer a',             // small mono text-link list in footer
  // Demo report on the landing page — non-interactive showcase. The
  // same component on auth-gated /dashboard/reports/[id] does need
  // proper tap targets (deferred to MOBILE_AUDIT.md Section 4).
  '[data-demo-showcase] a',
  '[data-demo-showcase] button',
];

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    };
  });
  expect(
    overflow.scrollWidth,
    `horizontal overflow: scrollWidth=${overflow.scrollWidth} > innerWidth=${overflow.innerWidth}`
  ).toBeLessThanOrEqual(overflow.innerWidth);
}

async function expectTapTargets(page: Page, exemptSelectors: string[]) {
  const offenders = await page.evaluate(
    ({ min, exempt }) => {
      const exemptSet = new Set<Element>();
      for (const sel of exempt) {
        try {
          for (const el of Array.from(document.querySelectorAll(sel))) {
            exemptSet.add(el);
          }
        } catch {
          /* invalid selector — skip */
        }
      }
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(
          'a, button, [role="button"], input[type="button"], input[type="submit"]'
        )
      );
      const out: Array<{
        tag: string;
        text: string;
        width: number;
        height: number;
        rectW: number;
        rectH: number;
        display: string;
        padX: number;
        padY: number;
        classes: string;
      }> = [];
      for (const el of candidates) {
        if (exemptSet.has(el)) continue;
        // Skip elements that aren't visible — display:none, aria-hidden,
        // unrendered. They can't be tapped so they can't fail.
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') continue;

        // Effective tap rect. For inline elements, padding doesn't
        // extend the layout box but DOES extend the visual hit zone —
        // iOS / WebKit hit-test the padded area. Inflate the rect by
        // the padding so the assertion matches what's actually
        // tappable on a phone.
        const padTop = parseFloat(style.paddingTop) || 0;
        const padRight = parseFloat(style.paddingRight) || 0;
        const padBottom = parseFloat(style.paddingBottom) || 0;
        const padLeft = parseFloat(style.paddingLeft) || 0;
        const isInline = style.display === 'inline';
        const effectiveW = isInline ? rect.width + padLeft + padRight : rect.width;
        const effectiveH = isInline ? rect.height + padTop + padBottom : rect.height;

        if (effectiveW < min || effectiveH < min) {
          out.push({
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 60),
            width: Math.round(effectiveW),
            height: Math.round(effectiveH),
            rectW: Math.round(rect.width),
            rectH: Math.round(rect.height),
            display: style.display,
            padX: Math.round(padLeft + padRight),
            padY: Math.round(padTop + padBottom),
            classes: el.className.toString().slice(0, 100),
          });
        }
      }
      return out;
    },
    { min: TAP_TARGET_MIN, exempt: exemptSelectors }
  );
  expect(
    offenders,
    `${offenders.length} tap target(s) below ${TAP_TARGET_MIN}pt:\n` +
      offenders
        .slice(0, 20)
        .map(
          (o) =>
            `  <${o.tag}> "${o.text}"\n` +
            `      effective ${o.width}x${o.height}  rect ${o.rectW}x${o.rectH}  ` +
            `display=${o.display}  pad=${o.padX}x${o.padY}\n` +
            `      class="${o.classes}"`
        )
        .join('\n')
  ).toEqual([]);
}

async function expectNoFixedUnderHomeIndicator(page: Page) {
  // iPhone safe-area-inset-bottom is ~34pt on home-indicator devices.
  // Anything `position: fixed` whose bottom edge lives in that band
  // without padding for `env(safe-area-inset-bottom)` reads as broken.
  const offenders = await page.evaluate(() => {
    const SAFE_AREA = 34;
    const all = Array.from(document.querySelectorAll<HTMLElement>('*'));
    const out: Array<{ tag: string; bottom: number; class: string }> = [];
    for (const el of all) {
      const style = getComputedStyle(el);
      if (style.position !== 'fixed') continue;
      // `pointer-events: none` elements are explicitly opted out of
      // hit-testing — taps pass through them entirely. The most
      // common case is a full-screen decorative overlay (noise
      // texture, gradient mask, etc.). They sit `inset-0` and would
      // otherwise produce a false positive on every route.
      if (style.pointerEvents === 'none') continue;
      const rect = el.getBoundingClientRect();
      const distFromBottom = window.innerHeight - rect.bottom;
      if (distFromBottom < 0 || distFromBottom > SAFE_AREA) continue;
      // If the element has bottom padding accounting for safe-area,
      // don't flag it. We can't read CSS env() directly, but a
      // padding-bottom > 0 is the standard pattern.
      const paddingBottom = parseFloat(style.paddingBottom);
      if (paddingBottom > 0) continue;
      out.push({
        tag: el.tagName.toLowerCase(),
        bottom: Math.round(distFromBottom),
        class: el.className.toString().slice(0, 80),
      });
    }
    return out;
  });
  expect(
    offenders,
    `${offenders.length} fixed element(s) under home indicator without safe-area padding:\n` +
      offenders.map((o) => `  <${o.tag}> bottom=${o.bottom}pt class="${o.class}"`).join('\n')
  ).toEqual([]);
}

async function expectMobileLayout(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(250);
  await expectNoHorizontalOverflow(page);
  await expectTapTargets(page, TAP_TARGET_EXEMPT_SELECTORS);
  await expectNoFixedUnderHomeIndicator(page);
}

for (const route of PUBLIC_ROUTES) {
  test(`mobile regression — ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'networkidle' });
    // Belt-and-suspenders for hydration: after networkidle, the React
    // tree has typically finished its first commit, but `min-h-[44px]`
    // and other layout-critical classes can still be one paint away
    // from settling. A small idle wait stops the suite from measuring
    // mid-hydration on slow CI runners.
    await expectMobileLayout(page);
  });
}

test('mobile regression: authenticated /pricing', async ({ page, context, baseURL }) => {
  expect(baseURL).toBeTruthy();
  const appOrigin = new URL(baseURL!).origin;
  expect(['localhost', '127.0.0.1']).toContain(new URL(appOrigin).hostname);
  await prepareAuthenticatedPricing(context, appOrigin);

  await page.goto('/pricing', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(page.getByRole('heading', { name: 'Pricing', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Full Report', exact: true })).toBeVisible();
  await expect(page.getByText('$19.99', { exact: true })).toBeVisible();
  await expect(page.getByText('Pay once. No subscription.', { exact: true })).toBeVisible();
  await expectMobileLayout(page);
});

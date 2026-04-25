import { test, expect, Page } from '@playwright/test';

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
  '/pricing',
  '/privacy',
  '/terms',
  '/faq',
];

const TAP_TARGET_MIN = 44;

// Selectors that may legitimately be smaller than 44pt — typically
// inline text links inside paragraphs where the surrounding line
// height provides the actual hit zone. Keep this list short and
// specific; never widen it to make a failing test pass.
const TAP_TARGET_EXEMPT_SELECTORS = [
  'p a',           // text-link inside a paragraph
  'li a',          // text-link inside a list item
  'span a',        // text-link inside inline span
  '[role="link"]', // explicitly-marked text link
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
      }> = [];
      for (const el of candidates) {
        if (exemptSet.has(el)) continue;
        // Skip elements that aren't visible — display:none, aria-hidden,
        // unrendered. They can't be tapped so they can't fail.
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') continue;
        if (rect.width < min || rect.height < min) {
          out.push({
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 60),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
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
        .map((o) => `  <${o.tag}> ${o.width}x${o.height} "${o.text}"`)
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

for (const route of PUBLIC_ROUTES) {
  test(`mobile regression — ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'networkidle' });
    await expectNoHorizontalOverflow(page);
    await expectTapTargets(page, TAP_TARGET_EXEMPT_SELECTORS);
    await expectNoFixedUnderHomeIndicator(page);
  });
}

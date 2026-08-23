import { test, expect } from '@playwright/test';

const REPRESENTATIVE_DOCUMENT_ROUTES = [
  '/',
  '/faq',
  '/login',
  '/sample',
  '/blog/why-am-i-losing-at-sports-betting',
];

function nonceFromPolicy(policy: string): string {
  const match = policy.match(/'nonce-([^']+)'/);
  expect(match, 'document CSP must contain a nonce').not.toBeNull();
  return match![1];
}

test('document responses enforce a fresh nonce and nonce every inline script', async ({
  request,
}) => {
  const observedNonces: string[] = [];

  for (const route of REPRESENTATIVE_DOCUMENT_ROUTES) {
    const response = await request.get(route);
    const policy = response.headers()['content-security-policy'];
    const html = await response.text();
    const nonce = nonceFromPolicy(policy);
    observedNonces.push(nonce);

    expect(
      response.headers()['content-security-policy-report-only'],
      `${route} must not retain Report-Only mode`
    ).toBeUndefined();
    expect(response.headers()['cache-control'], `${route} must not cache its nonce`)
      .toContain('private');
    expect(response.headers()['cache-control'], `${route} must not cache its nonce`)
      .toContain('no-store');
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");

    const inlineScriptNonces = Array.from(
      html.matchAll(/<script(?![^>]*\bsrc=)[^>]*\bnonce="([^"]+)"[^>]*>/g),
      (match) => match[1]
    );
    const inlineScriptCount = (html.match(/<script(?![^>]*\bsrc=)[^>]*>/g) ?? [])
      .length;

    expect(inlineScriptCount, `${route} must contain framework scripts`)
      .toBeGreaterThan(0);
    expect(inlineScriptNonces, `${route} has an inline script without a nonce`)
      .toHaveLength(inlineScriptCount);
    expect(new Set(inlineScriptNonces), `${route} has a mismatched script nonce`)
      .toEqual(new Set([nonce]));
  }

  expect(new Set(observedNonces).size).toBe(REPRESENTATIVE_DOCUMENT_ROUTES.length);
});

test('the browser blocks an untrusted inline event handler', async ({ page }) => {
  const response = await page.goto('/faq', { waitUntil: 'domcontentloaded' });
  expect(response).not.toBeNull();
  expect(response!.headers()['content-security-policy']).toBeTruthy();

  await page.evaluate(() => {
    const button = document.createElement('button');
    button.setAttribute(
      'onclick',
      'window.__betAutopsyUntrustedInlineRan = true'
    );
    document.body.appendChild(button);
    button.click();
  });

  const executed = await page.evaluate(
    () =>
      (window as typeof window & { __betAutopsyUntrustedInlineRan?: boolean })
        .__betAutopsyUntrustedInlineRan
  );
  expect(executed).toBeUndefined();
});

test('non-document responses receive a deny-all policy', async ({ request }) => {
  const response = await request.get('/api/template');

  expect(response.ok()).toBe(true);
  expect(response.headers()['content-security-policy']).toBe(
    "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';"
  );
});

test('the HTML unsubscribe endpoint keeps document styling under enforcement', async ({
  request,
}) => {
  const response = await request.get('/api/unsubscribe');
  const policy = response.headers()['content-security-policy'];

  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('text/html');
  expect(policy).toContain("script-src 'self'");
  expect(policy).toContain("style-src 'self' 'unsafe-inline'");
  expect(policy).toContain("'nonce-");
});

'use client';

/**
 * TikTok Pixel event helpers.
 * Only fires in production when ttq is loaded.
 */

function getTTQ(): Record<string, (...args: unknown[]) => void> | null {
  if (typeof window === 'undefined') return null;
  const ttq = (window as unknown as Record<string, unknown>).ttq as Record<string, (...args: unknown[]) => void> | undefined;
  return ttq ?? null;
}

export function trackSignup() {
  getTTQ()?.track('CompleteRegistration', {
    contents: [{ content_id: 'signup', content_type: 'product', content_name: 'BetAutopsy Account' }],
    value: 0,
    currency: 'USD',
  });
}

export function trackQuizComplete(archetype: string) {
  getTTQ()?.track('Search', {
    contents: [{ content_id: 'quiz', content_type: 'product', content_name: 'Bet DNA Quiz' }],
    search_string: archetype,
    value: 0,
    currency: 'USD',
  });
}

export function trackCheckout(tier: string, price: number) {
  getTTQ()?.track('InitiateCheckout', {
    contents: [{ content_id: tier, content_type: 'product', content_name: `BetAutopsy ${tier}` }],
    value: price,
    currency: 'USD',
  });
}

export function trackPurchase(tier: string, price: number) {
  getTTQ()?.track('Purchase', {
    contents: [{ content_id: tier, content_type: 'product', content_name: `BetAutopsy ${tier}` }],
    value: price,
    currency: 'USD',
  });
}

export function trackReportView() {
  getTTQ()?.track('ViewContent', {
    contents: [{ content_id: 'report', content_type: 'product', content_name: 'Autopsy Report' }],
    value: 0,
    currency: 'USD',
  });
}

export function trackUpload() {
  getTTQ()?.track('AddToCart', {
    contents: [{ content_id: 'upload', content_type: 'product', content_name: 'Bet History Upload' }],
    value: 0,
    currency: 'USD',
  });
}

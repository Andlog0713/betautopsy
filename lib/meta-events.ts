'use client';

/**
 * Meta (Facebook) Pixel client-side event helpers.
 *
 * Mirrors the shape of lib/tiktok-events.ts so call sites can fire both
 * alongside each other. Additive only — does not replace TikTok events.
 *
 * Each helper generates a unique event_id and passes it to fbq via the
 * {eventID} option. Server-side CAPI calls that want to dedupe with a
 * client fire should reuse the same event_id (returned from these
 * helpers) via a cookie, Stripe metadata, or an API request body.
 */

type FbqParams = Record<string, unknown>;
type FbqOptions = { eventID?: string };
type FBQ = (
  cmd: 'track' | 'trackCustom' | 'init' | 'consent',
  eventOrArg: string,
  params?: FbqParams,
  options?: FbqOptions
) => void;

function getFBQ(): FBQ | null {
  if (typeof window === 'undefined') return null;
  const fbq = (window as unknown as Record<string, unknown>).fbq as FBQ | undefined;
  return fbq ?? null;
}

function newEventId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function trackSignup(): string {
  const eventID = newEventId();
  getFBQ()?.(
    'track',
    'CompleteRegistration',
    {
      content_name: 'BetAutopsy Account',
      currency: 'USD',
      value: 0,
    },
    { eventID }
  );
  return eventID;
}

export function trackQuizComplete(archetype: string): string {
  const eventID = newEventId();
  getFBQ()?.(
    'track',
    'Lead',
    {
      content_name: 'Bet DNA Quiz',
      content_category: archetype,
      currency: 'USD',
      value: 0,
    },
    { eventID }
  );
  return eventID;
}

export function trackCheckout(tier: string, price: number): string {
  const eventID = newEventId();
  getFBQ()?.(
    'track',
    'InitiateCheckout',
    {
      content_name: `BetAutopsy ${tier}`,
      content_ids: [tier],
      content_type: 'product',
      currency: 'USD',
      value: price,
    },
    { eventID }
  );
  return eventID;
}

export function trackPurchase(tier: string, price: number): string {
  const eventID = newEventId();
  getFBQ()?.(
    'track',
    'Purchase',
    {
      content_name: `BetAutopsy ${tier}`,
      content_ids: [tier],
      content_type: 'product',
      currency: 'USD',
      value: price,
    },
    { eventID }
  );
  return eventID;
}

export function trackReportView(): string {
  const eventID = newEventId();
  getFBQ()?.(
    'track',
    'ViewContent',
    {
      content_name: 'Autopsy Report',
      content_ids: ['report'],
      content_type: 'product',
    },
    { eventID }
  );
  return eventID;
}

export function trackUpload(): string {
  const eventID = newEventId();
  getFBQ()?.(
    'track',
    'AddToCart',
    {
      content_name: 'Bet History Upload',
      content_ids: ['upload'],
      content_type: 'product',
      currency: 'USD',
      value: 0,
    },
    { eventID }
  );
  return eventID;
}

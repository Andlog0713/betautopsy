'use client';

/**
 * Meta (Facebook) Pixel client-side event helpers.
 *
 * Each helper generates a unique event_id and passes it to fbq via the
 * {eventID} option. Server-side CAPI calls that want to dedupe with a
 * client fire should reuse the same event_id (returned from these
 * helpers) via a cookie, Stripe metadata, or an API request body.
 *
 * RACE-RESILIENT FIRING. The MetaPixel <Script> uses Next.js's
 * `afterInteractive` strategy, which means `window.fbq` does NOT exist
 * during the first useEffect tick after mount. Calls fired immediately
 * on mount (e.g. dashboard's `?welcome=true` first-login detection)
 * would silently no-op with the naive `getFBQ()?.()` pattern. We solve
 * this by buffering fires in a module-level deferred queue and
 * draining it via setTimeout polling once `window.fbq` becomes
 * available — capped to ~3 seconds so a misconfigured pixel doesn't
 * leak memory. This means trackX() is fire-and-forget from the caller's
 * perspective and works regardless of script-load timing.
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
  const fbq = (window as unknown as Record<string, unknown>).fbq as
    | FBQ
    | undefined;
  return typeof fbq === 'function' ? fbq : null;
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

interface DeferredCall {
  eventName: string;
  params: FbqParams;
  options: FbqOptions;
  /** Earliest ms timestamp at which to give up. */
  expiresAt: number;
}

const deferred: DeferredCall[] = [];
let drainTimer: ReturnType<typeof setTimeout> | null = null;

const RETRY_INTERVAL_MS = 100;
const MAX_DEFER_MS = 3000;

function scheduleDrain() {
  if (typeof window === 'undefined') return;
  if (drainTimer !== null) return;
  drainTimer = setTimeout(drain, RETRY_INTERVAL_MS);
}

function drain() {
  drainTimer = null;
  const fbq = getFBQ();
  const now = Date.now();

  if (!fbq) {
    // Drop expired entries so we don't poll forever.
    for (let i = deferred.length - 1; i >= 0; i--) {
      if (deferred[i].expiresAt <= now) deferred.splice(i, 1);
    }
    if (deferred.length > 0) scheduleDrain();
    return;
  }

  // fbq is now available — flush everything in FIFO order.
  while (deferred.length > 0) {
    const call = deferred.shift()!;
    if (call.expiresAt <= now) continue;
    try {
      fbq('track', call.eventName, call.params, call.options);
    } catch {
      /* swallow — never break a caller on tracking failures */
    }
  }
}

function fire(eventName: string, params: FbqParams, options: FbqOptions): void {
  const fbq = getFBQ();
  if (fbq) {
    try {
      fbq('track', eventName, params, options);
    } catch {
      /* swallow */
    }
    return;
  }
  // Not loaded yet. Defer with a hard expiry so we don't grow forever.
  deferred.push({
    eventName,
    params,
    options,
    expiresAt: Date.now() + MAX_DEFER_MS,
  });
  scheduleDrain();
}

export function trackSignup(): string {
  const eventID = newEventId();
  fire(
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
  fire(
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
  fire(
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
  fire(
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
  fire(
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
  fire(
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

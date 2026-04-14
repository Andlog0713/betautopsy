'use client';

/**
 * TikTok Pixel event helpers.
 *
 * RACE-RESILIENT FIRING. The TikTokPixel <Script> uses Next.js's
 * `afterInteractive` strategy, which means `window.ttq` does not exist
 * during the first useEffect tick after mount. Calls fired immediately
 * on mount (e.g. dashboard's `?welcome=true` first-login detection)
 * would silently no-op with the naive `getTTQ()?.track(...)` pattern.
 * We solve this by buffering fires in a module-level deferred queue
 * and draining it via setTimeout polling once `window.ttq` becomes
 * available — capped to ~3 seconds so a misconfigured pixel doesn't
 * leak memory. Mirrors the same pattern in lib/meta-events.ts.
 */

type TTQTrack = (event: string, params: Record<string, unknown>) => void;
type TTQ = { track: TTQTrack };

function getTTQ(): TTQ | null {
  if (typeof window === 'undefined') return null;
  const ttq = (window as unknown as Record<string, unknown>).ttq as
    | TTQ
    | undefined;
  return ttq && typeof ttq.track === 'function' ? ttq : null;
}

interface DeferredTtqCall {
  event: string;
  params: Record<string, unknown>;
  /** Earliest ms timestamp at which to give up. */
  expiresAt: number;
}

const deferred: DeferredTtqCall[] = [];
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
  const ttq = getTTQ();
  const now = Date.now();

  if (!ttq) {
    for (let i = deferred.length - 1; i >= 0; i--) {
      if (deferred[i].expiresAt <= now) deferred.splice(i, 1);
    }
    if (deferred.length > 0) scheduleDrain();
    return;
  }

  while (deferred.length > 0) {
    const call = deferred.shift()!;
    if (call.expiresAt <= now) continue;
    try {
      ttq.track(call.event, call.params);
    } catch {
      /* swallow — never break a caller on tracking failures */
    }
  }
}

function fire(event: string, params: Record<string, unknown>): void {
  const ttq = getTTQ();
  if (ttq) {
    try {
      ttq.track(event, params);
    } catch {
      /* swallow */
    }
    return;
  }
  deferred.push({
    event,
    params,
    expiresAt: Date.now() + MAX_DEFER_MS,
  });
  scheduleDrain();
}

export function trackSignup() {
  fire('CompleteRegistration', {
    contents: [{ content_id: 'signup', content_type: 'product', content_name: 'BetAutopsy Account' }],
    value: 0,
    currency: 'USD',
  });
}

export function trackQuizComplete(archetype: string) {
  fire('Search', {
    contents: [{ content_id: 'quiz', content_type: 'product', content_name: 'Bet DNA Quiz' }],
    search_string: archetype,
    value: 0,
    currency: 'USD',
  });
}

export function trackCheckout(tier: string, price: number) {
  fire('InitiateCheckout', {
    contents: [{ content_id: tier, content_type: 'product', content_name: `BetAutopsy ${tier}` }],
    value: price,
    currency: 'USD',
  });
}

export function trackPurchase(tier: string, price: number) {
  fire('Purchase', {
    contents: [{ content_id: tier, content_type: 'product', content_name: `BetAutopsy ${tier}` }],
    value: price,
    currency: 'USD',
  });
}

export function trackReportView() {
  fire('ViewContent', {
    contents: [{ content_id: 'report', content_type: 'product', content_name: 'Autopsy Report' }],
    value: 0,
    currency: 'USD',
  });
}

export function trackUpload() {
  fire('AddToCart', {
    contents: [{ content_id: 'upload', content_type: 'product', content_name: 'Bet History Upload' }],
    value: 0,
    currency: 'USD',
  });
}

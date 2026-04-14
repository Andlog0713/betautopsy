/**
 * Meta Conversions API server-side event reporter.
 *
 * POSTs events to https://graph.facebook.com/v19.0/{PIXEL_ID}/events
 * using META_CAPI_TOKEN. Hashes PII (email) with SHA-256 per Meta's
 * requirements. Supports dedup with the client-side pixel fire via
 * matching event_id across channels — caller is responsible for
 * propagating the event_id (via cookie, Stripe metadata, or API body)
 * if they want cross-channel dedup.
 *
 * Fails closed: if the token or pixel ID is missing, the call is a
 * silent no-op so it can't break callers that run in envs without the
 * Meta config (local dev without env vars, preview deploys, etc.).
 */

import crypto from 'crypto';

const GRAPH_VERSION = 'v19.0';

function sha256Lower(value: string): string {
  return crypto
    .createHash('sha256')
    .update(value.trim().toLowerCase())
    .digest('hex');
}

export interface MetaEventUserData {
  /** Raw email — will be hashed SHA-256 before send. */
  email?: string | null;
  /** Client IP from x-forwarded-for / x-real-ip. */
  client_ip_address?: string | null;
  /** User-Agent header. */
  client_user_agent?: string | null;
  /** _fbc cookie value (Facebook click ID). */
  fbc?: string | null;
  /** _fbp cookie value (Facebook browser ID). */
  fbp?: string | null;
}

export interface MetaEventInput {
  event_name: string;
  /** Unix seconds. Defaults to now. */
  event_time?: number;
  /** URL of the page where the event happened. */
  event_source_url?: string;
  /** For dedup with a client pixel fire of the same event. */
  event_id?: string;
  /** Where the event originated. Defaults to 'website'. */
  action_source?:
    | 'website'
    | 'email'
    | 'app'
    | 'phone_call'
    | 'chat'
    | 'physical_store'
    | 'system_generated'
    | 'business_messaging'
    | 'other';
  user_data: MetaEventUserData;
  /** Event-specific fields: value, currency, content_ids, etc. */
  custom_data?: Record<string, unknown>;
}

export interface MetaEventResult {
  ok: boolean;
  error?: string;
}

/**
 * Fire a single Meta Conversions API event.
 *
 * Returns { ok: true } on success, { ok: false, error } on failure. Callers
 * should NOT await-throw — CAPI failures must not break the host request
 * (payment webhook, auth callback, etc.). Wrap in try/catch at the call
 * site or use .catch() to swallow.
 */
export async function sendMetaEvent(
  input: MetaEventInput
): Promise<MetaEventResult> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;

  if (!pixelId || !token) {
    return {
      ok: false,
      error: 'meta-capi: missing NEXT_PUBLIC_META_PIXEL_ID or META_CAPI_TOKEN',
    };
  }

  // Build hashed/normalized user_data per Meta's CAPI spec.
  const user_data: Record<string, unknown> = {};
  if (input.user_data.email) {
    user_data.em = [sha256Lower(input.user_data.email)];
  }
  if (input.user_data.client_ip_address) {
    user_data.client_ip_address = input.user_data.client_ip_address;
  }
  if (input.user_data.client_user_agent) {
    user_data.client_user_agent = input.user_data.client_user_agent;
  }
  if (input.user_data.fbc) {
    user_data.fbc = input.user_data.fbc;
  }
  if (input.user_data.fbp) {
    user_data.fbp = input.user_data.fbp;
  }

  const payload = {
    data: [
      {
        event_name: input.event_name,
        event_time: input.event_time ?? Math.floor(Date.now() / 1000),
        event_source_url: input.event_source_url,
        event_id: input.event_id,
        action_source: input.action_source ?? 'website',
        user_data,
        custom_data: input.custom_data,
      },
    ],
  };

  try {
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        ok: false,
        error: `meta-capi: HTTP ${res.status}${body ? ` — ${body.slice(0, 500)}` : ''}`,
      };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `meta-capi: ${message}` };
  }
}

import { SignJWT, importPKCS8 } from 'jose';

// Pure jose + native fetch APNs client. No push library. The HTTP/2
// requirement of api.push.apple.com is verified out-of-band by
// scripts/test-push.ts before this is wired into /api/analyze; if that
// gate ever fails (native fetch falling back to HTTP/1.1), swap the
// fetch call here for a node:http2 implementation.

const APNS_HOST_PROD = 'api.push.apple.com';
const APNS_HOST_SANDBOX = 'api.sandbox.push.apple.com';

// APNs accepts provider JWTs up to one hour old. Refresh at 50 min to
// leave headroom on slow function instances. The cache is per-process;
// Fluid Compute reuses instances so the cost amortizes across analyses.
const JWT_TTL_MS = 50 * 60 * 1000;

interface JwtCacheEntry {
  jwt: string;
  expiresAt: number;
}

let jwtCache: JwtCacheEntry | null = null;

async function getApnsJwt(): Promise<string> {
  const now = Date.now();
  if (jwtCache && jwtCache.expiresAt > now) {
    return jwtCache.jwt;
  }
  const teamId = process.env.APNS_TEAM_ID;
  const keyId = process.env.APNS_KEY_ID;
  const authKeyPem = process.env.APNS_AUTH_KEY;
  if (!teamId || !keyId || !authKeyPem) {
    throw new Error('APNs credentials missing: APNS_TEAM_ID, APNS_KEY_ID, APNS_AUTH_KEY');
  }
  // importPKCS8 accepts multi-line PEM directly; no base64 round-trip
  // and no manual newline handling. Vercel env vars preserve newlines.
  const privateKey = await importPKCS8(authKeyPem, 'ES256');
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .sign(privateKey);

  jwtCache = { jwt, expiresAt: now + JWT_TTL_MS };
  return jwt;
}

export type ApnsKind = 'heated_session';

export interface ApnsPayload {
  title: string;
  body: string;
  kind: ApnsKind;
  reportId: string;
  sessionDate: string;
}

export interface DeviceTokenRow {
  id: string;
  token: string;
  environment: 'sandbox' | 'production';
  bundle_id: string;
}

export type SendStatus = 'sent' | 'token_inactive' | 'transient_error';

export interface SendResult {
  deviceTokenId: string;
  tokenPrefix: string;
  environment: 'sandbox' | 'production';
  status: SendStatus;
  httpStatus: number;
  response: unknown;
}

function apnsHostFor(environment: 'sandbox' | 'production'): string {
  return environment === 'sandbox' ? APNS_HOST_SANDBOX : APNS_HOST_PROD;
}

export async function sendApnsPush(
  device: DeviceTokenRow,
  payload: ApnsPayload
): Promise<SendResult> {
  const jwt = await getApnsJwt();
  const host = apnsHostFor(device.environment);
  const url = `https://${host}/3/device/${device.token}`;

  const apsBody = {
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: 'default',
    },
    'betautopsy.kind': payload.kind,
    'betautopsy.report_id': payload.reportId,
    'betautopsy.session_date': payload.sessionDate,
  };

  let httpStatus = 0;
  let parsed: unknown = null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `bearer ${jwt}`,
        'apns-topic': device.bundle_id,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      },
      body: JSON.stringify(apsBody),
    });
    httpStatus = res.status;
    const text = await res.text();
    if (text) {
      try { parsed = JSON.parse(text); } catch { parsed = text; }
    }
  } catch (err) {
    return {
      deviceTokenId: device.id,
      tokenPrefix: device.token.slice(0, 12),
      environment: device.environment,
      status: 'transient_error',
      httpStatus: 0,
      response: { error: err instanceof Error ? err.message : String(err) },
    };
  }

  // 200 → delivered to APNs (not the device — that's async). 410 →
  // token is permanently bad (uninstalled / regenerated). Everything
  // else, including 400 BadDeviceToken / 429 / 5xx, is transient from
  // our point of view: we just skip writing notifications_sent so the
  // next /api/analyze run will retry.
  let status: SendStatus;
  if (httpStatus === 200) status = 'sent';
  else if (httpStatus === 410) status = 'token_inactive';
  else status = 'transient_error';

  return {
    deviceTokenId: device.id,
    tokenPrefix: device.token.slice(0, 12),
    environment: device.environment,
    status,
    httpStatus,
    response: parsed,
  };
}

// Shape stored in notifications_sent.apns_response per outline:
// { tokens: [{ token_prefix, environment, status, http_status, response }, ...] }
export function summarizeSendResults(results: SendResult[]) {
  return {
    tokens: results.map(r => ({
      token_prefix: r.tokenPrefix,
      environment: r.environment,
      status: r.status,
      http_status: r.httpStatus,
      response: r.response,
    })),
  };
}

import { connect, type ClientHttp2Session } from 'node:http2';
import { SignJWT, importPKCS8 } from 'jose';

// Pure jose + node:http2 APNs client. We tried native fetch first per
// the outline; scripts/test-push.ts Mode A proved Node's undici-backed
// fetch cannot negotiate HTTP/2 to api.push.apple.com (it throws
// "fetch failed" at TLS+ALPN). node:http2 is the stdlib fallback the
// outline pre-approved.

const APNS_HOST_PROD = 'api.push.apple.com';
const APNS_HOST_SANDBOX = 'api.sandbox.push.apple.com';

// APNs accepts provider JWTs up to one hour old. Refresh at 50 min to
// leave headroom on slow function instances. Per-process cache; Fluid
// Compute reuses instances so the cost amortizes.
const JWT_TTL_MS = 50 * 60 * 1000;

interface JwtCacheEntry {
  jwt: string;
  expiresAt: number;
}

let jwtCache: JwtCacheEntry | null = null;

// HTTP/2 sessions are reusable for many requests. One per host
// (sandbox vs production). Cache survives across /api/analyze
// invocations on a warm Fluid Compute instance.
const sessionCache = new Map<string, ClientHttp2Session>();

function getSession(host: string): ClientHttp2Session {
  const cached = sessionCache.get(host);
  if (cached && !cached.closed && !cached.destroyed) return cached;
  const session = connect(`https://${host}`);
  session.on('error', () => { sessionCache.delete(host); });
  session.on('close', () => { sessionCache.delete(host); });
  // Don't keep the event loop alive for the cached session — when the
  // function instance is about to be reaped, no in-flight requests
  // exist and we don't want to block shutdown.
  session.unref();
  sessionCache.set(host, session);
  return session;
}

export function closeAllApnsSessions(): void {
  for (const session of sessionCache.values()) {
    try { session.close(); } catch { /* best effort */ }
  }
  sessionCache.clear();
}

async function getApnsJwt(): Promise<string> {
  const now = Date.now();
  if (jwtCache && jwtCache.expiresAt > now) return jwtCache.jwt;
  const teamId = process.env.APNS_TEAM_ID;
  const keyId = process.env.APNS_KEY_ID;
  const authKeyPem = process.env.APNS_AUTH_KEY;
  if (!teamId || !keyId || !authKeyPem) {
    throw new Error('APNs credentials missing: APNS_TEAM_ID, APNS_KEY_ID, APNS_AUTH_KEY');
  }
  // importPKCS8 accepts multi-line PEM directly; no base64 round-trip
  // and no manual newline handling. Vercel preserves newlines in env vars.
  const privateKey = await importPKCS8(authKeyPem, 'ES256');
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .sign(privateKey);
  jwtCache = { jwt, expiresAt: now + JWT_TTL_MS };
  return jwt;
}

function http2Request(
  session: ClientHttp2Session,
  path: string,
  headers: Record<string, string>,
  body: string
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = session.request({
      ':method': 'POST',
      ':path': path,
      ...headers,
    });
    let status = 0;
    const chunks: Buffer[] = [];
    req.on('response', (h) => { status = (h[':status'] as number) ?? 0; });
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      resolve({ status, body: Buffer.concat(chunks).toString('utf-8') });
    });
    req.on('error', (err: Error) => reject(err));
    req.write(body);
    req.end();
  });
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

function apnsHostFor(env: 'sandbox' | 'production'): string {
  return env === 'sandbox' ? APNS_HOST_SANDBOX : APNS_HOST_PROD;
}

export async function sendApnsPush(
  device: DeviceTokenRow,
  payload: ApnsPayload
): Promise<SendResult> {
  const jwt = await getApnsJwt();
  const host = apnsHostFor(device.environment);
  const session = getSession(host);
  const apsBody = JSON.stringify({
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: 'default',
    },
    'betautopsy.kind': payload.kind,
    'betautopsy.report_id': payload.reportId,
    'betautopsy.session_date': payload.sessionDate,
  });
  let httpStatus = 0;
  let parsed: unknown = null;
  try {
    const { status, body } = await http2Request(
      session,
      `/3/device/${device.token}`,
      {
        authorization: `bearer ${jwt}`,
        'apns-topic': device.bundle_id,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      },
      apsBody,
    );
    httpStatus = status;
    if (body) {
      try { parsed = JSON.parse(body); } catch { parsed = body; }
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

  // 200 → delivered to APNs (device delivery is async). 410 → token is
  // permanently dead. Everything else, including 400 BadDeviceToken /
  // 429 / 5xx, is transient_error so the next /api/analyze retries.
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

// apns_response JSONB shape persisted in notifications_sent:
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

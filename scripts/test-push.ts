/**
 * HTTP/2 verification gate for the APNs send path. Two modes:
 *
 *   Mode A (no env required): node:http2 POST to api.sandbox.push.apple.com
 *     with a bogus 64-hex device token and NO provider JWT. Any HTTP
 *     response proves the transport negotiated HTTP/2; APNs replies
 *     403 MissingProviderToken which is the expected APNs error
 *     surface and confirms we're talking to the real service.
 *
 *   Mode B (when APNS_AUTH_KEY + APNS_KEY_ID + APNS_TEAM_ID +
 *     APNS_BUNDLE_ID are present): full signed JWT send via
 *     lib/apns.sendApnsPush. Expects HTTP 400 BadDeviceToken — the
 *     end-to-end gate Andrew specified in the outline.
 *
 * HALT conditions:
 *   - http2 session 'error' event before a response.
 *   - HTTP 426 Upgrade Required (HTTP/2 not negotiated).
 *   - Mode B failure when env present.
 *
 * Native fetch was tried first; undici-backed fetch in Node 22 does
 * NOT negotiate HTTP/2 to APNs (throws "fetch failed" at TLS+ALPN).
 * lib/apns.ts now uses node:http2 directly.
 *
 * Usage:
 *   npx tsx scripts/test-push.ts
 *   APNS_AUTH_KEY=... APNS_KEY_ID=... APNS_TEAM_ID=... APNS_BUNDLE_ID=... \
 *     npx tsx scripts/test-push.ts
 */

import { connect } from 'node:http2';
import { sendApnsPush, closeAllApnsSessions, type DeviceTokenRow } from '../lib/apns';

const APNS_SANDBOX_HOST = 'api.sandbox.push.apple.com';
const FAKE_TOKEN = 'a'.repeat(64);
const FAKE_BUNDLE = 'com.diagnosticsports.betautopsy.app';

function header(label: string) {
  console.log(`\n=== ${label} ===`);
}

function modeA(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    header('Mode A — HTTP/2 negotiation probe via node:http2 (no JWT)');
    const session = connect(`https://${APNS_SANDBOX_HOST}`);
    session.on('error', (err) => {
      reject(new Error(`http2 session error: ${err.message}`));
    });
    const req = session.request({
      ':method': 'POST',
      ':path': `/3/device/${FAKE_TOKEN}`,
      'apns-topic': FAKE_BUNDLE,
      'apns-push-type': 'alert',
      'content-type': 'application/json',
    });
    let status = 0;
    const chunks: Buffer[] = [];
    req.on('response', (h) => {
      status = (h[':status'] as number) ?? 0;
    });
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('error', (err) => reject(err));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf-8');
      console.log(`  status=${status}`);
      console.log(`  body=${body}`);
      session.close();
      if (status === 426) {
        reject(new Error('HTTP 426 Upgrade Required — HTTP/2 not negotiated.'));
        return;
      }
      if (status === 0) {
        reject(new Error('No HTTP status received.'));
        return;
      }
      console.log('  PASS: HTTP/2 transport negotiated (APNs responded with a real HTTP status).');
      resolve();
    });
    req.write(JSON.stringify({ aps: { alert: { title: 'probe', body: 'probe' } } }));
    req.end();
  });
}

async function modeB(): Promise<void> {
  const haveEnv = !!process.env.APNS_AUTH_KEY
    && !!process.env.APNS_KEY_ID
    && !!process.env.APNS_TEAM_ID
    && !!process.env.APNS_BUNDLE_ID;
  if (!haveEnv) {
    header('Mode B — SKIPPED (APNS_* env vars not present locally)');
    console.log('  Mode A passed, so the transport works. To run the full E2E gate:');
    console.log('    APNS_AUTH_KEY="$(cat AuthKey_XXXX.p8)" \\');
    console.log('      APNS_KEY_ID=XXXX APNS_TEAM_ID=YYYY \\');
    console.log('      APNS_BUNDLE_ID=com.diagnosticsports.betautopsy.app \\');
    console.log('      npx tsx scripts/test-push.ts');
    return;
  }
  header('Mode B — signed JWT to APNs sandbox with bogus token (expect 400 BadDeviceToken)');
  const device: DeviceTokenRow = {
    id: '00000000-0000-0000-0000-000000000000',
    token: FAKE_TOKEN,
    environment: 'sandbox',
    bundle_id: process.env.APNS_BUNDLE_ID!,
  };
  const result = await sendApnsPush(device, {
    title: 'probe',
    body: 'probe',
    kind: 'heated_session',
    reportId: '00000000-0000-0000-0000-000000000000',
    sessionDate: '2026-05-16',
  });
  console.log(`  result=${JSON.stringify(result, null, 2)}`);
  if (result.httpStatus === 0) {
    throw new Error('transport error inside sendApnsPush.');
  }
  if (result.httpStatus !== 400) {
    throw new Error(`expected HTTP 400 BadDeviceToken, got ${result.httpStatus}.`);
  }
  const reason = (result.response as { reason?: string } | null)?.reason;
  if (reason !== 'BadDeviceToken') {
    console.error(`  WARN: status 400 but reason=${reason} (expected BadDeviceToken).`);
  }
  console.log('  PASS: APNs returned 400 with the bogus token. End-to-end send path works.');
}

async function main(): Promise<void> {
  try {
    await modeA();
    await modeB();
    console.log('\n=== HTTP/2 gate complete ===');
  } finally {
    closeAllApnsSessions();
  }
  process.exit(0);
}

main().catch(err => {
  console.error('Gate harness crashed:', err instanceof Error ? err.message : err);
  closeAllApnsSessions();
  process.exit(1);
});

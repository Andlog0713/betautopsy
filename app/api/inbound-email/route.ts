import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getResend, isResendConfigured } from '@/lib/resend';

export const dynamic = 'force-dynamic';

// Escape user-controlled text before it lands in the forwarded HTML email.
// The previous version interpolated from/subject and the inbound `html` body
// raw, so an attacker could inject arbitrary markup/script into the owner's
// inbox and spoof message content. We never re-emit attacker HTML as HTML —
// the body is rendered as escaped text inside <pre>.
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Verify a Svix-signed webhook (Resend inbound uses Svix) without adding the
// svix dependency. Signature base = `${id}.${timestamp}.${body}`, signed with
// HMAC-SHA256 using the base64-decoded secret (the part after `whsec_`). The
// svix-signature header is a space-separated list of `v1,<base64>` entries;
// any match is valid. Constant-time compare. Fails closed when the secret is
// unset or any header is missing/expired.
function verifySvix(secret: string, headers: Headers, body: string): boolean {
  const id = headers.get('svix-id');
  const timestamp = headers.get('svix-timestamp');
  const sigHeader = headers.get('svix-signature');
  if (!id || !timestamp || !sigHeader) return false;

  // Reject stale timestamps (>5 min skew) to blunt replay.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = crypto
    .createHmac('sha256', key)
    .update(`${id}.${timestamp}.${body}`)
    .digest('base64');
  const expectedBuf = Buffer.from(expected);

  for (const part of sigHeader.split(' ')) {
    const candidate = part.split(',')[1];
    if (!candidate) continue;
    const candidateBuf = Buffer.from(candidate);
    if (
      candidateBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(candidateBuf, expectedBuf)
    ) {
      return true;
    }
  }
  return false;
}

export async function POST(request: Request) {
  try {
    // Read the raw body once — signature verification needs the exact bytes.
    const raw = await request.text();

    // Fail closed: with no signing secret configured, the endpoint is an open
    // relay into the owner's inbox, so reject until RESEND_INBOUND_SECRET is set.
    const secret = process.env.RESEND_INBOUND_SECRET;
    if (!secret) {
      console.error('Inbound email rejected: RESEND_INBOUND_SECRET not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
    }
    if (!verifySvix(secret, request.headers, raw)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const data = (body.data ?? body) as Record<string, unknown>;
    const from = data.from ?? body.from ?? 'unknown';
    const to = data.to ?? body.to ?? 'unknown';
    const subject = data.subject ?? body.subject ?? '(no subject)';
    const text = (data.text ?? body.text ?? '') as string;

    if (!isResendConfigured()) {
      return NextResponse.json({ error: 'Resend not configured' }, { status: 500 });
    }

    const resend = getResend();

    // Forward to the support inbox. Every field is escaped; the body is shown
    // as escaped plaintext, never as live HTML.
    await resend.emails.send({
      from: 'BetAutopsy Support <noreply@betautopsy.com>',
      to: 'andlog0713@gmail.com',
      subject: `[BetAutopsy Support] ${esc(subject)}`,
      html: `
        <div style="font-family:sans-serif;padding:20px;background:#111318;color:#D0D5DD;">
          <p style="color:#848D9A;font-size:12px;margin-bottom:16px;">
            <strong>From:</strong> ${esc(from)}<br/>
            <strong>To:</strong> ${esc(to)}<br/>
            <strong>Subject:</strong> ${esc(subject)}
          </p>
          <div style="border-top:1px solid #222;padding-top:16px;">
            <pre style="white-space:pre-wrap;color:#D0D5DD;">${esc(text)}</pre>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ forwarded: true });
  } catch (err) {
    console.error('Inbound email error:', err);
    return NextResponse.json({ error: 'Failed to forward' }, { status: 500 });
  }
}

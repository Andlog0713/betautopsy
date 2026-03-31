import { NextResponse } from 'next/server';
import { getResend, isResendConfigured } from '@/lib/resend';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Resend inbound webhook payload
    const from = body.data?.from ?? body.from ?? 'unknown';
    const to = body.data?.to ?? body.to ?? 'unknown';
    const subject = body.data?.subject ?? body.subject ?? '(no subject)';
    const text = body.data?.text ?? body.text ?? '';
    const html = body.data?.html ?? body.html ?? '';

    if (!isResendConfigured()) {
      return NextResponse.json({ error: 'Resend not configured' }, { status: 500 });
    }

    const resend = getResend();

    // Forward to your personal email
    await resend.emails.send({
      from: 'BetAutopsy Support <noreply@betautopsy.com>',
      to: 'andlog0713@gmail.com',
      subject: `[BetAutopsy Support] ${subject}`,
      html: `
        <div style="font-family:sans-serif;padding:20px;background:#111318;color:#D0D5DD;">
          <p style="color:#848D9A;font-size:12px;margin-bottom:16px;">
            <strong>From:</strong> ${from}<br/>
            <strong>To:</strong> ${to}<br/>
            <strong>Subject:</strong> ${subject}
          </p>
          <div style="border-top:1px solid #222;padding-top:16px;">
            ${html || `<pre style="white-space:pre-wrap;color:#D0D5DD;">${text}</pre>`}
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

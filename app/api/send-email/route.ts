import { NextResponse } from 'next/server';
import { isResendConfigured, getResend } from '@/lib/resend';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!isResendConfigured()) {
    return NextResponse.json({ error: 'Resend not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const to = searchParams.get('to');
  const subject = searchParams.get('subject');
  const template = searchParams.get('template');

  if (!to || !subject) {
    return NextResponse.json({ error: 'to and subject required' }, { status: 400 });
  }

  const resend = getResend();

  let html = '';

  if (template === 'lifetime-pro') {
    const name = searchParams.get('name') || 'there';
    html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5f5f5;width:100%">
<tr><td align="center" style="padding:24px 16px">
<table cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e5e5"><tbody>

<!-- Header -->
<tr><td style="background-color:#0D1117;padding:24px 32px">
  <span style="font-size:22px;font-weight:700;color:#ffffff"><span style="font-weight:900">BET</span><span style="font-weight:300;color:#00C9A7">AUTOPSY</span></span>
</td></tr>

<!-- Content -->
<tr><td style="padding:32px">
  <h1 style="font-size:24px;font-weight:700;color:#1a1a1a;margin:0 0 16px">You've been upgraded to Pro — for life.</h1>

  <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 16px">
    Hey ${name},
  </p>

  <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 16px">
    As a thank you for being one of our earliest users, we're giving you a <strong style="color:#1a1a1a">free lifetime Pro subscription</strong> — our top tier.
  </p>

  <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px">
    That means you'll always have access to:
  </p>

  <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px"><tbody>
    <tr><td style="padding:8px 0;font-size:15px;color:#1a1a1a">
      <span style="color:#00C9A7;font-weight:600">✓</span>&nbsp;&nbsp;Unlimited bets &amp; reports
    </td></tr>
    <tr><td style="padding:8px 0;font-size:15px;color:#1a1a1a">
      <span style="color:#00C9A7;font-weight:600">✓</span>&nbsp;&nbsp;Full bias suite &amp; strategic leaks
    </td></tr>
    <tr><td style="padding:8px 0;font-size:15px;color:#1a1a1a">
      <span style="color:#00C9A7;font-weight:600">✓</span>&nbsp;&nbsp;What-If Simulator
    </td></tr>
    <tr><td style="padding:8px 0;font-size:15px;color:#1a1a1a">
      <span style="color:#00C9A7;font-weight:600">✓</span>&nbsp;&nbsp;Leak Prioritizer — ranked by $ impact
    </td></tr>
    <tr><td style="padding:8px 0;font-size:15px;color:#1a1a1a">
      <span style="color:#00C9A7;font-weight:600">✓</span>&nbsp;&nbsp;Progress tracking &amp; weekly digests
    </td></tr>
    <tr><td style="padding:8px 0;font-size:15px;color:#1a1a1a">
      <span style="color:#00C9A7;font-weight:600">✓</span>&nbsp;&nbsp;Early access to every new feature
    </td></tr>
  </tbody></table>

  <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px">
    No credit card. No catch. No expiration. You believed in us early — this is our way of saying thanks.
  </p>

  <!-- CTA -->
  <div style="text-align:center;margin:32px 0">
    <a href="https://www.betautopsy.com/dashboard" style="display:inline-block;background:#00C9A7;color:#ffffff;font-size:16px;font-weight:700;padding:14px 40px;border-radius:10px;text-decoration:none">Go to Your Dashboard →</a>
  </div>

  <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 8px">
    Welcome to the team.
  </p>

  <p style="font-size:15px;color:#1a1a1a;font-weight:600;margin:24px 0 0">
    — The BetAutopsy Team
  </p>
</td></tr>

<!-- Footer -->
<tr><td style="padding:20px 32px;border-top:1px solid #e5e5e5">
  <p style="font-size:11px;color:#999;line-height:1.6;text-align:center;margin:0">
    BetAutopsy provides behavioral analysis and educational insights — not gambling or financial advice. 18+. If you or someone you know has a gambling problem, call 1-800-GAMBLER.
  </p>
</td></tr>

</tbody></table>
</td></tr></table>
</body></html>`;
  } else {
    return NextResponse.json({ error: 'Unknown template' }, { status: 400 });
  }

  try {
    await resend.emails.send({
      from: 'BetAutopsy <noreply@betautopsy.com>',
      to,
      subject,
      html,
    });
    return NextResponse.json({ sent: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Send failed' }, { status: 500 });
  }
}

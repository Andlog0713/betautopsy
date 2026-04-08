function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function emailShell(content: string, unsubscribeUrl?: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5f5f5;width:100%">
<tr><td align="center" style="padding:24px 16px">
<table cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background-color:#ffffff;overflow:hidden;border:1px solid #e0e0e0"><tbody>
<tr><td style="background-color:#111318;padding:20px 24px">
  <span style="font-size:18px;font-weight:900;color:#ffffff;letter-spacing:1px">BET</span><span style="font-size:18px;font-weight:300;color:#00C9A7;letter-spacing:1px">AUTOPSY</span>
</td></tr>
${content}
<tr><td style="padding:24px 24px">
  <div style="border-top:1px solid #e5e5e5;padding-top:16px">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#999;line-height:1.7;text-align:center">
      BetAutopsy provides behavioral analysis and educational insights, not gambling or financial advice. 18+.
    </div>
    ${unsubscribeUrl ? `<div style="text-align:center;margin-top:10px"><a href="${esc(unsubscribeUrl)}" style="font-size:10px;color:#999;text-decoration:underline">Unsubscribe</a></div>` : ''}
  </div>
</td></tr>
</tbody></table>
</td></tr></table>
</body></html>`;
}

// ── Email 1: Welcome (Day 1, only if no bets and no reports) ──

export function renderWelcomeEmail(props: { displayName: string; appUrl: string; unsubscribeUrl?: string }): { subject: string; html: string } {
  const { displayName, appUrl, unsubscribeUrl } = props;
  return {
    subject: '3 ways to get your bets into BetAutopsy',
    html: emailShell(`
<tr><td style="padding:24px 24px 0">
  <div style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:8px">Welcome, ${esc(displayName)}.</div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    Getting your betting history in takes 2–5 minutes. Pick whichever method is easiest for you:
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="background:#f8f9fa;padding:14px;margin-bottom:8px;border-left:3px solid #0d9488">
    <div style="font-size:13px;color:#1a1a1a;font-weight:700;margin-bottom:4px">Screenshot (fastest from your phone)</div>
    <div style="font-size:13px;color:#555;line-height:1.5">Open your sportsbook app → My Bets → Settled → take a screenshot → upload it to BetAutopsy. Our AI reads it automatically.</div>
  </div>
  <div style="background:#f8f9fa;padding:14px;margin-bottom:8px;border-left:3px solid #888">
    <div style="font-size:13px;color:#1a1a1a;font-weight:700;margin-bottom:4px">Paste (fastest from desktop)</div>
    <div style="font-size:13px;color:#555;line-height:1.5">Log into your sportsbook on desktop → My Bets → Settled → select all → copy → paste into BetAutopsy.</div>
  </div>
  <div style="background:#f8f9fa;padding:14px;border-left:3px solid #888">
    <div style="font-size:13px;color:#1a1a1a;font-weight:700;margin-bottom:4px">CSV upload (for full history)</div>
    <div style="font-size:13px;color:#555;line-height:1.5">Use <a href="https://links.pikkit.com/invite/surf40498" style="color:#0d9488;text-decoration:none">Pikkit</a> (a free third-party app) to export your complete sportsbook history as a CSV, then upload it.</div>
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px;text-align:center">
  <a href="${esc(appUrl)}/upload" style="display:inline-block;background:#0d9488;color:#ffffff;font-size:13px;font-weight:700;padding:12px 32px;text-decoration:none">Upload Your Bets →</a>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="font-size:12px;color:#888;text-align:center;line-height:1.6">
    Your first full report is free. No credit card needed.<br/>
    <a href="${esc(appUrl)}/how-to-upload" style="color:#0d9488;text-decoration:none">Detailed upload guide →</a>
  </div>
</td></tr>`, unsubscribeUrl),
  };
}

// ── Email 2: Nudge (Day 3, only if still no bets and no reports) ──

export function renderNudgeEmail(props: { displayName: string; appUrl: string; unsubscribeUrl?: string }): { subject: string; html: string } {
  const { displayName, appUrl, unsubscribeUrl } = props;
  return {
    subject: 'Still want to see what your bets say about you?',
    html: emailShell(`
<tr><td style="padding:24px 24px 0">
  <div style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:8px">${esc(displayName)}, your autopsy is waiting.</div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    You signed up for BetAutopsy but haven't imported your bets yet. Here's what you'll get when you do:
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="background:#f8f9fa;padding:14px;border-left:3px solid #d97706">
    <div style="font-size:13px;color:#555;line-height:1.7">
      <strong style="color:#1a1a1a">Every cognitive bias</strong> identified with dollar costs attached<br/>
      <strong style="color:#1a1a1a">Emotion Score</strong> measuring how much tilt affects your decisions<br/>
      <strong style="color:#1a1a1a">Sport-by-sport breakdown</strong> showing where you win and where you bleed<br/>
      <strong style="color:#1a1a1a">Personalized action plan</strong> with rules based on your actual data
    </div>
  </div>
</td></tr>

<tr><td style="padding:0 24px 8px">
  <div style="font-size:14px;color:#555;line-height:1.6">
    <strong style="color:#1a1a1a">Quickest way in:</strong> Screenshot your settled bets from your sportsbook app → upload → done in 2 minutes.
  </div>
</td></tr>

<tr><td style="padding:8px 24px 16px;text-align:center">
  <a href="${esc(appUrl)}/upload" style="display:inline-block;background:#0d9488;color:#ffffff;font-size:13px;font-weight:700;padding:12px 32px;text-decoration:none">Upload Your Bets →</a>
  <div style="font-size:12px;color:#888;margin-top:8px">Your first full report is free.</div>
</td></tr>`, unsubscribeUrl),
  };
}

// ── Email 3: Post-Report (1 day after first report) ──

export function renderPostReportEmail(props: { displayName: string; appUrl: string; unsubscribeUrl?: string }): { subject: string; html: string } {
  const { displayName, appUrl, unsubscribeUrl } = props;
  return {
    subject: 'How to read your autopsy report',
    html: emailShell(`
<tr><td style="padding:24px 24px 0">
  <div style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:8px">Nice work, ${esc(displayName)}. Your first autopsy is in.</div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    Here's a quick guide to getting the most out of your report:
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="background:#f8f9fa;padding:14px;margin-bottom:8px;border-left:3px solid #0d9488">
    <div style="font-size:13px;color:#1a1a1a;font-weight:700;margin-bottom:4px">Your scores</div>
    <div style="font-size:13px;color:#555;line-height:1.5"><strong style="color:#1a1a1a">BetIQ</strong> measures how sharp your decisions are. <strong style="color:#1a1a1a">Emotion Score</strong> measures how much tilt and chasing affects you (lower is better). <strong style="color:#1a1a1a">Discipline Score</strong> tracks how well you follow smart betting habits.</div>
  </div>
  <div style="background:#f8f9fa;padding:14px;margin-bottom:8px;border-left:3px solid #d97706">
    <div style="font-size:13px;color:#1a1a1a;font-weight:700;margin-bottom:4px">Your action plan</div>
    <div style="font-size:13px;color:#555;line-height:1.5">Scroll to the Prescription section. These are personalized rules based on your actual data — not generic advice. Each one tells you exactly what to change and how much it could save you.</div>
  </div>
  <div style="background:#f8f9fa;padding:14px;border-left:3px solid #888">
    <div style="font-size:13px;color:#1a1a1a;font-weight:700;margin-bottom:4px">Your next report will be sharper</div>
    <div style="font-size:13px;color:#555;line-height:1.5">The more data you feed in, the more patterns we catch. Your third report finds things your first one couldn't. Keep adding your recent bets as you place them.</div>
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px;text-align:center">
  <a href="${esc(appUrl)}/upload" style="display:inline-block;background:#0d9488;color:#ffffff;font-size:13px;font-weight:700;padding:12px 32px;text-decoration:none">Add Your Latest Bets →</a>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="font-size:12px;color:#888;text-align:center;line-height:1.6">
    Want a weekly summary of your betting stats? Enable the <a href="${esc(appUrl)}/settings" style="color:#0d9488;text-decoration:none">weekly digest</a> in your settings.
  </div>
</td></tr>`, unsubscribeUrl),
  };
}

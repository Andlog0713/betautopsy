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
      BetAutopsy provides behavioral analysis and educational insights — not gambling or financial advice. 21+.
    </div>
    ${unsubscribeUrl ? `<div style="text-align:center;margin-top:10px"><a href="${esc(unsubscribeUrl)}" style="font-size:10px;color:#999;text-decoration:underline">Unsubscribe</a></div>` : ''}
  </div>
</td></tr>
</tbody></table>
</td></tr></table>
</body></html>`;
}

export function renderWelcomeEmail(props: { displayName: string; appUrl: string; unsubscribeUrl?: string }): { subject: string; html: string } {
  const { displayName, appUrl, unsubscribeUrl } = props;
  return {
    subject: 'Your first autopsy is 5 minutes away',
    html: emailShell(`
<tr><td style="padding:24px 24px 0">
  <div style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:8px">Welcome, ${esc(displayName)}.</div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    Your first behavioral autopsy is just a few minutes away. Here's the fastest path to getting your complete bet history into BetAutopsy:
  </div>
</td></tr>

<tr><td style="padding:0 24px">
  <div style="background:#f8f9fa;border-left:3px solid #0d9488;padding:18px;margin-bottom:16px">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#888;letter-spacing:2px;margin-bottom:12px">RECOMMENDED: IMPORT WITH PIKKIT</div>
    <div style="font-size:13px;color:#555;line-height:1.8">
      <strong style="color:#1a1a1a">01</strong> Download Pikkit (free 7-day trial)<br/>
      <strong style="color:#1a1a1a">02</strong> Connect your sportsbooks (DraftKings, FanDuel, etc.)<br/>
      <strong style="color:#1a1a1a">03</strong> Wait for it to sync your bets<br/>
      <strong style="color:#1a1a1a">04</strong> Go to Pro → Settings → Data Exports → Download CSV<br/>
      <strong style="color:#1a1a1a">05</strong> Upload the CSV at BetAutopsy
    </div>
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px;text-align:center">
  <a href="https://links.pikkit.com/invite/surf40498" style="display:inline-block;background:#0d9488;color:#ffffff;font-size:13px;font-weight:700;padding:12px 32px;text-decoration:none">Download Pikkit (Free Trial) →</a>
  <div style="font-size:11px;color:#888;margin-top:8px">💰 Get $3–$100 cash when you sign up and sync 10+ bets</div>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="font-size:12px;color:#888;line-height:1.6;background:#f8f9fa;padding:12px;text-align:center">
    <strong style="color:#555">This is a one-time import.</strong> After your history is in, you'll keep it updated by pasting new bets directly — takes 30 seconds.
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="font-size:12px;color:#888;line-height:1.6">
    Already have a CSV or spreadsheet? <a href="${esc(appUrl)}/upload" style="color:#0d9488;text-decoration:none">Upload directly →</a><br/>
    No data at all? <a href="${esc(appUrl)}/upload" style="color:#0d9488;text-decoration:none">Paste from your sportsbook →</a>
  </div>
</td></tr>`, unsubscribeUrl),
  };
}

export function renderDay3Email(props: { displayName: string; appUrl: string; unsubscribeUrl?: string }): { subject: string; html: string } {
  const { displayName, appUrl, unsubscribeUrl } = props;
  return {
    subject: 'Your Pikkit trial expires in 4 days',
    html: emailShell(`
<tr><td style="padding:24px 24px 0">
  <div style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:8px">Hey ${esc(displayName)}, your free export window is open.</div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    You signed up for BetAutopsy but haven't imported your bets yet. Your Pikkit free trial has 4 days left — here's what you're missing:
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="background:#f8f9fa;padding:14px;border-left:3px solid #d97706;margin-bottom:8px">
    <div style="font-size:13px;color:#555;line-height:1.6">
      <strong style="color:#1a1a1a">Your autopsy reveals:</strong> which cognitive biases are costing you money (with dollar amounts), your Emotion Score, BetIQ skill assessment, sport-specific leaks, and a personalized action plan. Most users are surprised by what the data shows.
    </div>
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px;text-align:center">
  <a href="https://links.pikkit.com/invite/surf40498" style="display:inline-block;background:#0d9488;color:#ffffff;font-size:13px;font-weight:700;padding:12px 32px;text-decoration:none">Import Your Bets Now →</a>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="font-size:12px;color:#888;text-align:center">
    Don't want to use Pikkit? <a href="${esc(appUrl)}/upload" style="color:#0d9488;text-decoration:none">Paste from your sportsbook instead →</a>
  </div>
</td></tr>`, unsubscribeUrl),
  };
}

export function renderDay5Email(props: { displayName: string; appUrl: string; unsubscribeUrl?: string }): { subject: string; html: string } {
  const { displayName, appUrl, unsubscribeUrl } = props;
  return {
    subject: '⏰ 2 days left on your Pikkit free trial',
    html: emailShell(`
<tr><td style="padding:24px 24px 0">
  <div style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:8px">Your free export window closes in 2 days.</div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    ${esc(displayName)}, your Pikkit free trial expires soon. After that, exporting costs $3.33/month. Right now it's free — and it takes 3 minutes.
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px;text-align:center">
  <a href="https://links.pikkit.com/invite/surf40498" style="display:inline-block;background:#dc2626;color:#ffffff;font-size:13px;font-weight:700;padding:12px 32px;text-decoration:none">Export Before It Expires →</a>
  <div style="font-size:12px;color:#888;margin-top:12px">
    Then <a href="${esc(appUrl)}/upload" style="color:#0d9488;text-decoration:none">upload the CSV to BetAutopsy</a> and run your free autopsy.
  </div>
</td></tr>`, unsubscribeUrl),
  };
}

export function renderDay7HasBetsEmail(props: { displayName: string; betCount: number; appUrl: string; unsubscribeUrl?: string }): { subject: string; html: string } {
  const { displayName, betCount, appUrl, unsubscribeUrl } = props;
  return {
    subject: betCount > 0 ? 'Your bets are uploaded — time for your autopsy' : 'No Pikkit? No problem — here are other ways in',
    html: betCount > 0 ? emailShell(`
<tr><td style="padding:24px 24px 0">
  <div style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:8px">Your ${betCount} bets are ready, ${esc(displayName)}.</div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    Your free autopsy report will reveal the cognitive biases and behavioral patterns hiding in your betting history. Takes about 20 seconds.
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px;text-align:center">
  <a href="${esc(appUrl)}/reports?run=true" style="display:inline-block;background:#0d9488;color:#ffffff;font-size:13px;font-weight:700;padding:12px 32px;text-decoration:none">Run Your Free Autopsy →</a>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="background:#f0fdf4;border-left:3px solid #0d9488;padding:14px">
    <div style="font-size:13px;color:#555;line-height:1.6">
      <strong style="color:#1a1a1a">Going forward:</strong> Keep your data current by pasting new bets from your sportsbook. Go to Upload → Paste tab → copy from your sportsbook's Settled page → paste → done. Takes 30 seconds.
    </div>
  </div>
</td></tr>`, unsubscribeUrl)

    : emailShell(`
<tr><td style="padding:24px 24px 0">
  <div style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:8px">There are still easy ways to get started.</div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    ${esc(displayName)}, the Pikkit free trial may have passed, but you don't need it to use BetAutopsy. Here are your options:
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="background:#f8f9fa;padding:14px;margin-bottom:8px;border-left:3px solid #0d9488">
    <div style="font-size:13px;color:#1a1a1a;font-weight:700;margin-bottom:4px">Option 1: Paste from your sportsbook</div>
    <div style="font-size:13px;color:#555;line-height:1.5">Log into your sportsbook on desktop → My Bets → Settled → select all → copy → paste into BetAutopsy. Our AI extracts the data automatically.</div>
  </div>
  <div style="background:#f8f9fa;padding:14px;margin-bottom:8px;border-left:3px solid #888">
    <div style="font-size:13px;color:#1a1a1a;font-weight:700;margin-bottom:4px">Option 2: Upload a CSV</div>
    <div style="font-size:13px;color:#555;line-height:1.5">If your sportsbook lets you download a bet history file, upload it directly.</div>
  </div>
  <div style="background:#f8f9fa;padding:14px;border-left:3px solid #888">
    <div style="font-size:13px;color:#1a1a1a;font-weight:700;margin-bottom:4px">Option 3: Enter bets manually</div>
    <div style="font-size:13px;color:#555;line-height:1.5">Add your recent bets one by one. Even 20-30 bets gives useful insights.</div>
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px;text-align:center">
  <a href="${esc(appUrl)}/upload" style="display:inline-block;background:#0d9488;color:#ffffff;font-size:13px;font-weight:700;padding:12px 32px;text-decoration:none">See All Upload Methods →</a>
</td></tr>`, unsubscribeUrl),
  };
}

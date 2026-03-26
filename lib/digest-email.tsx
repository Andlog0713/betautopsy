interface DigestEmailProps {
  displayName: string;
  positiveLead: { emoji: string; text: string };
  totalBets: number;
  record: string;
  netPnL: number;
  roi: number;
  streakCount: number;
  insightEmoji: string;
  insightHeadline: string;
  insightDetail: string;
  biggestWin: { description: string; profit: number; odds: number } | null;
  biggestLoss: { description: string; profit: number } | null;
  unsubscribeUrl: string;
  autopsyUrl: string;
  quizUrl: string;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderDigestEmail(props: DigestEmailProps): string {
  const { displayName, positiveLead, totalBets, record, netPnL, roi, streakCount,
    insightEmoji, insightHeadline, insightDetail,
    biggestWin, biggestLoss, unsubscribeUrl, autopsyUrl, quizUrl } = props;

  const pnlColor = netPnL >= 0 ? '#00C853' : '#f87171';
  const roiColor = roi >= 0 ? '#00C853' : '#f87171';
  const pnlStr = `${netPnL >= 0 ? '+' : ''}$${Math.abs(Math.round(netPnL))}`;
  const roiStr = `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`;

  let winLossHtml = '';
  if (biggestWin || biggestLoss) {
    const winCell = biggestWin ? `
      <td style="width:${biggestLoss ? '50%' : '100%'};padding-right:${biggestLoss ? '4px' : '0'}">
        <div style="background:#0a1a0f;border-radius:10px;padding:14px;border:1px solid #0d3318">
          <div style="font-size:11px;color:#00C853;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">BIGGEST WIN</div>
          <div style="font-size:13px;color:#F0F0F0;margin-bottom:4px;line-height:1.4">${esc(biggestWin.description.slice(0, 50))}</div>
          <div style="font-size:15px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#00C853">+$${biggestWin.profit}</div>
        </div>
      </td>` : '';
    const lossCell = biggestLoss ? `
      <td style="width:${biggestWin ? '50%' : '100%'};padding-left:${biggestWin ? '4px' : '0'}">
        <div style="background:rgba(248,113,113,0.06);border-radius:10px;padding:14px;border:1px solid rgba(248,113,113,0.12)">
          <div style="font-size:11px;color:#f87171;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">BIGGEST LOSS</div>
          <div style="font-size:13px;color:#F0F0F0;margin-bottom:4px;line-height:1.4">${esc(biggestLoss.description.slice(0, 50))}</div>
          <div style="font-size:15px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#f87171">-$${Math.abs(biggestLoss.profit)}</div>
        </div>
      </td>` : '';
    winLossHtml = `
      <tr><td style="padding-bottom:20px">
        <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr>${winCell}${lossCell}</tr></tbody></table>
      </td></tr>`;
  }

  const streakHtml = streakCount > 0
    ? `<td style="text-align:right"><span style="font-size:14px;color:#A0A3B1">🔥 ${streakCount}-week streak</span></td>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<style>
  :root { color-scheme: dark; }
  body, .body-bg { background-color: #0D1117 !important; }
  .dark-bg { background-color: #1C1E2D !important; }
</style>
</head>
<body style="margin:0;padding:0;background-color:#0D1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#F0F0F0">
<!-- Outer wrapper table forces dark bg on all clients -->
<table cellpadding="0" cellspacing="0" border="0" width="100%" class="body-bg" style="background-color:#0D1117;width:100%;margin:0;padding:0">
<tr><td align="center" style="background-color:#0D1117">
<table cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;margin:0 auto;padding:32px 20px"><tbody>

<!-- Logo -->
<tr><td style="padding-bottom:24px">
  <span style="font-size:18px;font-weight:700">Bet<span style="color:#00C853">Autopsy</span></span>
</td></tr>

<!-- Positive lead -->
<tr><td style="padding-bottom:20px">
  <div style="background:#0a1a0f;border-radius:12px;padding:16px 20px;border:1px solid #0d3318">
    <span style="font-size:15px;color:#F0F0F0">${positiveLead.emoji} ${esc(positiveLead.text)}</span>
  </div>
</td></tr>

<!-- Heading -->
<tr><td style="padding-bottom:20px">
  <div style="font-size:16px;font-weight:700;color:#F0F0F0;margin-bottom:4px">Your week in bets, ${esc(displayName)}.</div>
  <div style="font-size:13px;color:#5A5C6F">Here's what happened since last Tuesday.</div>
</td></tr>

<!-- Stats grid -->
<tr><td style="padding-bottom:16px">
  <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr>
    <td style="width:33%;padding-right:6px">
      <div style="background:#1C1E2D;border-radius:10px;padding:14px 12px;text-align:center">
        <div style="font-size:11px;color:#5A5C6F;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">BETS</div>
        <div style="font-size:28px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#F0F0F0">${totalBets}</div>
      </div>
    </td>
    <td style="width:33%;padding:0 3px">
      <div style="background:#1C1E2D;border-radius:10px;padding:14px 12px;text-align:center">
        <div style="font-size:11px;color:#5A5C6F;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">RECORD</div>
        <div style="font-size:28px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#F0F0F0">${esc(record)}</div>
      </div>
    </td>
    <td style="width:33%;padding-left:6px">
      <div style="background:#1C1E2D;border-radius:10px;padding:14px 12px;text-align:center">
        <div style="font-size:11px;color:#5A5C6F;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">P&amp;L</div>
        <div style="font-size:28px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${pnlColor}">${pnlStr}</div>
      </div>
    </td>
  </tr></tbody></table>
</td></tr>

<!-- ROI + Streak -->
<tr><td style="padding-bottom:20px">
  <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr>
    <td>
      <span style="font-size:14px;color:#A0A3B1">Weekly ROI: </span>
      <span style="font-size:14px;font-weight:600;font-family:'JetBrains Mono',monospace;color:${roiColor}">${roiStr}</span>
    </td>
    ${streakHtml}
  </tr></tbody></table>
</td></tr>

<!-- Insight card -->
<tr><td style="padding-bottom:20px">
  <div style="background:#1C1E2D;border-radius:10px;padding:20px;border-left:3px solid #00C853">
    <div style="font-size:15px;font-weight:700;color:#F0F0F0;margin-bottom:8px">${insightEmoji} ${esc(insightHeadline)}</div>
    <div style="font-size:13px;color:#A0A3B1;line-height:1.6">${esc(insightDetail)}</div>
  </div>
</td></tr>

<!-- Win/Loss -->
${winLossHtml}

<!-- CTA -->
<tr><td style="padding-bottom:12px;text-align:center">
  <a href="${esc(autopsyUrl)}" style="display:inline-block;background:#00C853;color:#0D1117;font-size:14px;font-weight:700;padding:12px 32px;border-radius:10px;text-decoration:none">Run a Fresh Autopsy →</a>
</td></tr>

<!-- Secondary CTA -->
<tr><td style="padding-bottom:24px;text-align:center">
  <a href="${esc(quizUrl)}" style="font-size:13px;color:#00C853;text-decoration:none">Or take the free Bet DNA quiz →</a>
</td></tr>

<!-- Footer -->
<tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px">
  <div style="font-size:11px;color:#5A5C6F;line-height:1.6;text-align:center">
    BetAutopsy provides behavioral analysis and educational insights — not gambling or financial advice. Past results don't guarantee future outcomes. 21+. If you or someone you know has a gambling problem, call 1-800-GAMBLER.
  </div>
  <div style="text-align:center;margin-top:12px">
    <a href="${esc(unsubscribeUrl)}" style="font-size:11px;color:#5A5C6F;text-decoration:underline">Unsubscribe from weekly digests</a>
  </div>
</td></tr>

</tbody></table>
</td></tr></table>
</body></html>`;
}

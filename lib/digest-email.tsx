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

  const pnlColor = netPnL >= 0 ? '#3FB950' : '#F85149';
  const roiColor = roi >= 0 ? '#3FB950' : '#F85149';
  const pnlStr = `${netPnL >= 0 ? '+' : ''}$${Math.abs(Math.round(netPnL)).toLocaleString()}`;
  const roiStr = `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`;

  let winLossHtml = '';
  if (biggestWin || biggestLoss) {
    const winCell = biggestWin ? `
      <td style="width:${biggestLoss ? '50%' : '100%'};padding-right:${biggestLoss ? '6px' : '0'};vertical-align:top">
        <div style="background:#161820;border:1px solid rgba(63,185,80,0.2);padding:14px">
          <div style="font-family:'Courier New',monospace;font-size:10px;color:#3FB950;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px">BIGGEST WIN</div>
          <div style="font-size:13px;color:#D0D5DD;margin-bottom:4px;line-height:1.4">${esc(biggestWin.description)}</div>
          <div style="font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#3FB950">+$${biggestWin.profit.toLocaleString()}</div>
        </div>
      </td>` : '';
    const lossCell = biggestLoss ? `
      <td style="width:${biggestWin ? '50%' : '100%'};padding-left:${biggestWin ? '6px' : '0'};vertical-align:top">
        <div style="background:#161820;border:1px solid rgba(248,81,73,0.2);padding:14px">
          <div style="font-family:'Courier New',monospace;font-size:10px;color:#F85149;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px">BIGGEST LOSS</div>
          <div style="font-size:13px;color:#D0D5DD;margin-bottom:4px;line-height:1.4">${esc(biggestLoss.description)}</div>
          <div style="font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#F85149">-$${Math.abs(biggestLoss.profit).toLocaleString()}</div>
        </div>
      </td>` : '';
    winLossHtml = `
      <tr><td style="padding-bottom:16px">
        <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr>${winCell}${lossCell}</tr></tbody></table>
      </td></tr>`;
  }

  const streakHtml = streakCount > 0
    ? `<td style="text-align:right"><span style="font-family:'Courier New',monospace;font-size:12px;color:#00C9A7">🔥 ${streakCount}-week streak</span></td>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
</head>
<body style="margin:0;padding:0;background-color:#0E1015;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#D0D5DD">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0E1015;width:100%">
<tr><td align="center" style="padding:24px 16px">
<table cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background-color:#111318;overflow:hidden;border:1px solid rgba(255,255,255,0.06)"><tbody>

<!-- Header bar -->
<tr><td style="background-color:#161820;padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.04)">
  <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr>
    <td>
      <span style="font-size:18px;font-weight:900;color:#F0F2F5;letter-spacing:1px">BET</span><span style="font-size:18px;font-weight:300;color:#00C9A7;letter-spacing:1px">AUTOPSY</span>
    </td>
    <td style="text-align:right">
      <span style="font-family:'Courier New',monospace;font-size:9px;color:#515968;letter-spacing:3px;text-transform:uppercase">WEEKLY DIGEST</span>
    </td>
  </tr></tbody></table>
</td></tr>

<!-- Positive lead -->
<tr><td style="padding:20px 24px 0">
  <div style="background:#161820;border-left:3px solid #00C9A7;padding:14px 18px">
    <span style="font-size:14px;color:#D0D5DD">${positiveLead.emoji} ${esc(positiveLead.text)}</span>
  </div>
</td></tr>

<!-- Heading -->
<tr><td style="padding:20px 24px 0">
  <div style="font-size:17px;font-weight:700;color:#F0F2F5;margin-bottom:4px">Your week in bets, ${esc(displayName)}.</div>
  <div style="font-family:'Courier New',monospace;font-size:11px;color:#515968;letter-spacing:1px">HERE&rsquo;S WHAT HAPPENED SINCE LAST TUESDAY</div>
</td></tr>

<!-- Stats grid -->
<tr><td style="padding:16px 24px 0">
  <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid rgba(255,255,255,0.04)"><tbody><tr>
    <td style="width:33%;padding:14px 8px;text-align:center;background:#161820;border-right:1px solid rgba(255,255,255,0.04)">
      <div style="font-family:'Courier New',monospace;font-size:9px;color:#515968;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px">BETS</div>
      <div style="font-family:'Courier New',monospace;font-size:24px;font-weight:700;color:#F0F2F5">${totalBets}</div>
    </td>
    <td style="width:33%;padding:14px 8px;text-align:center;background:#161820;border-right:1px solid rgba(255,255,255,0.04)">
      <div style="font-family:'Courier New',monospace;font-size:9px;color:#515968;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px">RECORD</div>
      <div style="font-family:'Courier New',monospace;font-size:24px;font-weight:700;color:#F0F2F5">${esc(record)}</div>
    </td>
    <td style="width:33%;padding:14px 8px;text-align:center;background:#161820">
      <div style="font-family:'Courier New',monospace;font-size:9px;color:#515968;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px">P&amp;L</div>
      <div style="font-family:'Courier New',monospace;font-size:24px;font-weight:700;color:${pnlColor}">${pnlStr}</div>
    </td>
  </tr></tbody></table>
</td></tr>

<!-- ROI + Streak -->
<tr><td style="padding:12px 24px 0">
  <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr>
    <td>
      <span style="font-family:'Courier New',monospace;font-size:11px;color:#515968;letter-spacing:1px">ROI </span>
      <span style="font-family:'Courier New',monospace;font-size:13px;font-weight:600;color:${roiColor}">${roiStr}</span>
    </td>
    ${streakHtml}
  </tr></tbody></table>
</td></tr>

<!-- Divider -->
<tr><td style="padding:20px 24px 0"><div style="border-top:1px solid rgba(255,255,255,0.04)"></div></td></tr>

<!-- Insight card -->
<tr><td style="padding:20px 24px 0">
  <div style="background:#161820;padding:18px;border-left:3px solid #D29922;border:1px solid rgba(255,255,255,0.04);border-left:3px solid #D29922">
    <div style="font-size:14px;font-weight:700;color:#F0F2F5;margin-bottom:8px">${insightEmoji} ${esc(insightHeadline)}</div>
    <div style="font-size:13px;color:#848D9A;line-height:1.6">${esc(insightDetail)}</div>
  </div>
</td></tr>

<!-- Win/Loss -->
<tr><td style="padding:20px 24px 0">
  <table cellpadding="0" cellspacing="0" style="width:100%"><tbody>
    ${winLossHtml ? winLossHtml : ''}
  </tbody></table>
</td></tr>

<!-- CTA -->
<tr><td style="padding:8px 24px 0;text-align:center">
  <a href="${esc(autopsyUrl)}" style="display:inline-block;background:#00C9A7;color:#111318;font-size:13px;font-weight:700;font-family:'Courier New',monospace;padding:12px 32px;text-decoration:none;letter-spacing:0.5px">Run a Fresh Autopsy →</a>
</td></tr>

<!-- Secondary CTA -->
<tr><td style="padding:12px 24px 0;text-align:center">
  <a href="${esc(quizUrl)}" style="font-family:'Courier New',monospace;font-size:11px;color:#00C9A7;text-decoration:none;letter-spacing:1px">TAKE THE FREE BET DNA QUIZ →</a>
</td></tr>

<!-- Footer -->
<tr><td style="padding:24px 24px">
  <div style="border-top:1px solid rgba(255,255,255,0.04);padding-top:16px">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#515968;line-height:1.7;text-align:center;letter-spacing:0.5px">
      BetAutopsy provides behavioral analysis and educational insights — not gambling or financial advice. Past results don't guarantee future outcomes. 21+. If you or someone you know has a gambling problem, call 1-800-GAMBLER.
    </div>
    <div style="text-align:center;margin-top:10px">
      <a href="${esc(unsubscribeUrl)}" style="font-family:'Courier New',monospace;font-size:10px;color:#515968;text-decoration:underline;letter-spacing:0.5px">Unsubscribe from weekly digests</a>
    </div>
  </div>
</td></tr>

</tbody></table>
</td></tr></table>
</body></html>`;
}

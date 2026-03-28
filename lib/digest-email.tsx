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

  const pnlColor = netPnL >= 0 ? '#16a34a' : '#dc2626';
  const roiColor = roi >= 0 ? '#16a34a' : '#dc2626';
  const pnlStr = `${netPnL >= 0 ? '+' : ''}$${Math.abs(Math.round(netPnL)).toLocaleString()}`;
  const roiStr = `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`;

  let winLossHtml = '';
  if (biggestWin || biggestLoss) {
    const winCell = biggestWin ? `
      <td style="width:${biggestLoss ? '50%' : '100%'};padding-right:${biggestLoss ? '6px' : '0'};vertical-align:top">
        <div style="background:#f0fdf4;border-radius:10px;padding:14px;border:1px solid #bbf7d0">
          <div style="font-size:11px;color:#16a34a;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:600">BIGGEST WIN</div>
          <div style="font-size:13px;color:#1a1a1a;margin-bottom:4px;line-height:1.4">${esc(biggestWin.description)}</div>
          <div style="font-size:16px;font-weight:700;color:#16a34a">+$${biggestWin.profit.toLocaleString()}</div>
        </div>
      </td>` : '';
    const lossCell = biggestLoss ? `
      <td style="width:${biggestWin ? '50%' : '100%'};padding-left:${biggestWin ? '6px' : '0'};vertical-align:top">
        <div style="background:#fef2f2;border-radius:10px;padding:14px;border:1px solid #fecaca">
          <div style="font-size:11px;color:#dc2626;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:600">BIGGEST LOSS</div>
          <div style="font-size:13px;color:#1a1a1a;margin-bottom:4px;line-height:1.4">${esc(biggestLoss.description)}</div>
          <div style="font-size:16px;font-weight:700;color:#dc2626">-$${Math.abs(biggestLoss.profit).toLocaleString()}</div>
        </div>
      </td>` : '';
    winLossHtml = `
      <tr><td style="padding-bottom:20px">
        <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr>${winCell}${lossCell}</tr></tbody></table>
      </td></tr>`;
  }

  const streakHtml = streakCount > 0
    ? `<td style="text-align:right"><span style="font-size:14px;color:#666">🔥 ${streakCount}-week streak</span></td>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5f5f5;width:100%">
<tr><td align="center" style="padding:24px 16px">
<table cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e5e5"><tbody>

<!-- Header bar -->
<tr><td style="background-color:#0D1117;padding:20px 24px">
  <span style="font-size:18px;font-weight:700;color:#ffffff"><span style="font-weight:900">BET</span><span style="font-weight:300;color:#00C9A7">AUTOPSY</span></span>
</td></tr>

<!-- Positive lead -->
<tr><td style="padding:20px 24px 0">
  <div style="background:#f0fdf4;border-radius:10px;padding:14px 18px;border:1px solid #bbf7d0">
    <span style="font-size:15px;color:#1a1a1a">${positiveLead.emoji} ${esc(positiveLead.text)}</span>
  </div>
</td></tr>

<!-- Heading -->
<tr><td style="padding:20px 24px 0">
  <div style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:4px">Your week in bets, ${esc(displayName)}.</div>
  <div style="font-size:13px;color:#888">Here's what happened since last Tuesday.</div>
</td></tr>

<!-- Stats grid -->
<tr><td style="padding:16px 24px 0">
  <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr>
    <td style="width:33%;padding-right:6px">
      <div style="background:#f5f5f5;border-radius:10px;padding:14px 8px;text-align:center">
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:600">BETS</div>
        <div style="font-size:26px;font-weight:700;color:#1a1a1a">${totalBets}</div>
      </div>
    </td>
    <td style="width:33%;padding:0 3px">
      <div style="background:#f5f5f5;border-radius:10px;padding:14px 8px;text-align:center">
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:600">RECORD</div>
        <div style="font-size:26px;font-weight:700;color:#1a1a1a">${esc(record)}</div>
      </div>
    </td>
    <td style="width:33%;padding-left:6px">
      <div style="background:#f5f5f5;border-radius:10px;padding:14px 8px;text-align:center">
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:600">P&amp;L</div>
        <div style="font-size:26px;font-weight:700;color:${pnlColor}">${pnlStr}</div>
      </div>
    </td>
  </tr></tbody></table>
</td></tr>

<!-- ROI + Streak -->
<tr><td style="padding:12px 24px 0">
  <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr>
    <td>
      <span style="font-size:14px;color:#666">Weekly ROI: </span>
      <span style="font-size:14px;font-weight:600;color:${roiColor}">${roiStr}</span>
    </td>
    ${streakHtml}
  </tr></tbody></table>
</td></tr>

<!-- Divider -->
<tr><td style="padding:20px 24px 0"><div style="border-top:1px solid #e5e5e5"></div></td></tr>

<!-- Insight card -->
<tr><td style="padding:20px 24px 0">
  <div style="background:#f8f9fa;border-radius:10px;padding:18px;border-left:3px solid #00C9A7">
    <div style="font-size:15px;font-weight:700;color:#1a1a1a;margin-bottom:8px">${insightEmoji} ${esc(insightHeadline)}</div>
    <div style="font-size:13px;color:#555;line-height:1.6">${esc(insightDetail)}</div>
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
  <a href="${esc(autopsyUrl)}" style="display:inline-block;background:#00C9A7;color:#ffffff;font-size:14px;font-weight:700;padding:12px 32px;border-radius:10px;text-decoration:none">Run a Fresh Autopsy →</a>
</td></tr>

<!-- Secondary CTA -->
<tr><td style="padding:12px 24px 0;text-align:center">
  <a href="${esc(quizUrl)}" style="font-size:13px;color:#00C9A7;text-decoration:none">Or take the free Bet DNA quiz →</a>
</td></tr>

<!-- Footer -->
<tr><td style="padding:24px 24px">
  <div style="border-top:1px solid #e5e5e5;padding-top:16px">
    <div style="font-size:11px;color:#999;line-height:1.6;text-align:center">
      BetAutopsy provides behavioral analysis and educational insights — not gambling or financial advice. Past results don't guarantee future outcomes. 21+. If you or someone you know has a gambling problem, call 1-800-GAMBLER.
    </div>
    <div style="text-align:center;margin-top:10px">
      <a href="${esc(unsubscribeUrl)}" style="font-size:11px;color:#999;text-decoration:underline">Unsubscribe from weekly digests</a>
    </div>
  </div>
</td></tr>

</tbody></table>
</td></tr></table>
</body></html>`;
}

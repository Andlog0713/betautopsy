import type { WeekendSession } from './digest-helpers';

interface WeekendEmailProps {
  displayName: string;
  totalBets: number;
  record: string;
  netPnL: number;
  sessions: WeekendSession[];
  disciplineScore: number | null;
  disciplineDelta: number | null;
  unsubscribeUrl: string;
  autopsyUrl: string;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderWeekendEmail(props: WeekendEmailProps): string {
  const { displayName, totalBets, record, netPnL, sessions,
    disciplineScore, disciplineDelta, unsubscribeUrl, autopsyUrl } = props;

  const pnlColor = netPnL >= 0 ? '#16a34a' : '#dc2626';
  const pnlStr = `${netPnL >= 0 ? '+' : '-'}$${Math.abs(Math.round(netPnL)).toLocaleString()}`;
  const sessionCount = sessions.length;
  const heatedCount = sessions.filter(s => s.isHeated).length;
  const worstSession = sessions.length > 0
    ? sessions.reduce((w, s) => {
        const gradeOrder = { F: 0, D: 1, C: 2, B: 3, A: 4 };
        return gradeOrder[s.grade] < gradeOrder[w.grade] ? s : w;
      })
    : null;

  // Behavioral callout
  let behavioralHtml = '';
  if (heatedCount > 0 && worstSession) {
    behavioralHtml = `
    <tr><td style="padding:16px 24px 0">
      <div style="background:#fffbeb;border-left:3px solid #d97706;padding:14px 18px">
        <div style="font-size:14px;font-weight:700;color:#1a1a1a;margin-bottom:6px">🔥 ${heatedCount} of ${sessionCount} sessions were heated</div>
        <div style="font-size:13px;color:#555;line-height:1.5">Your worst was ${esc(worstSession.day)} at ${esc(worstSession.startTime)} (Grade ${worstSession.grade}). ${worstSession.profit < 0 ? `That session cost $${Math.abs(worstSession.profit).toLocaleString()}.` : ''}</div>
      </div>
    </td></tr>`;
  } else if (sessionCount > 0) {
    behavioralHtml = `
    <tr><td style="padding:16px 24px 0">
      <div style="background:#f0fdf4;border-left:3px solid #0d9488;padding:14px 18px">
        <div style="font-size:14px;color:#1a1a1a">No heated sessions detected this weekend. Discipline held.</div>
      </div>
    </td></tr>`;
  }

  // Session breakdown table
  let sessionTableHtml = '';
  if (sessions.length > 0) {
    const rows = sessions.map(s => {
      const gradeColor = s.grade === 'A' ? '#0d9488' : s.grade === 'B' ? '#0d9488' : s.grade === 'C' ? '#888' : s.grade === 'D' ? '#d97706' : '#dc2626';
      const profitColor = s.profit >= 0 ? '#16a34a' : '#dc2626';
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;color:#1a1a1a">${esc(s.day)} ${esc(s.startTime)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;font-family:'Courier New',monospace;font-size:13px;text-align:center;color:#1a1a1a">${s.bets}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;font-family:'Courier New',monospace;font-size:13px;font-weight:700;text-align:center;color:${gradeColor}">${s.grade}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;font-family:'Courier New',monospace;font-size:13px;font-weight:600;text-align:right;color:${profitColor}">${s.profit >= 0 ? '+' : '-'}$${Math.abs(s.profit).toLocaleString()}</td>
      </tr>`;
    }).join('');

    sessionTableHtml = `
    <tr><td style="padding:16px 24px 0">
      <div style="font-family:'Courier New',monospace;font-size:9px;color:#888;text-transform:uppercase;letter-spacing:3px;margin-bottom:8px">SESSION BREAKDOWN</div>
      <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e5e5">
        <thead><tr style="background:#fafafa">
          <th style="padding:8px 12px;text-align:left;font-family:'Courier New',monospace;font-size:10px;color:#888;letter-spacing:1px;border-bottom:1px solid #e5e5e5">WHEN</th>
          <th style="padding:8px 12px;text-align:center;font-family:'Courier New',monospace;font-size:10px;color:#888;letter-spacing:1px;border-bottom:1px solid #e5e5e5">BETS</th>
          <th style="padding:8px 12px;text-align:center;font-family:'Courier New',monospace;font-size:10px;color:#888;letter-spacing:1px;border-bottom:1px solid #e5e5e5">GRADE</th>
          <th style="padding:8px 12px;text-align:right;font-family:'Courier New',monospace;font-size:10px;color:#888;letter-spacing:1px;border-bottom:1px solid #e5e5e5">P&amp;L</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </td></tr>`;
  }

  // Discipline Score card
  let disciplineHtml = '';
  if (disciplineScore !== null) {
    const dsColor = disciplineScore >= 70 ? '#0d9488' : disciplineScore >= 40 ? '#d97706' : '#dc2626';
    disciplineHtml = `
    <tr><td style="padding:20px 24px 0">
      <div style="background:#f8fafc;border:1px solid #e5e5e5;padding:18px;text-align:center">
        <div style="font-family:'Courier New',monospace;font-size:9px;color:#888;text-transform:uppercase;letter-spacing:3px;margin-bottom:8px">DISCIPLINE SCORE</div>
        <div style="font-family:'Courier New',monospace;font-size:36px;font-weight:700;color:${dsColor}">${disciplineScore}</div>
        <div style="font-family:'Courier New',monospace;font-size:11px;color:#888;margin-top:2px">/100</div>
        ${disciplineDelta !== null && disciplineDelta !== 0 ? `
        <div style="font-family:'Courier New',monospace;font-size:12px;font-weight:600;color:${disciplineDelta > 0 ? '#0d9488' : '#dc2626'};margin-top:8px">
          ${disciplineDelta > 0 ? '&#9650;' : '&#9660;'} ${disciplineDelta > 0 ? '+' : ''}${disciplineDelta} pts from last report
        </div>` : ''}
      </div>
    </td></tr>`;
  }

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5f5f5;width:100%">
<tr><td align="center" style="padding:24px 16px">
<table cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background-color:#ffffff;overflow:hidden;border:1px solid #e0e0e0"><tbody>

<!-- Header bar -->
<tr><td style="background-color:#111318;padding:20px 24px">
  <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr>
    <td>
      <span style="font-size:18px;font-weight:900;color:#ffffff;letter-spacing:1px">BET</span><span style="font-size:18px;font-weight:300;color:#00FFCB;letter-spacing:1px">AUTOPSY</span>
    </td>
    <td style="text-align:right">
      <span style="font-family:'Courier New',monospace;font-size:9px;color:#888;letter-spacing:3px;text-transform:uppercase">WEEKEND AUTOPSY</span>
    </td>
  </tr></tbody></table>
</td></tr>

<!-- Lead -->
<tr><td style="padding:20px 24px 0">
  <div style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:4px">Your weekend, ${esc(displayName)}.</div>
  <div style="font-family:'Courier New',monospace;font-size:11px;color:#888;letter-spacing:1px">${totalBets} BETS ACROSS ${sessionCount} SESSION${sessionCount !== 1 ? 'S' : ''}</div>
</td></tr>

<!-- Stats grid -->
<tr><td style="padding:16px 24px 0">
  <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e5e5"><tbody><tr>
    <td style="width:33%;padding:14px 8px;text-align:center;background:#fafafa;border-right:1px solid #e5e5e5">
      <div style="font-family:'Courier New',monospace;font-size:9px;color:#888;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px">BETS</div>
      <div style="font-family:'Courier New',monospace;font-size:24px;font-weight:700;color:#1a1a1a">${totalBets}</div>
    </td>
    <td style="width:33%;padding:14px 8px;text-align:center;background:#fafafa;border-right:1px solid #e5e5e5">
      <div style="font-family:'Courier New',monospace;font-size:9px;color:#888;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px">RECORD</div>
      <div style="font-family:'Courier New',monospace;font-size:24px;font-weight:700;color:#1a1a1a">${esc(record)}</div>
    </td>
    <td style="width:33%;padding:14px 8px;text-align:center;background:#fafafa">
      <div style="font-family:'Courier New',monospace;font-size:9px;color:#888;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px">P&amp;L</div>
      <div style="font-family:'Courier New',monospace;font-size:24px;font-weight:700;color:${pnlColor}">${pnlStr}</div>
    </td>
  </tr></tbody></table>
</td></tr>

${behavioralHtml}
${sessionTableHtml}

<!-- Divider -->
<tr><td style="padding:20px 24px 0"><div style="border-top:1px solid #e5e5e5"></div></td></tr>

${disciplineHtml}

<!-- CTA -->
<tr><td style="padding:20px 24px 0;text-align:center">
  <a href="${esc(autopsyUrl)}" style="display:inline-block;background:#0d9488;color:#ffffff;font-size:13px;font-weight:700;font-family:'Courier New',monospace;padding:12px 32px;text-decoration:none;letter-spacing:0.5px">Upload Latest Data &rarr;</a>
</td></tr>

<tr><td style="padding:12px 24px 0;text-align:center">
  <span style="font-family:'Courier New',monospace;font-size:11px;color:#888">Upload your latest bets to update your Discipline Score</span>
</td></tr>

<!-- Footer -->
<tr><td style="padding:24px 24px">
  <div style="border-top:1px solid #e5e5e5;padding-top:16px">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#999;line-height:1.7;text-align:center;letter-spacing:0.5px">
      BetAutopsy provides behavioral analysis and educational insights, not gambling or financial advice. Past results don't guarantee future outcomes. 18+. If you or someone you know has a gambling problem, call 1-800-GAMBLER.
    </div>
    <div style="text-align:center;margin-top:10px">
      <a href="${esc(unsubscribeUrl)}" style="font-family:'Courier New',monospace;font-size:10px;color:#999;text-decoration:underline;letter-spacing:0.5px">Unsubscribe from emails</a>
    </div>
  </div>
</td></tr>

</tbody></table>
</td></tr></table>
</body></html>`;
}

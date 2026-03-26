import * as React from 'react';

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

export function DigestEmail({
  displayName, positiveLead, totalBets, record, netPnL, roi, streakCount,
  insightEmoji, insightHeadline, insightDetail,
  biggestWin, biggestLoss, unsubscribeUrl, autopsyUrl, quizUrl,
}: DigestEmailProps) {
  const pnlColor = netPnL >= 0 ? '#00C853' : '#f87171';
  const roiColor = roi >= 0 ? '#00C853' : '#f87171';
  const pnlStr = `${netPnL >= 0 ? '+' : ''}$${Math.abs(Math.round(netPnL))}`;
  const roiStr = `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`;

  return (
    <div style={{ backgroundColor: '#0D1117', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: '#F0F0F0' }}>
      <table cellPadding="0" cellSpacing="0" style={{ width: '100%', maxWidth: 560, margin: '0 auto', padding: '32px 20px' }}>
        <tbody>
          {/* Logo */}
          <tr>
            <td style={{ paddingBottom: 24 }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>
                Bet<span style={{ color: '#00C853' }}>Autopsy</span>
              </span>
            </td>
          </tr>

          {/* Positive lead */}
          <tr>
            <td style={{ paddingBottom: 20 }}>
              <div style={{ background: 'rgba(0,200,83,0.06)', borderRadius: 12, padding: '16px 20px', border: '1px solid rgba(0,200,83,0.12)' }}>
                <span style={{ fontSize: 15, color: '#F0F0F0' }}>
                  {positiveLead.emoji} {positiveLead.text}
                </span>
              </div>
            </td>
          </tr>

          {/* Heading */}
          <tr>
            <td style={{ paddingBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F0', marginBottom: 4 }}>
                Your week in bets, {displayName}.
              </div>
              <div style={{ fontSize: 13, color: '#5A5C6F' }}>
                Here&apos;s what happened since last Tuesday.
              </div>
            </td>
          </tr>

          {/* Stats grid */}
          <tr>
            <td style={{ paddingBottom: 16 }}>
              <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '33%', paddingRight: 6 }}>
                      <div style={{ background: '#1C1E2D', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#5A5C6F', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>BETS</div>
                        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#F0F0F0' }}>{totalBets}</div>
                      </div>
                    </td>
                    <td style={{ width: '33%', padding: '0 3px' }}>
                      <div style={{ background: '#1C1E2D', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#5A5C6F', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>RECORD</div>
                        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#F0F0F0' }}>{record}</div>
                      </div>
                    </td>
                    <td style={{ width: '33%', paddingLeft: 6 }}>
                      <div style={{ background: '#1C1E2D', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#5A5C6F', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>P&amp;L</div>
                        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: pnlColor }}>{pnlStr}</div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* ROI + Streak row */}
          <tr>
            <td style={{ paddingBottom: 20 }}>
              <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                <tbody>
                  <tr>
                    <td>
                      <span style={{ fontSize: 14, color: '#A0A3B1' }}>Weekly ROI: </span>
                      <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: roiColor }}>{roiStr}</span>
                    </td>
                    {streakCount > 0 && (
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 14, color: '#A0A3B1' }}>🔥 {streakCount}-week streak</span>
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* Insight card */}
          <tr>
            <td style={{ paddingBottom: 20 }}>
              <div style={{ background: '#1C1E2D', borderRadius: 10, padding: 20, borderLeft: '3px solid #00C853' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#F0F0F0', marginBottom: 8 }}>
                  {insightEmoji} {insightHeadline}
                </div>
                <div style={{ fontSize: 13, color: '#A0A3B1', lineHeight: 1.6 }}>
                  {insightDetail}
                </div>
              </div>
            </td>
          </tr>

          {/* Biggest Win / Loss */}
          {(biggestWin || biggestLoss) && (
            <tr>
              <td style={{ paddingBottom: 20 }}>
                <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                  <tbody>
                    <tr>
                      {biggestWin && (
                        <td style={{ width: biggestLoss ? '50%' : '100%', paddingRight: biggestLoss ? 4 : 0 }}>
                          <div style={{ background: 'rgba(0,200,83,0.06)', borderRadius: 10, padding: 14, border: '1px solid rgba(0,200,83,0.12)' }}>
                            <div style={{ fontSize: 11, color: '#00C853', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>BIGGEST WIN</div>
                            <div style={{ fontSize: 13, color: '#F0F0F0', marginBottom: 4, lineHeight: 1.4 }}>{biggestWin.description.slice(0, 50)}</div>
                            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#00C853' }}>+${biggestWin.profit}</div>
                          </div>
                        </td>
                      )}
                      {biggestLoss && (
                        <td style={{ width: biggestWin ? '50%' : '100%', paddingLeft: biggestWin ? 4 : 0 }}>
                          <div style={{ background: 'rgba(248,113,113,0.06)', borderRadius: 10, padding: 14, border: '1px solid rgba(248,113,113,0.12)' }}>
                            <div style={{ fontSize: 11, color: '#f87171', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>BIGGEST LOSS</div>
                            <div style={{ fontSize: 13, color: '#F0F0F0', marginBottom: 4, lineHeight: 1.4 }}>{biggestLoss.description.slice(0, 50)}</div>
                            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#f87171' }}>-${Math.abs(biggestLoss.profit)}</div>
                          </div>
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          )}

          {/* CTA button */}
          <tr>
            <td style={{ paddingBottom: 12, textAlign: 'center' }}>
              <a href={autopsyUrl} style={{ display: 'inline-block', background: '#00C853', color: '#0D1117', fontSize: 14, fontWeight: 700, padding: '12px 32px', borderRadius: 10, textDecoration: 'none' }}>
                Run a Fresh Autopsy →
              </a>
            </td>
          </tr>

          {/* Secondary CTA */}
          <tr>
            <td style={{ paddingBottom: 24, textAlign: 'center' }}>
              <a href={quizUrl} style={{ fontSize: 13, color: '#00C853', textDecoration: 'none' }}>
                Or take the free Bet DNA quiz →
              </a>
            </td>
          </tr>

          {/* Footer */}
          <tr>
            <td style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
              <div style={{ fontSize: 11, color: '#5A5C6F', lineHeight: 1.6, textAlign: 'center' }}>
                BetAutopsy provides behavioral analysis and educational insights — not gambling or financial advice. Past results don&apos;t guarantee future outcomes. 21+. If you or someone you know has a gambling problem, call 1-800-GAMBLER.
              </div>
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <a href={unsubscribeUrl} style={{ fontSize: 11, color: '#5A5C6F', textDecoration: 'underline' }}>
                  Unsubscribe from weekly digests
                </a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

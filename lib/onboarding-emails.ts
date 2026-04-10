// ── BetAutopsy onboarding email templates ──
// Seven-email drip sequence. Email 1 fires immediately from the auth callback
// the first time a user authenticates; Emails 2-7 fire from the daily cron at
// app/api/onboarding-emails/route.ts.
//
// Voice: forensic case file, clinical, data-driven. Keep monospace accents and
// the scalpel teal (#00C9A7). No emojis. No hype. Every factual claim must be
// backed by something in lib/autopsy-engine.ts or the product copy.

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function emailShell(content: string, unsubscribeUrl?: string): string {
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
      BetAutopsy // Behavioral Analysis for Sports Bettors<br/>
      Behavioral analysis and educational insights, not gambling or financial advice. 18+. If you or someone you know has a gambling problem, call 1-800-GAMBLER.
    </div>
    ${unsubscribeUrl ? `<div style="text-align:center;margin-top:10px"><a href="${esc(unsubscribeUrl)}" style="font-size:10px;color:#999;text-decoration:underline">Unsubscribe</a></div>` : ''}
  </div>
</td></tr>
</tbody></table>
</td></tr></table>
</body></html>`;
}

interface EmailProps {
  displayName: string;
  appUrl: string;
  unsubscribeUrl?: string;
}

// ── Email 1: Welcome (fires immediately from auth callback on first auth) ──

export function renderWelcomeEmail(props: EmailProps): { subject: string; html: string } {
  const { displayName, appUrl, unsubscribeUrl } = props;
  return {
    subject: 'Your case file is open',
    html: emailShell(`
<tr><td style="padding:24px 24px 0">
  <div style="font-size:18px;font-weight:700;color:#1a1a1a;margin-bottom:8px">Welcome, ${esc(displayName)}.</div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    You just took a step most bettors never take: deciding to look at your own patterns instead of chasing the next pick.
  </div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:12px">Here's what happens next:</div>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="background:#f8f9fa;padding:14px;margin-bottom:8px;border-left:3px solid #00C9A7">
    <div style="font-size:13px;color:#1a1a1a;font-weight:700;margin-bottom:4px">1. Upload your betting history</div>
    <div style="font-size:13px;color:#555;line-height:1.5">Screenshot your settled bets from your sportsbook app, paste them from desktop, or export a CSV. Or sync automatically with <a href="https://links.pikkit.com/invite/surf40498" style="color:#0d9488;text-decoration:none">Pikkit</a>.</div>
  </div>
  <div style="background:#f8f9fa;padding:14px;margin-bottom:8px;border-left:3px solid #888">
    <div style="font-size:13px;color:#1a1a1a;font-weight:700;margin-bottom:4px">2. We analyze 47 behavioral signals</div>
    <div style="font-size:13px;color:#555;line-height:1.5">Session patterns, loss chasing, stake volatility, parlay habits, timing, emotional triggers. Every bet gets classified.</div>
  </div>
  <div style="background:#f8f9fa;padding:14px;border-left:3px solid #888">
    <div style="font-size:13px;color:#1a1a1a;font-weight:700;margin-bottom:4px">3. You get a forensic report</div>
    <div style="font-size:13px;color:#555;line-height:1.5">Five chapters. Your biases named. Dollar costs attached. A personalized action plan to fix the leaks.</div>
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px;text-align:center">
  <a href="${esc(appUrl)}/upload" style="display:inline-block;background:#00C9A7;color:#111318;font-size:13px;font-weight:700;padding:12px 32px;text-decoration:none">Upload Your Bets →</a>
  <div style="font-size:12px;color:#888;margin-top:8px">Your first full report is free. No credit card.</div>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="font-size:12px;color:#888;text-align:center">// Andrew, BetAutopsy</div>
</td></tr>`, unsubscribeUrl),
  };
}

// ── Email 2: First Nudge (Day 1, skip if user uploaded bets) ──

export function renderFirstNudgeEmail(props: EmailProps): { subject: string; html: string } {
  const { displayName, appUrl, unsubscribeUrl } = props;
  return {
    subject: '3 minutes to upload. Seriously.',
    html: emailShell(`
<tr><td style="padding:24px 24px 0">
  <div style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:8px">${esc(displayName)}, getting bets in is easier than you think.</div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    Most people think uploading their betting history is going to be a pain. It takes about 3 minutes.
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="background:#f8f9fa;padding:14px;margin-bottom:8px;border-left:3px solid #00C9A7">
    <div style="font-size:13px;color:#1a1a1a;font-weight:700;margin-bottom:4px">Option A: Screenshot (fastest from phone)</div>
    <div style="font-size:13px;color:#555;line-height:1.5">Open your sportsbook app → My Bets → Settled → screenshot. Upload to BetAutopsy. Our AI reads it automatically.</div>
  </div>
  <div style="background:#f8f9fa;padding:14px;margin-bottom:8px;border-left:3px solid #888">
    <div style="font-size:13px;color:#1a1a1a;font-weight:700;margin-bottom:4px">Option B: Paste (fastest from desktop)</div>
    <div style="font-size:13px;color:#555;line-height:1.5">Log into your sportsbook on desktop → My Bets → Settled → select all → copy → paste into BetAutopsy. We'll figure out the format.</div>
  </div>
  <div style="background:#f8f9fa;padding:14px;margin-bottom:8px;border-left:3px solid #888">
    <div style="font-size:13px;color:#1a1a1a;font-weight:700;margin-bottom:4px">Option C: CSV export</div>
    <div style="font-size:13px;color:#555;line-height:1.5">Most sportsbooks have Activity/History → Export as CSV. Drop the file into BetAutopsy. Done.</div>
  </div>
  <div style="background:#f8f9fa;padding:14px;border-left:3px solid #888">
    <div style="font-size:13px;color:#1a1a1a;font-weight:700;margin-bottom:4px">Option D: Pikkit sync</div>
    <div style="font-size:13px;color:#555;line-height:1.5">Connect your sportsbook through <a href="https://links.pikkit.com/invite/surf40498" style="color:#0d9488;text-decoration:none">Pikkit</a> and your bets import automatically.</div>
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="font-size:13px;color:#555;line-height:1.6">
    Once your bets are in, you'll see behavioral patterns you didn't know existed. Most of them are costing real money.
  </div>
</td></tr>

<tr><td style="padding:8px 24px 16px;text-align:center">
  <a href="${esc(appUrl)}/upload" style="display:inline-block;background:#00C9A7;color:#111318;font-size:13px;font-weight:700;padding:12px 32px;text-decoration:none">Upload Now →</a>
</td></tr>`, unsubscribeUrl),
  };
}

// ── Email 3: Feature Highlight (Day 3, skip if user ran analysis) ──

export function renderFeatureHighlightEmail(props: EmailProps): { subject: string; html: string } {
  const { displayName, appUrl, unsubscribeUrl } = props;
  return {
    subject: 'What an emotion score of 72 actually means',
    html: emailShell(`
<tr><td style="padding:24px 24px 0">
  <div style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:8px">${esc(displayName)}, meet your Emotion Score.</div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    Every BetAutopsy report includes an Emotion Score from 0 to 100. It measures how much your betting behavior is driven by emotional reactions vs. disciplined strategy.
  </div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:12px">We look at four signals in your data:</div>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="background:#f8f9fa;padding:14px;border-left:3px solid #888">
    <div style="font-size:13px;color:#555;line-height:1.8">
      <strong style="color:#1a1a1a">Stake volatility:</strong> are your bet sizes all over the place, or steady?<br/>
      <strong style="color:#1a1a1a">Loss chasing:</strong> does your next bet get bigger after a loss?<br/>
      <strong style="color:#1a1a1a">Streak behavior:</strong> do you speed up or slow down on losing streaks?<br/>
      <strong style="color:#1a1a1a">Session discipline:</strong> do you quit while ahead, or chase until you're down?
    </div>
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="font-size:14px;color:#555;line-height:1.6">
    A score of 30 means your betting is mostly rational. A score of 72 means emotions are running the show on more than half your bets.
  </div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-top:12px">
    The number isn't the point. The point is seeing which specific triggers drive YOUR score. That's what the report breaks down.
  </div>
</td></tr>

<tr><td style="padding:8px 24px 16px;text-align:center">
  <a href="${esc(appUrl)}/upload" style="display:inline-block;background:#00C9A7;color:#111318;font-size:13px;font-weight:700;padding:12px 32px;text-decoration:none">See Your Emotion Score →</a>
</td></tr>`, unsubscribeUrl),
  };
}

// ── Email 4: Social Proof (Day 5, always sends) ──

export function renderSocialProofEmail(props: EmailProps): { subject: string; html: string } {
  const { displayName, appUrl, unsubscribeUrl } = props;
  return {
    subject: 'The pattern that costs most bettors the most money',
    html: emailShell(`
<tr><td style="padding:24px 24px 0">
  <div style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:8px">${esc(displayName)}, there's one pattern we see in almost every report.</div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    It's called post-loss escalation. The sequence looks like this:
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="background:#f8f9fa;padding:14px;border-left:3px solid #C4463A">
    <div style="font-size:13px;color:#555;line-height:1.7">
      You lose a $50 bet. Your next bet is $75. You lose that too. Now you put $120 on a parlay to "get it all back." That loses. You're down $245 instead of $50.
    </div>
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="font-size:14px;color:#555;line-height:1.6">
    Sound familiar? You're not alone. It shows up in the majority of reports we run. It's also one of the most expensive behavioral leaks in sports betting because it compounds inside a single session.
  </div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-top:12px">
    The fix is specific and measurable: a hard ceiling on post-loss stakes (say, 1.5x your average) and a mandatory stop after three consecutive losses. Generic advice without the data doesn't work, which is why your report tells you exactly how much this pattern is costing YOU and whether the fix applies to your specific numbers.
  </div>
</td></tr>

<tr><td style="padding:8px 24px 16px;text-align:center">
  <a href="${esc(appUrl)}/upload" style="display:inline-block;background:#00C9A7;color:#111318;font-size:13px;font-weight:700;padding:12px 32px;text-decoration:none">Get Your Report →</a>
</td></tr>`, unsubscribeUrl),
  };
}

// ── Email 5: Urgency (Day 7, skip if user ran analysis) ──

export function renderUrgencyEmail(props: EmailProps): { subject: string; html: string } {
  const { displayName, appUrl, unsubscribeUrl } = props;
  return {
    subject: 'Your bets are sitting there, waiting',
    html: emailShell(`
<tr><td style="padding:24px 24px 0">
  <div style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:8px">${esc(displayName)}, it's been a week.</div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    Your sportsbook has a record of every bet you've placed. Every late-night parlay. Every chase bet. Every time you doubled down after a bad beat.
  </div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    That data tells a story about <em>how</em> you bet. Not what you bet on. How.
  </div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:12px">
    BetAutopsy reads that story and translates it into specifics:
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="background:#f8f9fa;padding:14px;border-left:3px solid #888">
    <div style="font-size:13px;color:#555;line-height:1.8">
      Which sessions cost you the most (and what time they happened)<br/>
      Whether your stake sizing is disciplined or emotional<br/>
      Which sport/bet type combinations are actually profitable for you<br/>
      How much money your behavioral patterns are leaving on the table
    </div>
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="font-size:14px;color:#555;line-height:1.6">
    Your first full report is still free. The data is already there. You just haven't looked at it yet.
  </div>
</td></tr>

<tr><td style="padding:8px 24px 16px;text-align:center">
  <a href="${esc(appUrl)}/upload" style="display:inline-block;background:#00C9A7;color:#111318;font-size:13px;font-weight:700;padding:12px 32px;text-decoration:none">Upload Your Bets →</a>
</td></tr>`, unsubscribeUrl),
  };
}

// ── Email 6: Launch promo ending (48h before LAUNCH_PROMO_DEADLINE) ──

export function renderTrialEndingEmail(props: EmailProps): { subject: string; html: string } {
  const { displayName, appUrl, unsubscribeUrl } = props;
  return {
    subject: 'Your launch-window access ends in 48 hours',
    html: emailShell(`
<tr><td style="padding:24px 24px 0">
  <div style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:8px">${esc(displayName)}, quick heads up.</div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    BetAutopsy's launch-window access ends in about 48 hours.
  </div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    After that, you'll still be able to run free snapshot reports, but they show only your grade and top bias. The dollar costs, session breakdowns, and detailed recommendations get locked behind the paywall.
  </div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:12px">
    If you've been meaning to try BetAutopsy, now's the time to either:
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="background:#f8f9fa;padding:14px;margin-bottom:8px;border-left:3px solid #00C9A7">
    <div style="font-size:13px;color:#1a1a1a;font-weight:700;margin-bottom:4px">Run your first full report while it's still free</div>
    <div style="font-size:13px;color:#555;line-height:1.5">Takes 2 minutes once your bets are uploaded. No credit card.</div>
  </div>
  <div style="background:#f8f9fa;padding:14px;border-left:3px solid #888">
    <div style="font-size:13px;color:#1a1a1a;font-weight:700;margin-bottom:4px">Or upgrade to keep full access</div>
    <div style="font-size:13px;color:#555;line-height:1.5">Plans start at $9.99 for a single report, or $19.99/month for Pro (3 reports/month + weekly digest + progress tracking).</div>
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="font-size:14px;color:#555;line-height:1.6">
    No pressure either way. The free snapshot tier is always there.
  </div>
</td></tr>

<tr><td style="padding:8px 24px 16px;text-align:center">
  <a href="${esc(appUrl)}/upload" style="display:inline-block;background:#00C9A7;color:#111318;font-size:13px;font-weight:700;padding:12px 32px;text-decoration:none">Run Your Free Report →</a>
</td></tr>`, unsubscribeUrl),
  };
}

// ── Post-Report Summary (fires Day +1 after the user's FIRST autopsy) ──

interface PostReportProps extends EmailProps {
  grade: string;
  emotionScore: number;
  biasCount: number;
  reportUrl: string;
}

export function renderPostReportEmail(props: PostReportProps): { subject: string; html: string } {
  const { displayName, appUrl, unsubscribeUrl, grade, emotionScore, biasCount, reportUrl } = props;
  const emotionTone = emotionScore >= 50 ? 'emotions are doing a lot of the driving' : 'you\'re mostly in control';
  return {
    subject: `Your autopsy report is in: Grade ${esc(grade)}`,
    html: emailShell(`
<tr><td style="padding:24px 24px 0">
  <div style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:8px">${esc(displayName)}, your first autopsy is filed.</div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    Here's the short version of what the forensic analysis found:
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="background:#f8f9fa;padding:16px;border-left:3px solid #00C9A7">
    <div style="font-family:'Courier New',monospace;font-size:11px;color:#888;letter-spacing:1.5px;margin-bottom:4px">OVERALL GRADE</div>
    <div style="font-family:'Courier New',monospace;font-size:28px;font-weight:700;color:#1a1a1a;margin-bottom:12px">${esc(grade)}</div>
    <div style="font-family:'Courier New',monospace;font-size:11px;color:#888;letter-spacing:1.5px;margin-bottom:4px">EMOTION SCORE</div>
    <div style="font-family:'Courier New',monospace;font-size:20px;font-weight:700;color:#1a1a1a;margin-bottom:4px">${emotionScore} / 100</div>
    <div style="font-size:12px;color:#555;margin-bottom:12px">At this level, ${esc(emotionTone)}.</div>
    <div style="font-family:'Courier New',monospace;font-size:11px;color:#888;letter-spacing:1.5px;margin-bottom:4px">COGNITIVE BIASES DETECTED</div>
    <div style="font-family:'Courier New',monospace;font-size:20px;font-weight:700;color:#1a1a1a">${biasCount}</div>
  </div>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="font-size:14px;color:#555;line-height:1.6">
    The full report includes dollar costs for every bias, session-level grading, and a personalized action plan based on your actual patterns.
  </div>
</td></tr>

<tr><td style="padding:8px 24px 16px;text-align:center">
  <a href="${esc(reportUrl)}" style="display:inline-block;background:#00C9A7;color:#111318;font-size:13px;font-weight:700;padding:12px 32px;text-decoration:none">View Full Report →</a>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="font-size:12px;color:#888;text-align:center;line-height:1.6">
    Your next report will be sharper. Keep uploading bets as you place them. The more data, the more patterns we catch.
  </div>
</td></tr>`, unsubscribeUrl),
  };
}

// ── Email 7: Re-engagement (Day 21, skip if active in last 14 days) ──

export function renderReengagementEmail(props: EmailProps): { subject: string; html: string } {
  const { displayName, appUrl, unsubscribeUrl } = props;
  return {
    subject: 'Still betting? Still guessing.',
    html: emailShell(`
<tr><td style="padding:24px 24px 0">
  <div style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:8px">${esc(displayName)}, you signed up three weeks ago.</div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    Since then, you've probably placed a few dozen bets. Maybe more. Every one of those bets carried your behavioral patterns with it. The same biases. The same emotional triggers. The same leaks.
  </div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    <strong style="color:#1a1a1a">Nothing changes until you see the data.</strong>
  </div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    Upload takes 3 minutes. The analysis runs in under a minute. Your first full report is free.
  </div>
</td></tr>

<tr><td style="padding:8px 24px 16px;text-align:center">
  <a href="${esc(appUrl)}/upload" style="display:inline-block;background:#00C9A7;color:#111318;font-size:13px;font-weight:700;padding:12px 32px;text-decoration:none">Upload Your Bets →</a>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="font-size:12px;color:#888;text-align:center;line-height:1.6">
    If BetAutopsy isn't for you, no hard feelings. You can unsubscribe below and we won't email again.
  </div>
</td></tr>`, unsubscribeUrl),
  };
}

// ── Email: Miss You (Day 30, no activity in 14 days) ──

export function renderMissYouEmail(props: EmailProps): { subject: string; html: string } {
  const { displayName, appUrl, unsubscribeUrl } = props;
  return {
    subject: "Your patterns haven't changed",
    html: emailShell(`
<tr><td style="padding:24px 24px 0">
  <div style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:8px">${esc(displayName)}, it's been a month.</div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    Your betting patterns haven't changed since you signed up, because patterns don't fix themselves. They need data.
  </div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    BetAutopsy is still here, and your first full report is still free. Upload takes about 3 minutes.
  </div>
</td></tr>

<tr><td style="padding:8px 24px 16px;text-align:center">
  <a href="${esc(appUrl)}/upload" style="display:inline-block;background:#00C9A7;color:#111318;font-size:13px;font-weight:700;padding:12px 32px;text-decoration:none">Upload Your Bets →</a>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="font-size:12px;color:#888;text-align:center;line-height:1.6">
    No pressure. The tool is here when you're ready.
  </div>
</td></tr>`, unsubscribeUrl),
  };
}

// ── Email: Last Chance (Day 60, no activity in 30 days) ──

export function renderLastChanceEmail(props: EmailProps): { subject: string; html: string } {
  const { displayName, appUrl, unsubscribeUrl } = props;
  return {
    subject: 'Final check-in from BetAutopsy',
    html: emailShell(`
<tr><td style="padding:24px 24px 0">
  <div style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:8px">${esc(displayName)}, this is our last automated email.</div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    It's been two months since you signed up. We haven't seen any activity on your account, so we're going to stop emailing.
  </div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    If you ever want to look at your betting patterns, your account is still here. Upload takes 3 minutes, and your first full report is free.
  </div>
</td></tr>

<tr><td style="padding:8px 24px 16px;text-align:center">
  <a href="${esc(appUrl)}/upload" style="display:inline-block;background:#00C9A7;color:#111318;font-size:13px;font-weight:700;padding:12px 32px;text-decoration:none">Upload Your Bets →</a>
</td></tr>

<tr><td style="padding:0 24px 16px">
  <div style="font-size:12px;color:#888;text-align:center;line-height:1.6">
    No more emails from us after this. If you'd like to unsubscribe from future manual emails too, use the link below.
  </div>
</td></tr>`, unsubscribeUrl),
  };
}

// ── Streak Milestone Email (7, 14, 30 day streaks) ──

interface StreakEmailProps extends EmailProps {
  streakCount: number;
}

export function renderStreakEmail(props: StreakEmailProps): { subject: string; html: string } {
  const { displayName, streakCount, appUrl, unsubscribeUrl } = props;
  const milestone =
    streakCount >= 30 ? '30 days. That\'s exceptional.' :
    streakCount >= 14 ? '14 days straight. That takes real commitment.' :
    '7 days in a row. Your discipline is building.';
  return {
    subject: `${streakCount}-day streak \u{1F525} Your discipline is showing.`,
    html: emailShell(`
<tr><td style="padding:24px 24px 0">
  <div style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:8px">${esc(displayName)}, you hit a ${streakCount}-day streak.</div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    ${esc(milestone)}
  </div>
  <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">
    Consistency is the strongest signal of discipline we track. Every week you keep your streak going, your Discipline Score captures it. Keep uploading your bets. Each data point sharpens your next autopsy.
  </div>
</td></tr>

<tr><td style="padding:8px 24px 16px;text-align:center">
  <a href="${esc(appUrl)}/dashboard" style="display:inline-block;background:#00C9A7;color:#111318;font-size:13px;font-weight:700;padding:12px 32px;text-decoration:none">View Your Streak →</a>
</td></tr>`, unsubscribeUrl),
  };
}

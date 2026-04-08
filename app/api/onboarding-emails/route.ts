import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { isResendConfigured, getResend } from '@/lib/resend';
import { renderWelcomeEmail, renderNudgeEmail, renderPostReportEmail } from '@/lib/onboarding-emails';
import type { Profile } from '@/types';

export const maxDuration = 120;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isResendConfigured()) {
    return NextResponse.json({ error: 'Resend not configured' }, { status: 500 });
  }

  const supabase = createServiceRoleClient();
  const resend = getResend();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.betautopsy.com';

  const now = new Date();
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  // ── Find users who signed up in the last 7 days ──
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .gte('created_at', sevenDaysAgo.toISOString())
    .not('email', 'is', null);

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, errors: [] });
  }

  for (const profile of profiles) {
    try {
      const p = profile as Profile;
      const emailsSent = (profile.onboarding_emails_sent as Record<string, boolean>) ?? {};

      // Skip if unsubscribed
      if (p.email_digest_enabled === false) { skipped++; continue; }

      const daysSinceSignup = Math.floor((now.getTime() - new Date(p.created_at).getTime()) / 86400000);

      // Get bet count and report info
      const { count: betCount } = await supabase
        .from('bets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', p.id);

      const { data: firstReport } = await supabase
        .from('autopsy_reports')
        .select('created_at')
        .eq('user_id', p.id)
        .order('created_at', { ascending: true })
        .limit(1);

      const bets = betCount ?? 0;
      const reportCount = firstReport?.length ?? 0;
      const firstReportDate = firstReport?.[0]?.created_at ? new Date(firstReport[0].created_at) : null;
      const daysSinceFirstReport = firstReportDate ? Math.floor((now.getTime() - firstReportDate.getTime()) / 86400000) : null;

      const displayName = p.display_name || 'there';

      // ── Email 1: Welcome (Day 1+, no bets, no reports) ──
      if (daysSinceSignup >= 1 && bets === 0 && reportCount === 0 && !emailsSent['welcome']) {
        const email = renderWelcomeEmail({ displayName, appUrl });
        await resend.emails.send({
          from: 'BetAutopsy <noreply@betautopsy.com>',
          to: p.email,
          subject: email.subject,
          html: email.html,
        });
        await supabase
          .from('profiles')
          .update({ onboarding_emails_sent: { ...emailsSent, welcome: true } })
          .eq('id', p.id);
        sent++;
        continue; // Only one email per user per cron run
      }

      // ── Email 2: Nudge (Day 3+, no bets, no reports) ──
      if (daysSinceSignup >= 3 && bets === 0 && reportCount === 0 && !emailsSent['nudge']) {
        const email = renderNudgeEmail({ displayName, appUrl });
        await resend.emails.send({
          from: 'BetAutopsy <noreply@betautopsy.com>',
          to: p.email,
          subject: email.subject,
          html: email.html,
        });
        await supabase
          .from('profiles')
          .update({ onboarding_emails_sent: { ...emailsSent, nudge: true } })
          .eq('id', p.id);
        sent++;
        continue;
      }

      // ── Email 3: Post-Report (1+ day after first report) ──
      if (reportCount > 0 && daysSinceFirstReport !== null && daysSinceFirstReport >= 1 && !emailsSent['post_report']) {
        const email = renderPostReportEmail({ displayName, appUrl });
        await resend.emails.send({
          from: 'BetAutopsy <noreply@betautopsy.com>',
          to: p.email,
          subject: email.subject,
          html: email.html,
        });
        await supabase
          .from('profiles')
          .update({ onboarding_emails_sent: { ...emailsSent, post_report: true } })
          .eq('id', p.id);
        sent++;
        continue;
      }

      skipped++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`${(profile as Profile).email}: ${msg}`);
    }
  }

  return NextResponse.json({ sent, skipped, errors });
}

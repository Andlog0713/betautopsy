import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { isResendConfigured, getResend } from '@/lib/resend';
import { renderDay3Email, renderDay5Email, renderDay7HasBetsEmail } from '@/lib/onboarding-emails';
import type { Profile } from '@/types';

export const maxDuration = 120;

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

  const supabase = createServiceRoleClient();
  const resend = getResend();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.betautopsy.com';

  const now = new Date();
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Process Day 3, Day 5, Day 7 emails
  for (const { day, emailKey } of [
    { day: 3, emailKey: 'day3' },
    { day: 5, emailKey: 'day5' },
    { day: 7, emailKey: 'day7' },
  ]) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() - day);
    const dateStr = targetDate.toISOString().split('T')[0];

    // Find users who signed up on the target date
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .gte('created_at', `${dateStr}T00:00:00Z`)
      .lt('created_at', `${dateStr}T23:59:59Z`)
      .not('email', 'is', null);

    if (!profiles || profiles.length === 0) continue;

    for (const profile of profiles) {
      try {
        const typedProfile = profile as Profile;
        const emailsSent = (profile.onboarding_emails_sent as Record<string, boolean>) ?? {};

        // Skip if already sent
        if (emailsSent[emailKey]) { skipped++; continue; }

        // Skip if unsubscribed
        if (typedProfile.email_digest_enabled === false) { skipped++; continue; }

        // Get user's bet count
        const { count: betCount } = await supabase
          .from('bets')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', typedProfile.id);

        const { count: reportCount } = await supabase
          .from('autopsy_reports')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', typedProfile.id);

        const bets = betCount ?? 0;
        const reports = reportCount ?? 0;

        let email: { subject: string; html: string } | null = null;

        if (emailKey === 'day3') {
          // Only send if no bets yet
          if (bets > 0) { skipped++; continue; }
          email = renderDay3Email({
            displayName: typedProfile.display_name || 'there',
            appUrl,
          });
        } else if (emailKey === 'day5') {
          // Only send if no bets yet
          if (bets > 0) { skipped++; continue; }
          email = renderDay5Email({
            displayName: typedProfile.display_name || 'there',
            appUrl,
          });
        } else if (emailKey === 'day7') {
          // Send to everyone — content adapts based on state
          email = renderDay7HasBetsEmail({
            displayName: typedProfile.display_name || 'there',
            betCount: bets,
            appUrl,
          });
        }

        if (!email) { skipped++; continue; }

        await resend.emails.send({
          from: 'BetAutopsy <noreply@betautopsy.com>',
          to: typedProfile.email,
          subject: email.subject,
          html: email.html,
        });

        // Mark as sent
        await supabase
          .from('profiles')
          .update({
            onboarding_emails_sent: { ...emailsSent, [emailKey]: true },
          })
          .eq('id', typedProfile.id);

        sent++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${(profile as Profile).email}: ${msg}`);
      }
    }
  }

  return NextResponse.json({ sent, skipped, errors });
}

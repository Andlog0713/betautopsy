import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { isResendConfigured, getResend } from '@/lib/resend';
import { getWeekendBets, calculateDigestStats, detectWeekendSessions } from '@/lib/digest-helpers';
import { renderWeekendEmail } from '@/lib/weekend-email';
import { requireCronSecret } from '@/lib/cron-auth';
import type { Profile } from '@/types';

export const maxDuration = 300;

export async function GET(request: Request) {
  const unauthorized = requireCronSecret(request, '/api/weekend-autopsy');
  if (unauthorized) return unauthorized;

  if (!isResendConfigured()) {
    return NextResponse.json({ error: 'Resend not configured' }, { status: 500 });
  }

  const supabase = createServiceRoleClient();
  const resend = getResend();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://betautopsy.com';

  // Test mode: ?test=email@example.com
  const { searchParams } = new URL(request.url);
  const testEmail = searchParams.get('test');

  let profileQuery = supabase
    .from('profiles')
    .select('*')
    .not('email', 'is', null);

  if (testEmail) {
    profileQuery = profileQuery.eq('email', testEmail.toLowerCase().trim());
  } else {
    profileQuery = profileQuery.eq('email_digest_enabled', true);
  }

  const { data: profiles } = await profileQuery;

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, errors: [], note: testEmail ? `No profile found for ${testEmail}` : undefined });
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const profile of profiles) {
    try {
      const typedProfile = profile as Profile;
      const bets = await getWeekendBets(supabase, typedProfile.id);

      if (bets.length === 0) {
        skipped++;
        continue;
      }

      const stats = calculateDigestStats(bets);
      const sessions = detectWeekendSessions(bets);
      const heatedCount = sessions.filter(s => s.isHeated).length;

      // Record string
      const record = stats.pushes > 0
        ? `${stats.wins}-${stats.losses}-${stats.pushes}`
        : `${stats.wins}-${stats.losses}`;

      // Fetch discipline scores
      const { data: dsRows } = await supabase
        .from('discipline_scores')
        .select('score')
        .eq('user_id', typedProfile.id)
        .order('created_at', { ascending: false })
        .limit(2);
      const latestDS = dsRows?.[0]?.score as number | undefined;
      const prevDS = dsRows?.[1]?.score as number | undefined;
      const dsDelta = latestDS !== undefined && prevDS !== undefined ? latestDS - prevDS : null;

      // Get or create unsubscribe token
      const { data: existingToken } = await supabase
        .from('email_unsubscribe_tokens')
        .select('id')
        .eq('user_id', typedProfile.id)
        .single();

      let tokenId: string;
      if (existingToken) {
        tokenId = existingToken.id;
      } else {
        const { data: newToken } = await supabase
          .from('email_unsubscribe_tokens')
          .insert({ user_id: typedProfile.id })
          .select('id')
          .single();
        tokenId = newToken?.id ?? '';
      }

      if (!tokenId) {
        errors.push(`No unsubscribe token for ${typedProfile.email}`);
        continue;
      }

      // Subject line
      let subject: string;
      if (heatedCount > 0) {
        subject = `Your weekend had ${heatedCount} heated session${heatedCount !== 1 ? 's' : ''} | BetAutopsy`;
      } else if (stats.totalBets >= 3) {
        subject = `Clean weekend: ${stats.totalBets} bets, no heated sessions | BetAutopsy`;
      } else {
        subject = `Your Weekend Autopsy: ${stats.totalBets} bets, ${record} | BetAutopsy`;
      }

      const emailHtml = renderWeekendEmail({
        displayName: typedProfile.display_name || 'there',
        totalBets: stats.totalBets,
        record,
        netPnL: stats.netPnL,
        sessions,
        disciplineScore: latestDS ?? null,
        disciplineDelta: dsDelta,
        unsubscribeUrl: `${appUrl}/api/unsubscribe?token=${tokenId}`,
        autopsyUrl: `${appUrl}/upload`,
      });

      await resend.emails.send({
        from: 'BetAutopsy <weekend@betautopsy.com>',
        to: typedProfile.email,
        subject,
        html: emailHtml,
      });

      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`${(profile as Profile).email}: ${msg}`);
      if (errors.length >= 10) break;
    }
  }

  return NextResponse.json({ sent, skipped, errors });
}

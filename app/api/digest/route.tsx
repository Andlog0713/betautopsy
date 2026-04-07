import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { isResendConfigured, getResend } from '@/lib/resend';
import { getWeeklyBets, calculateDigestStats, generateInsight, generatePositiveLead } from '@/lib/digest-helpers';
import { renderDigestEmail } from '@/lib/digest-email';
import type { Profile } from '@/types';

export const maxDuration = 300; // 5 min for processing all users

export async function GET(request: Request) {
  // Verify cron secret if set
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://betautopsy.com';

  // Test mode: ?test=email@example.com sends only to that user with all-time bets
  const { searchParams } = new URL(request.url);
  const testEmail = searchParams.get('test');

  // Get users
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
      const sinceDate = (typedProfile as Profile & { last_digest_sent_at?: string }).last_digest_sent_at
        ?? new Date(Date.now() - 7 * 86400000).toISOString();

      const bets = await getWeeklyBets(supabase, typedProfile.id, sinceDate);

      if (bets.length === 0) {
        skipped++;
        continue;
      }

      const stats = calculateDigestStats(bets);
      const insight = generateInsight(stats);
      const positiveLead = generatePositiveLead(stats);

      // Fetch latest two discipline scores for trend
      const { data: dsRows } = await supabase
        .from('discipline_scores')
        .select('score')
        .eq('user_id', typedProfile.id)
        .order('created_at', { ascending: false })
        .limit(2);
      const latestDS = dsRows?.[0]?.score as number | undefined;
      const prevDS = dsRows?.[1]?.score as number | undefined;
      const dsDelta = latestDS !== undefined && prevDS !== undefined ? latestDS - prevDS : null;

      // Build record string
      const record = stats.pushes > 0
        ? `${stats.wins}-${stats.losses}-${stats.pushes}`
        : `${stats.wins}-${stats.losses}`;

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

      const pnlStr = `${stats.netPnL >= 0 ? '+' : '-'}$${Math.abs(Math.round(stats.netPnL))}`;
      let subject = `Your week: ${record}, ${pnlStr} | BetAutopsy`;
      if (dsDelta !== null && dsDelta < 0) {
        subject = `Your Discipline Score dropped ${Math.abs(dsDelta)} points | BetAutopsy`;
      } else if (dsDelta !== null && dsDelta > 0) {
        subject = `Discipline Score up ${dsDelta} pts. Your week: ${record} | BetAutopsy`;
      }

      const emailHtml = renderDigestEmail({
        displayName: typedProfile.display_name || 'there',
        positiveLead,
        totalBets: stats.totalBets,
        record,
        netPnL: stats.netPnL,
        roi: stats.roi,
        streakCount: typedProfile.streak_count ?? 0,
        insightEmoji: insight.emoji,
        insightHeadline: insight.headline,
        insightDetail: insight.detail,
        biggestWin: stats.biggestWin,
        biggestLoss: stats.biggestLoss,
        unsubscribeUrl: `${appUrl}/api/unsubscribe?token=${tokenId}`,
        autopsyUrl: `${appUrl}/reports?run=true`,
        quizUrl: `${appUrl}/quiz`,
        disciplineScore: latestDS ?? null,
        disciplineDelta: dsDelta,
      });

      await resend.emails.send({
        from: 'BetAutopsy <digest@betautopsy.com>',
        to: typedProfile.email,
        subject,
        html: emailHtml,
      });

      // Update last sent timestamp
      await supabase
        .from('profiles')
        .update({ last_digest_sent_at: new Date().toISOString() })
        .eq('id', typedProfile.id);

      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`${(profile as Profile).email}: ${msg}`);
      if (errors.length >= 10) break;
    }
  }

  return NextResponse.json({ sent, skipped, errors });
}

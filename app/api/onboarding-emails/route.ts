import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { isResendConfigured, getResend } from '@/lib/resend';
import {
  renderWelcomeEmail,
  renderFirstNudgeEmail,
  renderFeatureHighlightEmail,
  renderSocialProofEmail,
  renderUrgencyEmail,
  renderTrialEndingEmail,
  renderReengagementEmail,
  renderPostReportEmail,
  renderMissYouEmail,
  renderLastChanceEmail,
} from '@/lib/onboarding-emails';
import { LAUNCH_PROMO_DEADLINE, userQualifiesForPromo } from '@/types';
import type { Profile, AutopsyAnalysis } from '@/types';
import type { SupabaseClient } from '@supabase/supabase-js';

export const maxDuration = 120;

const FROM = 'BetAutopsy <noreply@betautopsy.com>';

/** Fetches or creates a per-user unsubscribe token row and returns the row id. */
async function getOrCreateUnsubscribeToken(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('email_unsubscribe_tokens')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: created } = await supabase
    .from('email_unsubscribe_tokens')
    .insert({ user_id: userId })
    .select('id')
    .single();
  return (created?.id as string) ?? null;
}

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

  // Need to look back 62 days so the Day 60 last-chance email can still fire.
  const lookbackDays = 62;
  const lookbackDate = new Date(now);
  lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .gte('created_at', lookbackDate.toISOString())
    .not('email', 'is', null);

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, errors: [] });
  }

  // Days remaining until the fixed launch promo deadline. Can go negative.
  const daysUntilPromoEnds = Math.floor(
    (new Date(LAUNCH_PROMO_DEADLINE).getTime() - now.getTime()) / 86400000
  );

  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const fourteenDaysAgoIso = fourteenDaysAgo.toISOString();

  for (const profile of profiles) {
    try {
      const p = profile as Profile;
      const emailsSent = (profile.onboarding_emails_sent as Record<string, boolean>) ?? {};

      if (p.email_digest_enabled === false) { skipped++; continue; }

      const daysSinceSignup = Math.floor(
        (now.getTime() - new Date(p.created_at).getTime()) / 86400000
      );

      // Counts for skip logic
      const { count: betCount } = await supabase
        .from('bets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', p.id);

      const { count: reportCount } = await supabase
        .from('autopsy_reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', p.id);

      const bets = betCount ?? 0;
      const reports = reportCount ?? 0;

      const displayName = p.display_name || 'there';
      const unsubToken = await getOrCreateUnsubscribeToken(supabase, p.id);
      const unsubscribeUrl = unsubToken ? `${appUrl}/api/unsubscribe?token=${unsubToken}` : undefined;

      const send = async (
        render: (props: { displayName: string; appUrl: string; unsubscribeUrl?: string }) => { subject: string; html: string },
        key: string
      ): Promise<void> => {
        const email = render({ displayName, appUrl, unsubscribeUrl });
        await resend.emails.send({
          from: FROM,
          to: p.email,
          subject: email.subject,
          html: email.html,
        });
        await supabase
          .from('profiles')
          .update({ onboarding_emails_sent: { ...emailsSent, [key]: true } })
          .eq('id', p.id);
        sent++;
      };

      // ── Email 1: Welcome (fallback only — normally fires from auth callback) ──
      if (daysSinceSignup >= 1 && !emailsSent['welcome']) {
        await send(renderWelcomeEmail, 'welcome');
        continue;
      }

      // ── Email 2: First Nudge (Day 1+, skip if user uploaded bets) ──
      if (daysSinceSignup >= 1 && bets === 0 && !emailsSent['first_nudge']) {
        await send(renderFirstNudgeEmail, 'first_nudge');
        continue;
      }

      // ── Email 3: Feature Highlight (Day 3+, skip if user ran analysis) ──
      if (daysSinceSignup >= 3 && reports === 0 && !emailsSent['feature_highlight']) {
        await send(renderFeatureHighlightEmail, 'feature_highlight');
        continue;
      }

      // ── Email 4: Social Proof (Day 5+, always sends to non-unsubscribed) ──
      if (daysSinceSignup >= 5 && !emailsSent['social_proof']) {
        await send(renderSocialProofEmail, 'social_proof');
        continue;
      }

      // ── Email 5: Urgency (Day 7+, skip if user ran analysis) ──
      if (daysSinceSignup >= 7 && reports === 0 && !emailsSent['urgency']) {
        await send(renderUrgencyEmail, 'urgency');
        continue;
      }

      // ── Email 6: Launch promo ending (48h before LAUNCH_PROMO_DEADLINE) ──
      // Only for users who still qualify for the promo and haven't upgraded.
      if (
        userQualifiesForPromo(p.created_at) &&
        daysUntilPromoEnds >= 0 &&
        daysUntilPromoEnds <= 2 &&
        p.subscription_tier === 'free' &&
        !emailsSent['trial_ending']
      ) {
        await send(renderTrialEndingEmail, 'trial_ending');
        continue;
      }

      // ── Post-Report Summary (Day +1 after FIRST report only) ──
      if (reports === 1 && !emailsSent['post_report']) {
        const { data: firstReport } = await supabase
          .from('autopsy_reports')
          .select('id, created_at, report_json')
          .eq('user_id', p.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (firstReport?.created_at) {
          const daysSinceFirstReport = Math.floor(
            (now.getTime() - new Date(firstReport.created_at as string).getTime()) / 86400000
          );
          if (daysSinceFirstReport >= 1) {
            const analysis = firstReport.report_json as AutopsyAnalysis | null;
            if (analysis?.summary) {
              const email = renderPostReportEmail({
                displayName,
                appUrl,
                unsubscribeUrl,
                grade: analysis.summary.overall_grade ?? 'N/A',
                emotionScore: Math.round(analysis.emotion_score ?? 0),
                biasCount: analysis.biases_detected?.length ?? 0,
                reportUrl: `${appUrl}/reports?id=${firstReport.id}`,
              });
              await resend.emails.send({
                from: FROM,
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
          }
        }
      }

      // ── Email 7: Reengagement (Day 21+, skip if active in last 14 days) ──
      if (daysSinceSignup >= 21 && !emailsSent['reengagement']) {
        // "Active" = has any bet or report row created in the last 14 days.
        const [{ count: recentBets }, { count: recentReports }] = await Promise.all([
          supabase
            .from('bets')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', p.id)
            .gte('created_at', fourteenDaysAgoIso),
          supabase
            .from('autopsy_reports')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', p.id)
            .gte('created_at', fourteenDaysAgoIso),
        ]);
        const activeRecently = (recentBets ?? 0) > 0 || (recentReports ?? 0) > 0;
        if (!activeRecently) {
          await send(renderReengagementEmail, 'reengagement');
          continue;
        }
      }

      // ── Day 30: Miss You (no activity in 14 days) ──
      if (daysSinceSignup >= 30 && !emailsSent['miss_you']) {
        const [{ count: recentBets30 }, { count: recentReports30 }] = await Promise.all([
          supabase
            .from('bets')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', p.id)
            .gte('created_at', fourteenDaysAgoIso),
          supabase
            .from('autopsy_reports')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', p.id)
            .gte('created_at', fourteenDaysAgoIso),
        ]);
        if ((recentBets30 ?? 0) === 0 && (recentReports30 ?? 0) === 0) {
          await send(renderMissYouEmail, 'miss_you');
          continue;
        }
      }

      // ── Day 60: Last Chance (no activity in 30 days) ──
      if (daysSinceSignup >= 60 && !emailsSent['last_chance']) {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();
        const [{ count: recentBets60 }, { count: recentReports60 }] = await Promise.all([
          supabase
            .from('bets')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', p.id)
            .gte('created_at', thirtyDaysAgoIso),
          supabase
            .from('autopsy_reports')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', p.id)
            .gte('created_at', thirtyDaysAgoIso),
        ]);
        if ((recentBets60 ?? 0) === 0 && (recentReports60 ?? 0) === 0) {
          await send(renderLastChanceEmail, 'last_chance');
          continue;
        }
      }

      skipped++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`${(profile as Profile).email}: ${msg}`);
    }
  }

  return NextResponse.json({ sent, skipped, errors });
}

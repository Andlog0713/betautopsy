import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { isResendConfigured, getResend } from '@/lib/resend';
import { renderWelcomeEmail } from '@/lib/onboarding-emails';

const FROM = 'BetAutopsy <noreply@betautopsy.com>';

/**
 * Fires the welcome email on the first successful authentication and returns
 * whether this auth was the user's first login. Idempotent via
 * profiles.onboarding_emails_sent.welcome — marked before the Resend call so a
 * cron retry can't double-send. Email delivery failure is swallowed inside
 * this function so the first-login redirect still fires.
 *
 * Returns true when the user had not been welcomed yet (first-login),
 * false otherwise (returning login or profile not yet created).
 */
async function maybeFireWelcomeEmail(userId: string, appUrl: string): Promise<boolean> {
  // Service-role client so we bypass RLS edge cases mid-auth-exchange.
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: profile } = await admin
    .from('profiles')
    .select('email, display_name, onboarding_emails_sent, email_digest_enabled')
    .eq('id', userId)
    .maybeSingle();

  // Profile may not exist yet if the create-profile trigger hasn't fired.
  // Not a first-login signal we can act on — cron fallback will handle it.
  if (!profile) return false;

  const emailsSent = (profile.onboarding_emails_sent as Record<string, boolean>) ?? {};
  if (emailsSent.welcome) return false; // Returning user

  // Mark-first so a concurrent cron run or a retry can't re-fire.
  await admin
    .from('profiles')
    .update({ onboarding_emails_sent: { ...emailsSent, welcome: true } })
    .eq('id', userId);

  // Try to actually send the email. If anything fails, we still treat this as
  // a first-login so the redirect fires correctly.
  if (isResendConfigured() && profile.email && profile.email_digest_enabled !== false) {
    try {
      let unsubscribeUrl: string | undefined;
      const { data: existing } = await admin
        .from('email_unsubscribe_tokens')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
      let tokenId = existing?.id as string | undefined;
      if (!tokenId) {
        const { data: created } = await admin
          .from('email_unsubscribe_tokens')
          .insert({ user_id: userId })
          .select('id')
          .single();
        tokenId = created?.id as string | undefined;
      }
      if (tokenId) unsubscribeUrl = `${appUrl}/api/unsubscribe?token=${tokenId}`;

      const displayName = (profile.display_name as string | null) || 'there';
      const email = renderWelcomeEmail({ displayName, appUrl, unsubscribeUrl });

      const resend = getResend();
      await resend.emails.send({
        from: FROM,
        to: profile.email as string,
        subject: email.subject,
        html: email.html,
      });
    } catch (err) {
      console.error('Welcome email delivery failed:', err);
    }
  }

  return true;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Increment login count for returning-user redirect
      await supabase.rpc('increment_login_count');

      // Fire welcome email + get first-login signal. Never allow this to
      // block the redirect — swallow any unexpected error.
      let wasFirstLogin = false;
      if (data.session?.user) {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
          wasFirstLogin = await maybeFireWelcomeEmail(data.session.user.id, appUrl);
        } catch (emailErr) {
          console.error('Welcome email dispatch failed:', emailErr);
        }
      }

      // First-login users: respect ?next= if set (e.g. /pricing), otherwise dashboard.
      const target = next && next !== '/' ? next : (wasFirstLogin ? '/dashboard?welcome=true' : '/');
      return NextResponse.redirect(`${origin}${target}`);
    }
  }

  // If code exchange fails, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth`);
}

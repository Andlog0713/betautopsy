import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { isResendConfigured, getResend } from '@/lib/resend';
import { renderWelcomeEmail } from '@/lib/onboarding-emails';
import { logErrorServer } from '@/lib/log-error-server';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isResendConfigured()) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, email, onboarding_emails_sent')
      .eq('id', user.id)
      .single();

    if (!profile?.email) {
      return NextResponse.json({ error: 'No email found' }, { status: 400 });
    }

    const sent = (profile.onboarding_emails_sent as Record<string, boolean>) ?? {};
    if (sent.welcome) {
      return NextResponse.json({ sent: false, reason: 'already_sent' });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.betautopsy.com';
    const resend = getResend();

    const { subject, html } = renderWelcomeEmail({
      displayName: profile.display_name || 'there',
      appUrl,
    });

    await resend.emails.send({
      from: 'BetAutopsy <noreply@betautopsy.com>',
      to: profile.email,
      subject,
      html,
    });

    await supabase
      .from('profiles')
      .update({ onboarding_emails_sent: { ...sent, welcome: true } })
      .eq('id', user.id);

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error('Welcome email error:', error);
    logErrorServer(error, { path: '/api/send-welcome' });
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}

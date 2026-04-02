import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = createServiceRoleClient();

  // Find all trial users whose trial has expired
  const { data: expiredTrials, error } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('subscription_status', 'trial')
    .lt('trial_ends_at', new Date().toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!expiredTrials || expiredTrials.length === 0) {
    return NextResponse.json({ expired: 0 });
  }

  let expired = 0;
  for (const profile of expiredTrials) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: 'free',
        subscription_status: 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)
      // Only downgrade if they haven't upgraded to a paid plan
      .eq('subscription_status', 'trial');

    if (!updateError) expired++;
  }

  return NextResponse.json({ expired, total_checked: expiredTrials.length });
}

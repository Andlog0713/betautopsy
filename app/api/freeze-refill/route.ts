import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { requireCronSecret } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const unauthorized = requireCronSecret(request, '/api/freeze-refill');
  if (unauthorized) return unauthorized;

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('profiles')
    .update({ streak_freezes: 1 })
    .lt('streak_freezes', 1)
    .select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ refilled: data?.length ?? 0 });
}

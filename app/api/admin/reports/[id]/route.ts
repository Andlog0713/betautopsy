import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server';
import type { Profile } from '@/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Authenticate the requesting user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile || !(profile as Profile).is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use service role client to bypass RLS
    const adminClient = createServiceRoleClient();

    const { data: report, error: reportError } = await adminClient
      .from('autopsy_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Fetch user profile
    const { data: userProfile } = await adminClient
      .from('profiles')
      .select('id, email, display_name, subscription_tier, bet_count, created_at')
      .eq('id', report.user_id)
      .single();

    return NextResponse.json({
      report,
      user: userProfile ?? null,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

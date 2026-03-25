import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server';
import type { Profile } from '@/types';

export async function GET(request: Request) {
  try {
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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const offset = (page - 1) * limit;
    const search = searchParams.get('search') ?? '';

    // Get total count
    let countQuery = adminClient
      .from('autopsy_reports')
      .select('id', { count: 'exact', head: true });

    // If searching, we need to join with profiles — use a different approach
    // For now, fetch reports and enrich with profile data

    const { count: totalCount } = await countQuery;

    // Fetch reports with pagination
    let query = adminClient
      .from('autopsy_reports')
      .select('id, user_id, report_type, bet_count_analyzed, date_range_start, date_range_end, report_json, model_used, tokens_used, cost_cents, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: reports, error: reportsError } = await query;

    if (reportsError) {
      return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }

    // Fetch profiles for all user_ids in the results
    const userIds = Array.from(new Set((reports ?? []).map((r) => r.user_id)));
    const { data: profiles } = userIds.length > 0
      ? await adminClient
          .from('profiles')
          .select('id, email, display_name, subscription_tier, bet_count, created_at')
          .in('id', userIds)
      : { data: [] };

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    // Enrich reports with user info
    const enrichedReports = (reports ?? []).map((r) => {
      const userProfile = profileMap.get(r.user_id);
      const json = r.report_json as Record<string, unknown>;
      const summary = json?.summary as Record<string, unknown> | undefined;
      return {
        id: r.id,
        created_at: r.created_at,
        report_type: r.report_type,
        bet_count_analyzed: r.bet_count_analyzed,
        date_range_start: r.date_range_start,
        date_range_end: r.date_range_end,
        model_used: r.model_used,
        tokens_used: r.tokens_used,
        cost_cents: r.cost_cents,
        overall_grade: summary?.overall_grade ?? '—',
        total_profit: summary?.total_profit ?? 0,
        roi_percent: summary?.roi_percent ?? 0,
        tilt_score: (json?.tilt_score as number) ?? null,
        user: userProfile ? {
          id: userProfile.id,
          email: userProfile.email,
          display_name: userProfile.display_name,
          tier: userProfile.subscription_tier,
          bet_count: userProfile.bet_count,
          joined: userProfile.created_at,
        } : null,
      };
    });

    // Filter by search if provided
    const filtered = search
      ? enrichedReports.filter((r) =>
          r.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
          r.user?.display_name?.toLowerCase().includes(search.toLowerCase())
        )
      : enrichedReports;

    return NextResponse.json({
      reports: filtered,
      total: totalCount ?? 0,
      page,
      limit,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

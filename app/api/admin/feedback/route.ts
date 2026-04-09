import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server';
import type { FeedbackType, FeedbackWithUser, Profile } from '@/types';

const VALID_TYPES: FeedbackType[] = ['report_reaction', 'bug', 'feature_request', 'general'];

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
    const typeParam = searchParams.get('type');
    const typeFilter = VALID_TYPES.includes(typeParam as FeedbackType)
      ? (typeParam as FeedbackType)
      : null;
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));

    // Fetch rows and all-type counts in parallel
    const rowsQueryBase = adminClient
      .from('feedback')
      .select('id, user_id, type, rating, message, report_id, page, metadata, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    const rowsQuery = typeFilter ? rowsQueryBase.eq('type', typeFilter) : rowsQueryBase;

    const countTotal = adminClient.from('feedback').select('id', { count: 'exact', head: true });
    const countReactions = adminClient.from('feedback').select('id', { count: 'exact', head: true }).eq('type', 'report_reaction');
    const countBugs = adminClient.from('feedback').select('id', { count: 'exact', head: true }).eq('type', 'bug');
    const countFeatures = adminClient.from('feedback').select('id', { count: 'exact', head: true }).eq('type', 'feature_request');
    const countGeneral = adminClient.from('feedback').select('id', { count: 'exact', head: true }).eq('type', 'general');

    const [rowsResult, totalResult, reactionsResult, bugsResult, featuresResult, generalResult] = await Promise.all([
      rowsQuery,
      countTotal,
      countReactions,
      countBugs,
      countFeatures,
      countGeneral,
    ]);

    if (rowsResult.error) {
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
    }

    const rows = rowsResult.data ?? [];

    // Fetch profiles for enrichment
    const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter((id): id is string => !!id)));
    const { data: profiles } = userIds.length > 0
      ? await adminClient
          .from('profiles')
          .select('id, email, display_name, subscription_tier')
          .in('id', userIds)
      : { data: [] };

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const enriched: FeedbackWithUser[] = rows.map((r) => {
      const userProfile = r.user_id ? profileMap.get(r.user_id) : null;
      return {
        id: r.id,
        user_id: r.user_id,
        type: r.type as FeedbackType,
        rating: r.rating,
        message: r.message,
        report_id: r.report_id,
        page: r.page,
        metadata: r.metadata,
        created_at: r.created_at,
        user: userProfile
          ? {
              id: userProfile.id,
              email: userProfile.email,
              display_name: userProfile.display_name,
              subscription_tier: userProfile.subscription_tier,
            }
          : null,
      };
    });

    return NextResponse.json({
      feedback: enriched,
      counts: {
        total: totalResult.count ?? 0,
        report_reaction: reactionsResult.count ?? 0,
        bug: bugsResult.count ?? 0,
        feature_request: featuresResult.count ?? 0,
        general: generalResult.count ?? 0,
      },
      offset,
      limit,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

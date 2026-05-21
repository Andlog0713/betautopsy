import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import { logErrorServer } from '@/lib/log-error-server';

// User-scoped list of autopsy_reports. Two modes on the same handler:
//
//   GET /api/reports?upgraded_from=<uuid>
//     iOS post-purchase polling (PR-REVENUECAT-IOS): detect when the
//     RevenueCat webhook has finished its waitUntil background work and the
//     child full-report row has materialized for a paid snapshot. Filtered
//     by upgraded_from_snapshot_id.
//
//   GET /api/reports
//     Cold-launch hydration (P0-PERSISTENCE-WEB): the authenticated user's
//     full report list, so iOS ReportStore can rehydrate on relaunch and
//     ReportListView can support .refreshable. Capped at 100 (v1 user-scoped
//     volume sits well under this).
//
// Both modes rely on RLS (auth.uid() = user_id) for ownership scoping, so
// the handler adds no explicit user_id filter — matching the sibling
// /api/reports/[id] route.

const LIST_LIMIT = 100;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const upgradedFrom = request.nextUrl.searchParams.get('upgraded_from');

  // When the polling param is supplied it must be a valid UUID. Validate
  // before auth so a malformed query is a 400, not a 401 — preserving the
  // pre-existing polling contract.
  if (upgradedFrom && !UUID_REGEX.test(upgradedFrom)) {
    return NextResponse.json(
      { error: 'upgraded_from must be a valid UUID' },
      { status: 400 },
    );
  }

  const { supabase, user, error: authError } = await getAuthenticatedClient(request);
  if (authError || !user || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Filtered (polling) mode. Returns an empty array when no child row exists
  // yet; iOS treats that as the "not ready, keep polling" signal rather than
  // a 404. Sorted DESC so reports[0] is the most recently created child.
  if (upgradedFrom) {
    const { data, error: dbError } = await supabase
      .from('autopsy_reports')
      .select('*')
      .eq('upgraded_from_snapshot_id', upgradedFrom)
      .order('created_at', { ascending: false });

    if (dbError) {
      await logErrorServer(dbError, {
        path: '/api/reports',
        userId: user.id,
        metadata: { stage: 'list_by_upgraded_from', upgraded_from: upgradedFrom },
      });
      return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }

    return NextResponse.json({ reports: data ?? [] });
  }

  // List-by-user (cold-launch) mode. Empty array (not 404) when the user has
  // no reports — an empty store is a valid hydrated state.
  const { data, error: dbError } = await supabase
    .from('autopsy_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(LIST_LIMIT);

  if (dbError) {
    await logErrorServer(dbError, {
      path: '/api/reports',
      userId: user.id,
      metadata: { stage: 'list_by_user' },
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  return NextResponse.json({ reports: data ?? [] });
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import { logErrorServer } from '@/lib/log-error-server';

// User-scoped list of autopsy_reports filtered by upgraded_from_snapshot_id.
// Used by iOS post-purchase polling (PR-REVENUECAT-IOS) to detect when the
// RevenueCat webhook has finished its waitUntil background work and the
// child full-report row has materialized for a paid snapshot. RLS on
// autopsy_reports enforces ownership (auth.uid() = user_id), so the
// handler does not add an explicit user_id filter.

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const upgradedFrom = request.nextUrl.searchParams.get('upgraded_from');

  if (!upgradedFrom) {
    return NextResponse.json(
      { error: 'upgraded_from query param is required' },
      { status: 400 },
    );
  }

  if (!UUID_REGEX.test(upgradedFrom)) {
    return NextResponse.json(
      { error: 'upgraded_from must be a valid UUID' },
      { status: 400 },
    );
  }

  const { supabase, user, error: authError } = await getAuthenticatedClient(request);
  if (authError || !user || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Returns an empty array when no child row exists yet. iOS treats that as
  // the "not ready, keep polling" signal rather than a 404. Sorted DESC so
  // reports[0] is the most recently created child (v1 produces at most one
  // child per snapshot, but the sort makes the contract robust if a future
  // re-run path adds more).
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

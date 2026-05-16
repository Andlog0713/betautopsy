import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import { logErrorServer } from '@/lib/log-error-server';

// User-scoped fetch of a single autopsy_reports row. Used by the iOS
// deep link router (PR-HEATED-PUSH-IOS) when a notification tap lands
// on a report id that isn't already cached in the in-memory
// ReportStore. RLS on autopsy_reports enforces ownership; this handler
// performs no explicit user_id filter and intentionally returns 404
// for both not-found and not-owned so existence cannot be probed.

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid report id' }, { status: 400 });
  }

  const { supabase, user, error: authError } = await getAuthenticatedClient(request);
  if (authError || !user || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: report, error: dbError } = await supabase
    .from('autopsy_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (dbError) {
    logErrorServer(dbError, {
      path: '/api/reports/[id]',
      userId: user.id,
      metadata: { reportId: id },
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  return NextResponse.json({ report });
}

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

// Vercel function timeout safety. Default is 10s; the list query + slim
// transform should complete in <2s but cellular-slow Supabase responses
// could push us higher. 30s ceiling matches iOS URLRequest's 15s with
// margin for the server-side work.
export const maxDuration = 30;

// Card-essential whitelist for list-mode report_json. iOS ReportListView
// renders cards from these fields plus the top-level autopsy_reports columns
// (case_number, created_at, bet_count_analyzed, date_range_start/end,
// report_type). Detail view (/api/reports/:id) returns the full report_json
// on tap; iOS lazy-fetches in ReportScrollView.
//
// To ADD a key here: confirm iOS card uses it AND that the key's avg size
// is small (<1 KB). To REMOVE a key: confirm no iOS card site references it.
// Keys missing from a row's report_json are simply absent from the slim
// response (not nulled).
//
// Sizes (avg) per MCP measurement May 21 2026:
//   betting_archetype 124B  betiq 376B  summary 232B  summaryCounts 176B
//   discipline_score 150B  emotion_score 17B  emotion_percentile 17B
//   tilt_score 17B  bankroll_health 15B  schema_version 17B
//   _snapshot_counts 136B  _snapshot_teaser 1.3KB
const LIST_REPORT_JSON_WHITELIST = [
  'betting_archetype',
  'betiq',
  'summary',
  'summaryCounts',
  'discipline_score',
  'emotion_score',
  'emotion_percentile',
  'tilt_score',
  'bankroll_health',
  'schema_version',
  '_snapshot_counts',
  '_snapshot_teaser',
] as const;

function slimReportJson(reportJson: unknown): Record<string, unknown> {
  if (!reportJson || typeof reportJson !== 'object') return {};
  const source = reportJson as Record<string, unknown>;
  const slim: Record<string, unknown> = {};
  for (const key of LIST_REPORT_JSON_WHITELIST) {
    if (key in source) slim[key] = source[key];
  }
  return slim;
}

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
  //
  // This branch intentionally returns full report_json — DO NOT slim. It
  // serves IAP materialization polling; iOS needs the complete report the
  // moment the child row exists. Slimming lives only in list-by-user mode
  // below.
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

  // Slim each row's report_json to the card-essential whitelist. The heavy
  // fields (bet_annotations ~2.5 MB, session_detection ~260 KB) are stripped;
  // iOS lazy-fetches the full report via /api/reports/:id on detail-view tap.
  const slimmedReports = (data ?? []).map((row) => ({
    ...row,
    report_json: slimReportJson(row.report_json),
  }));

  // Observability: log the byte savings for the first row of each response.
  // Lands in Vercel function logs (NOT Sentry — logErrorServer is strictly
  // an error path and would spam captureException on every cold start). Helps
  // debug if iOS reports decode failures post-deploy.
  if (slimmedReports.length > 0 && data && data.length > 0) {
    const originalBytes = JSON.stringify(data[0].report_json ?? {}).length;
    const slimBytes = JSON.stringify(slimmedReports[0].report_json).length;
    console.log('[slim_transform_metrics]', {
      path: '/api/reports',
      userId: user.id,
      stage: 'list_by_user_slim',
      row_count: slimmedReports.length,
      sample_original_bytes: originalBytes,
      sample_slim_bytes: slimBytes,
      reduction_pct: Math.round((1 - slimBytes / Math.max(originalBytes, 1)) * 100),
    });
  }

  return NextResponse.json({ reports: slimmedReports });
}

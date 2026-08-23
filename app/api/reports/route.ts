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

// List mode returns only card data. Full report_json is deliberately absent
// from this query; report_summary is a compact write-time projection and the
// detail route loads the full payload on demand. Dropped from select:
// user_id (iOS knows it), report_markdown (~5 KB/row
// avg, 269 KB total for 58-report user), model_used, tokens_used,
// cost_cents, stripe_payment_intent_id, analyzed_upload_ids. Adding a
// column here requires confirming iOS Row consumes it.
//
// NOTE: there is intentionally NO updated_at — the autopsy_reports table
// has no such column (only created_at; confirmed via Supabase MCP). The
// chat-layer brief for a28b056 incorrectly listed it; PostgREST rejects an
// unknown column and 500s the whole list query, so it must stay out.
const LIST_COLUMNS = [
  'id',
  'report_type',
  'bet_count_analyzed',
  'date_range_start',
  'date_range_end',
  'created_at',
  'report_summary',
  'upgraded_from_snapshot_id',
  'is_paid',
  'analyzed_sportsbook',
  'fulfillment:report_fulfillments!report_fulfillments_snapshot_report_id_fkey(status,completed_report_id,next_attempt_at)',
].join(',');

// Vercel function timeout safety. Default is 10s; the list query + slim
// transform should complete in <2s but cellular-slow Supabase responses
// could push us higher. 30s ceiling matches iOS URLRequest's 15s with
// margin for the server-side work.
export const maxDuration = 30;

interface FulfillmentListRow {
  status?: string | null;
  completed_report_id?: string | null;
  next_attempt_at?: string | null;
}

const CARD_SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);

function toListRow(row: Record<string, unknown>): Record<string, unknown> {
  const storedSummary = row.report_summary && typeof row.report_summary === 'object'
    ? row.report_summary as Record<string, unknown>
    : {};
  const cardBiases = Array.isArray(storedSummary.card_biases)
    ? storedSummary.card_biases.filter((bias) => {
        if (!bias || typeof bias !== 'object') return false;
        const candidate = bias as Record<string, unknown>;
        return typeof candidate.bias_name === 'string'
          && typeof candidate.severity === 'string'
          && CARD_SEVERITIES.has(candidate.severity);
      })
      .slice(0, 3)
      .map((bias) => {
        const candidate = bias as Record<string, unknown>;
        return { bias_name: candidate.bias_name, severity: candidate.severity };
      })
    : [];
  const { card_biases: _cardBiases, ...reportSummary } = storedSummary;
  void _cardBiases;
  const rawFulfillment = Array.isArray(row.fulfillment)
    ? row.fulfillment[0]
    : row.fulfillment;
  const fulfillment = rawFulfillment && typeof rawFulfillment === 'object'
    ? rawFulfillment as FulfillmentListRow
    : null;
  const { report_summary: _summary, fulfillment: _fulfillment, ...card } = row;
  void _summary;
  void _fulfillment;

  const paidStatus = fulfillment?.status && fulfillment.status !== 'unpaid'
    ? fulfillment.status
    : null;

  return {
    ...card,
    // Keep the established additive wire key for native clients. It now
    // contains the stored card projection, never a runtime-slimmed full row.
    report_json: reportSummary,
    card_biases: cardBiases,
    fulfillment_status: paidStatus,
    completed_report_id: fulfillment?.completed_report_id ?? null,
    fulfillment_next_attempt_at: fulfillment?.next_attempt_at ?? null,
  };
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

    // Alt-Svc: clear disables the HTTP/3 (QUIC) advertisement. iOS was caching
    // Vercel's Alt-Svc HTTP/3 hint and preferring QUIC over UDP, which hangs on
    // certain ISP/NAT networks (quic_conn_keepalive timeouts) — first launch
    // fast, subsequent launches hang. Clearing the hint forces iOS back to
    // HTTP/2. Both branches set it; iOS hits this polling branch during IAP.
    const publicReports = (data ?? []).map((report) => {
      const { analyzed_bets_snapshot: _frozenBets, ...publicReport } = report as Record<string, unknown>;
      void _frozenBets;
      return publicReport;
    });
    return NextResponse.json(
      { reports: publicReports },
      { headers: { 'Alt-Svc': 'clear' } },
    );
  }

  // List-by-user (cold-launch) mode. Empty array (not 404) when the user has
  // no reports — an empty store is a valid hydrated state.
  //
  // Diagnostic timing instrumentation (P0-PERSISTENCE-PERF-WEB-V2). After
  // this PR ships, Vercel logs show per-phase timing so we can localize the
  // 7-15s cold-launch cost (was: select '*' returning 433 KB after slim;
  // now: column trim + slim should return ~140 KB). performance.now() is a
  // Node 18+ global (no import needed).
  const t0 = performance.now();

  const { data, error: dbError } = await supabase
    .from('autopsy_reports')
    .select(LIST_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(LIST_LIMIT);

  const tDbDone = performance.now();

  if (dbError) {
    await logErrorServer(dbError, {
      path: '/api/reports',
      userId: user.id,
      metadata: { stage: 'list_by_user' },
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  // Convert the stored card projection back to the additive report_json key
  // consumed by existing clients. Heavy detail fields never leave Postgres.
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const slimmedReports = rows.map(toListRow);

  const tSlimDone = performance.now();

  // Pre-serialize so we can measure serialize_ms accurately and emit the
  // response as a raw string (avoids NextResponse.json double-serialization).
  const responseJson = JSON.stringify({ reports: slimmedReports });
  const tSerializeDone = performance.now();

  // Per-phase diagnostic log. Lands in Vercel function logs (NOT Sentry —
  // logErrorServer is strictly an error path and would spam captureException
  // on every cold start). response_bytes is the TOTAL response size, not a
  // sample row. Replaces the prior [slim_transform_metrics] block.
  console.log('[list_perf]', {
    path: '/api/reports',
    userId: user.id,
    row_count: slimmedReports.length,
    response_bytes: responseJson.length,
    db_query_ms: Math.round(tDbDone - t0),
    slim_transform_ms: Math.round(tSlimDone - tDbDone),
    serialize_ms: Math.round(tSerializeDone - tSlimDone),
    total_ms: Math.round(tSerializeDone - t0),
  });

  // Alt-Svc: clear — see polling-branch note above. Belt + suspenders with
  // the vercel.json /api/* edge rule, so the header lands even if vercel.json
  // isn't picked up.
  return new NextResponse(responseJson, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Alt-Svc': 'clear',
    },
  });
}

/**
 * P0-PERSISTENCE-WEB — GET /api/reports list-by-user regression test
 *
 * Locks the two-mode contract on the /api/reports GET handler:
 *   - GET /api/reports                 -> authenticated user's full list (NEW)
 *   - GET /api/reports?upgraded_from=X -> IAP polling, filtered (unchanged)
 *
 * The handler relies on getAuthenticatedClient + RLS for ownership scoping,
 * so the Supabase client is mocked (mirrors the SDK-mock pattern in
 * whatIf.test.ts). True cross-user isolation is enforced by RLS at the
 * database and is verified via manual Supabase MCP post-deploy; here we
 * assert the handler issues its query through the RLS-bound authed client
 * and never widens scope.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/reports/route';
import { getAuthenticatedClient } from '@/lib/supabase-from-request';

vi.mock('@/lib/supabase-from-request', () => ({
  getAuthenticatedClient: vi.fn(),
}));

// logErrorServer is only hit on a DB error; stub it so no real network/DB.
vi.mock('@/lib/log-error-server', () => ({
  logErrorServer: vi.fn(async () => {}),
}));

const mockedAuth = vi.mocked(getAuthenticatedClient);

// Fluent, thenable Supabase query-builder stub. Every method records its
// args and returns `this`; awaiting the chain resolves to `result`. Works
// for both branches (filtered ends at .order, list ends at .limit).
function makeSupabase(result: { data: unknown; error: unknown }) {
  const calls: Record<string, unknown[][]> = {
    from: [], select: [], eq: [], order: [], limit: [],
  };
  const builder: any = {
    calls,
    from(...a: unknown[]) { calls.from.push(a); return builder; },
    select(...a: unknown[]) { calls.select.push(a); return builder; },
    eq(...a: unknown[]) { calls.eq.push(a); return builder; },
    order(...a: unknown[]) { calls.order.push(a); return builder; },
    limit(...a: unknown[]) { calls.limit.push(a); return builder; },
    then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return builder;
}

const USER = { id: '11111111-1111-1111-1111-111111111111' } as any;

// Mirror of the route's LIST_COLUMNS projection (P0-PERSISTENCE-PERF-WEB-V2).
// List mode trims select('*') to this explicit column list; the dropped
// columns (report_markdown, model_used, tokens_used, cost_cents,
// stripe_payment_intent_id, analyzed_upload_ids, user_id) must never appear
// in the projection or the response.
const LIST_COLUMNS_STR = [
  'id',
  'report_type',
  'bet_count_analyzed',
  'date_range_start',
  'date_range_end',
  'created_at',
  'report_json',
  'upgraded_from_snapshot_id',
  'is_paid',
  'analyzed_sportsbook',
].join(',');

const DROPPED_COLUMNS = [
  'report_markdown',
  'model_used',
  'tokens_used',
  'cost_cents',
  'stripe_payment_intent_id',
  'analyzed_upload_ids',
  'user_id',
];

function req(query = '') {
  return new NextRequest(`https://app.test/api/reports${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/reports — list-by-user', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue({ supabase: null, user: null, error: 'Unauthorized' });

    const res = await GET(req());

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it("returns the user's reports sorted by created_at DESC, capped at 100", async () => {
    const rows = [
      { id: 'r2', created_at: '2026-05-20T00:00:00Z' },
      { id: 'r1', created_at: '2026-05-19T00:00:00Z' },
    ];
    const supabase = makeSupabase({ data: rows, error: null });
    mockedAuth.mockResolvedValue({ supabase, user: USER, error: null });

    const res = await GET(req());

    expect(res.status).toBe(200);
    // Alt-Svc: clear disables HTTP/3 advertisement so iOS stays on HTTP/2
    // (P0-PERSISTENCE-PERF-WEB-V3 — QUIC hangs on certain networks).
    expect(res.headers.get('Alt-Svc')).toBe('clear');
    // List mode always emits a (slimmed) report_json. These rows carry no
    // report_json, so the slim transform yields an empty object per row;
    // ordering, scoping, and cap assertions below are the focus here.
    expect(await res.json()).toEqual({
      reports: rows.map((row) => ({ ...row, report_json: {} })),
    });

    // Scoped by RLS via the authed client: no explicit user_id filter added,
    // sorted DESC, capped. The projection is the trimmed LIST_COLUMNS list
    // (not select('*')), so report_markdown et al. never leave the DB.
    expect(supabase.calls.from).toEqual([['autopsy_reports']]);
    expect(supabase.calls.select).toEqual([[LIST_COLUMNS_STR]]);
    expect(supabase.calls.eq).toEqual([]); // no scope-widening / no upgraded_from
    expect(supabase.calls.order).toEqual([['created_at', { ascending: false }]]);
    expect(supabase.calls.limit).toEqual([[100]]);
  });

  it('relies on RLS — issues the query through the authenticated client, no bypass filter', async () => {
    const supabase = makeSupabase({ data: [], error: null });
    mockedAuth.mockResolvedValue({ supabase, user: USER, error: null });

    await GET(req());

    // The only client touched is the one returned by getAuthenticatedClient
    // (RLS-bound to the caller's identity). The handler never re-scopes by a
    // caller-supplied user_id, so a user cannot read another user's rows.
    expect(mockedAuth).toHaveBeenCalledTimes(1);
    expect(supabase.calls.eq).toEqual([]);
  });

  it('returns an empty array (not 404) when the user has no reports', async () => {
    const supabase = makeSupabase({ data: [], error: null });
    mockedAuth.mockResolvedValue({ supabase, user: USER, error: null });

    const res = await GET(req());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reports: [] });
  });

  it('returns 500 when the list query errors', async () => {
    const supabase = makeSupabase({ data: null, error: { message: 'boom' } });
    mockedAuth.mockResolvedValue({ supabase, user: USER, error: null });

    const res = await GET(req());

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal error' });
  });

  it('list mode strips report_json to the whitelist', async () => {
    // Source report_json carries two whitelisted keys (betiq, summary) plus
    // three heavy non-whitelisted keys. The slim transform must keep only the
    // whitelisted keys that are present, and never invent absent ones.
    const rows = [
      {
        id: 'r1',
        created_at: '2026-05-20T00:00:00Z',
        report_json: {
          betiq: { score: 76 },
          summary: { total_bets: 120 },
          bet_annotations: [{ note: 'heavy' }],
          executive_diagnosis: 'long prose that should not ship to the card',
          session_detection: { sessions: [{ grade: 'F' }] },
        },
      },
    ];
    const supabase = makeSupabase({ data: rows, error: null });
    mockedAuth.mockResolvedValue({ supabase, user: USER, error: null });

    const res = await GET(req());

    expect(res.status).toBe(200);
    const body = await res.json();
    const slim = body.reports[0].report_json;

    // Whitelisted keys present in source survive.
    expect(slim.betiq).toEqual({ score: 76 });
    expect(slim.summary).toEqual({ total_bets: 120 });

    // Heavy non-whitelisted keys are stripped.
    expect('bet_annotations' in slim).toBe(false);
    expect('executive_diagnosis' in slim).toBe(false);
    expect('session_detection' in slim).toBe(false);

    // Whitelisted keys absent from source are NOT added (not nulled in).
    expect('betting_archetype' in slim).toBe(false);
    expect('_snapshot_teaser' in slim).toBe(false);
    expect(Object.keys(slim).sort()).toEqual(['betiq', 'summary']);

    // Top-level row columns are preserved alongside the slimmed report_json.
    expect(body.reports[0].id).toBe('r1');
    expect(body.reports[0].created_at).toBe('2026-05-20T00:00:00Z');
  });

  it('list mode select does NOT return report_markdown or other unused columns', async () => {
    // The .select() narrows the projection, so Supabase returns only the
    // LIST_COLUMNS. The mock reflects that: rows carry the kept columns and
    // none of the dropped ones. We assert (1) the query asked for exactly the
    // trimmed projection, and (2) the dropped columns are absent from the
    // response shape.
    const rows = [
      {
        id: 'r1',
        report_type: 'full',
        bet_count_analyzed: 120,
        date_range_start: '2026-04-01',
        date_range_end: '2026-05-01',
        created_at: '2026-05-20T00:00:00Z',
        report_json: { betiq: { score: 76 } },
        upgraded_from_snapshot_id: null,
        is_paid: true,
        analyzed_sportsbook: 'DraftKings',
      },
    ];
    const supabase = makeSupabase({ data: rows, error: null });
    mockedAuth.mockResolvedValue({ supabase, user: USER, error: null });

    const res = await GET(req());

    expect(res.status).toBe(200);

    // The query projection is the trimmed column list — not select('*').
    expect(supabase.calls.select).toEqual([[LIST_COLUMNS_STR]]);

    // None of the dropped columns appear in the projection string.
    for (const col of DROPPED_COLUMNS) {
      expect(LIST_COLUMNS_STR.split(',')).not.toContain(col);
    }

    // None of the dropped columns appear in the response row.
    const body = await res.json();
    const row = body.reports[0];
    for (const col of DROPPED_COLUMNS) {
      expect(col in row).toBe(false);
    }

    // The kept columns survive alongside the slimmed report_json.
    expect(row.id).toBe('r1');
    expect(row.report_type).toBe('full');
    expect(row.bet_count_analyzed).toBe(120);
    expect(row.analyzed_sportsbook).toBe('DraftKings');
    expect(row.report_json).toEqual({ betiq: { score: 76 } });
  });

  it('list mode response is under 100 KB for 100 typical rows', async () => {
    // Each row's report_json is dominated by heavy non-whitelisted fields
    // (bet_annotations + session_detection), the multi-MB payload the slim
    // transform exists to strip. Small whitelisted card fields flow through.
    const heavyAnnotations = Array.from({ length: 2000 }, (_, i) => ({
      bet_id: `bet-${i}`,
      note: 'emotional escalation after a bad beat in the prior leg of the parlay',
      flagged: true,
    }));
    const heavySessions = Array.from({ length: 500 }, (_, i) => ({
      session_id: `sess-${i}`,
      grade: 'F',
      heatSignals: ['chasing', 'late-night', 'stake-spike'],
    }));
    const rows = Array.from({ length: 100 }, (_, i) => ({
      id: `r${i}`,
      created_at: '2026-05-20T00:00:00Z',
      report_type: 'full',
      report_json: {
        betting_archetype: { name: 'The Tilter' },
        betiq: { score: 70 + (i % 30) },
        summary: { total_bets: 100 + i },
        summaryCounts: { wins: 40, losses: 60 },
        discipline_score: { total: 55 },
        emotion_score: 42,
        emotion_percentile: 80,
        tilt_score: 30,
        bankroll_health: 'fair',
        schema_version: 2,
        _snapshot_counts: { sessions: 12 },
        _snapshot_teaser: 'Your worst session cost you dearly. Tap to see the full breakdown of where it went wrong.',
        bet_annotations: heavyAnnotations,
        session_detection: { sessions: heavySessions },
      },
    }));
    const supabase = makeSupabase({ data: rows, error: null });
    mockedAuth.mockResolvedValue({ supabase, user: USER, error: null });

    const res = await GET(req());

    expect(res.status).toBe(200);
    const body = await res.json();
    const wireBytes = JSON.stringify(body).length;

    expect(wireBytes).toBeLessThan(100_000);
    // Heavy fields are gone from every row.
    expect('bet_annotations' in body.reports[0].report_json).toBe(false);
    expect('session_detection' in body.reports[0].report_json).toBe(false);
  });
});

describe('GET /api/reports?upgraded_from — IAP polling (unchanged)', () => {
  const VALID_UUID = '22222222-2222-2222-2222-222222222222';

  it('filters by upgraded_from_snapshot_id and does not add a list limit', async () => {
    const rows = [{ id: 'child', upgraded_from_snapshot_id: VALID_UUID }];
    const supabase = makeSupabase({ data: rows, error: null });
    mockedAuth.mockResolvedValue({ supabase, user: USER, error: null });

    const res = await GET(req(`?upgraded_from=${VALID_UUID}`));

    expect(res.status).toBe(200);
    // Polling mode also disables HTTP/3 — iOS hits this branch during IAP.
    expect(res.headers.get('Alt-Svc')).toBe('clear');
    expect(await res.json()).toEqual({ reports: rows });
    expect(supabase.calls.eq).toEqual([['upgraded_from_snapshot_id', VALID_UUID]]);
    expect(supabase.calls.order).toEqual([['created_at', { ascending: false }]]);
    expect(supabase.calls.limit).toEqual([]); // polling mode is unbounded
  });

  it('rejects a malformed upgraded_from with 400 before auth', async () => {
    const res = await GET(req('?upgraded_from=not-a-uuid'));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'upgraded_from must be a valid UUID' });
    expect(mockedAuth).not.toHaveBeenCalled();
  });

  it('polling mode preserves full report_json (unchanged from 5cc8356)', async () => {
    // Polling mode serves IAP materialization; iOS needs the COMPLETE report.
    // The slim transform must not touch this branch — heavy fields survive.
    const rows = [
      {
        id: 'child',
        upgraded_from_snapshot_id: VALID_UUID,
        report_json: {
          betiq: { score: 76 },
          bet_annotations: [{ note: 'heavy' }],
          session_detection: { sessions: [{ grade: 'F' }] },
          executive_diagnosis: 'full prose that MUST ship to the paid detail view',
        },
      },
    ];
    const supabase = makeSupabase({ data: rows, error: null });
    mockedAuth.mockResolvedValue({ supabase, user: USER, error: null });

    const res = await GET(req(`?upgraded_from=${VALID_UUID}`));

    expect(res.status).toBe(200);
    const body = await res.json();
    const rj = body.reports[0].report_json;

    // All heavy fields preserved — polling mode is intentionally NOT slimmed.
    expect(rj.bet_annotations).toEqual([{ note: 'heavy' }]);
    expect(rj.session_detection).toEqual({ sessions: [{ grade: 'F' }] });
    expect(rj.executive_diagnosis).toBe('full prose that MUST ship to the paid detail view');
    expect(rj.betiq).toEqual({ score: 76 });
  });
});

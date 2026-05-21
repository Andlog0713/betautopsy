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
    expect(await res.json()).toEqual({ reports: rows });

    // Scoped by RLS via the authed client: no explicit user_id filter added,
    // sorted DESC, capped.
    expect(supabase.calls.from).toEqual([['autopsy_reports']]);
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
});

describe('GET /api/reports?upgraded_from — IAP polling (unchanged)', () => {
  const VALID_UUID = '22222222-2222-2222-2222-222222222222';

  it('filters by upgraded_from_snapshot_id and does not add a list limit', async () => {
    const rows = [{ id: 'child', upgraded_from_snapshot_id: VALID_UUID }];
    const supabase = makeSupabase({ data: rows, error: null });
    mockedAuth.mockResolvedValue({ supabase, user: USER, error: null });

    const res = await GET(req(`?upgraded_from=${VALID_UUID}`));

    expect(res.status).toBe(200);
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
});

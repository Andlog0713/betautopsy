/**
 * DELETE + GET /api/share - regression tests.
 *
 * DELETE: part of the P0-3 share-token consent fix: a report owner can now
 * take their public link down without deleting the row (POST re-activates
 * it on the next explicit share). This locks the DELETE handler's auth gate
 * and ownership scoping.
 *
 * GET: read-only existence check added so ShareModal can show "Delete
 * shared link" for a link minted in a PAST session, not just one minted
 * this session. Locks that it never mints/re-activates (unlike POST, which
 * is the actual explicit-share action), that it's scoped to report_id AND
 * the caller's own user_id, and that a revoked token reports as no active
 * share.
 *
 * The POST handler's mint/re-activation branch has a longer dependency
 * chain (report fetch, admin fallback, owner profile lookup, existing-token
 * check) and is verified manually against a real report instead of a
 * multi-step mock here.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE, GET } from '@/app/api/share/route';
import { getAuthenticatedClient } from '@/lib/supabase-from-request';

vi.mock('@/lib/supabase-from-request', () => ({
  getAuthenticatedClient: vi.fn(),
}));

vi.mock('@/lib/supabase-server', () => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock('@/lib/log-error-server', () => ({
  logErrorServer: vi.fn(async () => {}),
}));

const mockedAuth = vi.mocked(getAuthenticatedClient);

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/share', {
    method: 'DELETE',
    body: JSON.stringify(body),
  });
}

function makeGetRequest(reportId?: string) {
  const url = reportId
    ? `http://localhost/api/share?report_id=${encodeURIComponent(reportId)}`
    : 'http://localhost/api/share';
  return new Request(url, { method: 'GET' });
}

function makeSupabaseSingle(result: { data: unknown; error: unknown }) {
  const calls: Record<string, unknown[][]> = { from: [], select: [], eq: [] };
  const builder: any = {
    calls,
    from(...a: unknown[]) { calls.from.push(a); return builder; },
    select(...a: unknown[]) { calls.select.push(a); return builder; },
    eq(...a: unknown[]) { calls.eq.push(a); return builder; },
    single() { return Promise.resolve(result); },
  };
  return builder;
}

function makeSupabase(result: { error: unknown }) {
  const calls: Record<string, unknown[][]> = { from: [], update: [], eq: [] };
  const builder: any = {
    calls,
    from(...a: unknown[]) { calls.from.push(a); return builder; },
    update(...a: unknown[]) { calls.update.push(a); return builder; },
    eq(...a: unknown[]) { calls.eq.push(a); return builder; },
    then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return builder;
}

describe('DELETE /api/share', () => {
  beforeEach(() => {
    mockedAuth.mockReset();
  });

  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue({ supabase: null, user: null, error: 'no session' } as any);

    const res = await DELETE(makeRequest({ report_id: 'r1' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when report_id is missing', async () => {
    const supabase = makeSupabase({ error: null });
    mockedAuth.mockResolvedValue({ supabase, user: { id: 'user_1' }, error: null } as any);

    const res = await DELETE(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('scopes the revoke update to report_id AND the caller\'s own user_id', async () => {
    const supabase = makeSupabase({ error: null });
    mockedAuth.mockResolvedValue({ supabase, user: { id: 'user_1' }, error: null } as any);

    const res = await DELETE(makeRequest({ report_id: 'report_123' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ revoked: true });
    expect(supabase.calls.from[0]).toEqual(['share_tokens']);
    expect(supabase.calls.update[0]).toEqual([{ revoked: true }]);
    expect(supabase.calls.eq).toContainEqual(['report_id', 'report_123']);
    expect(supabase.calls.eq).toContainEqual(['user_id', 'user_1']);
  });

  it('returns 500 on a DB error rather than silently reporting success', async () => {
    const supabase = makeSupabase({ error: { message: 'db down' } });
    mockedAuth.mockResolvedValue({ supabase, user: { id: 'user_1' }, error: null } as any);

    const res = await DELETE(makeRequest({ report_id: 'report_123' }));
    expect(res.status).toBe(500);
  });
});

describe('GET /api/share', () => {
  beforeEach(() => {
    mockedAuth.mockReset();
  });

  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue({ supabase: null, user: null, error: 'no session' } as any);

    const res = await GET(makeGetRequest('report_123'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when report_id query param is missing', async () => {
    const supabase = makeSupabaseSingle({ data: null, error: null });
    mockedAuth.mockResolvedValue({ supabase, user: { id: 'user_1' }, error: null } as any);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(400);
  });

  it('returns the share_id when an active (non-revoked) token exists, scoped to report_id AND the caller\'s own user_id', async () => {
    const supabase = makeSupabaseSingle({ data: { id: 'token_1', revoked: false }, error: null });
    mockedAuth.mockResolvedValue({ supabase, user: { id: 'user_1' }, error: null } as any);

    const res = await GET(makeGetRequest('report_123'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ share_id: 'token_1' });
    expect(supabase.calls.from[0]).toEqual(['share_tokens']);
    expect(supabase.calls.eq).toContainEqual(['report_id', 'report_123']);
    expect(supabase.calls.eq).toContainEqual(['user_id', 'user_1']);
  });

  it('returns null share_id for a revoked token - not "delete" for a link that is already down', async () => {
    const supabase = makeSupabaseSingle({ data: { id: 'token_1', revoked: true }, error: null });
    mockedAuth.mockResolvedValue({ supabase, user: { id: 'user_1' }, error: null } as any);

    const res = await GET(makeGetRequest('report_123'));
    const json = await res.json();

    expect(json).toEqual({ share_id: null });
  });

  it('returns null share_id when no token exists at all', async () => {
    const supabase = makeSupabaseSingle({ data: null, error: { message: 'no rows' } });
    mockedAuth.mockResolvedValue({ supabase, user: { id: 'user_1' }, error: null } as any);

    const res = await GET(makeGetRequest('report_123'));
    const json = await res.json();

    expect(json).toEqual({ share_id: null });
  });
});

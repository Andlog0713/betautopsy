/**
 * DELETE /api/share - revoke regression test.
 *
 * Part of the P0-3 share-token consent fix: a report owner can now take
 * their public link down without deleting the row (POST re-activates it on
 * the next explicit share). This locks the DELETE handler's auth gate and
 * ownership scoping. The POST handler's re-activation branch has a longer
 * dependency chain (report fetch, admin fallback, owner profile lookup,
 * existing-token check) and is verified manually against a real report
 * instead of a multi-step mock here.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from '@/app/api/share/route';
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

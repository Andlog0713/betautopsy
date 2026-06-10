import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST as checkInPost } from '@/app/api/check-in/route';
import { POST as outcomePost } from '@/app/api/check-in/outcome/route';
import { scoreCheckIn } from '@/lib/check-in-scorer';
import { getAuthenticatedClient } from '@/lib/supabase-from-request';

vi.mock('@/lib/supabase-from-request', () => ({
  getAuthenticatedClient: vi.fn(),
}));

vi.mock('@/lib/check-in-scorer', async () => {
  const actual = await vi.importActual<typeof import('@/lib/check-in-scorer')>('@/lib/check-in-scorer');
  return {
    ...actual,
    scoreCheckIn: vi.fn(),
  };
});

vi.mock('@/lib/control-system', () => ({
  buildCooldownDraftFromEvaluation: vi.fn(() => null),
  buildRiskEventDraftsFromCheckIn: vi.fn(() => []),
}));

vi.mock('@sentry/nextjs', () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));

const mockedAuth = vi.mocked(getAuthenticatedClient);
const mockedScoreCheckIn = vi.mocked(scoreCheckIn);

function makeCheckInSupabase() {
  const calls = {
    insertPayloads: [] as Array<Record<string, unknown>>,
  };

  return {
    calls,
    from(table: string) {
      if (table === 'pre_bet_checkins') {
        return {
          insert(payload: Record<string, unknown>) {
            calls.insertPayloads.push(payload);
            const attempt = calls.insertPayloads.length;
            const result = attempt === 1
              ? { data: null, error: { code: '42703', message: 'column pre_bet_checkins.context does not exist' } }
              : { data: { id: 'checkin-1' }, error: null };
            return {
              select() {
                return {
                  single: async () => result,
                };
              },
            };
          },
        };
      }

      if (table === 'risk_events') {
        const result = { data: [], error: null };
        const builder = {
          select() {
            return builder;
          },
          eq() {
            return builder;
          },
          order() {
            return builder;
          },
          limit() {
            return Promise.resolve(result);
          },
        };
        return builder;
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };
}

function makeOutcomeSupabase() {
  const calls = {
    updatePayloads: [] as Array<Record<string, unknown>>,
    selectCalls: [] as string[],
  };

  return {
    calls,
    from(table: string) {
      if (table !== 'pre_bet_checkins') throw new Error(`Unexpected table ${table}`);

      return {
        update(payload: Record<string, unknown>) {
          calls.updatePayloads.push(payload);
          const attempt = calls.updatePayloads.length;
          return {
            eq() {
              return {
                select(selection: string) {
                  calls.selectCalls.push(selection);
                  const result = attempt === 1
                    ? { data: null, error: { code: '42703', message: 'column pre_bet_checkins.override_reason does not exist' } }
                    : attempt === 2
                    ? { data: null, error: { code: '42703', message: 'column pre_bet_checkins.context does not exist' } }
                    : { data: { id: 'checkin-1' }, error: null };
                  return {
                    maybeSingle: async () => result,
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('check-in route prod-schema compatibility', () => {
  it('retries without context when the legacy prod schema is still live', async () => {
    const supabase = makeCheckInSupabase();
    mockedAuth.mockResolvedValue({ supabase: supabase as any, user: { id: 'user-1' } as any, error: null });
    mockedScoreCheckIn.mockResolvedValue({
      betQualityScore: 78,
      flags: [],
      recommendation: 'place_bet',
      summary: 'No risk flags. Behavioral state looks clean.',
      actionGate: 'clear',
      ruleViolations: [],
      cooldown: null,
      recentRiskContext: [],
      planContext: null,
      reflectionPrompts: [],
      overrideRequired: false,
    });

    const request = new Request('https://app.test/api/check-in', {
      method: 'POST',
      body: JSON.stringify({
        sport: 'nba',
        stake: 50,
        odds: -110,
        betType: 'spread',
        placedAt: '2026-06-10T12:00:00.000Z',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await checkInPost(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      checkInId: 'checkin-1',
      betQualityScore: 78,
      flags: [],
      recommendation: 'place_bet',
      summary: 'No risk flags. Behavioral state looks clean.',
      actionGate: 'clear',
      ruleViolations: [],
      cooldown: null,
      recentRiskContext: [],
      planContext: null,
      reflectionPrompts: [],
      overrideRequired: false,
    });
    expect(supabase.calls.insertPayloads).toHaveLength(2);
    expect(supabase.calls.insertPayloads[0]).toHaveProperty('context');
    expect(supabase.calls.insertPayloads[1]).not.toHaveProperty('context');
  });
});

describe('check-in outcome route prod-schema compatibility', () => {
  it('falls back to the legacy update path when override/context columns are absent', async () => {
    const supabase = makeOutcomeSupabase();
    mockedAuth.mockResolvedValue({ supabase: supabase as any, user: { id: 'user-1' } as any, error: null });

    const request = new Request('https://app.test/api/check-in/outcome', {
      method: 'POST',
      body: JSON.stringify({
        checkInId: '11111111-1111-1111-1111-111111111111',
        outcome: 'placed_anyway',
        overrideReason: 'ignored the gate',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await outcomePost(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({});
    expect(supabase.calls.updatePayloads).toEqual([
      {
        outcome: 'placed_anyway',
        outcome_at: expect.any(String),
        override_reason: 'ignored the gate',
      },
      {
        outcome: 'placed_anyway',
        outcome_at: expect.any(String),
      },
      {
        outcome: 'placed_anyway',
        outcome_at: expect.any(String),
      },
    ]);
    expect(supabase.calls.selectCalls).toEqual(['id, context', 'id, context', 'id']);
  });
});

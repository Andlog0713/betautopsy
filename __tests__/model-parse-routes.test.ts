import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createMessage: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class AnthropicMock {
    messages = { create: mocks.createMessage };
  },
}));

vi.mock('@/lib/supabase-from-request', () => ({
  getAuthenticatedClient: vi.fn(async () => ({
    supabase: {},
    user: { id: 'user-1', email: 'bettor@example.com' },
    error: null,
  })),
}));

vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn(async () => true) }));
vi.mock('@/lib/log-error-server', () => ({ logErrorServer: vi.fn() }));

function modelResponse(bets: Record<string, unknown>[]) {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ bets, parse_notes: [] }),
    }],
  };
}

function extracted(overrides: Record<string, unknown> = {}) {
  return {
    placed_at: '2026-08-22T19:15:00-04:00',
    sport: 'NFL',
    bet_type: 'spread',
    description: 'Chiefs -3.5',
    odds: -110,
    stake: 100,
    result: 'loss',
    profit: -100,
    sportsbook: 'DraftKings',
    is_bonus_bet: false,
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe('model-assisted parse routes', () => {
  it('paste parsing discloses and skips a date-only model value', async () => {
    mocks.createMessage.mockResolvedValue(modelResponse([
      extracted({ placed_at: '2026-08-22' }),
    ]));
    const { POST } = await import('@/app/api/parse-paste/route');
    const response = await POST(new Request('https://app.test/api/parse-paste', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: 'DraftKings settled history row with enough source text to parse safely.',
      }),
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.bets).toEqual([]);
    expect(body.parse_notes.join(' ')).toContain('no clock time');
  });

  it('screenshot parsing does not calculate a missing profit', async () => {
    mocks.createMessage.mockResolvedValue(modelResponse([
      extracted({ profit: undefined }),
    ]));
    const form = new FormData();
    form.append('files', new File(['image'], 'history.png', { type: 'image/png' }));

    const { POST } = await import('@/app/api/parse-screenshot/route');
    const response = await POST(new Request('https://app.test/api/parse-screenshot', {
      method: 'POST',
      body: form,
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.bets).toEqual([]);
    expect(body.parse_notes.join(' ')).toContain('profit is missing');
  });

  it('screenshot parsing emits an explicit zoned timestamp unchanged in meaning', async () => {
    mocks.createMessage.mockResolvedValue(modelResponse([extracted()]));
    const form = new FormData();
    form.append('files', new File(['image'], 'history.png', { type: 'image/png' }));

    const { POST } = await import('@/app/api/parse-screenshot/route');
    const response = await POST(new Request('https://app.test/api/parse-screenshot', {
      method: 'POST',
      body: form,
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.bets).toHaveLength(1);
    expect(body.bets[0]).toMatchObject({
      placed_at: '2026-08-22T23:15:00.000Z',
      profit: -100,
      payout: 0,
    });
  });
});

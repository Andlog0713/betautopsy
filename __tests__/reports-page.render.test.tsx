// @vitest-environment jsdom

import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AutopsyReportListItem } from '@/types';
import ReportsPage from '@/app/(dashboard)/reports/page';

const mocks = vi.hoisted(() => ({
  search: new URLSearchParams(),
  mutateReports: vi.fn(),
  apiPost: vi.fn(),
  apiGet: vi.fn(),
}));

const snapshot: AutopsyReportListItem = {
  id: '11111111-1111-1111-1111-111111111111',
  report_type: 'snapshot',
  bet_count_analyzed: 200,
  date_range_start: '2026-01-01T00:00:00.000Z',
  date_range_end: '2026-08-01T00:00:00.000Z',
  created_at: '2026-08-20T12:00:00.000Z',
  report_json: {
    summary: {
      total_bets: 200,
      record: '80-120-0',
      total_profit: 0,
      total_profit_visibility: 'redacted_dollar',
      roi_percent: -15.82,
      avg_stake: 0,
      avg_stake_visibility: 'redacted_dollar',
      date_range: 'Jan 1 - Aug 1',
      overall_grade: null,
    },
    emotion_score: 42,
  },
  is_paid: false,
  upgraded_from_snapshot_id: null,
  analyzed_sportsbook: 'DraftKings',
};
const reportList = [snapshot];
const emptySnapshots: never[] = [];
const emptyUploads: never[] = [];

vi.mock('next/navigation', () => ({
  useSearchParams: () => mocks.search,
}));

vi.mock('@/hooks/useUser', () => ({
  useUser: () => ({
    user: { id: 'user-1' },
    profile: { subscription_tier: 'free', manual_recovery_mode: false },
  }),
}));

vi.mock('@/hooks/useReports', () => ({
  useReports: () => ({
    reports: reportList,
    mutate: mocks.mutateReports,
  }),
}));

vi.mock('@/hooks/useSnapshots', () => ({
  useSnapshots: () => ({ snapshots: emptySnapshots }),
}));

vi.mock('@/hooks/useUploads', () => ({
  useUploads: () => ({ uploads: emptyUploads }),
}));

vi.mock('@/lib/api-client', () => ({
  apiPost: mocks.apiPost,
  apiGet: mocks.apiGet,
}));

vi.mock('@/lib/meta-events', () => ({
  trackPurchase: vi.fn(),
}));

function makeQueryBuilder(options: { count?: number; data?: unknown[] } = {}) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'not', 'gt', 'gte', 'lt', 'lte', 'order', 'in']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.then = (
    resolve: (value: unknown) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve({
    data: options.data ?? [],
    count: options.count ?? null,
    error: null,
  }).then(resolve, reject);
  return builder;
}

vi.mock('@/lib/supabase-browser', () => ({
  createBrowserSupabaseClient: () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })) },
    from: vi.fn((table: string) => table === 'bets'
      ? makeQueryBuilder({ count: 200, data: [] })
      : makeQueryBuilder()),
  }),
}));

beforeEach(() => {
  mocks.search = new URLSearchParams();
  mocks.mutateReports.mockReset();
  mocks.mutateReports.mockResolvedValue([snapshot]);
  mocks.apiPost.mockReset();
  mocks.apiGet.mockReset();
});

afterEach(() => cleanup());

describe('Reports page journey contracts', () => {
  it('keeps snapshot controls after the first report and never renders a redacted $0', async () => {
    render(<ReportsPage />);

    expect(await screen.findByRole('button', { name: /run new autopsy/i })).toBeTruthy();
    expect(screen.getByText('Free tier: unlimited snapshot reports. Unlock the full 5-chapter analysis for $19.99.')).toBeTruthy();
    expect(screen.getByText('Locked')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/[+-]?\$0\b/);
    expect(document.body.textContent).not.toContain('+6.1% ROI');
  });

  it('polls persisted fulfillment after checkout without invoking analyze', async () => {
    mocks.search = new URLSearchParams(`unlocked=true&id=${snapshot.id}`);
    mocks.mutateReports.mockResolvedValue([
      { ...snapshot, fulfillment_status: 'paid_queued' },
    ]);

    render(<ReportsPage />);

    expect(await screen.findByText('Payment received. Your full report is queued.')).toBeTruthy();
    await waitFor(() => expect(mocks.mutateReports).toHaveBeenCalled());
    expect(mocks.apiPost).not.toHaveBeenCalled();
  });
});

import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AutopsyAnalysis, Bet } from '@/types';
import { markFixtureTimestampAsSourced } from './helpers/known-instant';

const mocks = vi.hoisted(() => ({
  runAutopsy: vi.fn(),
  calculateMetrics: vi.fn(),
  calculateDisciplineScore: vi.fn(),
  calculateBetIQ: vi.fn(),
  estimatePercentile: vi.fn(),
  calculateEnhancedTilt: vi.fn(),
  detectSportSpecificPatterns: vi.fn(),
  buildReportSummary: vi.fn(),
  computeWhatChanged: vi.fn(),
}));

vi.mock('@/lib/autopsy-engine', () => ({
  runAutopsy: mocks.runAutopsy,
  calculateMetrics: mocks.calculateMetrics,
  calculateDisciplineScore: mocks.calculateDisciplineScore,
  calculateBetIQ: mocks.calculateBetIQ,
  estimatePercentile: mocks.estimatePercentile,
  calculateEnhancedTilt: mocks.calculateEnhancedTilt,
  detectSportSpecificPatterns: mocks.detectSportSpecificPatterns,
}));

vi.mock('@/lib/report-summary', () => ({
  buildReportSummary: mocks.buildReportSummary,
}));

vi.mock('@/lib/what-changed', () => ({
  computeWhatChanged: mocks.computeWhatChanged,
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

import { generateAndPersistFullReport } from '@/lib/full-report-pipeline';

interface Operation {
  table: string;
  op: string;
  payload?: unknown;
}

interface MockClientOptions {
  quizArchetype?: string | null;
  priorReport?: Record<string, unknown> | null;
  insertError?: { code?: string; message: string } | null;
  concurrentReport?: Record<string, unknown> | null;
}

function makeClient(options: MockClientOptions = {}) {
  const operations: Operation[] = [];

  const client = {
    from(table: string) {
      let writeOperation: string | null = null;
      let writePayload: unknown;

      const builder: Record<string, unknown> = {
        select() { return builder; },
        eq() { return builder; },
        order() { return builder; },
        limit() { return builder; },
        insert(payload: unknown) {
          writeOperation = 'insert';
          writePayload = payload;
          operations.push({ table, op: 'insert', payload });
          return builder;
        },
        update(payload: unknown) {
          writeOperation = 'update';
          writePayload = payload;
          operations.push({ table, op: 'update', payload });
          return builder;
        },
        upsert(payload: unknown) {
          writeOperation = 'upsert';
          writePayload = payload;
          operations.push({ table, op: 'upsert', payload });
          return builder;
        },
        async maybeSingle() {
          if (table === 'quiz_leads') {
            return {
              data: options.quizArchetype
                ? { archetype: options.quizArchetype }
                : null,
              error: null,
            };
          }
          if (table === 'autopsy_reports') {
            return {
              data: options.concurrentReport !== undefined
                ? options.concurrentReport
                : options.priorReport ?? null,
              error: null,
            };
          }
          return { data: null, error: null };
        },
        async single() {
          if (table === 'autopsy_reports' && writeOperation === 'insert') {
            if (options.insertError) return { data: null, error: options.insertError };
            return {
              data: {
                ...(writePayload as Record<string, unknown>),
                created_at: '2026-08-22T12:00:00.000Z',
              },
              error: null,
            };
          }
          return { data: null, error: null };
        },
        then(resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) {
          return Promise.resolve({ data: null, error: null }).then(resolve, reject);
        },
      };

      return builder;
    },
  } as unknown as SupabaseClient;

  return { client, operations };
}

function bet(id: string, placedAt: string): Bet {
  return markFixtureTimestampAsSourced({
    id,
    user_id: 'user-1',
    placed_at: placedAt,
    sport: 'NFL',
    league: null,
    bet_type: 'spread',
    description: id,
    odds: -110,
    stake: 100,
    result: 'loss',
    payout: 0,
    profit: -100,
    sportsbook: 'DraftKings',
    is_bonus_bet: false,
    parlay_legs: null,
    tags: null,
    notes: null,
    upload_id: 'upload-1',
    created_at: placedAt,
  });
}

function pipelineArgs(
  supabase: SupabaseClient,
  persistenceClient: SupabaseClient,
) {
  return {
    supabase,
    persistenceClient,
    userId: 'user-1',
    profile: {
      email: 'bettor@example.com',
      bankroll: 1000,
      streak_count: 2,
      streak_last_date: null,
      streak_best: 4,
      streak_freezes: 1,
    },
    bets: [
      bet('bet-1', '2026-08-20T12:00:00.000Z'),
      bet('bet-2', '2026-08-21T12:00:00.000Z'),
    ],
    reportType: 'full' as const,
    analyzedUploadIds: ['upload-1'],
    analyzedSportsbook: 'DraftKings',
    reportCount: 3,
    recentUploadCount: 1,
    previousSnapshot: null,
    upgradedFromSnapshotId: 'snapshot-1',
    reportId: 'report-1',
    dropLogPath: '/test/full-report',
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.runAutopsy.mockResolvedValue({
    analysis: { emotion_score: 42 } as AutopsyAnalysis,
    markdown: '# Full report',
    tokensUsed: 1234,
    model: 'test-model',
    drops: [{
      site: 'strategic_leaks',
      reportId: 'report-1',
      category: null,
      categoryRoiExists: false,
      reason: 'no_category',
    }],
  });
  mocks.calculateMetrics.mockReturnValue({
    summary: {
      wins: 60,
      losses: 60,
      total_profit: -1000,
      roi_percent: -10,
      win_rate: 33.3,
      avg_stake: 100,
      overall_grade: 'C',
    },
    emotion_score: 42,
    parlay_stats: { parlay_percent: 12 },
    loss_chase_ratio: 0.25,
    bankroll_health: 'watch',
  });
  mocks.calculateDisciplineScore.mockReturnValue({
    total: 71,
    tracking: 18,
    sizing: 17,
    control: 19,
    strategy: 17,
    insufficient_data: false,
  });
  mocks.calculateBetIQ.mockReturnValue({ score: 78 });
  mocks.estimatePercentile.mockReturnValue(64);
  mocks.calculateEnhancedTilt.mockReturnValue({ score: 31 });
  mocks.detectSportSpecificPatterns.mockReturnValue([{ sport: 'NFL' }]);
  mocks.buildReportSummary.mockReturnValue({ summary_marker: true });
  mocks.computeWhatChanged.mockReturnValue({
    previousReportDate: '2026-08-01',
    daysSincePrevious: 21,
  });
});

describe('canonical full-report pipeline', () => {
  it('owns full enrichment, exact-scope persistence, drops, and longitudinal writes', async () => {
    const sideEffects = makeClient({
      quizArchetype: 'Careful Grinder',
      priorReport: {
        report_json: { schema_version: 3 },
        created_at: '2026-08-01T12:00:00.000Z',
        bet_count_analyzed: 50,
      },
    });
    const persistence = makeClient();
    const beforePersist = vi.fn(async () => {});

    const result = await generateAndPersistFullReport({
      ...pipelineArgs(sideEffects.client, persistence.client),
      beforePersist,
    });

    expect(mocks.runAutopsy).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'bet-1' })]),
      1000,
      'report-1',
    );
    expect(beforePersist).toHaveBeenCalledOnce();

    const reportInsert = persistence.operations.find(
      (operation) => operation.table === 'autopsy_reports' && operation.op === 'insert',
    );
    expect(reportInsert).toBeDefined();
    const row = reportInsert?.payload as Record<string, unknown>;
    const analysis = row.report_json as AutopsyAnalysis;

    expect(row).toMatchObject({
      id: 'report-1',
      user_id: 'user-1',
      report_type: 'full',
      is_paid: true,
      upgraded_from_snapshot_id: 'snapshot-1',
      analyzed_upload_ids: ['upload-1'],
      analyzed_bet_ids: ['bet-1', 'bet-2'],
      analyzed_sportsbook: 'DraftKings',
      report_summary: { summary_marker: true },
      cost_cents: 2,
      date_range_start: '2026-08-20T12:00:00.000Z',
      date_range_end: '2026-08-21T12:00:00.000Z',
      date_range_start_date: '2026-08-20',
      date_range_end_date: '2026-08-21',
    });
    expect(analysis).toMatchObject({
      quiz_archetype: 'Careful Grinder',
      schema_version: 4,
      discipline_score: { total: 71, percentile: 64 },
      betiq: { score: 78 },
      emotion_percentile: 64,
      emotion_score_insufficient_data: false,
      tilt_score_insufficient_data: false,
      enhanced_tilt: { score: 31 },
      sport_specific_findings: [{ sport: 'NFL' }],
      whatChanged: {
        previousReportDate: '2026-08-01',
        daysSincePrevious: 21,
      },
    });
    expect(mocks.buildReportSummary).toHaveBeenCalledWith(analysis);

    expect(persistence.operations).toContainEqual(expect.objectContaining({
      table: 'error_logs',
      op: 'insert',
      payload: [expect.objectContaining({
        user_id: 'user-1',
        path: '/test/full-report',
        source: 'autopsy-engine-drop',
      })],
    }));
    expect(sideEffects.operations).toContainEqual(expect.objectContaining({
      table: 'discipline_scores',
      op: 'insert',
      payload: expect.objectContaining({ report_id: 'report-1', score: 71 }),
    }));
    expect(sideEffects.operations).toContainEqual(expect.objectContaining({
      table: 'profiles',
      op: 'update',
      payload: expect.objectContaining({ streak_count: 1, streak_best: 4 }),
    }));
    expect(sideEffects.operations).toContainEqual(expect.objectContaining({
      table: 'progress_snapshots',
      op: 'upsert',
      payload: expect.objectContaining({
        total_bets: 2,
        total_profit: -1000,
        discipline_score: 71,
      }),
    }));
    expect(result.reusedExisting).toBe(false);
    expect(result.report.id).toBe('report-1');
  });

  it('returns the concurrent paid child without duplicating post-insert effects', async () => {
    const sideEffects = makeClient({ quizArchetype: null, priorReport: null });
    const persistence = makeClient({
      insertError: { code: '23505', message: 'unique violation' },
      concurrentReport: {
        id: 'winner-report',
        report_json: { schema_version: 4 },
        report_markdown: '# Winner',
      },
    });

    const result = await generateAndPersistFullReport({
      ...pipelineArgs(sideEffects.client, persistence.client),
      returnExistingUpgradeOnConflict: true,
    });

    expect(result).toMatchObject({
      reusedExisting: true,
      report: { id: 'winner-report' },
    });
    expect(persistence.operations.some((operation) => operation.table === 'error_logs')).toBe(false);
    expect(sideEffects.operations).toEqual([]);
  });

  it('keeps both callers delegated and all notifications caller-owned', () => {
    const route = readFileSync('app/api/analyze/route.ts', 'utf8');
    const iap = readFileSync('lib/iap-upgrade.ts', 'utf8');
    const pipeline = readFileSync('lib/full-report-pipeline.ts', 'utf8');

    expect(route).toContain('generateAndPersistFullReport({');
    expect(iap).toContain('generateAndPersistFullReport({');
    expect(route).not.toMatch(/\bawait\s+runAutopsy\s*\(/);
    expect(iap).not.toMatch(/\bawait\s+runAutopsy\s*\(/);
    expect(pipeline.match(/\brunAutopsy\s*\(/g)).toHaveLength(1);
    expect(pipeline).not.toContain('maybeSendHeatedPush');
    expect(pipeline).not.toContain('maybeSendReportReadyPush');
    expect(route).toContain('analyzed_bets_snapshot: betsToAnalyze');
    expect(pipeline).not.toContain('analyzed_bets_snapshot');
  });
});

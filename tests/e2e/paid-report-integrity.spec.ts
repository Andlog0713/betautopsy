import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';
import { DEMO_ANALYSIS, DEMO_BETS } from '../../lib/demo-data';
import { runSnapshot } from '../../lib/autopsy-engine';
import { buildReportSummary } from '../../lib/report-summary';

const AUTH_HEADER = 'x-betautopsy-playwright-auth';
const AUTH_TOKEN = 'paid-report-integrity-e2e-v1';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const SNAPSHOT_ID = '22222222-2222-4222-8222-222222222222';
const FULL_REPORT_ID = '33333333-3333-4333-8333-333333333333';
const CREATED_AT = '2026-01-31T12:00:00.000Z';

test.use({
  extraHTTPHeaders: {
    [AUTH_HEADER]: AUTH_TOKEN,
  },
});

const PROFILE = {
  id: USER_ID,
  email: 'paid-integrity@example.com',
  display_name: 'Integrity Fixture',
  stripe_customer_id: 'cus_playwright_fixture',
  subscription_tier: 'free',
  subscription_status: 'inactive',
  trial_ends_at: null,
  bet_count: DEMO_BETS.length,
  bankroll: null,
  streak_count: 0,
  streak_last_date: null,
  streak_best: 0,
  streak_freezes: 1,
  login_count: 1,
  is_admin: false,
  email_digest_enabled: false,
  last_digest_sent_at: null,
  manual_recovery_mode: false,
  recovery_mode_reason: null,
  recovery_mode_started_at: null,
  reports_used_this_period: 1,
  current_period_start: null,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: CREATED_AT,
};

const USER = {
  id: USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: PROFILE.email,
  email_confirmed_at: '2025-01-01T00:00:00.000Z',
  phone: '',
  confirmed_at: '2025-01-01T00:00:00.000Z',
  last_sign_in_at: CREATED_AT,
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  identities: [],
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: CREATED_AT,
  is_anonymous: false,
};

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function makeAccessToken(expiresAt: number): string {
  return [
    base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    base64Url(JSON.stringify({ sub: USER_ID, role: 'authenticated', exp: expiresAt })),
    'playwright-fixture-signature',
  ].join('.');
}

async function seedSupabaseSession(context: BrowserContext, appOrigin: string): Promise<void> {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  const session = {
    access_token: makeAccessToken(expiresAt),
    refresh_token: 'playwright-refresh-token',
    expires_in: 3600,
    expires_at: expiresAt,
    token_type: 'bearer',
    user: USER,
  };
  const encoded = `base64-${base64Url(JSON.stringify(session))}`;
  await context.addCookies([{
    name: 'sb-stub-auth-token',
    value: encoded,
    url: appOrigin,
    sameSite: 'Lax',
  }]);
}

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': [
    'accept-profile',
    'apikey',
    'authorization',
    'content-profile',
    'content-type',
    'prefer',
    'x-betautopsy-playwright-auth',
    'x-client-info',
    'x-supabase-api-version',
  ].join(', '),
  'access-control-allow-methods': 'GET, HEAD, POST, PATCH, DELETE, OPTIONS',
  'access-control-expose-headers': 'content-range',
};

async function fulfillJson(route: Route, body: unknown, headers: Record<string, string> = {}): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { ...CORS_HEADERS, ...headers },
    body: JSON.stringify(body),
  });
}

function exactBetRows(url: URL) {
  const idFilter = url.searchParams.get('id');
  if (!idFilter?.startsWith('in.(') || !idFilter.endsWith(')')) return DEMO_BETS;
  const ids = new Set(idFilter.slice(4, -1).split(','));
  return DEMO_BETS.filter((bet) => ids.has(bet.id));
}

test('authenticated paid report delivery is browser-independent and single-child', async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(90_000);
  expect(baseURL).toBeTruthy();
  const appUrl = new URL(baseURL!);
  expect(['localhost', '127.0.0.1']).toContain(appUrl.hostname);
  const appOrigin = appUrl.origin;
  const { analysis: snapshotAnalysis } = await runSnapshot(DEMO_BETS);
  const analyzedBetIds = DEMO_BETS.map((bet) => bet.id);
  const settled = DEMO_BETS.filter((bet) => bet.result !== 'pending' && bet.result !== 'void');
  const totalWagered = settled.reduce((sum, bet) => sum + Math.abs(bet.stake), 0);
  const netPnl = settled.reduce((sum, bet) => sum + bet.profit, 0);

  const snapshotListRow = {
    id: SNAPSHOT_ID,
    report_type: 'snapshot',
    bet_count_analyzed: DEMO_BETS.length,
    date_range_start: '2025-11-01T00:00:00.000Z',
    date_range_end: '2026-01-31T23:59:59.999Z',
    report_json: buildReportSummary(snapshotAnalysis),
    is_paid: true,
    upgraded_from_snapshot_id: null,
    analyzed_sportsbook: null,
    fulfillment_status: 'paid_queued',
    completed_report_id: null,
    fulfillment_next_attempt_at: null,
    created_at: CREATED_AT,
  };
  const fullListRow = {
    id: FULL_REPORT_ID,
    report_type: 'full',
    bet_count_analyzed: DEMO_BETS.length,
    date_range_start: snapshotListRow.date_range_start,
    date_range_end: snapshotListRow.date_range_end,
    report_json: buildReportSummary(DEMO_ANALYSIS),
    is_paid: true,
    upgraded_from_snapshot_id: SNAPSHOT_ID,
    analyzed_sportsbook: null,
    fulfillment_status: null,
    completed_report_id: null,
    fulfillment_next_attempt_at: null,
    created_at: '2026-01-31T12:01:00.000Z',
  };
  const snapshotDetail = {
    ...snapshotListRow,
    user_id: USER_ID,
    report_json: snapshotAnalysis,
    report_markdown: '',
    model_used: 'snapshot-deterministic-v2',
    tokens_used: 0,
    cost_cents: 0,
    stripe_payment_intent_id: 'pi_playwright_fixture',
    analyzed_bet_ids: analyzedBetIds,
  };
  const fullDetail = {
    ...fullListRow,
    user_id: USER_ID,
    report_json: DEMO_ANALYSIS,
    report_markdown: '',
    model_used: 'claude-fixture',
    tokens_used: null,
    cost_cents: null,
    stripe_payment_intent_id: 'pi_playwright_fixture',
    analyzed_bet_ids: analyzedBetIds,
  };

  let reportJourneyStarted = false;
  let completionReleased = false;
  let reportListRequests = 0;
  const fullDetailRequests: string[] = [];
  const browserApiPosts: string[] = [];
  const renderDiagnostics: string[] = [];

  const observeRenderDiagnostics = (candidate: Page) => {
    candidate.on('console', (message) => {
      const text = message.text();
      if (
        /hydration failed|server-rendered html|did not match|error while hydrating|minified react error #(418|423)/i.test(text)
        || /width\([^)]*\).*height\([^)]*\).*greater than 0/i.test(text)
      ) {
        renderDiagnostics.push(`${message.type()}: ${text}`);
      }
    });
    candidate.on('pageerror', (error) => {
      if (/hydration|minified react error #(418|423)|recharts|greater than 0/i.test(error.message)) {
        renderDiagnostics.push(`pageerror: ${error.message}`);
      }
    });
  };
  observeRenderDiagnostics(page);
  context.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin === appOrigin && url.pathname.startsWith('/api/') && request.method() === 'POST') {
      browserApiPosts.push(url.pathname);
    }
  });

  await seedSupabaseSession(context, appOrigin);

  await context.route('https://stub.supabase.co/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }
    if (url.pathname === '/auth/v1/user') {
      await fulfillJson(route, USER);
      return;
    }
    if (url.pathname === '/rest/v1/rpc/dashboard_stats') {
      await fulfillJson(route, {
        total_bets: DEMO_BETS.length,
        total_wagered: totalWagered,
        net_pnl: netPnl,
        wins: settled.filter((bet) => bet.result === 'win').length,
        settled: settled.length,
        avg_stake: totalWagered / settled.length,
        newest_created_at: DEMO_BETS.reduce(
          (latest, bet) => bet.created_at > latest ? bet.created_at : latest,
          DEMO_BETS[0].created_at,
        ),
        bets_since: 0,
      });
      return;
    }
    if (url.pathname === '/rest/v1/profiles') {
      const wantsObject = request.headers()['accept']?.includes('application/vnd.pgrst.object');
      await fulfillJson(route, wantsObject ? PROFILE : [PROFILE]);
      return;
    }
    if (url.pathname === '/rest/v1/bets') {
      if (request.method() === 'HEAD') {
        await route.fulfill({
          status: 200,
          headers: {
            ...CORS_HEADERS,
            'content-type': 'application/json',
            'content-range': `0-0/${DEMO_BETS.length}`,
          },
        });
        return;
      }
      const select = url.searchParams.get('select');
      const rows = exactBetRows(url);
      await fulfillJson(
        route,
        select === 'sportsbook'
          ? rows.map((bet) => ({ sportsbook: bet.sportsbook }))
          : rows,
      );
      return;
    }
    if (url.pathname === '/rest/v1/progress_snapshots' || url.pathname === '/rest/v1/uploads') {
      await fulfillJson(route, []);
      return;
    }
    if (url.pathname === '/rest/v1/autopsy_reports' && request.method() === 'HEAD') {
      await route.fulfill({
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'content-type': 'application/json',
          'content-range': '0-0/0',
        },
      });
      return;
    }
    await fulfillJson(route, []);
  });

  await context.route(`${appOrigin}/api/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'POST') {
      await fulfillJson(route, { error: 'Unexpected browser-owned generation request' });
      return;
    }
    if (url.pathname === '/api/reports') {
      if (reportJourneyStarted) reportListRequests += 1;
      if (reportJourneyStarted && completionReleased) {
        await fulfillJson(route, {
          reports: [
            fullListRow,
            {
              ...snapshotListRow,
              fulfillment_status: 'completed',
              completed_report_id: FULL_REPORT_ID,
            },
          ],
        });
      } else {
        await fulfillJson(route, { reports: [snapshotListRow] });
      }
      return;
    }
    if (url.pathname === `/api/reports/${SNAPSHOT_ID}`) {
      await fulfillJson(route, { report: snapshotDetail });
      return;
    }
    if (url.pathname === `/api/reports/${FULL_REPORT_ID}`) {
      fullDetailRequests.push(url.pathname);
      await fulfillJson(route, { report: fullDetail });
      return;
    }
    if (url.pathname === '/api/journal') {
      await fulfillJson(route, { count: 0 });
      return;
    }
    if (url.pathname === '/api/control-system') {
      await fulfillJson(route, null);
      return;
    }
    await fulfillJson(route, {});
  });

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Your behavior, on record.' })).toBeVisible();
  await page.close();

  const uploadPage = await context.newPage();
  observeRenderDiagnostics(uploadPage);
  await uploadPage.goto('/upload');
  await expect(uploadPage).toHaveURL(/\/upload$/);
  await expect(uploadPage.getByRole('heading', { name: 'Upload Bets' })).toBeVisible();
  await uploadPage.close();

  reportJourneyStarted = true;
  const reportsPage = await context.newPage();
  observeRenderDiagnostics(reportsPage);
  await reportsPage.goto(`/reports?unlocked=true&id=${SNAPSHOT_ID}`);
  await expect(reportsPage).toHaveURL(/\/reports(?:\?|$)/);
  await expect(reportsPage.getByRole('status')).toContainText('Payment received. Your full report is queued.');
  expect(reportListRequests).toBeGreaterThan(0);

  await reportsPage.getByText('Snapshot', { exact: true }).click();
  await expect(reportsPage.getByText('You will not be charged again for this snapshot.')).toBeVisible();
  await expect(reportsPage.getByText('NET P&L')).toBeVisible();
  await expect(reportsPage.locator('[data-paywall-cta]')).toHaveCount(0);
  await expect(reportsPage.getByRole('button', { name: /see your full dollar costs/i })).toHaveCount(0);
  await expect(reportsPage.getByRole('link', { name: /get full report/i })).toHaveCount(0);

  completionReleased = true;
  await expect(reportsPage.getByText('Profit/Loss Over Time')).toBeVisible({ timeout: 15_000 });
  await expect(reportsPage.getByText('AUTOPSY REPORT #BA-3333')).toBeVisible();
  await reportsPage.waitForTimeout(500);

  expect(fullDetailRequests).toEqual([`/api/reports/${FULL_REPORT_ID}`]);
  expect(browserApiPosts).toEqual([]);

  await reportsPage.getByRole('button', { name: /back to reports/i }).click();
  await expect(reportsPage.getByText('Full Autopsy', { exact: true })).toHaveCount(1);
  expect(renderDiagnostics).toEqual([]);
});

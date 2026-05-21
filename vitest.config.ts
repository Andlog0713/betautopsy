// Pin tests to UTC. Engine code uses local `getHours()` / `toLocaleTimeString`
// for hour-of-day bucketing (lib/autopsy-engine.ts), which makes test output
// depend on the runner's machine timezone. Production runs on Vercel (UTC),
// so pinning here makes snapshots deterministic across dev machines + CI and
// match production behavior. NOTE: production code still has the local-time
// bug for non-UTC users (filed as v1.1 backlog item, separate work).
process.env.TZ = 'UTC';

import { defineConfig, configDefaults } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    exclude: [
      ...configDefaults.exclude,
      // Skip git worktrees under .claude, which carry stale copies of the
      // test files that pollute the run.
      '**/.claude/**',
      // Playwright owns tests/e2e/** — runs via `npm run test:e2e`. Vitest's
      // default include matches *.spec.ts but its test() API conflicts with
      // Playwright's, so vitest must not collect these.
      'tests/e2e/**',
      // p0-iap-webhook is a production-Supabase integration suite (added in
      // 0e9282e); it calls createClient at module load and requires
      // SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL env vars + mutates
      // production data. Excluded from default `npm test` to keep the unit test
      // gate fast and non-destructive. Run manually with env vars set:
      //   npx vitest run __tests__/p0-iap-webhook.test.ts
      // v1.1 backlog: re-integrate with staging Supabase + env injection.
      '__tests__/p0-iap-webhook.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});

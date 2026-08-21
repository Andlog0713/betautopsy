// Pin tests to UTC to match production (Vercel, see PROGRESS.md) and keep
// snapshots deterministic across dev machines + CI. lib/autopsy-engine.ts
// now reads all bet timestamps through lib/date-utils.ts's explicit UTC
// accessors (D4), not local Date methods, so this pin no longer masks a
// production bug — but it DOES make `new Date(x).getHours()` and
// `d.getUTCHours()` indistinguishable inside this process, so any test
// for UTC-vs-local correctness must assert which method gets called
// (see __tests__/date-utils.test.ts), not just compare output values.
process.env.TZ = 'UTC';

import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // tsconfig.json sets "jsx": "preserve" (Next.js's SWC pipeline handles the
  // transform in the app itself); Vite/esbuild needs this plugin to transform
  // JSX in .tsx test files, since it won't do so under "preserve" on its own.
  plugins: [react()],
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

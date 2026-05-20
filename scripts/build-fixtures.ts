/**
 * REGEN WORKFLOW (fixtures + golden are gitignored, see .gitignore):
 *   1. npx tsx scripts/build-fixtures.ts
 *   2. npx tsx scripts/capture-golden.ts   (run BEFORE engine changes)
 *   3. npx tsx scripts/verify-engine-floor.ts
 *
 * Fixture builder for the global minimum-sample floor work (sprint row
 * 3655964c-daf2-8138). Read-only against Supabase.
 *
 * Pulls Andrew's 5000-bet upload and writes:
 *   test/fixtures/5000-bets.json   all raw bets (settled + unsettled), as
 *                                  production sees them; used for the golden
 *   test/fixtures/2-bets.json      first 2 SETTLED bets
 *   test/fixtures/50-bets.json     first 50 SETTLED bets
 *   test/fixtures/100-bets.json    first 100 SETTLED bets
 *   test/fixtures/500-bets.json    first 500 SETTLED bets
 *
 * The small slices are settled-only so the gate boundaries are exact: N
 * settled bets == threshold N, with no pending/void ambiguity at the cutoffs.
 *
 * Usage:
 *   npx tsx scripts/build-fixtures.ts
 * (reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local)
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Bet } from '../types';

config({ path: resolve(__dirname, '..', '.env.local') });

const USER_ID = 'dcb2436d-23ef-4da6-9802-15db75bb6406';
const UPLOAD_ID = '62474872-9c88-4e23-9e93-50a56fbe077b';
const FIXTURE_DIR = resolve(__dirname, '..', 'test', 'fixtures');

function isSettled(b: Bet): boolean {
  return b.result === 'win' || b.result === 'loss';
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`[fixtures] Fetching bets for upload ${UPLOAD_ID} ...`);
  const bets: Bet[] = [];
  let offset = 0;
  const PAGE = 1000;
  for (;;) {
    const { data: page, error } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', USER_ID)
      .eq('upload_id', UPLOAD_ID)
      .order('placed_at', { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) {
      console.error('Bets fetch failed:', error);
      process.exit(1);
    }
    if (!page || page.length === 0) break;
    bets.push(...(page as Bet[]));
    if (page.length < PAGE) break;
    offset += PAGE;
  }
  console.log(`[fixtures] Fetched ${bets.length} bets.`);
  if (bets.length === 0) {
    console.error('No bets returned. Cannot build fixtures.');
    process.exit(1);
  }

  const settled = bets.filter(isSettled);
  console.log(`[fixtures] ${settled.length} settled of ${bets.length} total.`);

  mkdirSync(FIXTURE_DIR, { recursive: true });

  const write = (name: string, data: Bet[]) => {
    const path = resolve(FIXTURE_DIR, name);
    writeFileSync(path, JSON.stringify(data, null, 2));
    console.log(`[fixtures] wrote ${name} (${data.length} bets)`);
  };

  write('5000-bets.json', bets);
  write('2-bets.json', settled.slice(0, 2));
  write('50-bets.json', settled.slice(0, 50));
  write('100-bets.json', settled.slice(0, 100));
  write('500-bets.json', settled.slice(0, 500));

  console.log('[fixtures] done.');
  process.exit(0);
}

main().catch((err) => {
  console.error('build-fixtures failed:', err);
  process.exit(1);
});

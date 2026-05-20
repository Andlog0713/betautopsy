/**
 * REGEN WORKFLOW (fixtures + golden are gitignored, see .gitignore):
 *   1. npx tsx scripts/build-fixtures.ts
 *   2. npx tsx scripts/capture-golden.ts   (run BEFORE engine changes)
 *   3. npx tsx scripts/verify-engine-floor.ts
 *
 * Golden baseline capture for the global minimum-sample floor work
 * (sprint row 3655964c-daf2-8138).
 *
 * MUST be run against the PRE-CHANGE engine. Captures the deterministic
 * layer only (runAutopsy is excluded because it is LLM-dependent) for the
 * 5000-bet fixture, where every detector sits above all floors. After the
 * floor change, scripts/verify-engine-floor.ts re-derives these and allows
 * only newly added insufficient_data / interpretation / sibling keys; any
 * other delta is a regression.
 *
 * Captured artifacts (deterministic):
 *   - runSnapshot(bets).analysis
 *   - calculateMetrics(bets)
 *   - calculateBetIQ
 *   - calculateDisciplineScore (fixed default ctx)
 *   - calculateEnhancedTilt
 *   - detectContradictions
 *   - detectAndGradeSessions
 *   - metrics.betting_archetype (covers determineArchetype)
 *
 * Usage:
 *   npx tsx scripts/capture-golden.ts
 */

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  calculateMetrics,
  calculateBetIQ,
  calculateDisciplineScore,
  calculateEnhancedTilt,
  detectContradictions,
  detectAndGradeSessions,
  runSnapshot,
  type DisciplineContext,
} from '../lib/autopsy-engine';
import type { Bet } from '../types';

const FIXTURE_DIR = resolve(__dirname, '..', 'test', 'fixtures');
const GOLDEN_DIR = resolve(__dirname, '..', 'test', 'golden');

// Fixed, deterministic discipline context so the golden is reproducible.
export const GOLDEN_DISCIPLINE_CTX: DisciplineContext = {
  hasBankroll: false,
  reportCount: 0,
  streakCount: 0,
  uploadedRecently: false,
  prevSnapshot: null,
};

function loadFixture(name: string): Bet[] {
  return JSON.parse(readFileSync(resolve(FIXTURE_DIR, name), 'utf8')) as Bet[];
}

export async function buildDeterministicSnapshot(bets: Bet[]) {
  const metrics = calculateMetrics(bets);
  const { analysis } = await runSnapshot(bets);
  return {
    snapshotAnalysis: analysis,
    metrics,
    betiq: calculateBetIQ(metrics, bets),
    disciplineScore: calculateDisciplineScore(metrics, GOLDEN_DISCIPLINE_CTX),
    enhancedTilt: calculateEnhancedTilt(metrics, bets),
    contradictions: detectContradictions(metrics, bets),
    sessions: detectAndGradeSessions(bets),
    archetype: metrics.betting_archetype,
  };
}

async function main() {
  const bets = loadFixture('5000-bets.json');
  console.log(`[golden] loaded ${bets.length} bets`);
  const snap = await buildDeterministicSnapshot(bets);
  mkdirSync(GOLDEN_DIR, { recursive: true });
  const path = resolve(GOLDEN_DIR, '5000-bet-baseline.json');
  writeFileSync(path, JSON.stringify(snap, null, 2));
  console.log(`[golden] wrote ${path}`);
  process.exit(0);
}

// Only capture when invoked directly. verify-engine-floor.ts imports
// buildDeterministicSnapshot to re-derive the artifacts post-change without
// overwriting the pre-change golden file.
if (require.main === module) {
  main().catch((err) => {
    console.error('capture-golden failed:', err);
    process.exit(1);
  });
}

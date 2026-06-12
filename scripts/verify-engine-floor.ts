/**
 * REGEN WORKFLOW (fixtures + golden are gitignored, see .gitignore):
 *   1. npx tsx scripts/build-fixtures.ts
 *   2. npx tsx scripts/capture-golden.ts   (run BEFORE engine changes)
 *   3. npx tsx scripts/verify-engine-floor.ts
 *
 * Verification harness for the global minimum-sample floor (sprint row
 * 3655964c-daf2-8138). Mirrors scripts/verify-mega-pr-a.ts PASS/FAIL style.
 * Fully offline: deterministic engine layer + the gate helpers only.
 *
 * Five fixture cases (2 / 50 / 100 / 500 settled bets + 5000 raw golden).
 *
 * Usage:
 *   npx tsx scripts/verify-engine-floor.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  calculateMetrics,
  calculateBetIQ,
  calculateDisciplineScore,
  calculateEnhancedTilt,
  runSnapshot,
} from '../lib/autopsy-engine';
import { BET_COUNT_THRESHOLDS } from '../lib/engine/constants/thresholds';
import { checkSufficiency, gateArray } from '../lib/engine/helpers/sufficiencyGate';
import { SMALL_SAMPLE_BIAS_ALLOWLIST } from '../lib/engine/sufficiency';
import { buildDeterministicSnapshot, GOLDEN_DISCIPLINE_CTX } from './capture-golden';
import type { Bet } from '../types';

const FIXTURE_DIR = resolve(__dirname, '..', 'test', 'fixtures');
const GOLDEN_PATH = resolve(__dirname, '..', 'test', 'golden', '5000-bet-baseline.json');
const TILT_INSUFFICIENT_TRIGGER =
  'Insufficient sample. Trigger detection requires at least 100 settled bets.';

interface Assertion { name: string; pass: boolean; detail: string; }
const assertions: Assertion[] = [];
function assert(name: string, pass: boolean, detail: string) {
  assertions.push({ name, pass, detail });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}\n       ${detail}`);
}

function load(name: string): Bet[] {
  return JSON.parse(readFileSync(resolve(FIXTURE_DIR, name), 'utf8')) as Bet[];
}

// Keys that the floor change is allowed to add anywhere in the tree.
const ALLOWED_NEW_KEYS = new Set([
  'insufficient_data',
  'interpretation',
  'emotion_score_insufficient_data',
  'tilt_score_insufficient_data',
]);
// Top-level golden paths whose VALUE is intentionally changed by this PR
// (snapshot per-category leak gate) and therefore excluded from the strict
// "no other delta" diff; asserted explicitly instead.
const ALLOWED_CHANGED_PATHS = new Set([
  'snapshotAnalysis.strategic_leaks',
  'snapshotAnalysis.summaryCounts.leakPatternsFlagged',
]);

// Returns a list of regression paths: any value delta that is not an
// added allowed key and not under an allowed-changed path.
function diffRegressions(golden: unknown, current: unknown, path: string, out: string[]) {
  if (ALLOWED_CHANGED_PATHS.has(path)) return;
  if (golden === current) return;
  if (golden === null || current === null || typeof golden !== 'object' || typeof current !== 'object') {
    if (golden !== current) out.push(`${path}: ${JSON.stringify(golden)} -> ${JSON.stringify(current)}`);
    return;
  }
  if (Array.isArray(golden) || Array.isArray(current)) {
    const g = golden as unknown[];
    const c = current as unknown[];
    if (g.length !== c.length) { out.push(`${path}.length: ${g.length} -> ${c.length}`); return; }
    for (let i = 0; i < g.length; i++) diffRegressions(g[i], c[i], `${path}[${i}]`, out);
    return;
  }
  const gObj = golden as Record<string, unknown>;
  const cObj = current as Record<string, unknown>;
  // golden keys must still match (no removals / changes)
  for (const k of Object.keys(gObj)) {
    diffRegressions(gObj[k], cObj[k], path ? `${path}.${k}` : k, out);
  }
  // current may only ADD keys from the allowlist
  for (const k of Object.keys(cObj)) {
    if (!(k in gObj) && !ALLOWED_NEW_KEYS.has(k)) {
      out.push(`${path ? `${path}.` : ''}${k}: new unexpected key = ${JSON.stringify(cObj[k])}`);
    }
  }
}

async function main() {
  // ── Gate-helper unit checks ──
  assert('helper: checkSufficiency(2,100) not sufficient', checkSufficiency(2, 100, 'x').sufficient === false,
    JSON.stringify(checkSufficiency(2, 100, 'x')));
  assert('helper: checkSufficiency(100,100) sufficient', checkSufficiency(100, 100, 'x').sufficient === true,
    JSON.stringify(checkSufficiency(100, 100, 'x')));
  assert('helper: gateArray collapses below floor', gateArray([{}], 2, 100).length === 0,
    `len=${gateArray([{}], 2, 100).length}`);

  // ── Case 1: 2 settled bets ──
  {
    const bets = load('2-bets.json');
    const m = calculateMetrics(bets);
    const betiq = calculateBetIQ(m, bets);
    const disc = calculateDisciplineScore(m, GOLDEN_DISCIPLINE_CTX);
    const tilt = calculateEnhancedTilt(m, bets);
    const { analysis } = await runSnapshot(bets);
    const ok =
      m.biases_detected.length === 0 &&
      m.betting_archetype.insufficient_data === true &&
      m.betting_archetype.name === 'Building Sample' &&
      betiq.insufficient_data === true &&
      disc.insufficient_data === true &&
      tilt.insufficient_data === true &&
      tilt.worst_trigger === TILT_INSUFFICIENT_TRIGGER &&
      analysis.strategic_leaks.length === 0 &&
      analysis.behavioral_patterns.length === 0 &&
      analysis.emotion_score_insufficient_data === true &&
      analysis.emotion_percentile === null;
    assert('2-bet: every detector gated (biases/archetype/betiq/discipline/tilt/leaks/patterns/emotion)', ok,
      `biases=${m.biases_detected.length} archetype="${m.betting_archetype.name}"(insuf=${m.betting_archetype.insufficient_data}) betiq.insuf=${betiq.insufficient_data} disc.insuf=${disc.insufficient_data} tilt.insuf=${tilt.insufficient_data} tilt.trigger="${tilt.worst_trigger}" leaks=${analysis.strategic_leaks.length} patterns=${analysis.behavioral_patterns.length} emo.insuf=${analysis.emotion_score_insufficient_data} emo.pct=${analysis.emotion_percentile}`);

    // Session classifier narrow gate: per-session cards preserved, aggregates zeroed.
    const sd = m.sessionDetection;
    const sessionOk =
      !!sd &&
      sd.insufficient_data === true &&
      sd.sessions.length > 0 &&
      sd.heatedSessionCount === 0 &&
      sd.totalSessions < BET_COUNT_THRESHOLDS.heatedSessionsMinSessions;
    assert('2-bet: session classifier narrow-gated (insufficient_data, sessions preserved, heatedCount=0)', sessionOk,
      `insuf=${sd?.insufficient_data} sessions=${sd?.sessions.length} totalSessions=${sd?.totalSessions} heatedCount=${sd?.heatedSessionCount}`);
  }

  // ── Case 2: 50 settled bets ──
  {
    const bets = load('50-bets.json');
    const m = calculateMetrics(bets);
    const betiq = calculateBetIQ(m, bets);
    const disc = calculateDisciplineScore(m, GOLDEN_DISCIPLINE_CTX);
    const tilt = calculateEnhancedTilt(m, bets);
    // SNAPSHOT-LOOSEN (schema_version 4): 50 settled sits in the 30-99
    // limited band — biases are no longer force-emptied; only allowlist
    // detectors may fire, severity capped at medium. The floor contract is
    // now "allowlist-only + capped", not "empty".
    const bandOk = m.biases_detected.every(
      (b) =>
        SMALL_SAMPLE_BIAS_ALLOWLIST.has(b.bias_name) &&
        (b.severity === 'low' || b.severity === 'medium') &&
        (b.sample_size ?? 0) >= 10,
    );
    const ok =
      bandOk &&                                    // 30 <= 50 < biasesDetected(100): allowlist-only, capped
      betiq.insufficient_data === false &&         // 50 >= betIQ(50)
      disc.insufficient_data !== true &&           // 50 >= disciplineScore(50) (key omitted on sufficient path)
      !m.betting_archetype.insufficient_data &&    // 50 >= bettingArchetype(50)
      tilt.insufficient_data === true &&           // 50 < enhancedTilt(100)
      tilt.worst_trigger === TILT_INSUFFICIENT_TRIGGER;
    assert('50-bet: limited-band biases (allowlist-only, severity<=medium), betiq/discipline/archetype OK, enhanced_tilt still insufficient', ok,
      `biases=${m.biases_detected.length} [${m.biases_detected.map(b => `${b.bias_name}:${b.severity}`).join(', ')}] betiq.insuf=${betiq.insufficient_data} disc.insuf=${disc.insufficient_data} archetype.insuf=${!!m.betting_archetype.insufficient_data} tilt.insuf=${tilt.insufficient_data}`);
  }

  // ── Case 3: 100 settled bets ──
  {
    const bets = load('100-bets.json');
    const m = calculateMetrics(bets);
    const betiq = calculateBetIQ(m, bets);
    const disc = calculateDisciplineScore(m, GOLDEN_DISCIPLINE_CTX);
    const tilt = calculateEnhancedTilt(m, bets);
    const ok =
      Array.isArray(m.biases_detected) &&
      checkSufficiency(100, BET_COUNT_THRESHOLDS.biasesDetected, 'x').sufficient === true &&
      betiq.insufficient_data === false &&
      disc.insufficient_data !== true &&
      tilt.insufficient_data !== true;
    assert('100-bet: at floor for biases, betiq/discipline/enhanced_tilt all sufficient', ok,
      `biasesIsArray=${Array.isArray(m.biases_detected)} biases=${m.biases_detected.length} betiq.insuf=${betiq.insufficient_data} disc.insuf=${disc.insufficient_data} tilt.insuf=${tilt.insufficient_data}`);
  }

  // ── Case 4: 500 settled bets (Mega-PR A reachability smoke test) ──
  {
    const bets = load('500-bets.json');
    let threw = false;
    let m: ReturnType<typeof calculateMetrics> | null = null;
    try { m = calculateMetrics(bets); } catch { threw = true; }
    const betiq = m ? calculateBetIQ(m, bets) : null;
    // betiq confidence component hardcodes 15 only on the settled.length >= 500
    // branch (lib/autopsy-engine.ts ~1374): proves a Mega-PR A 500-block ran.
    const ok =
      !threw &&
      m !== null &&
      Array.isArray(m.biases_detected) &&
      betiq?.insufficient_data === false &&
      betiq?.components.confidence === 15;
    assert('500-bet: no throw, biases is array, betiq sufficient, >=500 branch reached (confidence===15)', ok,
      `threw=${threw} biasesIsArray=${Array.isArray(m?.biases_detected)} betiq.insuf=${betiq?.insufficient_data} confidence=${betiq?.components.confidence}`);
  }

  // Case 5: 5000 raw, golden deep-diff (allow only new flag/interpretation
  //    keys + the intended snapshot leak gate) ──
  {
    const bets = load('5000-bets.json');
    const golden = JSON.parse(readFileSync(GOLDEN_PATH, 'utf8'));
    // Normalize current through a JSON round-trip so undefined-valued keys
    // (e.g. evidence_bet_ids, dfs_platform) are dropped symmetrically with the
    // serialized golden, matching production wire shape (report_json column).
    const current = JSON.parse(JSON.stringify(await buildDeterministicSnapshot(bets)));
    const regressions: string[] = [];
    diffRegressions(golden, current, '', regressions);
    assert('5000-bet: zero regression vs golden (only added insufficient_data/interpretation/sibling keys + gated snapshot leaks)',
      regressions.length === 0,
      regressions.length === 0 ? 'no unexpected deltas' : `${regressions.length} regression(s):\n       ${regressions.slice(0, 20).join('\n       ')}`);

    // Explicitly assert the intended snapshot leak change: every surviving
    // snapshot leak meets the per-category floor.
    const leaks = current.snapshotAnalysis.strategic_leaks as { sample_size: number }[];
    const allMeetFloor = leaks.every((l) => l.sample_size >= BET_COUNT_THRESHOLDS.strategicLeaksPerCategory);
    assert('5000-bet: every snapshot leak meets per-category floor (>=100)', allMeetFloor,
      `leaks=${leaks.length}, min sample_size=${leaks.length ? Math.min(...leaks.map((l) => l.sample_size)) : 'n/a'}`);
  }

  const failed = assertions.filter((a) => !a.pass);
  console.log(`\n===== RESULT: ${assertions.length - failed.length} / ${assertions.length} assertions passed =====`);
  if (failed.length > 0) {
    for (const a of failed) console.log(`  FAIL ${a.name}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('verify-engine-floor failed:', err);
  process.exit(1);
});

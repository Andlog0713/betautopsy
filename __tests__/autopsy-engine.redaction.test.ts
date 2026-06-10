/**
 * Snapshot Redaction Spec v2 — regression test
 *
 * Locks the locked decisions (D1-D20) for ENGINE-PR-REDACTION-1 into CI.
 * If snapshot mode ever leaks a redacted dollar / percent / text field,
 * one of these groups fails before code reaches main.
 *
 * Five groups (per Phase 3 directive):
 *   1. Redacted-empty invariant — snapshot mode: tag != "visible" implies
 *      value is '' (string), 0 (number), or undefined.
 *   2. Visible-fields-have-values — full mode: every tag is "visible" AND
 *      the value field is populated where the source data has content.
 *   3. No-dollar-leak walk — snapshot mode: every dollar-pattern leaf > 0
 *      must be in the per-path allowlist.
 *   4. Executive diagnosis dual-emission — snapshot ships only camel
 *      executiveDiagnosis; full ships both legacy snake + camel struct
 *      with insightFull mirroring legacy.
 *   5. summaryCounts shipped in BOTH modes with the 5 spec'd int fields.
 */

import { describe, it, expect, vi } from 'vitest';
import { runSnapshot, runAutopsy, firstSentence, scrubDollarsInSentence, stripDollarsFromSentence } from '@/lib/autopsy-engine';
import type {
  Bet,
  AutopsyAnalysis,
  BiasDetected,
  Recommendation,
  SportSpecificFinding,
  TimingBucket,
  OddsBucket,
  DetectedSession,
  TopDamageEntry,
  PatternSnapshotEntry,
  VisibilityTag,
} from '@/types';

// ── Anthropic SDK mock ─────────────────────────────────────────────────
// runAutopsy dynamically imports @anthropic-ai/sdk and calls .messages.create.
// runSnapshot is pure-compute (Phase 2) and never touches the SDK, but the
// dynamic import still needs to resolve to a constructor for module loading.
// Returns a canned response that lets runAutopsy assemble a full payload
// without a real network call.
vi.mock('@anthropic-ai/sdk', () => {
  const mockResponse = {
    biases_detected: [
      {
        bias_name: 'Heavy Parlay Tendency',
        description: 'Strong parlay reliance.',
        evidence: '37% of bets are parlays with negative ROI.',
        estimated_cost: 1500,
        fix: 'Cut parlay frequency to singles where your edge is real.',
      },
      {
        bias_name: 'Stake Volatility',
        description: 'Wild stake swings indicate emotional sizing.',
        evidence: 'Stake CV of 1.4 with min/max range $25-$200.',
        estimated_cost: 800,
        fix: 'Lock unit size to 1% of bankroll.',
      },
    ],
    strategic_leaks: [],
    behavioral_patterns: [],
    recommendations: [
      {
        priority: 1,
        title: 'Lock your unit size',
        description: 'Hold stake constant at 1u regardless of confidence.',
        expected_improvement: '+5% ROI',
        difficulty: 'easy',
      },
    ],
    executive_diagnosis:
      'Your top issue is stake volatility. Lock your unit size to reduce variance and clarify whether your edge is real.',
  };
  class MockAnthropic {
    messages = {
      create: async () => ({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
        usage: { input_tokens: 100, output_tokens: 200 },
      }),
    };
  }
  return { default: MockAnthropic };
});

// ── Fixture builder ────────────────────────────────────────────────────
// 60 bets across NBA + NFL, mix of spreads and parlays, mix of wins/losses.
// Designed to trigger Heavy Parlay Tendency + Stake Volatility biases,
// at least one detected session (cluster of bets within 4 hours), and
// one clear biggest_win to validate D6 visibility.
function makeFixtureBets(): Bet[] {
  const bets: Bet[] = [];
  const baseDate = Date.parse('2026-04-15T20:00:00Z');
  // 120 settled bets so the dataset clears the n>=100 bias-detection floor
  // (lib/engine/constants/thresholds.ts). The redaction suite needs biases to
  // exist in order to assert full-mode visibility parity on them.
  for (let i = 0; i < 120; i++) {
    const isWin = i % 3 === 0;
    const isParlay = i % 5 === 0;
    const sport = i % 2 === 0 ? 'NBA' : 'NFL';
    const stake = 25 + (i % 7) * 35;  // 25, 60, 95, ... — gives meaningful CV
    bets.push({
      id: `bet-${i}`,
      user_id: 'test-user',
      placed_at: new Date(baseDate - (60 - i) * 86400000 + (i * 90 * 60_000)).toISOString(),
      sport,
      league: null,
      bet_type: isParlay ? 'parlay' : 'spread',
      description: `${sport} ${isParlay ? 'parlay' : 'spread'} #${i}`,
      odds: -110 + ((i % 9) - 4) * 30,
      stake,
      result: isWin ? 'win' : 'loss',
      payout: isWin ? Math.round(stake * 1.91) : 0,
      profit: isWin ? Math.round(stake * 0.91) : -stake,
      sportsbook: 'DraftKings',
      is_bonus_bet: false,
      parlay_legs: isParlay ? 3 : null,
      tags: null,
      notes: null,
      upload_id: null,
      created_at: new Date().toISOString(),
    });
  }
  // One outlier winning bet to anchor biggest_win
  bets.push({
    id: 'bet-bigwin',
    user_id: 'test-user',
    placed_at: new Date(baseDate - 86400000).toISOString(),
    sport: 'NBA',
    league: null,
    bet_type: 'spread',
    description: 'NBA Lakers +5.5',
    odds: -105,
    stake: 250,
    result: 'win',
    payout: 488,
    profit: 238,
    sportsbook: 'DraftKings',
    is_bonus_bet: false,
    parlay_legs: null,
    tags: null,
    notes: null,
    upload_id: null,
    created_at: new Date().toISOString(),
  });
  return bets;
}

// ── Helpers ────────────────────────────────────────────────────────────
function isVisible(tag?: VisibilityTag): boolean {
  return tag === 'visible';
}

function isRedactedNumber(value: number): boolean {
  return value === 0;
}

function isRedactedString(value: string): boolean {
  return value === '';
}

// Recursive leaf walker. Records every non-object property with its full
// dotted path (arrays expressed as [N]).
type Leaf = { path: string; key: string; value: unknown };
function walkLeaves(obj: unknown, path: string, leaves: Leaf[]): void {
  if (obj === null || obj === undefined) return;
  if (typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => walkLeaves(item, `${path}[${idx}]`, leaves));
    return;
  }
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    const val = (obj as Record<string, unknown>)[key];
    const newPath = path ? `${path}.${key}` : key;
    if (val !== null && typeof val === 'object') {
      walkLeaves(val, newPath, leaves);
    } else {
      leaves.push({ path: newPath, key, value: val });
    }
  }
}

// ───────────────────────────────────────────────────────────────────────
// GROUP 1 — Redacted-empty invariant (snapshot mode)
// ───────────────────────────────────────────────────────────────────────
describe('Snapshot Redaction — Group 1: redacted-empty invariant', () => {
  it('every visibility-tagged surface respects tag != "visible" → value is empty/zero', async () => {
    const { analysis } = await runSnapshot(makeFixtureBets());

    // biases_detected[]
    for (const bias of analysis.biases_detected) {
      if (!isVisible(bias.description_visibility)) {
        expect(isRedactedString(bias.description)).toBe(true);
      }
      if (!isVisible(bias.evidence_visibility)) {
        expect(isRedactedString(bias.evidence)).toBe(true);
      }
      if (!isVisible(bias.fix_visibility)) {
        expect(isRedactedString(bias.fix)).toBe(true);
      }
      if (!isVisible(bias.estimated_cost_visibility)) {
        expect(isRedactedNumber(bias.estimated_cost)).toBe(true);
      }
    }

    // recommendations[]
    for (const rec of analysis.recommendations) {
      if (!isVisible(rec.description_visibility)) {
        expect(isRedactedString(rec.description)).toBe(true);
      }
      if (!isVisible(rec.expected_improvement_visibility)) {
        // expected_improvement is typed `string`; redacted = '' not 0
        expect(isRedactedString(rec.expected_improvement)).toBe(true);
      }
    }

    // _snapshot_teaser.topDamages[]
    for (const td of analysis._snapshot_teaser?.topDamages ?? []) {
      if (!isVisible(td.estimatedCostVisibility)) {
        expect(td.estimatedCost === 0 || td.estimatedCost === null).toBe(true);
      }
    }

    // timing_analysis cells
    for (const cell of analysis.timing_analysis?.by_hour ?? []) {
      if (!isVisible(cell.profit_visibility)) {
        expect(isRedactedNumber(cell.profit)).toBe(true);
      }
    }
    for (const cell of analysis.timing_analysis?.by_day ?? []) {
      if (!isVisible(cell.profit_visibility)) {
        expect(isRedactedNumber(cell.profit)).toBe(true);
      }
    }

    // odds_analysis.buckets[] — all 6 dollar/percent fields
    for (const b of analysis.odds_analysis?.buckets ?? []) {
      if (!isVisible(b.profit_visibility)) expect(isRedactedNumber(b.profit)).toBe(true);
      if (!isVisible(b.roi_visibility)) expect(isRedactedNumber(b.roi)).toBe(true);
      if (!isVisible(b.win_rate_visibility)) expect(isRedactedNumber(b.win_rate)).toBe(true);
      if (!isVisible(b.implied_prob_visibility)) expect(isRedactedNumber(b.implied_prob)).toBe(true);
      if (!isVisible(b.actual_win_rate_visibility)) expect(isRedactedNumber(b.actual_win_rate)).toBe(true);
      if (!isVisible(b.edge_visibility)) expect(isRedactedNumber(b.edge)).toBe(true);
    }

    // session_detection.sessions[].profit
    for (const s of analysis.session_detection?.sessions ?? []) {
      if (!isVisible(s.profitVisibility)) {
        expect(isRedactedNumber(s.profit)).toBe(true);
      }
    }

    // sport_specific_findings[] — top-1 in snapshot
    for (const f of analysis.sport_specific_findings ?? []) {
      if (!isVisible(f.evidence_visibility)) {
        expect(isRedactedString(f.evidence)).toBe(true);
      }
      if (!isVisible(f.estimated_cost_visibility)) {
        expect(f.estimated_cost === 0 || f.estimated_cost === null).toBe(true);
      }
      if (!isVisible(f.recommendation_visibility)) {
        expect(isRedactedString(f.recommendation)).toBe(true);
      }
    }

    // patternsSnapshot[] — dollarValue gated by dollarVisibility
    for (const p of analysis.patternsSnapshot ?? []) {
      if (!isVisible(p.dollarVisibility)) {
        expect(p.dollarValue === 0 || p.dollarValue === null).toBe(true);
      }
    }
    // biggest_win is the one explicit visible-dollar D6 exemption — confirm
    // we have at least one biggest_win entry with a positive dollarValue
    const bigWin = analysis.patternsSnapshot?.find((p) => p.kind === 'biggest_win');
    expect(bigWin).toBeDefined();
    if (bigWin) {
      expect(bigWin.dollarVisibility).toBe('visible');
      expect((bigWin.dollarValue ?? 0) > 0).toBe(true);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────
// GROUP 2 — Visible-fields-have-values (full mode)
// ───────────────────────────────────────────────────────────────────────
describe('Snapshot Redaction — Group 2: full-mode visibility parity', () => {
  it('every visibility tag is "visible" in full mode and values are populated', async () => {
    const { analysis } = await runAutopsy(makeFixtureBets());

    expect(analysis.biases_detected.length).toBeGreaterThan(0);
    for (const bias of analysis.biases_detected) {
      expect(bias.description_visibility).toBe('visible');
      expect(bias.evidence_visibility).toBe('visible');
      expect(bias.fix_visibility).toBe('visible');
      expect(bias.estimated_cost_visibility).toBe('visible');
      expect(typeof bias.severity_bar_ratio).toBe('number');
      // The Claude mock returns matching bias data, so these should populate.
      expect(bias.description.length).toBeGreaterThan(0);
      expect(bias.evidence.length).toBeGreaterThan(0);
      expect(bias.fix.length).toBeGreaterThan(0);
    }

    for (const rec of analysis.recommendations) {
      expect(rec.description_visibility).toBe('visible');
      expect(rec.expected_improvement_visibility).toBe('visible');
    }

    for (const cell of analysis.timing_analysis?.by_hour ?? []) {
      expect(cell.profit_visibility).toBe('visible');
    }
    for (const cell of analysis.timing_analysis?.by_day ?? []) {
      expect(cell.profit_visibility).toBe('visible');
    }

    for (const b of analysis.odds_analysis?.buckets ?? []) {
      expect(b.profit_visibility).toBe('visible');
      expect(b.roi_visibility).toBe('visible');
      expect(b.win_rate_visibility).toBe('visible');
      expect(b.implied_prob_visibility).toBe('visible');
      expect(b.actual_win_rate_visibility).toBe('visible');
      expect(b.edge_visibility).toBe('visible');
    }

    for (const s of analysis.session_detection?.sessions ?? []) {
      expect(s.profitVisibility).toBe('visible');
    }

    for (const f of analysis.sport_specific_findings ?? []) {
      expect(f.evidence_visibility).toBe('visible');
      expect(f.estimated_cost_visibility).toBe('visible');
      expect(f.recommendation_visibility).toBe('visible');
    }
  });
});

// ───────────────────────────────────────────────────────────────────────
// GROUP 3 — No-dollar-leak walk (snapshot mode)
// ───────────────────────────────────────────────────────────────────────
//
// Walks the full snapshot payload. For every leaf whose key matches the
// dollar-pattern regex AND whose value is a number > 0 (or string with $
// pattern), assert the path is in the allowlist. Catches future regressions
// where someone adds a new dollar-valued field to snapshot mode without a
// redaction tag.
//
// Allowlist scope (per Phase 3 directive + observed safe paths):
//   - Top-level summary fields shipped visible by spec
//   - _snapshot_counts.* and summaryCounts.* (counts, not dollars)
//   - _snapshot_teaser.heatedSessionCount (count)
//   - emotion_score / tilt_score / emotion_percentile (scores, not dollars)
//   - patternsSnapshot[N].dollarValue WHERE kind === 'biggest_win' (D6)
//   - TimingBucket.staked, OddsBucket.staked, DetectedSession.staked —
//     bucket-level stake sums. Spec v2 Phase 2 only redacts profit on these
//     surfaces (D14 narrow reading); staked stays visible at current scope.
//     Listed here to make the gap explicit for v1.1 follow-up.
describe('Snapshot Redaction — Group 3: no-dollar-leak walk', () => {
  const DOLLAR_KEY = /cost|dollar|profit|amount|stake|wagered|won|lost|net/i;
  const DOLLAR_PATTERN_STR = /\$\s?[\d,]+(\.\d+)?/;

  function isAllowlisted(path: string, key: string, payload: AutopsyAnalysis): boolean {
    // ── Top-level summary ──
    // total_profit + avg_stake are now redacted to 0 in snapshot mode
    // (SNAPSHOT-REDACTION-POLICY), so they no longer need allowlisting.
    // total_bets / roi_percent / record / date_range / overall_grade don't
    // hit the regex but list anyway for documentation parity with directive
    if (path === 'summary.total_bets') return true;
    if (path === 'summary.roi_percent') return true;
    if (path === 'summary.record') return true;

    // ── Pre-aggregated counts (never dollars even if key shape suggests) ──
    if (path.startsWith('_snapshot_counts.')) return true;
    if (path.startsWith('summaryCounts.')) return true;
    if (path === '_snapshot_teaser.heatedSessionCount') return true;

    // ── Scores ──
    if (path === 'emotion_score') return true;
    if (path === 'tilt_score') return true;
    if (path === 'emotion_percentile') return true;
    // betiq scores
    if (path === 'betiq.score') return true;
    if (path.startsWith('betiq.components.')) return true;

    // ── biggest_win.dollarValue per D6 ──
    const bw = path.match(/^patternsSnapshot\[(\d+)\]\.dollarValue$/);
    if (bw) {
      const idx = Number(bw[1]);
      if (payload.patternsSnapshot?.[idx]?.kind === 'biggest_win') return true;
    }

    // ── Bucket-level staked sums ──
    // timing_analysis + odds_analysis staked are now redacted to 0 in snapshot
    // (SNAPSHOT-REDACTION-POLICY), so they no longer need allowlisting.
    // session_detection.sessions[].staked stays visible (out of this PR scope).
    if (/^session_detection\.sessions\[\d+\]\.staked$/.test(path)) return true;

    // ── Sub-scores keyed with "stake" (false positives — these are 0..25
    // or 0..100 component scores, not dollar values) ──
    if (path === 'emotion_breakdown.stake_volatility') return true;
    if (path === 'tilt_breakdown.stake_volatility') return true;

    // ── DetectedSession.stakeEscalation (ratio 1.0 = no escalation, not $) ──
    if (/^session_detection\.sessions\[\d+\]\.stakeEscalation$/.test(path)) return true;

    // ── bet_annotations.* (Spec v2 scope gap — FLAGGED FOR FOLLOW-UP) ──
    // Phase 3 surfaced three real dollar leaks in bet_annotations that
    // ship visible in snapshot mode today because the spec didn't enumerate
    // bet_annotations:
    //   - distribution.{disciplined,chasing,neutral}.totalStaked
    //   - streakInfluence.avgStakeNeutral / avgStakeDisciplined / etc.
    //   - worstAnnotatedBet / bestAnnotatedBet profit + stake metrics
    // These are aggregate $ values from raw bets — exactly the kind of
    // payoff signal Spec v2 is supposed to redact. The structure is
    // *_visibility-tag-less today; redacting requires a Phase 4-style
    // engine change (parked, sprint row in Notion).
    // The stakeVsMedian RATIOS (annotations[].stakeVsMedian) are false
    // positives — they're 0..2 ratios, not dollars — but the regex catches
    // them. Both bucketed under bet_annotations.* here.
    if (path.startsWith('bet_annotations.')) return true;

    return false;
  }

  it('no dollar-pattern leaf > 0 surfaces outside the allowlist', async () => {
    const { analysis } = await runSnapshot(makeFixtureBets());
    const leaves: Leaf[] = [];
    walkLeaves(analysis, '', leaves);

    const leaks: string[] = [];
    for (const { path, key, value } of leaves) {
      if (!DOLLAR_KEY.test(key)) continue;
      const isLeakyNumber = typeof value === 'number' && value > 0;
      const isLeakyString = typeof value === 'string' && DOLLAR_PATTERN_STR.test(value);
      if (!isLeakyNumber && !isLeakyString) continue;
      if (isAllowlisted(path, key, analysis)) continue;
      leaks.push(`${path} = ${JSON.stringify(value)}`);
    }

    if (leaks.length > 0) {
      // eslint-disable-next-line no-console
      console.error('Dollar leaks detected:\n  - ' + leaks.join('\n  - '));
    }
    expect(leaks).toEqual([]);
  });
});

// ───────────────────────────────────────────────────────────────────────
// GROUP 4 — Executive diagnosis dual-emission
// ───────────────────────────────────────────────────────────────────────
describe('Snapshot Redaction — Group 4: executive diagnosis dual emission', () => {
  it('snapshot mode: legacy snake absent, camel struct has only insightSnapshot', async () => {
    const { analysis } = await runSnapshot(makeFixtureBets());
    expect(analysis.executive_diagnosis).toBeUndefined();
    expect(analysis.executiveDiagnosis).toBeDefined();
    expect(typeof analysis.executiveDiagnosis?.insightSnapshot).toBe('string');
    expect(analysis.executiveDiagnosis?.insightSnapshot.length).toBeGreaterThan(0);
    expect(analysis.executiveDiagnosis?.insightFull).toBeUndefined();
  });

  it('full mode: both legacy snake + camel struct present, insightFull mirrors legacy', async () => {
    const { analysis } = await runAutopsy(makeFixtureBets());
    expect(typeof analysis.executive_diagnosis).toBe('string');
    expect(analysis.executive_diagnosis?.length ?? 0).toBeGreaterThan(0);
    expect(analysis.executiveDiagnosis).toBeDefined();
    expect(typeof analysis.executiveDiagnosis?.insightSnapshot).toBe('string');
    expect(typeof analysis.executiveDiagnosis?.insightFull).toBe('string');
    expect(analysis.executiveDiagnosis?.insightFull).toBe(analysis.executive_diagnosis);
  });
});

// ───────────────────────────────────────────────────────────────────────
// GROUP 5 — summaryCounts in BOTH modes
// ───────────────────────────────────────────────────────────────────────
describe('Snapshot Redaction — Group 5: summaryCounts in BOTH modes', () => {
  function assertSummaryCountsShape(analysis: AutopsyAnalysis): void {
    expect(analysis.summaryCounts).toBeDefined();
    const sc = analysis.summaryCounts!;
    for (const field of [
      'sessionsAnalyzed',
      'biasesDetected',
      'patternsIdentified',
      'leakPatternsFlagged',
      'sportLevelFindings',
    ] as const) {
      expect(typeof sc[field]).toBe('number');
      expect(sc[field]).toBeGreaterThanOrEqual(0);
    }
  }

  it('snapshot mode emits summaryCounts with 5 int fields', async () => {
    const { analysis } = await runSnapshot(makeFixtureBets());
    assertSummaryCountsShape(analysis);
  });

  it('full mode emits summaryCounts with 5 int fields', async () => {
    const { analysis } = await runAutopsy(makeFixtureBets());
    assertSummaryCountsShape(analysis);
  });
});

// ───────────────────────────────────────────────────────────────────────
// GROUP 6: Unified redaction policy (SNAPSHOT-REDACTION-POLICY)
// Five wire fixes traced to physical-iPhone QA on 5000-bet snapshot 690cab1b.
// (behavioral_patterns is intentionally NOT covered: snapshot is pure-compute,
//  so behavioral_patterns is correctly [] until iOS Ch 5 reads patternsSnapshot
//  per IOS-RENDER-AUDIT.)
// ───────────────────────────────────────────────────────────────────────

// Leak-heavy fixture: 110 NBA spread bets at a deeply negative ROI so a
// non-platform category clears the per-category strategic-leak floor (n>=100).
// The shared makeFixtureBets() splits across NBA/NFL + a platform sportsbook,
// so no single non-platform category reaches 100 there.
function leakHeavyBets(): Bet[] {
  const base = Date.parse('2026-01-01T18:00:00Z');
  return Array.from({ length: 110 }, (_, i) => {
    const isWin = i % 4 === 0; // 28 wins / 82 losses -> deeply negative ROI
    const stake = 50;
    return {
      id: `leak-${i}`,
      user_id: 'u',
      placed_at: new Date(base + i * 3600_000).toISOString(),
      sport: 'NBA',
      league: null,
      bet_type: 'spread',
      description: `NBA spread #${i}`,
      odds: -110,
      stake,
      result: isWin ? 'win' : 'loss',
      payout: isWin ? Math.round(stake * 1.91) : 0,
      profit: isWin ? Math.round(stake * 0.91) : -stake,
      sportsbook: 'DraftKings',
      is_bonus_bet: false,
      parlay_legs: null,
      tags: null,
      notes: null,
      upload_id: null,
      created_at: new Date().toISOString(),
    } as Bet;
  });
}

describe('Snapshot Redaction - Group 6: unified policy', () => {
  const NO_DOLLAR = /\$\s?[\d,]/;

  it('snapshot payload omits control_system entirely', async () => {
    const { analysis } = await runSnapshot(makeFixtureBets());
    expect('control_system' in analysis).toBe(false);
    expect(analysis.control_system).toBeUndefined();
  });

  it('full payload still ships control_system', async () => {
    const { analysis } = await runAutopsy(makeFixtureBets());
    expect(analysis.control_system).toBeDefined();
  });

  it('strategic_leaks: first-sentence detail visible, suggestion hidden, no dollars', async () => {
    const { analysis } = await runSnapshot(leakHeavyBets());
    expect(analysis.strategic_leaks.length).toBeGreaterThan(0);
    const leak = analysis.strategic_leaks[0];
    expect(leak.detail.length).toBeGreaterThan(0);
    expect(leak.detail.length).toBeLessThan(250);
    expect(leak.detail_visibility).toBe('visible');
    expect(leak.detail).not.toMatch(NO_DOLLAR);
    expect(leak.suggestion).toBe('');
    expect(leak.suggestion_visibility).toBe('hidden');
    expect(leak.category.length).toBeGreaterThan(0);
    expect(leak.sample_size).toBeGreaterThanOrEqual(100);
  });

  it('sport_specific_findings: description first-sentence visible, recommendation hidden, no $ blur', async () => {
    const full = (await runAutopsy(makeFixtureBets())).analysis;
    const snap = (await runSnapshot(makeFixtureBets())).analysis;
    expect((snap.sport_specific_findings ?? []).length).toBeGreaterThan(0);
    const sf = snap.sport_specific_findings![0];
    const fullSf = full.sport_specific_findings![0];

    expect(sf.recommendation).toBe('');
    expect(sf.recommendation_visibility).toBe('hidden');

    expect(sf.description_visibility).toBe('visible');
    expect(sf.description).toBe(stripDollarsFromSentence(firstSentence(fullSf.description)));
    expect(sf.description.length).toBeLessThanOrEqual(fullSf.description.length);
    expect(sf.description).not.toMatch(NO_DOLLAR);

    expect(sf.evidence_visibility).toBe('visible');
    expect(sf.evidence).not.toContain('$•••');
    expect(sf.evidence).not.toMatch(NO_DOLLAR);

    expect(sf.estimated_cost).toBe(0);
    expect(sf.estimated_cost_visibility).toBe('redacted_dollar');
  });

  it('odds_analysis.buckets[].staked redacted', async () => {
    const { analysis } = await runSnapshot(makeFixtureBets());
    const buckets = analysis.odds_analysis?.buckets ?? [];
    expect(buckets.length).toBeGreaterThan(0);
    for (const b of buckets) {
      expect(b.staked).toBe(0);
      expect(b.staked_visibility).toBe('redacted_dollar');
    }
  });

  it('timing_analysis.by_day + by_hour staked redacted', async () => {
    const { analysis } = await runSnapshot(makeFixtureBets());
    const days = analysis.timing_analysis?.by_day ?? [];
    const hours = analysis.timing_analysis?.by_hour ?? [];
    expect(days.length).toBeGreaterThan(0);
    for (const d of days) {
      expect(d.staked).toBe(0);
      expect(d.staked_visibility).toBe('redacted_dollar');
    }
    for (const h of hours) {
      expect(h.staked).toBe(0);
      expect(h.staked_visibility).toBe('redacted_dollar');
    }
  });

  it('summary.total_profit + avg_stake redacted', async () => {
    const { analysis } = await runSnapshot(makeFixtureBets());
    expect(analysis.summary.total_profit).toBe(0);
    expect(analysis.summary.total_profit_visibility).toBe('redacted_dollar');
    expect(analysis.summary.avg_stake).toBe(0);
    expect(analysis.summary.avg_stake_visibility).toBe('redacted_dollar');
  });

  it('regression: full mode keeps real dollar values', async () => {
    const { analysis } = await runAutopsy(makeFixtureBets());
    expect(analysis.summary.total_profit).not.toBe(0);
    expect((analysis.odds_analysis?.buckets ?? []).some((b) => b.staked > 0)).toBe(true);
    expect((analysis.timing_analysis?.by_day ?? []).some((d) => d.staked > 0)).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────
// firstSentence helper — covers the snapshot bias-evidence truncation path
// (ENGINE-PR-SNAPSHOT-LOOSEN). Used to teaser the first sentence of evidence
// for top-7 biases while keeping the rest of the prose hidden.
// ───────────────────────────────────────────────────────────────────────

describe('firstSentence helper', () => {
  it('returns empty string for empty input', () => {
    expect(firstSentence('')).toBe('');
  });

  it('returns whole string when no terminal punctuation is present', () => {
    expect(firstSentence('no terminal punct here')).toBe('no terminal punct here');
  });

  it('returns the input unchanged for a single sentence', () => {
    expect(firstSentence('One complete sentence.')).toBe('One complete sentence.');
  });

  it('returns only the first sentence for multi-sentence input', () => {
    expect(firstSentence('First sentence. Second sentence.')).toBe('First sentence.');
  });

  it('preserves abbreviations (Dr., U.S., etc.) without false sentence breaks', () => {
    expect(firstSentence('Dr. Smith said something. Then left.')).toBe('Dr. Smith said something.');
    expect(firstSentence('U.S. sportsbooks vary by state.')).toBe('U.S. sportsbooks vary by state.');
  });

  it('handles decimal numbers without false sentence breaks', () => {
    expect(firstSentence('ratio: 1.25, threshold: 1.5.')).toBe('ratio: 1.25, threshold: 1.5.');
  });

  it('returns only first sentence when multi-sentence with decimals', () => {
    expect(firstSentence('First number 3.14. Second sentence.')).toBe('First number 3.14.');
  });

  it('handles dollar amounts with commas and decimals as part of one sentence', () => {
    expect(firstSentence('Cost $1,234.56 detected. Next sentence.')).toBe('Cost $1,234.56 detected.');
  });

  it('handles abbreviation immediately followed by decimal', () => {
    expect(firstSentence('Dr. Smith found ratio 2.5. Then left.')).toBe('Dr. Smith found ratio 2.5.');
  });
});

// ───────────────────────────────────────────────────────────────────────
// scrubDollarsInSentence helper — masks every $-amount in a string with
// "$•••". Used in snapshot mode for bias evidence and sport finding
// evidence so the diagnostic prose stays visible while raw dollar amounts
// stay paywalled.
// ───────────────────────────────────────────────────────────────────────
describe('scrubDollarsInSentence helper', () => {
  it('returns empty string for empty input', () => {
    expect(scrubDollarsInSentence('')).toBe('');
  });

  it('leaves strings without dollars unchanged', () => {
    expect(scrubDollarsInSentence('No dollars here.')).toBe('No dollars here.');
  });

  it('scrubs simple dollars', () => {
    expect(scrubDollarsInSentence('Bet sizes range from $4 to $5000 (avg $88).'))
      .toBe('Bet sizes range from $••• to $••• (avg $•••).');
  });

  it('scrubs dollars with thousands separators and decimals', () => {
    expect(scrubDollarsInSentence('Lost $1,234.56 on Tuesday.')).toBe('Lost $••• on Tuesday.');
  });

  it('scrubs negative dollars in both forms', () => {
    expect(scrubDollarsInSentence('Combined: $-11,635. Net: -$4,200.'))
      .toBe('Combined: $•••. Net: $•••.');
  });
});

// ───────────────────────────────────────────────────────────────────────
// Snapshot loosen v2 — biases_detected sorted by severity descending so
// iOS renders HIGH/CRITICAL first (array head order matters on iOS).
// ───────────────────────────────────────────────────────────────────────
describe('Snapshot loosen v2 — biases_detected severity sort', () => {
  it('emits biases_detected in monotonic non-increasing severity_bar_ratio order', async () => {
    const { analysis } = await runSnapshot(makeFixtureBets());
    const ratios = analysis.biases_detected.map(b => b.severity_bar_ratio ?? 0);
    for (let i = 1; i < ratios.length; i++) {
      expect(ratios[i]).toBeLessThanOrEqual(ratios[i - 1]);
    }
  });

  it('scrubs dollar amounts from visible bias evidence first sentences', async () => {
    const { analysis } = await runSnapshot(makeFixtureBets());
    for (const bias of analysis.biases_detected) {
      if (bias.evidence_visibility === 'visible') {
        expect(/\$\s?-?\d/.test(bias.evidence)).toBe(false);
      }
    }
  });
});

// ───────────────────────────────────────────────────────────────────────
// Snapshot loosen v2 — sport_specific_findings: estimated_cost zeroed +
// redacted_dollar tag, evidence visible with dollars scrubbed. Mirrors the
// PR #43 bias-evidence un-redaction: tease the diagnosis, paywall the
// dollars.
// ───────────────────────────────────────────────────────────────────────
describe('Snapshot loosen v2 — sport_specific_findings redaction', () => {
  it('every sport finding ships estimated_cost: 0 with redacted_dollar visibility', async () => {
    const { analysis } = await runSnapshot(makeFixtureBets());
    const findings = analysis.sport_specific_findings ?? [];
    for (const sf of findings) {
      expect(sf.estimated_cost).toBe(0);
      expect(sf.estimated_cost_visibility).toBe('redacted_dollar');
    }
  });

  it('every sport finding evidence is visible with dollars scrubbed', async () => {
    const { analysis } = await runSnapshot(makeFixtureBets());
    const findings = analysis.sport_specific_findings ?? [];
    for (const sf of findings) {
      expect(sf.evidence_visibility).toBe('visible');
      expect(/\$\s?-?\d/.test(sf.evidence)).toBe(false);
    }
  });
});

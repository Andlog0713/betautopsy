/**
 * Drift guard for lib/demo-data.ts's two demo fixtures (PR #117 + the DFS
 * follow-up).
 *
 * DEMO_ANALYSIS / DEMO_DFS_ANALYSIS are frozen snapshots of one real
 * runAutopsy(bets, null) call each - correct at freeze time, but nothing
 * else ties them to DEMO_BETS / DEMO_DFS_BETS. The engine changed roughly
 * fifteen times in the session that produced the sportsbook fixture; the
 * next change to any computed field silently desyncs a fixture from the
 * code that generated it - the same "two populations wearing one label"
 * bug this rebuild replaced, just delayed and harder to spot because the
 * numbers still look plausible.
 *
 * Claude's prose (descriptions, evidence text, executive_diagnosis,
 * recommendations' behavioral copy) can't be re-verified without a real API
 * call and isn't attempted here. Every DETERMINISTIC field - anything that
 * comes from calculateMetrics()/detectSportSpecificPatterns() rather than
 * the LLM - can be, by recomputing it fresh from the bets and comparing.
 * That's what this file does. A failure here means the corresponding
 * fixture needs to be regenerated (see PR #117's description for the
 * generation approach), not that the failing assertion should be loosened.
 */
import { describe, it, expect } from 'vitest';
import { calculateMetrics, detectSportSpecificPatterns } from '@/lib/autopsy-engine';
import { DEMO_BETS, DEMO_ANALYSIS, DEMO_DFS_BETS, DEMO_DFS_ANALYSIS } from '@/lib/demo-data';
import type { AutopsyAnalysis, Bet } from '@/types';

// Every wire-shape wrapper these fixtures pass through (withFullModeTimingTags,
// withFullModeSessionTags, withFullModeFindingTags, withFullModeBiasTags) is
// purely additive - it spreads the deterministic value and adds
// `*_visibility`/`*Visibility` tag fields, never touches the underlying
// numbers. Stripping those tags before comparing makes this test robust to
// new tags being added later without becoming a false positive on drift.
function stripVisibilityTags(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripVisibilityTags);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (/[Vv]isibility$/.test(key)) continue;
      out[key] = stripVisibilityTags(v);
    }
    return out;
  }
  return value;
}

function runDriftGuard(label: string, bets: Bet[], analysis: AutopsyAnalysis, opts: { isDFS: boolean }) {
  const metrics = calculateMetrics(bets, null);

  describe(`demo fixture drift guard — ${label}`, () => {
    it('summary matches (overall_grade is intentionally nulled on the wire, not a drift signal; wire summary is a narrower field set than metrics.summary)', () => {
      const { overall_grade: _ignored, ...wireSummary } = analysis.summary;
      expect(metrics.summary).toMatchObject(wireSummary);
    });

    it('timing_analysis matches exactly, visibility tags aside', () => {
      expect(stripVisibilityTags(analysis.timing_analysis)).toEqual(stripVisibilityTags(metrics.timing));
    });

    it('session_detection matches exactly, visibility tags aside', () => {
      expect(stripVisibilityTags(analysis.session_detection)).toEqual(stripVisibilityTags(metrics.sessionDetection));
    });

    it('sport_specific_findings matches exactly (100% engine-derived, never touches Claude)', () => {
      const fresh = detectSportSpecificPatterns(metrics, bets);
      expect(stripVisibilityTags(analysis.sport_specific_findings ?? [])).toEqual(stripVisibilityTags(fresh));
    });

    it("strategic_leaks' category_roi-derived numbers (roi_impact, sample_size) still match category_roi", () => {
      for (const leak of analysis.strategic_leaks ?? []) {
        const fresh = metrics.category_roi.find((c) => c.category === leak.category);
        expect(fresh, `category_roi no longer has a "${leak.category}" entry`).toBeTruthy();
        expect(leak.roi_impact).toBeCloseTo(fresh!.roi, 2);
        expect(leak.sample_size).toBe(fresh!.count);
      }
    });

    it("edge_profile's category_roi-derived numbers (roi, sample_size, estimated_loss) still match category_roi", () => {
      const areas = [
        ...(analysis.edge_profile?.profitable_areas ?? []),
        ...(analysis.edge_profile?.unprofitable_areas ?? []),
      ];
      for (const area of areas) {
        const fresh = metrics.category_roi.find((c) => c.category === area.category);
        expect(fresh, `category_roi no longer has a "${area.category}" entry`).toBeTruthy();
        expect(area.roi).toBeCloseTo(fresh!.roi, 2);
        expect(area.sample_size).toBe(fresh!.count);
        if ('estimated_loss' in area) {
          expect(area.estimated_loss).toBeCloseTo(Math.abs(fresh!.profit), 2);
        }
      }
    });

    it("biases_detected's detector-side fields (severity, sample_size, evidence_bet_ids, sub_splits) still match the detector", () => {
      expect(metrics.biases_detected.map((b) => b.bias_name).sort())
        .toEqual(analysis.biases_detected.map((b) => b.bias_name).sort());
      for (const wireBias of analysis.biases_detected) {
        const fresh = metrics.biases_detected.find((b) => b.bias_name === wireBias.bias_name);
        expect(fresh, `detector no longer produces a "${wireBias.bias_name}" bias for these bets`).toBeTruthy();
        expect(wireBias.severity).toBe(fresh!.severity);
        expect(wireBias.sample_size).toBe(fresh!.sample_size);
        expect(wireBias.evidence_bet_ids).toEqual(fresh!.evidence_bet_ids);
        expect(wireBias.sub_splits).toEqual(fresh!.sub_splits);
      }
    });

    if (opts.isDFS) {
      it('dfs_metrics matches exactly (100% engine-derived, never touches Claude)', () => {
        expect(metrics.dfs.isDFS).toBe(true);
        expect(analysis.dfs_metrics).toEqual(metrics.dfs_metrics);
      });
    }
  });
}

runDriftGuard('DEMO_ANALYSIS vs a fresh calculateMetrics(DEMO_BETS)', DEMO_BETS, DEMO_ANALYSIS, { isDFS: false });
runDriftGuard('DEMO_DFS_ANALYSIS vs a fresh calculateMetrics(DEMO_DFS_BETS)', DEMO_DFS_BETS, DEMO_DFS_ANALYSIS, { isDFS: true });

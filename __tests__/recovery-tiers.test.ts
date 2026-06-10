/**
 * Recovery-mode threshold recalibration (R-run).
 *
 * Locks the two safety-critical structural changes:
 *  1. classifyReportRiskTier — three tiers, with Tier 2 (recovery) requiring the
 *     emotion signal AND corroboration (never either alone), so one bad weekend
 *     can't trip the clinical tier.
 *  2. deriveRecoveryModeState — auto recovery requires a sustained conjunction;
 *     a single signal only reaches 'elevated' (active=false). Manual wins.
 */
import { describe, it, expect } from 'vitest';
import { classifyReportRiskTier, deriveRecoveryModeState } from '@/lib/control-system';
import type { AutopsyAnalysis, BiasDetected, Profile, RiskEvent, Cooldown } from '@/types';

type Severity = 'low' | 'medium' | 'high' | 'critical';

function bias(severity: Severity): BiasDetected {
  return { bias_name: 'X', severity, data: '' } as unknown as BiasDetected;
}

function analysis(opts: { emotion: number; biases?: Severity[]; heatedPct?: number }): AutopsyAnalysis {
  return {
    emotion_score: opts.emotion,
    biases_detected: (opts.biases ?? []).map(bias),
    session_detection: { heatedSessionPercent: opts.heatedPct ?? 0 },
  } as unknown as AutopsyAnalysis;
}

describe('classifyReportRiskTier', () => {
  it('returns none for a low-risk report', () => {
    expect(classifyReportRiskTier(analysis({ emotion: 30 }))).toBe('none');
  });

  it('emotion >= 80 ALONE is not enough for recovery (no corroboration)', () => {
    // High emotion but no critical bias and low heatedPct -> elevated, not recovery.
    expect(classifyReportRiskTier(analysis({ emotion: 85, heatedPct: 0 }))).toBe('elevated');
  });

  it('recovery requires emotion >= 80 AND (critical bias OR heatedPct >= 35)', () => {
    expect(classifyReportRiskTier(analysis({ emotion: 85, biases: ['critical'] }))).toBe('recovery');
    expect(classifyReportRiskTier(analysis({ emotion: 85, heatedPct: 40 }))).toBe('recovery');
  });

  it('corroboration WITHOUT high emotion does not reach recovery', () => {
    // Critical bias + high heatedPct but emotion below cutoff -> elevated only.
    expect(classifyReportRiskTier(analysis({ emotion: 50, biases: ['critical'], heatedPct: 50 }))).toBe('elevated');
  });

  it('a single critical bias at low emotion is NOT recovery (codex over-flag fixed)', () => {
    // Old logic: any critical bias -> recovery. New: needs emotion>=80 too.
    expect(classifyReportRiskTier(analysis({ emotion: 40, biases: ['critical'] }))).toBe('elevated');
  });

  it('elevated band: emotion 60-79', () => {
    expect(classifyReportRiskTier(analysis({ emotion: 65 }))).toBe('elevated');
    expect(classifyReportRiskTier(analysis({ emotion: 79 }))).toBe('elevated');
  });

  it('elevated band: 2+ severe biases', () => {
    expect(classifyReportRiskTier(analysis({ emotion: 30, biases: ['high', 'high'] }))).toBe('elevated');
  });

  it('elevated band: heatedPct 20-34', () => {
    expect(classifyReportRiskTier(analysis({ emotion: 30, heatedPct: 25 }))).toBe('elevated');
    expect(classifyReportRiskTier(analysis({ emotion: 30, heatedPct: 19 }))).toBe('none');
  });
});

function riskEvent(type: string): RiskEvent {
  return { event_type: type, severity: 'high', event_at: new Date(0).toISOString() } as unknown as RiskEvent;
}
function activeCooldownRow(): Cooldown {
  return { status: 'active', expires_at: new Date(Date.now() + 3600_000).toISOString(), triggered_at: new Date(0).toISOString() } as unknown as Cooldown;
}

describe('deriveRecoveryModeState conjunction', () => {
  const base = { profile: null as Profile | null, analysis: null, riskEvents: [] as RiskEvent[], cooldowns: [] as Cooldown[] };

  it('manual toggle always wins', () => {
    const r = deriveRecoveryModeState({
      ...base,
      profile: { manual_recovery_mode: true, recovery_mode_started_at: null, recovery_mode_reason: null } as unknown as Profile,
    });
    expect(r.active).toBe(true);
    expect(r.level).toBe('recovery');
    expect(r.manual).toBe(true);
  });

  it('a single signal does NOT auto-activate recovery (elevated only)', () => {
    // 3 rule violations but no active cooldown and no heated pattern -> elevated, not active.
    const r = deriveRecoveryModeState({
      ...base,
      riskEvents: [riskEvent('rule_violation'), riskEvent('rule_violation'), riskEvent('rule_violation')],
    });
    expect(r.active).toBe(false);
    expect(r.level).toBe('elevated');
  });

  it('sustained conjunction (violations + active cooldown) auto-activates recovery', () => {
    const r = deriveRecoveryModeState({
      ...base,
      riskEvents: [riskEvent('rule_violation'), riskEvent('rule_violation'), riskEvent('rule_violation')],
      cooldowns: [activeCooldownRow()],
    });
    expect(r.active).toBe(true);
    expect(r.level).toBe('recovery');
    expect(r.manual).toBe(false);
  });

  it('no signals -> watch, inactive', () => {
    const r = deriveRecoveryModeState({ ...base });
    expect(r.active).toBe(false);
    expect(r.level).toBe('watch');
  });
});

import { describe, it, expect } from 'vitest';
import { evaluateCheckInAgainstControlState } from '@/lib/control-system';
import type { Bet, ControlRule, Cooldown, PreBetCheckInRequest } from '@/types';

// Enforcement-path coverage for evaluateCheckInAgainstControlState. The shipped
// suite (api-check-in-compat) only exercises the prod-schema fallbacks; the
// decision gate (rule triggered / cooldown active / override flow) had none.
// We use loss_streak_stop rules so the assertions don't depend on the clock.

const baseRequest: PreBetCheckInRequest = {
  sport: 'NBA',
  stake: 50,
  odds: -110,
  betType: 'spread',
  placedAt: '2026-06-10T18:00:00.000Z',
  localHour: 14, // mid-afternoon — never trips a late-night rule
};

function lossBets(n: number): Bet[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `bet-${i}`,
    placed_at: new Date(Date.UTC(2026, 5, 10, 12, i)).toISOString(),
    result: 'loss',
  })) as unknown as Bet[];
}

function lossStreakRule(enforcement: 'hard' | 'soft', threshold = 3): ControlRule {
  return {
    id: `rule-${enforcement}`,
    rule_type: 'loss_streak_stop',
    status: 'active',
    title: 'Stop after 3 losses',
    description: 'Walk away once you have lost 3 in a row.',
    enforcement,
    severity: enforcement === 'hard' ? 'critical' : 'guardrail',
    trigger: { threshold },
  } as unknown as ControlRule;
}

function activeCooldown(): Cooldown {
  return {
    id: 'cooldown-1',
    status: 'active',
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    trigger_reason: 'Heated session detected',
    trigger_type: 'heated_session',
  } as unknown as Cooldown;
}

const emptyState = {
  cooldowns: [] as Cooldown[],
  riskEvents: [],
  recentBets: [] as Bet[],
  activePlan: null,
};

describe('evaluateCheckInAgainstControlState enforcement', () => {
  it('clears when no rules fire, no cooldown, no risk signals', () => {
    const result = evaluateCheckInAgainstControlState({
      request: baseRequest,
      rules: [],
      ...emptyState,
    });
    expect(result.actionGate).toBe('clear');
    expect(result.overrideRequired).toBe(false);
    expect(result.cooldown).toBeNull();
    expect(result.reflectionPrompts).toHaveLength(0);
  });

  it('blocks and requires override when a hard rule is triggered', () => {
    const result = evaluateCheckInAgainstControlState({
      request: baseRequest,
      rules: [lossStreakRule('hard')],
      ...emptyState,
      recentBets: lossBets(4), // 4-loss streak >= threshold 3
    });
    expect(result.actionGate).toBe('blocked');
    expect(result.overrideRequired).toBe(true);
    expect(result.ruleViolations).toHaveLength(1);
    expect(result.ruleViolations[0].enforcement).toBe('hard');
  });

  it('requires reflection (not block) when only a soft rule is triggered', () => {
    const result = evaluateCheckInAgainstControlState({
      request: baseRequest,
      rules: [lossStreakRule('soft')],
      ...emptyState,
      recentBets: lossBets(4),
    });
    expect(result.actionGate).toBe('reflection_required');
    expect(result.overrideRequired).toBe(false);
    expect(result.ruleViolations[0].enforcement).toBe('soft');
    expect(result.reflectionPrompts.length).toBeGreaterThan(0);
  });

  it('does not fire a rule when the loss streak is below threshold', () => {
    const result = evaluateCheckInAgainstControlState({
      request: baseRequest,
      rules: [lossStreakRule('hard', 3)],
      ...emptyState,
      recentBets: lossBets(2), // below threshold
    });
    expect(result.ruleViolations).toHaveLength(0);
    expect(result.actionGate).toBe('clear');
  });

  it('blocks on an active cooldown even with no rule violation', () => {
    const result = evaluateCheckInAgainstControlState({
      request: baseRequest,
      rules: [],
      ...emptyState,
      cooldowns: [activeCooldown()],
    });
    expect(result.actionGate).toBe('blocked');
    expect(result.overrideRequired).toBe(true);
    expect(result.cooldown?.active).toBe(true);
    expect(result.cooldown?.cooldownId).toBe('cooldown-1');
  });

  it('ignores an expired cooldown', () => {
    const expired = {
      ...activeCooldown(),
      id: 'cooldown-expired',
      expires_at: new Date(Date.now() - 60 * 1000).toISOString(),
    } as unknown as Cooldown;
    const result = evaluateCheckInAgainstControlState({
      request: baseRequest,
      rules: [],
      ...emptyState,
      cooldowns: [expired],
    });
    expect(result.cooldown).toBeNull();
    expect(result.actionGate).toBe('clear');
  });

  it('requires reflection when the user reports trying to win back losses', () => {
    const result = evaluateCheckInAgainstControlState({
      request: { ...baseRequest, reflection: { tryingToWinBackLosses: true } },
      rules: [],
      ...emptyState,
    });
    expect(result.actionGate).toBe('reflection_required');
    expect(result.overrideRequired).toBe(false);
  });
});

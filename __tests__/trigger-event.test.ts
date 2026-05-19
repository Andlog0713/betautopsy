import { describe, it, expect } from 'vitest';
import { detectAndGradeSessions } from '@/lib/autopsy-engine';
import type { Bet } from '@/types';

function makeBet(overrides: Partial<Bet> = {}): Bet {
  return {
    id: `b-${Math.random().toString(36).slice(2, 10)}`,
    user_id: 'u',
    placed_at: '2024-01-01T14:00:00Z',
    sport: 'NFL',
    league: 'NFL',
    bet_type: 'spread',
    description: 'x',
    odds: -110,
    stake: 50,
    result: 'loss',
    payout: 0,
    profit: -50,
    sportsbook: 'DraftKings',
    is_bonus_bet: false,
    parlay_legs: null,
    tags: null,
    notes: null,
    upload_id: 'u',
    created_at: '2024-01-01T14:00:00Z',
    ...overrides,
  };
}

// Build a heated session by jamming 12 escalating-stake losses into a short
// window with a clear chase pattern. detectAndGradeSessions splits on a 3-hour
// gap, so we keep bets within 30 minutes of each other.
function heatedSessionBets(start: Date, baseStake = 50): Bet[] {
  return Array.from({ length: 12 }, (_, i) => {
    const t = new Date(start.getTime() + i * 60_000);
    const stake = baseStake + i * 50;
    return makeBet({
      placed_at: t.toISOString(),
      created_at: t.toISOString(),
      stake,
      result: 'loss',
      profit: -stake,
      payout: 0,
    });
  });
}

describe('per-session triggerEvent attribution', () => {
  it('attributes "loss" when prior settled bet was a large loss', () => {
    const priorLoss = makeBet({
      placed_at: new Date(2024, 0, 1, 9, 0, 0).toISOString(),
      created_at: new Date(2024, 0, 1, 9, 0, 0).toISOString(),
      stake: 1500,
      result: 'loss',
      profit: -1500,
    });
    // Heated session starts 5 hours later (gap > 3hrs so it's a new session).
    // Use modest stakes so the overall median stays well below the priorLoss
    // profit magnitude (median * 2 must be < $1500 for the loss attribution
    // to fire).
    const start = new Date(2024, 0, 1, 14, 0, 0);
    const heated = Array.from({ length: 12 }, (_, i) =>
      makeBet({
        placed_at: new Date(start.getTime() + i * 60_000).toISOString(),
        created_at: new Date(start.getTime() + i * 60_000).toISOString(),
        stake: 50 + i * 20,
        result: 'loss',
        profit: -(50 + i * 20),
        payout: 0,
      })
    );
    const bets = [priorLoss, ...heated];

    const result = detectAndGradeSessions(bets);
    const heatedSess = result.sessions.find((s) => s.isHeated);
    expect(heatedSess?.triggerEvent?.type).toBe('loss');
    expect(heatedSess?.triggerEvent?.triggeringBetId).toBe(priorLoss.id);
    expect(heatedSess?.triggerEvent?.description).toMatch(/\$1500/);
  });

  it('attributes "late_night" when no prior big loss but session is late-night', () => {
    // No prior bets at all, heated session starts at 11:30pm LOCAL time.
    const heated = heatedSessionBets(new Date(2024, 0, 1, 23, 30, 0));
    const result = detectAndGradeSessions(heated);
    const heatedSess = result.sessions.find((s) => s.isHeated);
    expect(heatedSess?.triggerEvent?.type).toBe('late_night');
    expect(heatedSess?.triggerEvent?.triggeringBetId).toBeUndefined();
  });

  it('attributes "stake_volatility" when starting stake is >1.5x median and no loss/late-night', () => {
    // Establish a long history of small $50 bets so median is $50.
    const history: Bet[] = Array.from({ length: 30 }, (_, i) => {
      const day = new Date(2024, 0, 1 + i, 10, 0, 0);
      return makeBet({
        placed_at: day.toISOString(),
        created_at: day.toISOString(),
        stake: 50,
        result: i % 2 === 0 ? 'win' : 'loss',
        profit: i % 2 === 0 ? 45 : -50,
        payout: i % 2 === 0 ? 95 : 0,
      });
    });
    // Then a heated session at 2pm LOCAL with starting stake $200 (4x median),
    // not late-night, not preceded by a big loss.
    const start = new Date(2024, 1, 1, 14, 0, 0);
    const heated = Array.from({ length: 12 }, (_, i) => {
      const t = new Date(start.getTime() + i * 60_000);
      return makeBet({
        placed_at: t.toISOString(),
        created_at: t.toISOString(),
        stake: 200 + i * 50,
        result: 'loss',
        profit: -(200 + i * 50),
        payout: 0,
      });
    });
    const result = detectAndGradeSessions([...history, ...heated]);
    const heatedSess = result.sessions.find((s) => s.isHeated);
    expect(heatedSess?.triggerEvent?.type).toBe('stake_volatility');
    expect(heatedSess?.triggerEvent?.description).toMatch(/\$200/);
    expect(heatedSess?.triggerEvent?.description).toMatch(/\$50/);
  });

  it('does NOT populate triggerEvent on non-heated sessions', () => {
    // Calm session: 3 small wins spaced 5 min apart, daytime.
    const start = new Date(2024, 0, 1, 12, 0, 0);
    const calm = Array.from({ length: 3 }, (_, i) =>
      makeBet({
        placed_at: new Date(start.getTime() + i * 5 * 60_000).toISOString(),
        created_at: new Date(start.getTime() + i * 5 * 60_000).toISOString(),
        stake: 50,
        result: 'win',
        profit: 45,
        payout: 95,
      })
    );
    const result = detectAndGradeSessions(calm);
    const calmSess = result.sessions[0];
    expect(calmSess.isHeated).toBe(false);
    expect(calmSess.triggerEvent).toBeUndefined();
  });
});

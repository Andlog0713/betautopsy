// @vitest-environment jsdom
/**
 * Minimum-viable DOM guard for the snapshot findings render path (P1-1).
 *
 * PR #84 correctly fixed the locked-teaser branch order, then silently
 * regressed the i === 0 case (permanent "Generating analysis..." spinner
 * on the free tier's conversion moment) - nothing caught it, because this
 * component had zero rendered-output coverage. PR #89 fixed it again and
 * verified live in a browser, which is not a repeatable regression guard.
 *
 * This is deliberately narrow: one render, two invariants. It is not the
 * broader DOM fixture suite (jsdom + testing-library are new to this repo
 * as of this test) - that can follow as its own piece of work.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import AutopsyReport from '@/components/AutopsyReport';
import { runSnapshot } from '@/lib/autopsy-engine';
import type { Bet } from '@/types';

// framer-motion's useInView (via components/ui/number-ticker.tsx) needs
// IntersectionObserver, which jsdom does not implement.
beforeAll(() => {
  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-expect-error - test polyfill, not a full IntersectionObserver
  global.IntersectionObserver = MockIntersectionObserver;
});

// Same shape as autopsy-engine.redaction.test.ts's makeFixtureBets(): 120
// settled bets across NBA/NFL, mix of parlay/spread and win/loss, enough
// to clear the bias-detection sample floor and produce real biases_detected
// with evidence_visibility: 'visible' on the top-severity ones.
function makeFixtureBets(): Bet[] {
  const bets: Bet[] = [];
  const baseDate = Date.parse('2026-04-15T20:00:00Z');
  for (let i = 0; i < 120; i++) {
    const isWin = i % 3 === 0;
    const isParlay = i % 5 === 0;
    const sport = i % 2 === 0 ? 'NBA' : 'NFL';
    const stake = 25 + (i % 7) * 35;
    bets.push({
      id: `bet-${i}`,
      user_id: 'test-user',
      placed_at: new Date(baseDate - (60 - i) * 86400000 + i * 90 * 60_000).toISOString(),
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
  return bets;
}

// Strips every aria-hidden subtree (RedactedValue's intentional blurred
// decoy amounts, e.g. "$1,880" behind a CSS blur + aria-hidden="true") so
// the check below only sees genuinely visible text. Decoy dollar strings
// are the point of the paywall UI; a real leak is VISIBLE dollar text.
function visibleText(container: HTMLElement): string {
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.remove());
  return clone.textContent ?? '';
}

describe('AutopsyReport — snapshot findings render (P1-1 minimum viable guard)', () => {
  it('renders real evidence on the top bias, never a spinner, never a visible dollar figure', async () => {
    const { analysis } = await runSnapshot(makeFixtureBets());
    expect(analysis.biases_detected.length).toBeGreaterThan(0);
    expect(analysis.biases_detected.some((b) => b.evidence_visibility === 'visible')).toBe(true);

    render(<AutopsyReport analysis={analysis} bets={[]} isSnapshot={true} tier="free" />);

    const findings = screen.getByTestId('findings-section');

    // The regression this guards against: bias.description is always ''
    // on a snapshot, and a branch-order bug made that fall through to a
    // permanent "Generating analysis..." spinner instead of the locked
    // teaser or the real evidence.
    expect(findings.textContent).not.toMatch(/Generating/i);

    // No real (visible) dollar figure anywhere in the findings section.
    // Decoy blur amounts are aria-hidden and excluded by visibleText().
    expect(visibleText(findings)).not.toMatch(/\$[\d,]/);
  });
});

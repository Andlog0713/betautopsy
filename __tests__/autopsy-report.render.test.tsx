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
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import AutopsyReport from '@/components/AutopsyReport';
import { runSnapshot } from '@/lib/autopsy-engine';
import { DEMO_ANALYSIS, DEMO_BETS } from '@/lib/demo-data';
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

  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.ResizeObserver = MockResizeObserver;
  HTMLElement.prototype.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    width: 320,
    height: 200,
    top: 0,
    right: 320,
    bottom: 200,
    left: 0,
    toJSON: () => ({}),
  });
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

// Strips every aria-hidden subtree so the check below only sees genuinely
// visible text. Redacted numeric values must render as a nonnumeric lock.
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

  it('renders summary dollar sentinels as Locked, never $0 or +$0', async () => {
    const { analysis } = await runSnapshot(makeFixtureBets());
    render(<AutopsyReport analysis={analysis} bets={[]} isSnapshot={true} tier="free" />);

    const netCell = screen.getByText('NET P&L').parentElement;
    const stakeCell = screen.getByText('AVG STAKE').parentElement;
    expect(netCell?.textContent).toContain('Locked');
    expect(stakeCell?.textContent).toContain('Locked');
    expect(netCell?.textContent).not.toMatch(/[+-]?\$0\b/);
    expect(stakeCell?.textContent).not.toMatch(/\$0\b/);
  });

  it('does not reconstruct a recoverable dollar range from snapshot bet rows', async () => {
    const bets = makeFixtureBets();
    const { analysis } = await runSnapshot(bets);
    const snapshotWithLeak = {
      ...analysis,
      strategic_leaks: [{
        category: 'NBA',
        detail: 'NBA wagers underperformed in this sample.',
        roi_impact: -12,
        sample_size: 60,
        suggestion: '',
        detail_visibility: 'visible' as const,
        suggestion_visibility: 'hidden' as const,
      }],
    };

    render(
      <AutopsyReport
        analysis={snapshotWithLeak}
        bets={bets}
        isSnapshot={true}
        tier="free"
      />,
    );

    expect(screen.queryByText('BIGGEST RECOVERABLE LEAK')).toBeNull();
  });

  it('RedactedValue uses a nonnumeric lock instead of fabricated decoys', async () => {
    const { analysis } = await runSnapshot(makeFixtureBets());
    const lockedBiases = analysis.biases_detected.filter((b) => b.estimated_cost_visibility !== 'visible');
    expect(lockedBiases.length).toBeGreaterThan(0);
    // Wire-level invariant this test pins: a locked bias's estimated_cost
    // is always the redacted sentinel (0), never a real figure. This is
    // the value a regression would have to leak for the decoy check below
    // to matter.
    for (const b of lockedBiases) {
      expect(b.estimated_cost).toBe(0);
    }

    render(<AutopsyReport analysis={analysis} bets={[]} isSnapshot={true} tier="free" />);
    const findings = screen.getByTestId('findings-section');

    const decoys = Array.from(findings.querySelectorAll('[aria-hidden="true"]')).filter((el) =>
      /^\$[\d,]+$/.test(el.textContent?.trim() ?? '')
    );
    expect(decoys).toEqual([]);
    expect(
      within(findings).getAllByRole('button', { name: /see your full dollar costs/i })[0].textContent,
    ).toContain('Locked');
  });

  // Accessible-name check: the decoy amount is aria-hidden by design (it's
  // a visual-only blur effect), so if the surrounding control has no other
  // accessible name, a screen reader user gets silence where a sighted
  // user sees a paywall affordance.
  it('every RedactedValue lock control has an accessible name', async () => {
    const { analysis } = await runSnapshot(makeFixtureBets());
    render(<AutopsyReport analysis={analysis} bets={[]} isSnapshot={true} tier="free" />);
    const findings = screen.getByTestId('findings-section');

    const lockControls = within(findings).getAllByRole('button', { name: /see your full dollar costs/i });
    expect(lockControls.length).toBeGreaterThan(0);
  });

  it('keeps paid snapshot redactions static and removes every repurchase control', async () => {
    const { analysis } = await runSnapshot(makeFixtureBets());

    render(
      <AutopsyReport
        analysis={analysis}
        bets={[]}
        isSnapshot={true}
        tier="free"
        purchaseAvailable={false}
      />,
    );

    expect(screen.getAllByText('Locked').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /see your full dollar costs/i })).toBeNull();
    expect(screen.queryByText(/unlock your full report/i)).toBeNull();
  });

  it('initializes report charts with positive dimensions', async () => {
    const bets = makeFixtureBets();
    const { analysis } = await runSnapshot(bets);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <AutopsyReport
        analysis={{ ...analysis, executive_diagnosis: 'Complete analysis.' }}
        bets={bets}
        isSnapshot={false}
        tier="free"
      />,
    );

    const warningText = warn.mock.calls.flat().join(' ');
    expect(warningText).not.toMatch(/width\([^)]*\)[\s\S]*height\([^)]*\)[\s\S]*greater than 0/i);
    warn.mockRestore();
  });

  it('renders the frozen session snapshots instead of unrelated prop indices', () => {
    render(
      <AutopsyReport
        analysis={DEMO_ANALYSIS}
        bets={DEMO_BETS}
        isSnapshot={false}
        tier="pro"
      />,
    );

    const bestSessionButton = screen.getAllByRole('button', { name: /view session bets/i })[0];
    const bestSessionCard = bestSessionButton.parentElement;
    expect(bestSessionCard).not.toBeNull();
    fireEvent.click(bestSessionButton);

    expect(within(bestSessionCard!).getByText('3-leg NFL parlay: Chiefs + Texans + Texans')).toBeTruthy();
    expect(within(bestSessionCard!).getByText('2h 22m later')).toBeTruthy();
    expect(within(bestSessionCard!).queryByText('24h 50m later')).toBeNull();
  });

  it('reconstructs session indices from engine ordering when snapshots are unavailable', () => {
    const sessionDetection = DEMO_ANALYSIS.session_detection!;
    const bestSession = sessionDetection.bestSession!;
    const analysisWithoutSnapshots = {
      ...DEMO_ANALYSIS,
      session_detection: {
        ...sessionDetection,
        bestSession: { ...bestSession, betSnapshots: undefined },
      },
    };

    render(
      <AutopsyReport
        analysis={analysisWithoutSnapshots}
        bets={DEMO_BETS}
        isSnapshot={false}
        tier="pro"
      />,
    );

    const bestSessionButton = screen.getAllByRole('button', { name: /view session bets/i })[0];
    const bestSessionCard = bestSessionButton.parentElement;
    expect(bestSessionCard).not.toBeNull();
    fireEvent.click(bestSessionButton);

    expect(within(bestSessionCard!).getByText('3-leg NFL parlay: Chiefs + Texans + Texans')).toBeTruthy();
    expect(within(bestSessionCard!).getByText('2h 22m later')).toBeTruthy();
  });
});

describe('AutopsyReport — isPartialReport vacuous-truth guard', () => {
  // isPartialReport used to infer "still waiting on Claude" purely from
  // biases_detected/strategic_leaks/recommendations all being empty. Those
  // three are real, reachable engine output for a genuinely disciplined
  // bettor (no conditions in calculateMetrics' bias detection fired), not
  // just a "not arrived yet" placeholder shape - so a fully complete full
  // report for such a user was indistinguishable from mid-generation and
  // showed "Generating..." skeletons in nearly every section, permanently,
  // every time the report was viewed.
  it('does not show a permanent "Generating..." skeleton for a complete full report with zero findings', async () => {
    const { analysis } = await runSnapshot(makeFixtureBets());

    // Simulate a completed FULL report (not snapshot) for a bettor the
    // engine found nothing to flag on: empty findings arrays, but Claude's
    // required executive_diagnosis has arrived, same as any other
    // completed full report regardless of finding count.
    const cleanBettorAnalysis = {
      ...analysis,
      biases_detected: [],
      strategic_leaks: [],
      recommendations: [],
      executive_diagnosis: 'Your betting shows no significant behavioral leaks this period.',
    };

    render(<AutopsyReport analysis={cleanBettorAnalysis} bets={[]} isSnapshot={false} tier="pro" />);

    expect(screen.queryByText(/Generating/i)).toBeNull();
  });

  it('still shows the skeleton for a genuinely partial full report (no executive_diagnosis, no real content yet)', async () => {
    const { analysis } = await runSnapshot(makeFixtureBets());

    const partialAnalysis = {
      ...analysis,
      biases_detected: analysis.biases_detected.map((b) => ({ ...b, description: '', fix: '' })),
      strategic_leaks: [],
      recommendations: [],
      executive_diagnosis: undefined,
      executiveDiagnosis: undefined,
    };

    render(<AutopsyReport analysis={partialAnalysis} bets={[]} isSnapshot={false} tier="pro" />);

    expect(screen.queryAllByText(/Generating/i).length).toBeGreaterThan(0);
  });

  it('does not render local-time claims from a saved report with no timestamp provenance', async () => {
    const { analysis } = await runSnapshot(makeFixtureBets());
    const historicalAnalysis = {
      ...analysis,
      timing_analysis: analysis.timing_analysis
        ? {
            ...analysis.timing_analysis,
            clock_basis: undefined,
            local_time_confirmed: undefined,
          }
        : undefined,
      behavioral_patterns: [{
        pattern_name: 'Late-night losses',
        description: 'Late-night bets underperformed.',
        frequency: 'Often',
        impact: 'negative' as const,
        data_points: 'After 11pm',
      }],
      recommendations: [{
        priority: 1,
        title: 'Set an 11pm cutoff',
        description: 'Stop betting after 11pm.',
        expected_improvement: 'Avoid overnight losses.',
        difficulty: 'easy' as const,
      }],
      executive_diagnosis: 'Your sizing is uneven. Late-night losses dominate.',
    };

    const { container } = render(
      <AutopsyReport analysis={historicalAnalysis} bets={[]} isSnapshot={false} tier="pro" />,
    );

    expect(container.textContent).toContain('Your sizing is uneven.');
    expect(container.textContent).not.toMatch(/late[- ]?night|overnight|11pm/i);
    expect(screen.queryByText('Timing Patterns')).toBeNull();
  });
});

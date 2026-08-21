import type { AutopsyAnalysis, Bet } from '@/types';
import { buildReportControlSystem } from '@/lib/control-system';

// -- Demo Bets --
// 304 bets (Nov 1, 2025 - Jan 31, 2026), script-generated with deliberate
// per-category win-rate targets (NFL spread profitable, NBA
// prop/parlay/late-night unprofitable, one loss-chasing session) and run
// through the REAL engine: lib/autopsy-engine.ts's calculateMetrics() +
// one live runAutopsy() call against the actual Claude API. DEMO_ANALYSIS
// below is that call's frozen, unedited output.
//
// This replaces a prior ~35-row hand-picked "sample for charts" that
// coexisted with a separately hand-authored DEMO_ANALYSIS describing a
// different, never-materialized 280-bet population - two populations
// wearing one label, which is why every number in this fixture kept
// drifting out of sync with every other number (PR #105, #111 x2).
// DEMO_BETS is now the ONLY population. Every DEMO_ANALYSIS figure is
// computed from exactly these bets - What-If/Leak-Prioritizer (which
// compute live from DEMO_BETS in components/AutopsyReport.tsx) and every
// hand-off number in DEMO_ANALYSIS now necessarily agree, because they
// come from the same array instead of two independently maintained ones.
//
// To regenerate: see the generation script pattern in this PR's
// description - it is not checked in (it makes a real, billed Claude API
// call, so it must not run as part of `npx vitest run`).

export const DEMO_BETS: Bet[] = [
  {
    "id": "demo-1",
    "user_id": "demo",
    "placed_at": "2025-12-05T20:40:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Vikings +8.5",
    "odds": -110,
    "stake": 70,
    "result": "win",
    "payout": 133.64,
    "profit": 63.64,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-05T20:40:00.000Z"
  },
  {
    "id": "demo-2",
    "user_id": "demo",
    "placed_at": "2025-12-27T17:44:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Broncos +5",
    "odds": -110,
    "stake": 104,
    "result": "win",
    "payout": 198.55,
    "profit": 94.55,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-27T17:44:00.000Z"
  },
  {
    "id": "demo-3",
    "user_id": "demo",
    "placed_at": "2026-01-12T20:02:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Dolphins +10.5",
    "odds": -110,
    "stake": 136,
    "result": "loss",
    "payout": 0,
    "profit": -136,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-12T20:02:00.000Z"
  },
  {
    "id": "demo-4",
    "user_id": "demo",
    "placed_at": "2025-11-06T19:01:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Steelers -5.5",
    "odds": -110,
    "stake": 62,
    "result": "win",
    "payout": 118.36,
    "profit": 56.36,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-06T19:01:00.000Z"
  },
  {
    "id": "demo-5",
    "user_id": "demo",
    "placed_at": "2026-01-23T21:38:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Steelers -6.5",
    "odds": -110,
    "stake": 101,
    "result": "loss",
    "payout": 0,
    "profit": -101,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-23T21:38:00.000Z"
  },
  {
    "id": "demo-6",
    "user_id": "demo",
    "placed_at": "2026-01-15T20:47:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Chiefs -5",
    "odds": -110,
    "stake": 79,
    "result": "win",
    "payout": 150.82,
    "profit": 71.82,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-15T20:47:00.000Z"
  },
  {
    "id": "demo-7",
    "user_id": "demo",
    "placed_at": "2026-01-10T17:12:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Lions +11",
    "odds": -110,
    "stake": 82,
    "result": "win",
    "payout": 156.55,
    "profit": 74.55,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-10T17:12:00.000Z"
  },
  {
    "id": "demo-8",
    "user_id": "demo",
    "placed_at": "2025-12-02T21:12:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Dolphins -1.5",
    "odds": -110,
    "stake": 115,
    "result": "loss",
    "payout": 0,
    "profit": -115,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-02T21:12:00.000Z"
  },
  {
    "id": "demo-9",
    "user_id": "demo",
    "placed_at": "2025-12-21T18:24:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Vikings -2.5",
    "odds": -110,
    "stake": 114,
    "result": "win",
    "payout": 217.64,
    "profit": 103.64,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-21T18:24:00.000Z"
  },
  {
    "id": "demo-10",
    "user_id": "demo",
    "placed_at": "2026-01-26T19:05:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Eagles -7.5",
    "odds": -110,
    "stake": 87,
    "result": "loss",
    "payout": 0,
    "profit": -87,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-26T19:05:00.000Z"
  },
  {
    "id": "demo-11",
    "user_id": "demo",
    "placed_at": "2026-01-25T18:14:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Packers +4.5",
    "odds": -110,
    "stake": 96,
    "result": "win",
    "payout": 183.27,
    "profit": 87.27,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-25T18:14:00.000Z"
  },
  {
    "id": "demo-12",
    "user_id": "demo",
    "placed_at": "2025-11-29T19:21:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Packers -9.5",
    "odds": -110,
    "stake": 72,
    "result": "win",
    "payout": 137.45,
    "profit": 65.45,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-29T19:21:00.000Z"
  },
  {
    "id": "demo-13",
    "user_id": "demo",
    "placed_at": "2026-01-28T20:35:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Packers -12.5",
    "odds": -110,
    "stake": 105,
    "result": "loss",
    "payout": 0,
    "profit": -105,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-28T20:35:00.000Z"
  },
  {
    "id": "demo-14",
    "user_id": "demo",
    "placed_at": "2025-12-03T19:52:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Bengals -11",
    "odds": -110,
    "stake": 120,
    "result": "win",
    "payout": 229.09,
    "profit": 109.09,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-03T19:52:00.000Z"
  },
  {
    "id": "demo-15",
    "user_id": "demo",
    "placed_at": "2026-01-08T17:43:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "49ers -12",
    "odds": -110,
    "stake": 72,
    "result": "loss",
    "payout": 0,
    "profit": -72,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-08T17:43:00.000Z"
  },
  {
    "id": "demo-16",
    "user_id": "demo",
    "placed_at": "2026-01-03T18:06:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Steelers +4",
    "odds": -110,
    "stake": 75,
    "result": "win",
    "payout": 143.18,
    "profit": 68.18,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-03T18:06:00.000Z"
  },
  {
    "id": "demo-17",
    "user_id": "demo",
    "placed_at": "2026-01-17T21:07:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Broncos -1.5",
    "odds": -110,
    "stake": 129,
    "result": "loss",
    "payout": 0,
    "profit": -129,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-17T21:07:00.000Z"
  },
  {
    "id": "demo-18",
    "user_id": "demo",
    "placed_at": "2025-12-06T02:52:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Cowboys +6",
    "odds": -110,
    "stake": 78,
    "result": "loss",
    "payout": 0,
    "profit": -78,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-06T02:52:00.000Z"
  },
  {
    "id": "demo-19",
    "user_id": "demo",
    "placed_at": "2026-01-13T19:19:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Texans +10",
    "odds": -110,
    "stake": 94,
    "result": "win",
    "payout": 179.45,
    "profit": 85.45,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-13T19:19:00.000Z"
  },
  {
    "id": "demo-20",
    "user_id": "demo",
    "placed_at": "2026-01-02T21:49:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Vikings +7.5",
    "odds": -110,
    "stake": 107,
    "result": "win",
    "payout": 204.27,
    "profit": 97.27,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-02T21:49:00.000Z"
  },
  {
    "id": "demo-21",
    "user_id": "demo",
    "placed_at": "2025-11-14T20:23:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Cowboys +2",
    "odds": -110,
    "stake": 124,
    "result": "win",
    "payout": 236.73,
    "profit": 112.73,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-14T20:23:00.000Z"
  },
  {
    "id": "demo-22",
    "user_id": "demo",
    "placed_at": "2026-01-03T20:55:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Lions -4",
    "odds": -110,
    "stake": 82,
    "result": "win",
    "payout": 156.55,
    "profit": 74.55,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-03T20:55:00.000Z"
  },
  {
    "id": "demo-23",
    "user_id": "demo",
    "placed_at": "2025-12-06T18:19:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "49ers -3.5",
    "odds": -110,
    "stake": 132,
    "result": "win",
    "payout": 252,
    "profit": 120,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-06T18:19:00.000Z"
  },
  {
    "id": "demo-24",
    "user_id": "demo",
    "placed_at": "2025-12-17T17:35:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Lions +1.5",
    "odds": -110,
    "stake": 127,
    "result": "loss",
    "payout": 0,
    "profit": -127,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-17T17:35:00.000Z"
  },
  {
    "id": "demo-25",
    "user_id": "demo",
    "placed_at": "2025-11-01T17:47:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "49ers +9",
    "odds": -110,
    "stake": 107,
    "result": "loss",
    "payout": 0,
    "profit": -107,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-01T17:47:00.000Z"
  },
  {
    "id": "demo-26",
    "user_id": "demo",
    "placed_at": "2025-11-06T17:15:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Dolphins +5",
    "odds": -110,
    "stake": 110,
    "result": "win",
    "payout": 210,
    "profit": 100,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-06T17:15:00.000Z"
  },
  {
    "id": "demo-27",
    "user_id": "demo",
    "placed_at": "2025-11-27T18:38:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Bengals +10.5",
    "odds": -110,
    "stake": 120,
    "result": "win",
    "payout": 229.09,
    "profit": 109.09,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-27T18:38:00.000Z"
  },
  {
    "id": "demo-28",
    "user_id": "demo",
    "placed_at": "2025-12-17T17:49:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Vikings +1.5",
    "odds": -110,
    "stake": 74,
    "result": "win",
    "payout": 141.27,
    "profit": 67.27,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-17T17:49:00.000Z"
  },
  {
    "id": "demo-29",
    "user_id": "demo",
    "placed_at": "2026-01-01T19:27:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Eagles +4",
    "odds": -110,
    "stake": 104,
    "result": "win",
    "payout": 198.55,
    "profit": 94.55,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-01T19:27:00.000Z"
  },
  {
    "id": "demo-30",
    "user_id": "demo",
    "placed_at": "2026-01-14T19:12:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Packers -1",
    "odds": -110,
    "stake": 98,
    "result": "loss",
    "payout": 0,
    "profit": -98,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-14T19:12:00.000Z"
  },
  {
    "id": "demo-31",
    "user_id": "demo",
    "placed_at": "2025-11-06T21:10:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Steelers +6.5",
    "odds": -110,
    "stake": 134,
    "result": "loss",
    "payout": 0,
    "profit": -134,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-06T21:10:00.000Z"
  },
  {
    "id": "demo-32",
    "user_id": "demo",
    "placed_at": "2025-12-12T19:54:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Packers +5",
    "odds": -110,
    "stake": 111,
    "result": "win",
    "payout": 211.91,
    "profit": 100.91,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-12T19:54:00.000Z"
  },
  {
    "id": "demo-33",
    "user_id": "demo",
    "placed_at": "2026-01-30T19:09:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Texans +2",
    "odds": -110,
    "stake": 130,
    "result": "loss",
    "payout": 0,
    "profit": -130,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-30T19:09:00.000Z"
  },
  {
    "id": "demo-34",
    "user_id": "demo",
    "placed_at": "2025-12-09T21:57:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Bills +8",
    "odds": -110,
    "stake": 137,
    "result": "win",
    "payout": 261.55,
    "profit": 124.55,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-09T21:57:00.000Z"
  },
  {
    "id": "demo-35",
    "user_id": "demo",
    "placed_at": "2026-01-23T23:31:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Chiefs -12",
    "odds": -110,
    "stake": 104,
    "result": "loss",
    "payout": 0,
    "profit": -104,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-23T23:31:00.000Z"
  },
  {
    "id": "demo-36",
    "user_id": "demo",
    "placed_at": "2025-11-03T18:24:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Bengals +1",
    "odds": -110,
    "stake": 113,
    "result": "win",
    "payout": 215.73,
    "profit": 102.73,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-03T18:24:00.000Z"
  },
  {
    "id": "demo-37",
    "user_id": "demo",
    "placed_at": "2026-01-12T20:46:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Vikings -10",
    "odds": -110,
    "stake": 89,
    "result": "win",
    "payout": 169.91,
    "profit": 80.91,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-12T20:46:00.000Z"
  },
  {
    "id": "demo-38",
    "user_id": "demo",
    "placed_at": "2026-01-03T21:43:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Broncos -11.5",
    "odds": -110,
    "stake": 116,
    "result": "loss",
    "payout": 0,
    "profit": -116,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-03T21:43:00.000Z"
  },
  {
    "id": "demo-39",
    "user_id": "demo",
    "placed_at": "2026-01-17T21:11:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Texans +3.5",
    "odds": -110,
    "stake": 97,
    "result": "win",
    "payout": 185.18,
    "profit": 88.18,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-17T21:11:00.000Z"
  },
  {
    "id": "demo-40",
    "user_id": "demo",
    "placed_at": "2025-12-28T19:11:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Bills -9.5",
    "odds": -110,
    "stake": 96,
    "result": "win",
    "payout": 183.27,
    "profit": 87.27,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-28T19:11:00.000Z"
  },
  {
    "id": "demo-41",
    "user_id": "demo",
    "placed_at": "2025-12-31T18:05:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Cowboys +2",
    "odds": -110,
    "stake": 122,
    "result": "win",
    "payout": 232.91,
    "profit": 110.91,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-31T18:05:00.000Z"
  },
  {
    "id": "demo-42",
    "user_id": "demo",
    "placed_at": "2026-01-24T20:10:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Chiefs -7",
    "odds": -110,
    "stake": 67,
    "result": "loss",
    "payout": 0,
    "profit": -67,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-24T20:10:00.000Z"
  },
  {
    "id": "demo-43",
    "user_id": "demo",
    "placed_at": "2025-12-12T20:49:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Chiefs +1",
    "odds": -110,
    "stake": 62,
    "result": "win",
    "payout": 118.36,
    "profit": 56.36,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-12T20:49:00.000Z"
  },
  {
    "id": "demo-44",
    "user_id": "demo",
    "placed_at": "2025-11-10T21:29:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Broncos -5.5",
    "odds": -110,
    "stake": 83,
    "result": "loss",
    "payout": 0,
    "profit": -83,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-10T21:29:00.000Z"
  },
  {
    "id": "demo-45",
    "user_id": "demo",
    "placed_at": "2026-01-19T20:12:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "49ers -12.5",
    "odds": -110,
    "stake": 110,
    "result": "loss",
    "payout": 0,
    "profit": -110,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-19T20:12:00.000Z"
  },
  {
    "id": "demo-46",
    "user_id": "demo",
    "placed_at": "2025-12-29T17:19:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Lions -12.5",
    "odds": -110,
    "stake": 121,
    "result": "loss",
    "payout": 0,
    "profit": -121,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-29T17:19:00.000Z"
  },
  {
    "id": "demo-47",
    "user_id": "demo",
    "placed_at": "2025-12-11T17:40:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Vikings -6.5",
    "odds": -110,
    "stake": 106,
    "result": "loss",
    "payout": 0,
    "profit": -106,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-11T17:40:00.000Z"
  },
  {
    "id": "demo-48",
    "user_id": "demo",
    "placed_at": "2025-12-24T20:39:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Broncos -12",
    "odds": -110,
    "stake": 113,
    "result": "win",
    "payout": 215.73,
    "profit": 102.73,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-24T20:39:00.000Z"
  },
  {
    "id": "demo-49",
    "user_id": "demo",
    "placed_at": "2026-01-28T17:57:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Eagles -11",
    "odds": -110,
    "stake": 77,
    "result": "win",
    "payout": 147,
    "profit": 70,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-28T17:57:00.000Z"
  },
  {
    "id": "demo-50",
    "user_id": "demo",
    "placed_at": "2026-01-22T17:27:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Packers +1",
    "odds": -110,
    "stake": 82,
    "result": "win",
    "payout": 156.55,
    "profit": 74.55,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-22T17:27:00.000Z"
  },
  {
    "id": "demo-51",
    "user_id": "demo",
    "placed_at": "2026-01-23T18:17:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Texans +8",
    "odds": -110,
    "stake": 70,
    "result": "loss",
    "payout": 0,
    "profit": -70,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-23T18:17:00.000Z"
  },
  {
    "id": "demo-52",
    "user_id": "demo",
    "placed_at": "2026-01-13T20:30:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Texans -8",
    "odds": -110,
    "stake": 102,
    "result": "win",
    "payout": 194.73,
    "profit": 92.73,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-13T20:30:00.000Z"
  },
  {
    "id": "demo-53",
    "user_id": "demo",
    "placed_at": "2025-12-07T17:17:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Steelers +7",
    "odds": -110,
    "stake": 132,
    "result": "loss",
    "payout": 0,
    "profit": -132,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-07T17:17:00.000Z"
  },
  {
    "id": "demo-54",
    "user_id": "demo",
    "placed_at": "2025-12-01T21:14:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Bengals -3.5",
    "odds": -110,
    "stake": 101,
    "result": "loss",
    "payout": 0,
    "profit": -101,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-01T21:14:00.000Z"
  },
  {
    "id": "demo-55",
    "user_id": "demo",
    "placed_at": "2025-12-30T17:55:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Cowboys -3.5",
    "odds": -110,
    "stake": 73,
    "result": "loss",
    "payout": 0,
    "profit": -73,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-30T17:55:00.000Z"
  },
  {
    "id": "demo-56",
    "user_id": "demo",
    "placed_at": "2025-12-16T21:24:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Cowboys +7",
    "odds": -110,
    "stake": 107,
    "result": "win",
    "payout": 204.27,
    "profit": 97.27,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-16T21:24:00.000Z"
  },
  {
    "id": "demo-57",
    "user_id": "demo",
    "placed_at": "2025-12-06T18:23:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Bills -2.5",
    "odds": -110,
    "stake": 120,
    "result": "loss",
    "payout": 0,
    "profit": -120,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-06T18:23:00.000Z"
  },
  {
    "id": "demo-58",
    "user_id": "demo",
    "placed_at": "2026-01-22T17:08:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Texans +3.5",
    "odds": -110,
    "stake": 79,
    "result": "win",
    "payout": 150.82,
    "profit": 71.82,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-22T17:08:00.000Z"
  },
  {
    "id": "demo-59",
    "user_id": "demo",
    "placed_at": "2025-12-24T19:16:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Cowboys +8.5",
    "odds": -110,
    "stake": 84,
    "result": "win",
    "payout": 160.36,
    "profit": 76.36,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-24T19:16:00.000Z"
  },
  {
    "id": "demo-60",
    "user_id": "demo",
    "placed_at": "2025-11-06T21:56:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "spread",
    "description": "Chiefs -4.5",
    "odds": -110,
    "stake": 101,
    "result": "win",
    "payout": 192.82,
    "profit": 91.82,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-06T21:56:00.000Z"
  },
  {
    "id": "demo-61",
    "user_id": "demo",
    "placed_at": "2026-01-06T18:45:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "moneyline",
    "description": "Eagles ML",
    "odds": -150,
    "stake": 63,
    "result": "win",
    "payout": 105,
    "profit": 42,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-06T18:45:00.000Z"
  },
  {
    "id": "demo-62",
    "user_id": "demo",
    "placed_at": "2025-11-17T20:02:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "moneyline",
    "description": "Broncos ML",
    "odds": -130,
    "stake": 113,
    "result": "loss",
    "payout": 0,
    "profit": -113,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-17T20:02:00.000Z"
  },
  {
    "id": "demo-63",
    "user_id": "demo",
    "placed_at": "2025-12-30T17:54:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "moneyline",
    "description": "Ravens ML",
    "odds": -150,
    "stake": 78,
    "result": "win",
    "payout": 130,
    "profit": 52,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-30T17:54:00.000Z"
  },
  {
    "id": "demo-64",
    "user_id": "demo",
    "placed_at": "2025-11-19T20:37:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "moneyline",
    "description": "Texans ML",
    "odds": -150,
    "stake": 94,
    "result": "loss",
    "payout": 0,
    "profit": -94,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-19T20:37:00.000Z"
  },
  {
    "id": "demo-65",
    "user_id": "demo",
    "placed_at": "2026-01-16T18:10:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "moneyline",
    "description": "Ravens ML",
    "odds": 105,
    "stake": 93,
    "result": "win",
    "payout": 190.65,
    "profit": 97.65,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-16T18:10:00.000Z"
  },
  {
    "id": "demo-66",
    "user_id": "demo",
    "placed_at": "2025-12-13T19:50:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "moneyline",
    "description": "Bills ML",
    "odds": 105,
    "stake": 100,
    "result": "win",
    "payout": 205,
    "profit": 105,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-13T19:50:00.000Z"
  },
  {
    "id": "demo-67",
    "user_id": "demo",
    "placed_at": "2025-12-18T21:23:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "moneyline",
    "description": "Vikings ML",
    "odds": -150,
    "stake": 58,
    "result": "loss",
    "payout": 0,
    "profit": -58,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-18T21:23:00.000Z"
  },
  {
    "id": "demo-68",
    "user_id": "demo",
    "placed_at": "2026-01-14T17:32:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "moneyline",
    "description": "Bills ML",
    "odds": 105,
    "stake": 100,
    "result": "win",
    "payout": 205,
    "profit": 105,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-14T17:32:00.000Z"
  },
  {
    "id": "demo-69",
    "user_id": "demo",
    "placed_at": "2025-11-09T03:58:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "moneyline",
    "description": "Cowboys ML",
    "odds": 140,
    "stake": 62,
    "result": "loss",
    "payout": 0,
    "profit": -62,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-09T03:58:00.000Z"
  },
  {
    "id": "demo-70",
    "user_id": "demo",
    "placed_at": "2026-01-24T17:22:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "moneyline",
    "description": "Ravens ML",
    "odds": -130,
    "stake": 63,
    "result": "win",
    "payout": 111.46,
    "profit": 48.46,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-24T17:22:00.000Z"
  },
  {
    "id": "demo-71",
    "user_id": "demo",
    "placed_at": "2026-01-23T23:22:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "moneyline",
    "description": "49ers ML",
    "odds": 105,
    "stake": 75,
    "result": "loss",
    "payout": 0,
    "profit": -75,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-23T23:22:00.000Z"
  },
  {
    "id": "demo-72",
    "user_id": "demo",
    "placed_at": "2025-11-23T20:00:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "moneyline",
    "description": "Bengals ML",
    "odds": -130,
    "stake": 66,
    "result": "win",
    "payout": 116.77,
    "profit": 50.77,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-23T20:00:00.000Z"
  },
  {
    "id": "demo-73",
    "user_id": "demo",
    "placed_at": "2026-01-21T20:32:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "moneyline",
    "description": "Eagles ML",
    "odds": 140,
    "stake": 97,
    "result": "loss",
    "payout": 0,
    "profit": -97,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-21T20:32:00.000Z"
  },
  {
    "id": "demo-74",
    "user_id": "demo",
    "placed_at": "2026-01-26T19:00:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "moneyline",
    "description": "Lions ML",
    "odds": -180,
    "stake": 59,
    "result": "win",
    "payout": 91.78,
    "profit": 32.78,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-26T19:00:00.000Z"
  },
  {
    "id": "demo-75",
    "user_id": "demo",
    "placed_at": "2025-11-11T17:00:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Dolphins + Ravens + Dolphins",
    "odds": 500,
    "stake": 44,
    "result": "loss",
    "payout": 0,
    "profit": -44,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-11T17:00:00.000Z"
  },
  {
    "id": "demo-76",
    "user_id": "demo",
    "placed_at": "2026-01-09T21:51:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Steelers + Cowboys + Broncos",
    "odds": 500,
    "stake": 44,
    "result": "loss",
    "payout": 0,
    "profit": -44,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-09T21:51:00.000Z"
  },
  {
    "id": "demo-77",
    "user_id": "demo",
    "placed_at": "2026-01-17T20:21:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Eagles + Lions + Texans",
    "odds": 500,
    "stake": 29,
    "result": "loss",
    "payout": 0,
    "profit": -29,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-17T20:21:00.000Z"
  },
  {
    "id": "demo-78",
    "user_id": "demo",
    "placed_at": "2025-11-03T21:25:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Ravens + Lions + Vikings",
    "odds": 500,
    "stake": 23,
    "result": "loss",
    "payout": 0,
    "profit": -23,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-03T21:25:00.000Z"
  },
  {
    "id": "demo-79",
    "user_id": "demo",
    "placed_at": "2026-01-04T21:43:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Vikings + Broncos + Texans",
    "odds": 500,
    "stake": 33,
    "result": "win",
    "payout": 198,
    "profit": 165,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-04T21:43:00.000Z"
  },
  {
    "id": "demo-80",
    "user_id": "demo",
    "placed_at": "2026-01-22T18:20:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Steelers + Ravens + Dolphins",
    "odds": 500,
    "stake": 42,
    "result": "loss",
    "payout": 0,
    "profit": -42,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-22T18:20:00.000Z"
  },
  {
    "id": "demo-81",
    "user_id": "demo",
    "placed_at": "2025-11-11T18:34:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Dolphins + Steelers + Ravens",
    "odds": 500,
    "stake": 44,
    "result": "loss",
    "payout": 0,
    "profit": -44,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-11T18:34:00.000Z"
  },
  {
    "id": "demo-82",
    "user_id": "demo",
    "placed_at": "2026-01-27T22:48:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Chiefs + Steelers + Cowboys",
    "odds": 500,
    "stake": 23,
    "result": "loss",
    "payout": 0,
    "profit": -23,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-27T22:48:00.000Z"
  },
  {
    "id": "demo-83",
    "user_id": "demo",
    "placed_at": "2025-11-20T19:49:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Chiefs + Broncos + Texans",
    "odds": 500,
    "stake": 37,
    "result": "loss",
    "payout": 0,
    "profit": -37,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-20T19:49:00.000Z"
  },
  {
    "id": "demo-84",
    "user_id": "demo",
    "placed_at": "2025-12-23T00:18:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Dolphins + Dolphins + Dolphins",
    "odds": 500,
    "stake": 43,
    "result": "loss",
    "payout": 0,
    "profit": -43,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-23T00:18:00.000Z"
  },
  {
    "id": "demo-85",
    "user_id": "demo",
    "placed_at": "2025-11-15T22:23:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Chiefs + 49ers + Vikings",
    "odds": 500,
    "stake": 24,
    "result": "loss",
    "payout": 0,
    "profit": -24,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-15T22:23:00.000Z"
  },
  {
    "id": "demo-86",
    "user_id": "demo",
    "placed_at": "2026-01-27T02:10:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Bengals + 49ers + Eagles",
    "odds": 500,
    "stake": 33,
    "result": "loss",
    "payout": 0,
    "profit": -33,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-27T02:10:00.000Z"
  },
  {
    "id": "demo-87",
    "user_id": "demo",
    "placed_at": "2025-11-05T23:36:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: 49ers + Lions + Eagles",
    "odds": 500,
    "stake": 34,
    "result": "loss",
    "payout": 0,
    "profit": -34,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-05T23:36:00.000Z"
  },
  {
    "id": "demo-88",
    "user_id": "demo",
    "placed_at": "2026-01-24T20:23:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Steelers + Steelers + Cowboys",
    "odds": 500,
    "stake": 40,
    "result": "loss",
    "payout": 0,
    "profit": -40,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-24T20:23:00.000Z"
  },
  {
    "id": "demo-89",
    "user_id": "demo",
    "placed_at": "2026-01-23T20:34:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Eagles + Bengals + Chiefs",
    "odds": 500,
    "stake": 39,
    "result": "loss",
    "payout": 0,
    "profit": -39,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-23T20:34:00.000Z"
  },
  {
    "id": "demo-90",
    "user_id": "demo",
    "placed_at": "2025-11-29T22:05:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Texans + Bengals + Bills",
    "odds": 500,
    "stake": 27,
    "result": "loss",
    "payout": 0,
    "profit": -27,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-29T22:05:00.000Z"
  },
  {
    "id": "demo-91",
    "user_id": "demo",
    "placed_at": "2026-01-18T01:56:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Lions + Texans + Steelers",
    "odds": 500,
    "stake": 36,
    "result": "loss",
    "payout": 0,
    "profit": -36,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-18T01:56:00.000Z"
  },
  {
    "id": "demo-92",
    "user_id": "demo",
    "placed_at": "2025-11-21T22:41:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Ravens + Chiefs + Eagles",
    "odds": 500,
    "stake": 37,
    "result": "loss",
    "payout": 0,
    "profit": -37,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-21T22:41:00.000Z"
  },
  {
    "id": "demo-93",
    "user_id": "demo",
    "placed_at": "2025-12-29T21:52:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Steelers + Lions + Bengals",
    "odds": 500,
    "stake": 36,
    "result": "loss",
    "payout": 0,
    "profit": -36,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-29T21:52:00.000Z"
  },
  {
    "id": "demo-94",
    "user_id": "demo",
    "placed_at": "2025-11-14T18:01:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Chiefs + Texans + Texans",
    "odds": 500,
    "stake": 41,
    "result": "win",
    "payout": 246,
    "profit": 205,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-14T18:01:00.000Z"
  },
  {
    "id": "demo-95",
    "user_id": "demo",
    "placed_at": "2025-12-07T22:45:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Eagles + Bengals + Steelers",
    "odds": 500,
    "stake": 31,
    "result": "loss",
    "payout": 0,
    "profit": -31,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-07T22:45:00.000Z"
  },
  {
    "id": "demo-96",
    "user_id": "demo",
    "placed_at": "2026-01-11T23:16:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Bengals + Packers + Dolphins",
    "odds": 500,
    "stake": 28,
    "result": "loss",
    "payout": 0,
    "profit": -28,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-11T23:16:00.000Z"
  },
  {
    "id": "demo-97",
    "user_id": "demo",
    "placed_at": "2025-11-21T17:53:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Bengals + Bengals + Broncos",
    "odds": 500,
    "stake": 32,
    "result": "loss",
    "payout": 0,
    "profit": -32,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-21T17:53:00.000Z"
  },
  {
    "id": "demo-98",
    "user_id": "demo",
    "placed_at": "2026-01-18T00:03:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Dolphins + Broncos + Bills",
    "odds": 500,
    "stake": 25,
    "result": "loss",
    "payout": 0,
    "profit": -25,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-18T00:03:00.000Z"
  },
  {
    "id": "demo-99",
    "user_id": "demo",
    "placed_at": "2025-12-08T18:04:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Chiefs + Packers + Packers",
    "odds": 500,
    "stake": 24,
    "result": "loss",
    "payout": 0,
    "profit": -24,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-08T18:04:00.000Z"
  },
  {
    "id": "demo-100",
    "user_id": "demo",
    "placed_at": "2026-01-20T19:03:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Bengals + Steelers + Bengals",
    "odds": 500,
    "stake": 38,
    "result": "loss",
    "payout": 0,
    "profit": -38,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-20T19:03:00.000Z"
  },
  {
    "id": "demo-101",
    "user_id": "demo",
    "placed_at": "2025-11-18T20:07:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Packers + Dolphins + Packers",
    "odds": 500,
    "stake": 33,
    "result": "loss",
    "payout": 0,
    "profit": -33,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-18T20:07:00.000Z"
  },
  {
    "id": "demo-102",
    "user_id": "demo",
    "placed_at": "2025-12-10T23:28:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Packers + Eagles + Ravens",
    "odds": 500,
    "stake": 39,
    "result": "loss",
    "payout": 0,
    "profit": -39,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-10T23:28:00.000Z"
  },
  {
    "id": "demo-103",
    "user_id": "demo",
    "placed_at": "2025-12-27T22:06:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Broncos + Lions + Bengals",
    "odds": 500,
    "stake": 33,
    "result": "win",
    "payout": 198,
    "profit": 165,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-27T22:06:00.000Z"
  },
  {
    "id": "demo-104",
    "user_id": "demo",
    "placed_at": "2025-12-22T22:12:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Texans + 49ers + Vikings",
    "odds": 500,
    "stake": 31,
    "result": "win",
    "payout": 186,
    "profit": 155,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-22T22:12:00.000Z"
  },
  {
    "id": "demo-105",
    "user_id": "demo",
    "placed_at": "2025-12-21T18:00:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Lions + Bengals + Chiefs",
    "odds": 500,
    "stake": 35,
    "result": "loss",
    "payout": 0,
    "profit": -35,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-21T18:00:00.000Z"
  },
  {
    "id": "demo-106",
    "user_id": "demo",
    "placed_at": "2025-11-21T19:34:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Chiefs + Chiefs + Eagles",
    "odds": 500,
    "stake": 25,
    "result": "loss",
    "payout": 0,
    "profit": -25,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-21T19:34:00.000Z"
  },
  {
    "id": "demo-107",
    "user_id": "demo",
    "placed_at": "2026-01-04T02:57:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Texans + Bills + Ravens",
    "odds": 500,
    "stake": 44,
    "result": "loss",
    "payout": 0,
    "profit": -44,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-04T02:57:00.000Z"
  },
  {
    "id": "demo-108",
    "user_id": "demo",
    "placed_at": "2026-01-26T22:46:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Bengals + Dolphins + Packers",
    "odds": 500,
    "stake": 40,
    "result": "loss",
    "payout": 0,
    "profit": -40,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-26T22:46:00.000Z"
  },
  {
    "id": "demo-109",
    "user_id": "demo",
    "placed_at": "2025-11-04T22:04:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Packers + Dolphins + Eagles",
    "odds": 500,
    "stake": 35,
    "result": "loss",
    "payout": 0,
    "profit": -35,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-04T22:04:00.000Z"
  },
  {
    "id": "demo-110",
    "user_id": "demo",
    "placed_at": "2026-01-23T21:17:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Chiefs + Eagles + Chiefs",
    "odds": 500,
    "stake": 21,
    "result": "loss",
    "payout": 0,
    "profit": -21,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-23T21:17:00.000Z"
  },
  {
    "id": "demo-111",
    "user_id": "demo",
    "placed_at": "2025-11-27T17:00:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Broncos + Broncos + Texans",
    "odds": 500,
    "stake": 27,
    "result": "loss",
    "payout": 0,
    "profit": -27,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-27T17:00:00.000Z"
  },
  {
    "id": "demo-112",
    "user_id": "demo",
    "placed_at": "2025-11-17T22:32:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Texans + 49ers + Packers",
    "odds": 500,
    "stake": 39,
    "result": "loss",
    "payout": 0,
    "profit": -39,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-17T22:32:00.000Z"
  },
  {
    "id": "demo-113",
    "user_id": "demo",
    "placed_at": "2025-11-22T01:13:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Chiefs + Steelers + Dolphins",
    "odds": 500,
    "stake": 26,
    "result": "loss",
    "payout": 0,
    "profit": -26,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-22T01:13:00.000Z"
  },
  {
    "id": "demo-114",
    "user_id": "demo",
    "placed_at": "2026-01-27T19:08:00.000Z",
    "sport": "NFL",
    "league": "NFL",
    "bet_type": "parlay",
    "description": "3-leg NFL parlay: Lions + Steelers + Packers",
    "odds": 500,
    "stake": 35,
    "result": "loss",
    "payout": 0,
    "profit": -35,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-27T19:08:00.000Z"
  },
  {
    "id": "demo-115",
    "user_id": "demo",
    "placed_at": "2026-01-04T21:45:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Bucks -8.5",
    "odds": -110,
    "stake": 81,
    "result": "loss",
    "payout": 0,
    "profit": -81,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-04T21:45:00.000Z"
  },
  {
    "id": "demo-116",
    "user_id": "demo",
    "placed_at": "2025-12-02T20:00:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Knicks +10",
    "odds": -110,
    "stake": 106,
    "result": "loss",
    "payout": 0,
    "profit": -106,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-02T20:00:00.000Z"
  },
  {
    "id": "demo-117",
    "user_id": "demo",
    "placed_at": "2025-12-27T20:50:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Lakers -9",
    "odds": -110,
    "stake": 74,
    "result": "win",
    "payout": 141.27,
    "profit": 67.27,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-27T20:50:00.000Z"
  },
  {
    "id": "demo-118",
    "user_id": "demo",
    "placed_at": "2026-01-13T20:22:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Timberwolves -10.5",
    "odds": -110,
    "stake": 53,
    "result": "loss",
    "payout": 0,
    "profit": -53,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-13T20:22:00.000Z"
  },
  {
    "id": "demo-119",
    "user_id": "demo",
    "placed_at": "2025-12-12T19:35:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Thunder +2.5",
    "odds": -110,
    "stake": 59,
    "result": "loss",
    "payout": 0,
    "profit": -59,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-12T19:35:00.000Z"
  },
  {
    "id": "demo-120",
    "user_id": "demo",
    "placed_at": "2026-01-26T20:52:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Warriors -8.5",
    "odds": -110,
    "stake": 66,
    "result": "loss",
    "payout": 0,
    "profit": -66,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-26T20:52:00.000Z"
  },
  {
    "id": "demo-121",
    "user_id": "demo",
    "placed_at": "2025-11-10T22:52:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Celtics +1",
    "odds": -110,
    "stake": 77,
    "result": "win",
    "payout": 147,
    "profit": 70,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-10T22:52:00.000Z"
  },
  {
    "id": "demo-122",
    "user_id": "demo",
    "placed_at": "2025-11-01T03:44:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Thunder -4",
    "odds": -110,
    "stake": 95,
    "result": "loss",
    "payout": 0,
    "profit": -95,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-01T03:44:00.000Z"
  },
  {
    "id": "demo-123",
    "user_id": "demo",
    "placed_at": "2025-11-13T19:17:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Thunder -5.5",
    "odds": -110,
    "stake": 66,
    "result": "win",
    "payout": 126,
    "profit": 60,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-13T19:17:00.000Z"
  },
  {
    "id": "demo-124",
    "user_id": "demo",
    "placed_at": "2025-11-25T19:12:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Celtics +4.5",
    "odds": -110,
    "stake": 71,
    "result": "loss",
    "payout": 0,
    "profit": -71,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-25T19:12:00.000Z"
  },
  {
    "id": "demo-125",
    "user_id": "demo",
    "placed_at": "2026-01-30T21:50:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Lakers +3.5",
    "odds": -110,
    "stake": 57,
    "result": "win",
    "payout": 108.82,
    "profit": 51.82,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-30T21:50:00.000Z"
  },
  {
    "id": "demo-126",
    "user_id": "demo",
    "placed_at": "2025-11-07T21:50:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Cavaliers +8",
    "odds": -110,
    "stake": 102,
    "result": "win",
    "payout": 194.73,
    "profit": 92.73,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-07T21:50:00.000Z"
  },
  {
    "id": "demo-127",
    "user_id": "demo",
    "placed_at": "2026-01-27T19:09:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Timberwolves +4.5",
    "odds": -110,
    "stake": 94,
    "result": "loss",
    "payout": 0,
    "profit": -94,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-27T19:09:00.000Z"
  },
  {
    "id": "demo-128",
    "user_id": "demo",
    "placed_at": "2026-01-12T22:28:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Knicks +2.5",
    "odds": -110,
    "stake": 66,
    "result": "win",
    "payout": 126,
    "profit": 60,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-12T22:28:00.000Z"
  },
  {
    "id": "demo-129",
    "user_id": "demo",
    "placed_at": "2026-01-22T20:00:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Suns -5",
    "odds": -110,
    "stake": 53,
    "result": "loss",
    "payout": 0,
    "profit": -53,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-22T20:00:00.000Z"
  },
  {
    "id": "demo-130",
    "user_id": "demo",
    "placed_at": "2025-11-04T22:47:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Nuggets +1.5",
    "odds": -110,
    "stake": 95,
    "result": "win",
    "payout": 181.36,
    "profit": 86.36,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-04T22:47:00.000Z"
  },
  {
    "id": "demo-131",
    "user_id": "demo",
    "placed_at": "2025-12-24T21:53:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Mavericks +10",
    "odds": -110,
    "stake": 90,
    "result": "win",
    "payout": 171.82,
    "profit": 81.82,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-24T21:53:00.000Z"
  },
  {
    "id": "demo-132",
    "user_id": "demo",
    "placed_at": "2026-01-29T21:21:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "76ers -7",
    "odds": -110,
    "stake": 54,
    "result": "win",
    "payout": 103.09,
    "profit": 49.09,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-29T21:21:00.000Z"
  },
  {
    "id": "demo-133",
    "user_id": "demo",
    "placed_at": "2025-11-17T21:54:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "76ers -1.5",
    "odds": -110,
    "stake": 94,
    "result": "win",
    "payout": 179.45,
    "profit": 85.45,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-17T21:54:00.000Z"
  },
  {
    "id": "demo-134",
    "user_id": "demo",
    "placed_at": "2025-12-15T22:31:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Timberwolves -3",
    "odds": -110,
    "stake": 67,
    "result": "loss",
    "payout": 0,
    "profit": -67,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-15T22:31:00.000Z"
  },
  {
    "id": "demo-135",
    "user_id": "demo",
    "placed_at": "2026-01-05T21:11:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Thunder +1",
    "odds": -110,
    "stake": 68,
    "result": "loss",
    "payout": 0,
    "profit": -68,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-05T21:11:00.000Z"
  },
  {
    "id": "demo-136",
    "user_id": "demo",
    "placed_at": "2025-11-08T22:50:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Magic -9.5",
    "odds": -110,
    "stake": 52,
    "result": "win",
    "payout": 99.27,
    "profit": 47.27,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-08T22:50:00.000Z"
  },
  {
    "id": "demo-137",
    "user_id": "demo",
    "placed_at": "2025-11-19T22:49:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Cavaliers +5.5",
    "odds": -110,
    "stake": 84,
    "result": "loss",
    "payout": 0,
    "profit": -84,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-19T22:49:00.000Z"
  },
  {
    "id": "demo-138",
    "user_id": "demo",
    "placed_at": "2026-01-04T19:33:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Nuggets +2",
    "odds": -110,
    "stake": 69,
    "result": "win",
    "payout": 131.73,
    "profit": 62.73,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-04T19:33:00.000Z"
  },
  {
    "id": "demo-139",
    "user_id": "demo",
    "placed_at": "2026-01-28T20:41:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Timberwolves -3",
    "odds": -110,
    "stake": 51,
    "result": "loss",
    "payout": 0,
    "profit": -51,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-28T20:41:00.000Z"
  },
  {
    "id": "demo-140",
    "user_id": "demo",
    "placed_at": "2026-01-05T22:32:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Timberwolves +8.5",
    "odds": -110,
    "stake": 92,
    "result": "win",
    "payout": 175.64,
    "profit": 83.64,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-05T22:32:00.000Z"
  },
  {
    "id": "demo-141",
    "user_id": "demo",
    "placed_at": "2026-01-13T19:57:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Knicks -10",
    "odds": -110,
    "stake": 108,
    "result": "loss",
    "payout": 0,
    "profit": -108,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-13T19:57:00.000Z"
  },
  {
    "id": "demo-142",
    "user_id": "demo",
    "placed_at": "2025-11-11T22:05:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Nuggets -6",
    "odds": -110,
    "stake": 76,
    "result": "loss",
    "payout": 0,
    "profit": -76,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-11T22:05:00.000Z"
  },
  {
    "id": "demo-143",
    "user_id": "demo",
    "placed_at": "2026-01-19T20:58:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "76ers +1.5",
    "odds": -110,
    "stake": 89,
    "result": "win",
    "payout": 169.91,
    "profit": 80.91,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-19T20:58:00.000Z"
  },
  {
    "id": "demo-144",
    "user_id": "demo",
    "placed_at": "2025-12-08T20:32:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "76ers -5.5",
    "odds": -110,
    "stake": 97,
    "result": "loss",
    "payout": 0,
    "profit": -97,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-08T20:32:00.000Z"
  },
  {
    "id": "demo-145",
    "user_id": "demo",
    "placed_at": "2025-11-11T00:54:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Suns +8.5",
    "odds": -110,
    "stake": 80,
    "result": "loss",
    "payout": 0,
    "profit": -80,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-11T00:54:00.000Z"
  },
  {
    "id": "demo-146",
    "user_id": "demo",
    "placed_at": "2026-01-13T20:34:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Lakers -7.5",
    "odds": -110,
    "stake": 69,
    "result": "win",
    "payout": 131.73,
    "profit": 62.73,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-13T20:34:00.000Z"
  },
  {
    "id": "demo-147",
    "user_id": "demo",
    "placed_at": "2025-11-19T21:23:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Celtics -1",
    "odds": -110,
    "stake": 93,
    "result": "win",
    "payout": 177.55,
    "profit": 84.55,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-19T21:23:00.000Z"
  },
  {
    "id": "demo-148",
    "user_id": "demo",
    "placed_at": "2026-01-13T20:26:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Warriors +3",
    "odds": -110,
    "stake": 55,
    "result": "win",
    "payout": 105,
    "profit": 50,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-13T20:26:00.000Z"
  },
  {
    "id": "demo-149",
    "user_id": "demo",
    "placed_at": "2025-12-15T21:31:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Suns -9",
    "odds": -110,
    "stake": 100,
    "result": "loss",
    "payout": 0,
    "profit": -100,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-15T21:31:00.000Z"
  },
  {
    "id": "demo-150",
    "user_id": "demo",
    "placed_at": "2025-12-02T22:51:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Nuggets +6.5",
    "odds": -110,
    "stake": 67,
    "result": "loss",
    "payout": 0,
    "profit": -67,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-02T22:51:00.000Z"
  },
  {
    "id": "demo-151",
    "user_id": "demo",
    "placed_at": "2025-11-14T21:32:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "76ers -9",
    "odds": -110,
    "stake": 87,
    "result": "win",
    "payout": 166.09,
    "profit": 79.09,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-14T21:32:00.000Z"
  },
  {
    "id": "demo-152",
    "user_id": "demo",
    "placed_at": "2026-01-26T19:15:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "76ers -5.5",
    "odds": -110,
    "stake": 89,
    "result": "win",
    "payout": 169.91,
    "profit": 80.91,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-26T19:15:00.000Z"
  },
  {
    "id": "demo-153",
    "user_id": "demo",
    "placed_at": "2025-11-05T21:29:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Thunder -8",
    "odds": -110,
    "stake": 80,
    "result": "loss",
    "payout": 0,
    "profit": -80,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-05T21:29:00.000Z"
  },
  {
    "id": "demo-154",
    "user_id": "demo",
    "placed_at": "2025-12-20T23:55:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Magic -7",
    "odds": -110,
    "stake": 51,
    "result": "loss",
    "payout": 0,
    "profit": -51,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-20T23:55:00.000Z"
  },
  {
    "id": "demo-155",
    "user_id": "demo",
    "placed_at": "2025-11-10T23:08:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Warriors -6.5",
    "odds": -110,
    "stake": 84,
    "result": "loss",
    "payout": 0,
    "profit": -84,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-10T23:08:00.000Z"
  },
  {
    "id": "demo-156",
    "user_id": "demo",
    "placed_at": "2025-11-01T21:02:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Suns -5",
    "odds": -110,
    "stake": 101,
    "result": "win",
    "payout": 192.82,
    "profit": 91.82,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-01T21:02:00.000Z"
  },
  {
    "id": "demo-157",
    "user_id": "demo",
    "placed_at": "2026-01-25T20:18:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Magic +2.5",
    "odds": -110,
    "stake": 59,
    "result": "win",
    "payout": 112.64,
    "profit": 53.64,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-25T20:18:00.000Z"
  },
  {
    "id": "demo-158",
    "user_id": "demo",
    "placed_at": "2025-11-24T21:27:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Timberwolves +3.5",
    "odds": -110,
    "stake": 76,
    "result": "loss",
    "payout": 0,
    "profit": -76,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-24T21:27:00.000Z"
  },
  {
    "id": "demo-159",
    "user_id": "demo",
    "placed_at": "2025-11-08T19:23:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "76ers -3",
    "odds": -110,
    "stake": 100,
    "result": "win",
    "payout": 190.91,
    "profit": 90.91,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-08T19:23:00.000Z"
  },
  {
    "id": "demo-160",
    "user_id": "demo",
    "placed_at": "2025-12-27T21:48:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Timberwolves +7.5",
    "odds": -110,
    "stake": 78,
    "result": "win",
    "payout": 148.91,
    "profit": 70.91,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-27T21:48:00.000Z"
  },
  {
    "id": "demo-161",
    "user_id": "demo",
    "placed_at": "2025-11-13T19:00:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Knicks +5",
    "odds": -110,
    "stake": 57,
    "result": "win",
    "payout": 108.82,
    "profit": 51.82,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-13T19:00:00.000Z"
  },
  {
    "id": "demo-162",
    "user_id": "demo",
    "placed_at": "2025-11-27T21:14:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Celtics -5.5",
    "odds": -110,
    "stake": 108,
    "result": "loss",
    "payout": 0,
    "profit": -108,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-27T21:14:00.000Z"
  },
  {
    "id": "demo-163",
    "user_id": "demo",
    "placed_at": "2026-01-03T21:35:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Magic +6.5",
    "odds": -110,
    "stake": 109,
    "result": "loss",
    "payout": 0,
    "profit": -109,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-03T21:35:00.000Z"
  },
  {
    "id": "demo-164",
    "user_id": "demo",
    "placed_at": "2025-11-07T22:14:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Cavaliers +10.5",
    "odds": -110,
    "stake": 80,
    "result": "loss",
    "payout": 0,
    "profit": -80,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-07T22:14:00.000Z"
  },
  {
    "id": "demo-165",
    "user_id": "demo",
    "placed_at": "2025-12-15T21:15:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "moneyline",
    "description": "Bucks ML",
    "odds": -160,
    "stake": 82,
    "result": "loss",
    "payout": 0,
    "profit": -82,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-15T21:15:00.000Z"
  },
  {
    "id": "demo-166",
    "user_id": "demo",
    "placed_at": "2026-01-09T20:56:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "moneyline",
    "description": "Celtics ML",
    "odds": -200,
    "stake": 76,
    "result": "win",
    "payout": 114,
    "profit": 38,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-09T20:56:00.000Z"
  },
  {
    "id": "demo-167",
    "user_id": "demo",
    "placed_at": "2025-11-11T21:54:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "moneyline",
    "description": "Warriors ML",
    "odds": -160,
    "stake": 60,
    "result": "loss",
    "payout": 0,
    "profit": -60,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-11T21:54:00.000Z"
  },
  {
    "id": "demo-168",
    "user_id": "demo",
    "placed_at": "2025-12-14T20:50:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "moneyline",
    "description": "Cavaliers ML",
    "odds": 110,
    "stake": 86,
    "result": "win",
    "payout": 180.6,
    "profit": 94.6,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-14T20:50:00.000Z"
  },
  {
    "id": "demo-169",
    "user_id": "demo",
    "placed_at": "2026-01-16T22:14:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "moneyline",
    "description": "Mavericks ML",
    "odds": 115,
    "stake": 79,
    "result": "loss",
    "payout": 0,
    "profit": -79,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-16T22:14:00.000Z"
  },
  {
    "id": "demo-170",
    "user_id": "demo",
    "placed_at": "2026-01-27T22:30:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "moneyline",
    "description": "Suns ML",
    "odds": -160,
    "stake": 72,
    "result": "win",
    "payout": 117,
    "profit": 45,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-27T22:30:00.000Z"
  },
  {
    "id": "demo-171",
    "user_id": "demo",
    "placed_at": "2025-12-22T22:49:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "moneyline",
    "description": "Celtics ML",
    "odds": 130,
    "stake": 96,
    "result": "win",
    "payout": 220.8,
    "profit": 124.8,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-22T22:49:00.000Z"
  },
  {
    "id": "demo-172",
    "user_id": "demo",
    "placed_at": "2026-01-14T23:51:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "moneyline",
    "description": "Mavericks ML",
    "odds": 130,
    "stake": 87,
    "result": "loss",
    "payout": 0,
    "profit": -87,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-14T23:51:00.000Z"
  },
  {
    "id": "demo-173",
    "user_id": "demo",
    "placed_at": "2025-12-06T21:20:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "moneyline",
    "description": "Cavaliers ML",
    "odds": 110,
    "stake": 95,
    "result": "loss",
    "payout": 0,
    "profit": -95,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-06T21:20:00.000Z"
  },
  {
    "id": "demo-174",
    "user_id": "demo",
    "placed_at": "2025-11-28T20:58:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "moneyline",
    "description": "Thunder ML",
    "odds": 110,
    "stake": 64,
    "result": "win",
    "payout": 134.4,
    "profit": 70.4,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-28T20:58:00.000Z"
  },
  {
    "id": "demo-175",
    "user_id": "demo",
    "placed_at": "2026-01-18T20:30:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "moneyline",
    "description": "Heat ML",
    "odds": 115,
    "stake": 54,
    "result": "loss",
    "payout": 0,
    "profit": -54,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-18T20:30:00.000Z"
  },
  {
    "id": "demo-176",
    "user_id": "demo",
    "placed_at": "2025-12-08T22:13:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "moneyline",
    "description": "Magic ML",
    "odds": 130,
    "stake": 85,
    "result": "win",
    "payout": 195.5,
    "profit": 110.5,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-08T22:13:00.000Z"
  },
  {
    "id": "demo-177",
    "user_id": "demo",
    "placed_at": "2025-12-18T22:57:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "moneyline",
    "description": "Cavaliers ML",
    "odds": 110,
    "stake": 66,
    "result": "win",
    "payout": 138.6,
    "profit": 72.6,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-18T22:57:00.000Z"
  },
  {
    "id": "demo-178",
    "user_id": "demo",
    "placed_at": "2025-11-09T22:12:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "moneyline",
    "description": "Bucks ML",
    "odds": -200,
    "stake": 56,
    "result": "win",
    "payout": 84,
    "profit": 28,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-09T22:12:00.000Z"
  },
  {
    "id": "demo-179",
    "user_id": "demo",
    "placed_at": "2025-12-28T19:26:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "moneyline",
    "description": "Nuggets ML",
    "odds": -160,
    "stake": 72,
    "result": "loss",
    "payout": 0,
    "profit": -72,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-28T19:26:00.000Z"
  },
  {
    "id": "demo-180",
    "user_id": "demo",
    "placed_at": "2026-01-11T19:04:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "moneyline",
    "description": "Timberwolves ML",
    "odds": 110,
    "stake": 79,
    "result": "loss",
    "payout": 0,
    "profit": -79,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-11T19:04:00.000Z"
  },
  {
    "id": "demo-181",
    "user_id": "demo",
    "placed_at": "2025-11-22T23:10:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "LeBron James Over 20.5 pts",
    "odds": -105,
    "stake": 56,
    "result": "loss",
    "payout": 0,
    "profit": -56,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-22T23:10:00.000Z"
  },
  {
    "id": "demo-182",
    "user_id": "demo",
    "placed_at": "2025-12-13T19:49:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Curry Over 10.5 reb",
    "odds": -115,
    "stake": 50,
    "result": "win",
    "payout": 93.48,
    "profit": 43.48,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-13T19:49:00.000Z"
  },
  {
    "id": "demo-183",
    "user_id": "demo",
    "placed_at": "2025-11-23T21:07:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "LeBron James Over 23.5 pts",
    "odds": -115,
    "stake": 42,
    "result": "loss",
    "payout": 0,
    "profit": -42,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-23T21:07:00.000Z"
  },
  {
    "id": "demo-184",
    "user_id": "demo",
    "placed_at": "2026-01-12T20:36:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Doncic Over 3.5 3pt",
    "odds": -115,
    "stake": 60,
    "result": "loss",
    "payout": 0,
    "profit": -60,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-12T20:36:00.000Z"
  },
  {
    "id": "demo-185",
    "user_id": "demo",
    "placed_at": "2025-11-28T19:49:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Edwards Over 5.5 3pt",
    "odds": 100,
    "stake": 44,
    "result": "win",
    "payout": 88,
    "profit": 44,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-28T19:49:00.000Z"
  },
  {
    "id": "demo-186",
    "user_id": "demo",
    "placed_at": "2025-11-30T21:22:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Edwards Over 6.5 reb",
    "odds": 105,
    "stake": 42,
    "result": "win",
    "payout": 86.1,
    "profit": 44.1,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-30T21:22:00.000Z"
  },
  {
    "id": "demo-187",
    "user_id": "demo",
    "placed_at": "2026-01-03T20:32:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Jokic Over 31.5 pts",
    "odds": -115,
    "stake": 67,
    "result": "loss",
    "payout": 0,
    "profit": -67,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-03T20:32:00.000Z"
  },
  {
    "id": "demo-188",
    "user_id": "demo",
    "placed_at": "2026-01-06T20:41:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Brunson Over 20.5 pts",
    "odds": 105,
    "stake": 65,
    "result": "loss",
    "payout": 0,
    "profit": -65,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-06T20:41:00.000Z"
  },
  {
    "id": "demo-189",
    "user_id": "demo",
    "placed_at": "2026-01-28T20:46:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Brunson Over 25.5 pts",
    "odds": -110,
    "stake": 75,
    "result": "loss",
    "payout": 0,
    "profit": -75,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-28T20:46:00.000Z"
  },
  {
    "id": "demo-190",
    "user_id": "demo",
    "placed_at": "2025-11-15T20:34:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "LeBron James Over 9.5 ast",
    "odds": -110,
    "stake": 49,
    "result": "loss",
    "payout": 0,
    "profit": -49,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-15T20:34:00.000Z"
  },
  {
    "id": "demo-191",
    "user_id": "demo",
    "placed_at": "2025-11-15T20:08:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Giannis Over 5.5 reb",
    "odds": 100,
    "stake": 79,
    "result": "win",
    "payout": 158,
    "profit": 79,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-15T20:08:00.000Z"
  },
  {
    "id": "demo-192",
    "user_id": "demo",
    "placed_at": "2025-11-30T01:51:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Gilgeous-Alexander Over 6.5 ast",
    "odds": 105,
    "stake": 43,
    "result": "loss",
    "payout": 0,
    "profit": -43,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-30T01:51:00.000Z"
  },
  {
    "id": "demo-193",
    "user_id": "demo",
    "placed_at": "2025-12-07T22:22:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "LeBron James Over 5.5 3pt",
    "odds": 100,
    "stake": 67,
    "result": "loss",
    "payout": 0,
    "profit": -67,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-07T22:22:00.000Z"
  },
  {
    "id": "demo-194",
    "user_id": "demo",
    "placed_at": "2025-11-17T22:20:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Giannis Over 26.5 pts",
    "odds": 105,
    "stake": 64,
    "result": "loss",
    "payout": 0,
    "profit": -64,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-17T22:20:00.000Z"
  },
  {
    "id": "demo-195",
    "user_id": "demo",
    "placed_at": "2025-11-05T20:49:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Curry Over 8.5 ast",
    "odds": -105,
    "stake": 47,
    "result": "win",
    "payout": 91.76,
    "profit": 44.76,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-05T20:49:00.000Z"
  },
  {
    "id": "demo-196",
    "user_id": "demo",
    "placed_at": "2026-01-11T21:15:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Tatum Over 30.5 pts",
    "odds": -110,
    "stake": 43,
    "result": "win",
    "payout": 82.09,
    "profit": 39.09,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-11T21:15:00.000Z"
  },
  {
    "id": "demo-197",
    "user_id": "demo",
    "placed_at": "2025-11-11T03:03:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Doncic Over 3.5 3pt",
    "odds": -110,
    "stake": 57,
    "result": "loss",
    "payout": 0,
    "profit": -57,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-11T03:03:00.000Z"
  },
  {
    "id": "demo-198",
    "user_id": "demo",
    "placed_at": "2025-12-28T22:31:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Doncic Over 5.5 ast",
    "odds": 100,
    "stake": 79,
    "result": "loss",
    "payout": 0,
    "profit": -79,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-28T22:31:00.000Z"
  },
  {
    "id": "demo-199",
    "user_id": "demo",
    "placed_at": "2025-11-01T21:13:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Edwards Over 3.5 3pt",
    "odds": 105,
    "stake": 48,
    "result": "win",
    "payout": 98.4,
    "profit": 50.4,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-01T21:13:00.000Z"
  },
  {
    "id": "demo-200",
    "user_id": "demo",
    "placed_at": "2025-12-12T23:27:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Jokic Over 31.5 pts",
    "odds": -110,
    "stake": 74,
    "result": "loss",
    "payout": 0,
    "profit": -74,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-12T23:27:00.000Z"
  },
  {
    "id": "demo-201",
    "user_id": "demo",
    "placed_at": "2025-11-02T21:58:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "LeBron James Over 26.5 pts",
    "odds": 100,
    "stake": 41,
    "result": "loss",
    "payout": 0,
    "profit": -41,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-02T21:58:00.000Z"
  },
  {
    "id": "demo-202",
    "user_id": "demo",
    "placed_at": "2026-01-26T21:53:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Booker Over 30.5 pts",
    "odds": -105,
    "stake": 66,
    "result": "loss",
    "payout": 0,
    "profit": -66,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-26T21:53:00.000Z"
  },
  {
    "id": "demo-203",
    "user_id": "demo",
    "placed_at": "2026-01-21T21:36:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Edwards Over 31.5 pts",
    "odds": -115,
    "stake": 72,
    "result": "loss",
    "payout": 0,
    "profit": -72,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-21T21:36:00.000Z"
  },
  {
    "id": "demo-204",
    "user_id": "demo",
    "placed_at": "2025-12-15T21:39:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Edwards Over 19.5 pts",
    "odds": 100,
    "stake": 56,
    "result": "loss",
    "payout": 0,
    "profit": -56,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-15T21:39:00.000Z"
  },
  {
    "id": "demo-205",
    "user_id": "demo",
    "placed_at": "2026-01-03T22:57:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Gilgeous-Alexander Over 7.5 ast",
    "odds": 105,
    "stake": 52,
    "result": "win",
    "payout": 106.6,
    "profit": 54.6,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-03T22:57:00.000Z"
  },
  {
    "id": "demo-206",
    "user_id": "demo",
    "placed_at": "2025-12-10T21:33:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Curry Over 9.5 ast",
    "odds": -115,
    "stake": 44,
    "result": "loss",
    "payout": 0,
    "profit": -44,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-10T21:33:00.000Z"
  },
  {
    "id": "demo-207",
    "user_id": "demo",
    "placed_at": "2025-12-01T20:21:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Gilgeous-Alexander Over 5.5 reb",
    "odds": -110,
    "stake": 75,
    "result": "win",
    "payout": 143.18,
    "profit": 68.18,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-01T20:21:00.000Z"
  },
  {
    "id": "demo-208",
    "user_id": "demo",
    "placed_at": "2026-01-20T21:13:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Brunson Over 7.5 ast",
    "odds": -105,
    "stake": 65,
    "result": "win",
    "payout": 126.9,
    "profit": 61.9,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-20T21:13:00.000Z"
  },
  {
    "id": "demo-209",
    "user_id": "demo",
    "placed_at": "2025-11-13T21:50:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Doncic Over 5.5 ast",
    "odds": -105,
    "stake": 79,
    "result": "loss",
    "payout": 0,
    "profit": -79,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-13T21:50:00.000Z"
  },
  {
    "id": "demo-210",
    "user_id": "demo",
    "placed_at": "2026-01-17T20:17:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Gilgeous-Alexander Over 9.5 reb",
    "odds": 105,
    "stake": 47,
    "result": "loss",
    "payout": 0,
    "profit": -47,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-17T20:17:00.000Z"
  },
  {
    "id": "demo-211",
    "user_id": "demo",
    "placed_at": "2026-01-25T22:23:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Jokic Over 10.5 ast",
    "odds": -115,
    "stake": 50,
    "result": "win",
    "payout": 93.48,
    "profit": 43.48,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-25T22:23:00.000Z"
  },
  {
    "id": "demo-212",
    "user_id": "demo",
    "placed_at": "2025-12-31T21:01:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Booker Over 8.5 reb",
    "odds": 100,
    "stake": 50,
    "result": "win",
    "payout": 100,
    "profit": 50,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-31T21:01:00.000Z"
  },
  {
    "id": "demo-213",
    "user_id": "demo",
    "placed_at": "2025-11-28T19:23:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Edwards Over 24.5 pts",
    "odds": -115,
    "stake": 56,
    "result": "loss",
    "payout": 0,
    "profit": -56,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-28T19:23:00.000Z"
  },
  {
    "id": "demo-214",
    "user_id": "demo",
    "placed_at": "2025-11-17T20:10:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Tatum Over 5.5 3pt",
    "odds": -105,
    "stake": 73,
    "result": "win",
    "payout": 142.52,
    "profit": 69.52,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-17T20:10:00.000Z"
  },
  {
    "id": "demo-215",
    "user_id": "demo",
    "placed_at": "2025-11-20T22:10:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "LeBron James Over 5.5 reb",
    "odds": -105,
    "stake": 64,
    "result": "loss",
    "payout": 0,
    "profit": -64,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-20T22:10:00.000Z"
  },
  {
    "id": "demo-216",
    "user_id": "demo",
    "placed_at": "2025-12-12T22:02:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Jokic Over 5.5 ast",
    "odds": 105,
    "stake": 56,
    "result": "loss",
    "payout": 0,
    "profit": -56,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-12T22:02:00.000Z"
  },
  {
    "id": "demo-217",
    "user_id": "demo",
    "placed_at": "2025-12-20T22:49:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Edwards Over 18.5 pts",
    "odds": 105,
    "stake": 77,
    "result": "loss",
    "payout": 0,
    "profit": -77,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-20T22:49:00.000Z"
  },
  {
    "id": "demo-218",
    "user_id": "demo",
    "placed_at": "2025-11-20T19:23:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Booker Over 8.5 reb",
    "odds": -115,
    "stake": 47,
    "result": "win",
    "payout": 87.87,
    "profit": 40.87,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-20T19:23:00.000Z"
  },
  {
    "id": "demo-219",
    "user_id": "demo",
    "placed_at": "2026-01-27T22:17:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Gilgeous-Alexander Over 8.5 reb",
    "odds": -115,
    "stake": 54,
    "result": "loss",
    "payout": 0,
    "profit": -54,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-27T22:17:00.000Z"
  },
  {
    "id": "demo-220",
    "user_id": "demo",
    "placed_at": "2026-01-14T22:44:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Brunson Over 5.5 3pt",
    "odds": -105,
    "stake": 64,
    "result": "loss",
    "payout": 0,
    "profit": -64,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-14T22:44:00.000Z"
  },
  {
    "id": "demo-221",
    "user_id": "demo",
    "placed_at": "2025-12-04T20:58:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Doncic Over 30.5 pts",
    "odds": -115,
    "stake": 40,
    "result": "win",
    "payout": 74.78,
    "profit": 34.78,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-04T20:58:00.000Z"
  },
  {
    "id": "demo-222",
    "user_id": "demo",
    "placed_at": "2025-12-26T20:41:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Booker Over 10.5 reb",
    "odds": -110,
    "stake": 66,
    "result": "win",
    "payout": 126,
    "profit": 60,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-26T20:41:00.000Z"
  },
  {
    "id": "demo-223",
    "user_id": "demo",
    "placed_at": "2025-11-01T21:58:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Jokic Over 5.5 reb",
    "odds": -105,
    "stake": 72,
    "result": "win",
    "payout": 140.57,
    "profit": 68.57,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-01T21:58:00.000Z"
  },
  {
    "id": "demo-224",
    "user_id": "demo",
    "placed_at": "2025-12-12T21:41:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Curry Over 8.5 reb",
    "odds": -110,
    "stake": 60,
    "result": "loss",
    "payout": 0,
    "profit": -60,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-12T21:41:00.000Z"
  },
  {
    "id": "demo-225",
    "user_id": "demo",
    "placed_at": "2026-01-16T19:37:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Giannis Over 6.5 reb",
    "odds": -105,
    "stake": 49,
    "result": "win",
    "payout": 95.67,
    "profit": 46.67,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-16T19:37:00.000Z"
  },
  {
    "id": "demo-226",
    "user_id": "demo",
    "placed_at": "2025-12-05T22:22:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Curry Over 10.5 ast",
    "odds": -115,
    "stake": 57,
    "result": "loss",
    "payout": 0,
    "profit": -57,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-05T22:22:00.000Z"
  },
  {
    "id": "demo-227",
    "user_id": "demo",
    "placed_at": "2025-12-17T03:16:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Brunson Over 7.5 reb",
    "odds": 100,
    "stake": 65,
    "result": "loss",
    "payout": 0,
    "profit": -65,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-17T03:16:00.000Z"
  },
  {
    "id": "demo-228",
    "user_id": "demo",
    "placed_at": "2025-11-30T23:04:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Jokic Over 19.5 pts",
    "odds": -115,
    "stake": 46,
    "result": "loss",
    "payout": 0,
    "profit": -46,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-30T23:04:00.000Z"
  },
  {
    "id": "demo-229",
    "user_id": "demo",
    "placed_at": "2025-12-07T20:03:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Booker Over 9.5 reb",
    "odds": -110,
    "stake": 71,
    "result": "win",
    "payout": 135.55,
    "profit": 64.55,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-07T20:03:00.000Z"
  },
  {
    "id": "demo-230",
    "user_id": "demo",
    "placed_at": "2026-01-19T21:44:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Edwards Over 28.5 pts",
    "odds": 105,
    "stake": 77,
    "result": "loss",
    "payout": 0,
    "profit": -77,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-19T21:44:00.000Z"
  },
  {
    "id": "demo-231",
    "user_id": "demo",
    "placed_at": "2025-12-07T19:33:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Tatum Over 10.5 ast",
    "odds": 100,
    "stake": 46,
    "result": "win",
    "payout": 92,
    "profit": 46,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-07T19:33:00.000Z"
  },
  {
    "id": "demo-232",
    "user_id": "demo",
    "placed_at": "2026-01-27T22:12:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Edwards Over 21.5 pts",
    "odds": -115,
    "stake": 76,
    "result": "win",
    "payout": 142.09,
    "profit": 66.09,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-27T22:12:00.000Z"
  },
  {
    "id": "demo-233",
    "user_id": "demo",
    "placed_at": "2026-01-05T20:57:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "LeBron James Over 27.5 pts",
    "odds": -115,
    "stake": 44,
    "result": "win",
    "payout": 82.26,
    "profit": 38.26,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-05T20:57:00.000Z"
  },
  {
    "id": "demo-234",
    "user_id": "demo",
    "placed_at": "2025-12-26T19:20:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Booker Over 6.5 3pt",
    "odds": 105,
    "stake": 48,
    "result": "loss",
    "payout": 0,
    "profit": -48,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-26T19:20:00.000Z"
  },
  {
    "id": "demo-235",
    "user_id": "demo",
    "placed_at": "2026-01-10T22:11:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "prop",
    "description": "Brunson Over 5.5 3pt",
    "odds": -115,
    "stake": 63,
    "result": "loss",
    "payout": 0,
    "profit": -63,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-10T22:11:00.000Z"
  },
  {
    "id": "demo-236",
    "user_id": "demo",
    "placed_at": "2026-01-11T19:49:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Magic + Mavericks + Knicks",
    "odds": 500,
    "stake": 22,
    "result": "loss",
    "payout": 0,
    "profit": -22,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-11T19:49:00.000Z"
  },
  {
    "id": "demo-237",
    "user_id": "demo",
    "placed_at": "2026-01-02T20:12:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Nuggets + Thunder + Thunder",
    "odds": 500,
    "stake": 24,
    "result": "loss",
    "payout": 0,
    "profit": -24,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-02T20:12:00.000Z"
  },
  {
    "id": "demo-238",
    "user_id": "demo",
    "placed_at": "2025-11-21T19:56:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Warriors + Bucks + Warriors",
    "odds": 500,
    "stake": 33,
    "result": "loss",
    "payout": 0,
    "profit": -33,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-21T19:56:00.000Z"
  },
  {
    "id": "demo-239",
    "user_id": "demo",
    "placed_at": "2025-11-22T21:09:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Suns + Mavericks + Suns",
    "odds": 500,
    "stake": 33,
    "result": "loss",
    "payout": 0,
    "profit": -33,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-22T21:09:00.000Z"
  },
  {
    "id": "demo-240",
    "user_id": "demo",
    "placed_at": "2026-01-24T22:09:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Magic + Cavaliers + 76ers",
    "odds": 500,
    "stake": 30,
    "result": "loss",
    "payout": 0,
    "profit": -30,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-24T22:09:00.000Z"
  },
  {
    "id": "demo-241",
    "user_id": "demo",
    "placed_at": "2025-11-12T01:07:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Lakers + Timberwolves + Suns",
    "odds": 500,
    "stake": 32,
    "result": "loss",
    "payout": 0,
    "profit": -32,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-12T01:07:00.000Z"
  },
  {
    "id": "demo-242",
    "user_id": "demo",
    "placed_at": "2026-01-22T21:12:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Cavaliers + Celtics + Mavericks",
    "odds": 500,
    "stake": 24,
    "result": "loss",
    "payout": 0,
    "profit": -24,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-22T21:12:00.000Z"
  },
  {
    "id": "demo-243",
    "user_id": "demo",
    "placed_at": "2025-12-21T20:51:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Thunder + Lakers + 76ers",
    "odds": 500,
    "stake": 22,
    "result": "loss",
    "payout": 0,
    "profit": -22,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-21T20:51:00.000Z"
  },
  {
    "id": "demo-244",
    "user_id": "demo",
    "placed_at": "2025-11-07T21:50:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Knicks + Heat + Heat",
    "odds": 500,
    "stake": 32,
    "result": "win",
    "payout": 192,
    "profit": 160,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-07T21:50:00.000Z"
  },
  {
    "id": "demo-245",
    "user_id": "demo",
    "placed_at": "2025-12-30T22:40:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Cavaliers + Celtics + Timberwolves",
    "odds": 500,
    "stake": 21,
    "result": "loss",
    "payout": 0,
    "profit": -21,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-30T22:40:00.000Z"
  },
  {
    "id": "demo-246",
    "user_id": "demo",
    "placed_at": "2025-12-02T23:40:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Celtics + Warriors + Thunder",
    "odds": 500,
    "stake": 29,
    "result": "win",
    "payout": 174,
    "profit": 145,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-02T23:40:00.000Z"
  },
  {
    "id": "demo-247",
    "user_id": "demo",
    "placed_at": "2026-01-16T21:01:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Knicks + Timberwolves + Mavericks",
    "odds": 500,
    "stake": 21,
    "result": "loss",
    "payout": 0,
    "profit": -21,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-16T21:01:00.000Z"
  },
  {
    "id": "demo-248",
    "user_id": "demo",
    "placed_at": "2025-11-08T20:26:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Cavaliers + Suns + Nuggets",
    "odds": 500,
    "stake": 25,
    "result": "loss",
    "payout": 0,
    "profit": -25,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-08T20:26:00.000Z"
  },
  {
    "id": "demo-249",
    "user_id": "demo",
    "placed_at": "2026-01-19T19:43:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Lakers + Heat + Bucks",
    "odds": 500,
    "stake": 26,
    "result": "loss",
    "payout": 0,
    "profit": -26,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-19T19:43:00.000Z"
  },
  {
    "id": "demo-250",
    "user_id": "demo",
    "placed_at": "2025-12-21T23:16:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Mavericks + Warriors + Cavaliers",
    "odds": 500,
    "stake": 16,
    "result": "loss",
    "payout": 0,
    "profit": -16,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-21T23:16:00.000Z"
  },
  {
    "id": "demo-251",
    "user_id": "demo",
    "placed_at": "2025-12-31T23:15:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Mavericks + Cavaliers + Cavaliers",
    "odds": 500,
    "stake": 33,
    "result": "win",
    "payout": 198,
    "profit": 165,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-31T23:15:00.000Z"
  },
  {
    "id": "demo-252",
    "user_id": "demo",
    "placed_at": "2025-12-17T21:13:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Mavericks + Mavericks + Bucks",
    "odds": 500,
    "stake": 19,
    "result": "loss",
    "payout": 0,
    "profit": -19,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-17T21:13:00.000Z"
  },
  {
    "id": "demo-253",
    "user_id": "demo",
    "placed_at": "2025-12-08T03:10:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Knicks + Celtics + Bucks",
    "odds": 500,
    "stake": 27,
    "result": "loss",
    "payout": 0,
    "profit": -27,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-08T03:10:00.000Z"
  },
  {
    "id": "demo-254",
    "user_id": "demo",
    "placed_at": "2025-11-19T20:05:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Suns + Timberwolves + Cavaliers",
    "odds": 500,
    "stake": 33,
    "result": "win",
    "payout": 198,
    "profit": 165,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-19T20:05:00.000Z"
  },
  {
    "id": "demo-255",
    "user_id": "demo",
    "placed_at": "2025-11-22T20:09:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Cavaliers + Timberwolves + Warriors",
    "odds": 500,
    "stake": 15,
    "result": "loss",
    "payout": 0,
    "profit": -15,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-22T20:09:00.000Z"
  },
  {
    "id": "demo-256",
    "user_id": "demo",
    "placed_at": "2025-11-19T20:12:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Knicks + Bucks + Magic",
    "odds": 500,
    "stake": 25,
    "result": "loss",
    "payout": 0,
    "profit": -25,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-19T20:12:00.000Z"
  },
  {
    "id": "demo-257",
    "user_id": "demo",
    "placed_at": "2025-11-04T19:30:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Cavaliers + Magic + Suns",
    "odds": 500,
    "stake": 20,
    "result": "loss",
    "payout": 0,
    "profit": -20,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-04T19:30:00.000Z"
  },
  {
    "id": "demo-258",
    "user_id": "demo",
    "placed_at": "2025-11-24T23:30:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Mavericks + Magic + Warriors",
    "odds": 500,
    "stake": 23,
    "result": "loss",
    "payout": 0,
    "profit": -23,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-24T23:30:00.000Z"
  },
  {
    "id": "demo-259",
    "user_id": "demo",
    "placed_at": "2025-11-16T20:19:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Celtics + Suns + Warriors",
    "odds": 500,
    "stake": 17,
    "result": "loss",
    "payout": 0,
    "profit": -17,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-16T20:19:00.000Z"
  },
  {
    "id": "demo-260",
    "user_id": "demo",
    "placed_at": "2025-11-30T20:32:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Warriors + Mavericks + Warriors",
    "odds": 500,
    "stake": 25,
    "result": "loss",
    "payout": 0,
    "profit": -25,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-30T20:32:00.000Z"
  },
  {
    "id": "demo-261",
    "user_id": "demo",
    "placed_at": "2025-11-10T23:15:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Bucks + Knicks + Lakers",
    "odds": 500,
    "stake": 28,
    "result": "loss",
    "payout": 0,
    "profit": -28,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-10T23:15:00.000Z"
  },
  {
    "id": "demo-262",
    "user_id": "demo",
    "placed_at": "2026-01-05T23:49:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Bucks + 76ers + Lakers",
    "odds": 500,
    "stake": 29,
    "result": "loss",
    "payout": 0,
    "profit": -29,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-05T23:49:00.000Z"
  },
  {
    "id": "demo-263",
    "user_id": "demo",
    "placed_at": "2026-01-04T20:47:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Thunder + Mavericks + Mavericks",
    "odds": 500,
    "stake": 28,
    "result": "loss",
    "payout": 0,
    "profit": -28,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-04T20:47:00.000Z"
  },
  {
    "id": "demo-264",
    "user_id": "demo",
    "placed_at": "2025-12-18T22:31:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Magic + Cavaliers + Cavaliers",
    "odds": 500,
    "stake": 29,
    "result": "win",
    "payout": 174,
    "profit": 145,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-18T22:31:00.000Z"
  },
  {
    "id": "demo-265",
    "user_id": "demo",
    "placed_at": "2025-12-12T23:14:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Heat + Magic + Warriors",
    "odds": 500,
    "stake": 25,
    "result": "loss",
    "payout": 0,
    "profit": -25,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-12T23:14:00.000Z"
  },
  {
    "id": "demo-266",
    "user_id": "demo",
    "placed_at": "2026-01-25T23:12:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Mavericks + Suns + Celtics",
    "odds": 500,
    "stake": 29,
    "result": "loss",
    "payout": 0,
    "profit": -29,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-25T23:12:00.000Z"
  },
  {
    "id": "demo-267",
    "user_id": "demo",
    "placed_at": "2025-12-11T02:42:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Thunder + Timberwolves + Lakers",
    "odds": 500,
    "stake": 24,
    "result": "loss",
    "payout": 0,
    "profit": -24,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-11T02:42:00.000Z"
  },
  {
    "id": "demo-268",
    "user_id": "demo",
    "placed_at": "2025-11-30T20:48:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Timberwolves + Cavaliers + Celtics",
    "odds": 500,
    "stake": 28,
    "result": "loss",
    "payout": 0,
    "profit": -28,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-30T20:48:00.000Z"
  },
  {
    "id": "demo-269",
    "user_id": "demo",
    "placed_at": "2026-01-16T23:12:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Knicks + Thunder + Thunder",
    "odds": 500,
    "stake": 34,
    "result": "loss",
    "payout": 0,
    "profit": -34,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-16T23:12:00.000Z"
  },
  {
    "id": "demo-270",
    "user_id": "demo",
    "placed_at": "2025-12-03T22:44:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Nuggets + Bucks + Celtics",
    "odds": 500,
    "stake": 34,
    "result": "loss",
    "payout": 0,
    "profit": -34,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-03T22:44:00.000Z"
  },
  {
    "id": "demo-271",
    "user_id": "demo",
    "placed_at": "2025-11-17T19:51:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Thunder + Lakers + Suns",
    "odds": 500,
    "stake": 35,
    "result": "loss",
    "payout": 0,
    "profit": -35,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-17T19:51:00.000Z"
  },
  {
    "id": "demo-272",
    "user_id": "demo",
    "placed_at": "2025-12-09T20:32:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Warriors + Lakers + Bucks",
    "odds": 500,
    "stake": 20,
    "result": "loss",
    "payout": 0,
    "profit": -20,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-09T20:32:00.000Z"
  },
  {
    "id": "demo-273",
    "user_id": "demo",
    "placed_at": "2025-11-09T22:58:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Warriors + Nuggets + Nuggets",
    "odds": 500,
    "stake": 16,
    "result": "loss",
    "payout": 0,
    "profit": -16,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-09T22:58:00.000Z"
  },
  {
    "id": "demo-274",
    "user_id": "demo",
    "placed_at": "2026-01-25T21:51:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Celtics + Cavaliers + Thunder",
    "odds": 500,
    "stake": 19,
    "result": "loss",
    "payout": 0,
    "profit": -19,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-25T21:51:00.000Z"
  },
  {
    "id": "demo-275",
    "user_id": "demo",
    "placed_at": "2025-11-26T21:21:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Knicks + Timberwolves + Warriors",
    "odds": 500,
    "stake": 17,
    "result": "loss",
    "payout": 0,
    "profit": -17,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-26T21:21:00.000Z"
  },
  {
    "id": "demo-276",
    "user_id": "demo",
    "placed_at": "2025-11-09T02:20:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Warriors + 76ers + Magic",
    "odds": 500,
    "stake": 28,
    "result": "loss",
    "payout": 0,
    "profit": -28,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-09T02:20:00.000Z"
  },
  {
    "id": "demo-277",
    "user_id": "demo",
    "placed_at": "2025-12-26T23:31:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Lakers + Timberwolves + Mavericks",
    "odds": 500,
    "stake": 29,
    "result": "loss",
    "payout": 0,
    "profit": -29,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-26T23:31:00.000Z"
  },
  {
    "id": "demo-278",
    "user_id": "demo",
    "placed_at": "2025-11-01T03:43:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Knicks + Suns + Celtics",
    "odds": 500,
    "stake": 34,
    "result": "loss",
    "payout": 0,
    "profit": -34,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-01T03:43:00.000Z"
  },
  {
    "id": "demo-279",
    "user_id": "demo",
    "placed_at": "2025-11-21T20:04:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Heat + Thunder + Warriors",
    "odds": 500,
    "stake": 32,
    "result": "loss",
    "payout": 0,
    "profit": -32,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-21T20:04:00.000Z"
  },
  {
    "id": "demo-280",
    "user_id": "demo",
    "placed_at": "2026-01-06T21:04:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "parlay",
    "description": "3-leg NBA parlay: Magic + Heat + Knicks",
    "odds": 500,
    "stake": 33,
    "result": "loss",
    "payout": 0,
    "profit": -33,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": 3,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-06T21:04:00.000Z"
  },
  {
    "id": "demo-281",
    "user_id": "demo",
    "placed_at": "2026-01-14T19:10:00.000Z",
    "sport": "NHL",
    "league": "NHL",
    "bet_type": "moneyline",
    "description": "Panthers ML",
    "odds": -150,
    "stake": 46,
    "result": "win",
    "payout": 76.67,
    "profit": 30.67,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-14T19:10:00.000Z"
  },
  {
    "id": "demo-282",
    "user_id": "demo",
    "placed_at": "2025-11-14T22:43:00.000Z",
    "sport": "NHL",
    "league": "NHL",
    "bet_type": "spread",
    "description": "Panthers -1.5",
    "odds": 130,
    "stake": 67,
    "result": "loss",
    "payout": 0,
    "profit": -67,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-14T22:43:00.000Z"
  },
  {
    "id": "demo-283",
    "user_id": "demo",
    "placed_at": "2026-01-14T22:37:00.000Z",
    "sport": "NHL",
    "league": "NHL",
    "bet_type": "spread",
    "description": "Oilers -1.5",
    "odds": 130,
    "stake": 62,
    "result": "win",
    "payout": 142.6,
    "profit": 80.6,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-14T22:37:00.000Z"
  },
  {
    "id": "demo-284",
    "user_id": "demo",
    "placed_at": "2026-01-19T21:06:00.000Z",
    "sport": "NHL",
    "league": "NHL",
    "bet_type": "moneyline",
    "description": "Oilers ML",
    "odds": -130,
    "stake": 77,
    "result": "loss",
    "payout": 0,
    "profit": -77,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-19T21:06:00.000Z"
  },
  {
    "id": "demo-285",
    "user_id": "demo",
    "placed_at": "2025-11-07T02:17:00.000Z",
    "sport": "NHL",
    "league": "NHL",
    "bet_type": "spread",
    "description": "Avalanche -1.5",
    "odds": 130,
    "stake": 65,
    "result": "loss",
    "payout": 0,
    "profit": -65,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-07T02:17:00.000Z"
  },
  {
    "id": "demo-286",
    "user_id": "demo",
    "placed_at": "2025-11-06T19:33:00.000Z",
    "sport": "NHL",
    "league": "NHL",
    "bet_type": "moneyline",
    "description": "Avalanche ML",
    "odds": 120,
    "stake": 77,
    "result": "loss",
    "payout": 0,
    "profit": -77,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-06T19:33:00.000Z"
  },
  {
    "id": "demo-287",
    "user_id": "demo",
    "placed_at": "2025-12-21T19:37:00.000Z",
    "sport": "NHL",
    "league": "NHL",
    "bet_type": "spread",
    "description": "Rangers -1.5",
    "odds": 130,
    "stake": 61,
    "result": "loss",
    "payout": 0,
    "profit": -61,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-21T19:37:00.000Z"
  },
  {
    "id": "demo-288",
    "user_id": "demo",
    "placed_at": "2025-11-13T21:40:00.000Z",
    "sport": "NHL",
    "league": "NHL",
    "bet_type": "moneyline",
    "description": "Panthers ML",
    "odds": -130,
    "stake": 47,
    "result": "win",
    "payout": 83.15,
    "profit": 36.15,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-13T21:40:00.000Z"
  },
  {
    "id": "demo-289",
    "user_id": "demo",
    "placed_at": "2025-11-01T20:01:00.000Z",
    "sport": "NHL",
    "league": "NHL",
    "bet_type": "spread",
    "description": "Rangers -1.5",
    "odds": 130,
    "stake": 48,
    "result": "win",
    "payout": 110.4,
    "profit": 62.4,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-01T20:01:00.000Z"
  },
  {
    "id": "demo-290",
    "user_id": "demo",
    "placed_at": "2025-11-12T22:04:00.000Z",
    "sport": "NHL",
    "league": "NHL",
    "bet_type": "spread",
    "description": "Maple Leafs -1.5",
    "odds": 130,
    "stake": 65,
    "result": "loss",
    "payout": 0,
    "profit": -65,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-12T22:04:00.000Z"
  },
  {
    "id": "demo-291",
    "user_id": "demo",
    "placed_at": "2026-01-05T19:13:00.000Z",
    "sport": "NHL",
    "league": "NHL",
    "bet_type": "moneyline",
    "description": "Bruins ML",
    "odds": -130,
    "stake": 41,
    "result": "loss",
    "payout": 0,
    "profit": -41,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-05T19:13:00.000Z"
  },
  {
    "id": "demo-292",
    "user_id": "demo",
    "placed_at": "2026-01-25T23:32:00.000Z",
    "sport": "NHL",
    "league": "NHL",
    "bet_type": "spread",
    "description": "Panthers -1.5",
    "odds": 130,
    "stake": 89,
    "result": "loss",
    "payout": 0,
    "profit": -89,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2026-01-25T23:32:00.000Z"
  },
  {
    "id": "demo-293",
    "user_id": "demo",
    "placed_at": "2025-12-08T19:09:00.000Z",
    "sport": "NHL",
    "league": "NHL",
    "bet_type": "moneyline",
    "description": "Rangers ML",
    "odds": -130,
    "stake": 87,
    "result": "win",
    "payout": 153.92,
    "profit": 66.92,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-08T19:09:00.000Z"
  },
  {
    "id": "demo-294",
    "user_id": "demo",
    "placed_at": "2025-11-13T20:01:00.000Z",
    "sport": "NHL",
    "league": "NHL",
    "bet_type": "moneyline",
    "description": "Rangers ML",
    "odds": 120,
    "stake": 67,
    "result": "win",
    "payout": 147.4,
    "profit": 80.4,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-13T20:01:00.000Z"
  },
  {
    "id": "demo-295",
    "user_id": "demo",
    "placed_at": "2025-11-21T21:47:00.000Z",
    "sport": "NHL",
    "league": "NHL",
    "bet_type": "moneyline",
    "description": "Rangers ML",
    "odds": -130,
    "stake": 88,
    "result": "loss",
    "payout": 0,
    "profit": -88,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-11-21T21:47:00.000Z"
  },
  {
    "id": "demo-296",
    "user_id": "demo",
    "placed_at": "2025-12-13T20:00:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Heat +4.5",
    "odds": -110,
    "stake": 50,
    "result": "loss",
    "payout": 0,
    "profit": -50,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-13T20:00:00.000Z"
  },
  {
    "id": "demo-297",
    "user_id": "demo",
    "placed_at": "2025-12-13T20:39:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "moneyline",
    "description": "Timberwolves ML",
    "odds": 160,
    "stake": 100,
    "result": "loss",
    "payout": 0,
    "profit": -100,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-13T20:39:00.000Z"
  },
  {
    "id": "demo-298",
    "user_id": "demo",
    "placed_at": "2025-12-13T21:28:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Mavericks +7.5",
    "odds": -110,
    "stake": 150,
    "result": "win",
    "payout": 286.36,
    "profit": 136.36,
    "sportsbook": "DraftKings",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-13T21:28:00.000Z"
  },
  {
    "id": "demo-299",
    "user_id": "demo",
    "placed_at": "2025-12-13T22:21:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "moneyline",
    "description": "Magic ML",
    "odds": -120,
    "stake": 220,
    "result": "loss",
    "payout": 0,
    "profit": -220,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-13T22:21:00.000Z"
  },
  {
    "id": "demo-300",
    "user_id": "demo",
    "placed_at": "2025-12-13T23:01:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Bucks -3.5",
    "odds": -110,
    "stake": 300,
    "result": "loss",
    "payout": 0,
    "profit": -300,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-13T23:01:00.000Z"
  },
  {
    "id": "demo-301",
    "user_id": "demo",
    "placed_at": "2025-12-13T23:52:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "moneyline",
    "description": "Knicks ML",
    "odds": -120,
    "stake": 300,
    "result": "win",
    "payout": 550,
    "profit": 250,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-13T23:52:00.000Z"
  },
  {
    "id": "demo-302",
    "user_id": "demo",
    "placed_at": "2025-12-13T00:45:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Warriors +6.5",
    "odds": -110,
    "stake": 350,
    "result": "loss",
    "payout": 0,
    "profit": -350,
    "sportsbook": "Caesars",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-13T00:45:00.000Z"
  },
  {
    "id": "demo-303",
    "user_id": "demo",
    "placed_at": "2025-12-13T01:39:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "moneyline",
    "description": "Knicks ML",
    "odds": 160,
    "stake": 400,
    "result": "loss",
    "payout": 0,
    "profit": -400,
    "sportsbook": "BetMGM",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-13T01:39:00.000Z"
  },
  {
    "id": "demo-304",
    "user_id": "demo",
    "placed_at": "2025-12-13T02:19:00.000Z",
    "sport": "NBA",
    "league": "NBA",
    "bet_type": "spread",
    "description": "Nuggets +6.5",
    "odds": -110,
    "stake": 450,
    "result": "loss",
    "payout": 0,
    "profit": -450,
    "sportsbook": "FanDuel",
    "is_bonus_bet": false,
    "parlay_legs": null,
    "tags": null,
    "notes": null,
    "upload_id": null,
    "created_at": "2025-12-13T02:19:00.000Z"
  }
];

// -- Demo Analysis --
// Frozen output of a real runAutopsy(DEMO_BETS, null) call. Not hand-edited.

export const DEMO_ANALYSIS: AutopsyAnalysis = {
  "summary": {
    "total_bets": 304,
    "record": "114W-190L-0P",
    "total_profit": -3247.6099999999988,
    "roi_percent": -15.23,
    "avg_stake": 70.16,
    "date_range": "2025-11-01 to 2026-01-30",
    "overall_grade": null
  },
  "what_if_scenarios": [
    {
      "label": "Flat-staked at $65 on every bet",
      "actual": -3247.61,
      "hypothetical": -3168.62
    },
    {
      "label": "Only bet your profitable sports/types",
      "actual": -3247.61,
      "hypothetical": 497.22
    }
  ],
  "recovery": {
    "biggestSingleLeakUSD": 3745,
    "method": "profitable_categories_only",
    "overlapsExist": true,
    "rangeLow": 2500,
    "rangeHigh": 4500,
    "netUSD": -3248
  },
  "charts": {
    "timeOfDayPnl": [
      {
        "hour": 0,
        "netUSD": -498,
        "bets": 4
      },
      {
        "hour": 1,
        "netUSD": -537,
        "bets": 5
      },
      {
        "hour": 2,
        "netUSD": -722,
        "bets": 7
      },
      {
        "hour": 3,
        "netUSD": -340,
        "bets": 6
      },
      {
        "hour": 4,
        "netUSD": 0,
        "bets": 0
      },
      {
        "hour": 5,
        "netUSD": 0,
        "bets": 0
      },
      {
        "hour": 6,
        "netUSD": 0,
        "bets": 0
      },
      {
        "hour": 7,
        "netUSD": 0,
        "bets": 0
      },
      {
        "hour": 8,
        "netUSD": 0,
        "bets": 0
      },
      {
        "hour": 9,
        "netUSD": 0,
        "bets": 0
      },
      {
        "hour": 10,
        "netUSD": 0,
        "bets": 0
      },
      {
        "hour": 11,
        "netUSD": 0,
        "bets": 0
      },
      {
        "hour": 12,
        "netUSD": 0,
        "bets": 0
      },
      {
        "hour": 13,
        "netUSD": 0,
        "bets": 0
      },
      {
        "hour": 14,
        "netUSD": 0,
        "bets": 0
      },
      {
        "hour": 15,
        "netUSD": 0,
        "bets": 0
      },
      {
        "hour": 16,
        "netUSD": 0,
        "bets": 0
      },
      {
        "hour": 17,
        "netUSD": -82.8,
        "bets": 20
      },
      {
        "hour": 18,
        "netUSD": 711.47,
        "bets": 16
      },
      {
        "hour": 19,
        "netUSD": 126.2,
        "bets": 45
      },
      {
        "hour": 20,
        "netUSD": -126.36,
        "bets": 65
      },
      {
        "hour": 21,
        "netUSD": -690.06,
        "bets": 64
      },
      {
        "hour": 22,
        "netUSD": -369.06,
        "bets": 48
      },
      {
        "hour": 23,
        "netUSD": -720,
        "bets": 24
      }
    ],
    "dayOfWeekPnl": [
      {
        "day": 0,
        "netUSD": -426.86,
        "bets": 45
      },
      {
        "day": 1,
        "netUSD": -851.49,
        "bets": 49
      },
      {
        "day": 2,
        "netUSD": -489.92,
        "bets": 40
      },
      {
        "day": 3,
        "netUSD": -64.24,
        "bets": 37
      },
      {
        "day": 4,
        "netUSD": 335.72,
        "bets": 31
      },
      {
        "day": 5,
        "netUSD": -288.73,
        "bets": 46
      },
      {
        "day": 6,
        "netUSD": -1462.09,
        "bets": 56
      }
    ],
    "oddsBuckets": [
      {
        "bucket": "Heavy Chalk",
        "roiPct": 0,
        "bets": 0,
        "winPct": 0,
        "edgePP": 0
      },
      {
        "bucket": "Moderate Favorite",
        "roiPct": 50,
        "bets": 2,
        "winPct": 100,
        "edgePP": 33.33
      },
      {
        "bucket": "Slight Favorite",
        "roiPct": -10.69,
        "bets": 160,
        "winPct": 50,
        "edgePP": -3.27
      },
      {
        "bucket": "Pick'em",
        "roiPct": -10.32,
        "bets": 34,
        "winPct": 44.12,
        "edgePP": -5.7
      },
      {
        "bucket": "Slight Dog",
        "roiPct": -38.06,
        "bets": 23,
        "winPct": 34.78,
        "edgePP": -9.44
      },
      {
        "bucket": "Moderate Dog",
        "roiPct": 0,
        "bets": 0,
        "winPct": 0,
        "edgePP": 0
      },
      {
        "bucket": "Longshot",
        "roiPct": -30.22,
        "bets": 85,
        "winPct": 10.59,
        "edgePP": -6.08
      }
    ],
    "stakeByStreak": {
      "after3WinsUSD": 63.71,
      "neutralUSD": 68.93,
      "after3LossesUSD": 75.27
    },
    "sessionTimeline": [
      {
        "tOffsetMin": 0,
        "stakeUSD": 59,
        "outcome": "loss",
        "isChaseMarker": false
      },
      {
        "tOffsetMin": 19,
        "stakeUSD": 111,
        "outcome": "win",
        "isChaseMarker": true
      },
      {
        "tOffsetMin": 74,
        "stakeUSD": 62,
        "outcome": "win",
        "isChaseMarker": false
      },
      {
        "tOffsetMin": 126,
        "stakeUSD": 60,
        "outcome": "loss",
        "isChaseMarker": false
      },
      {
        "tOffsetMin": 147,
        "stakeUSD": 56,
        "outcome": "loss",
        "isChaseMarker": false
      },
      {
        "tOffsetMin": 219,
        "stakeUSD": 25,
        "outcome": "loss",
        "isChaseMarker": false
      },
      {
        "tOffsetMin": 232,
        "stakeUSD": 74,
        "outcome": "loss",
        "isChaseMarker": true
      },
      {
        "tOffsetMin": 310,
        "stakeUSD": 350,
        "outcome": "loss",
        "isChaseMarker": true
      },
      {
        "tOffsetMin": 364,
        "stakeUSD": 400,
        "outcome": "loss",
        "isChaseMarker": true
      },
      {
        "tOffsetMin": 404,
        "stakeUSD": 450,
        "outcome": "loss",
        "isChaseMarker": true
      }
    ],
    "heroSession": {
      "sessionId": "SESSION-052",
      "date": "Dec 12, 2025",
      "framing": "loss",
      "bets": 10
    },
    "betTypeMix": [
      {
        "class": "spread",
        "count": 122,
        "pct": 40.1
      },
      {
        "class": "parlay",
        "count": 85,
        "pct": 28
      },
      {
        "class": "prop",
        "count": 55,
        "pct": 18.1
      },
      {
        "class": "moneyline",
        "count": 42,
        "pct": 13.8
      }
    ]
  },
  "biases_detected": [
    {
      "bias_name": "Heavy Parlay Tendency",
      "severity": "low",
      "description": "You're throwing 3-leg parlays at +500 consistently, which sounds exciting until you see the hit rate. The parlay ROI sits at -30.2% versus -13.2% on straight bets, meaning the parlays are dragging your overall numbers down meaningfully. The good news: this isn't out of control. At 28% of your bets, it's a habit worth trimming, not an emergency.",
      "evidence": "85 parlays at -30.2% ROI versus 219 straight bets at -13.2% ROI. NFL parlays specifically are the worst offender at -38.7% ROI across 40 bets, losing $522 while your NFL straight bets made $497.",
      "estimated_cost": 700,
      "fix": "Cap parlays at one per session, max 3 legs, and only when your straight bet already cashed.",
      "evidence_bet_ids": [
        "demo-75",
        "demo-81",
        "demo-107",
        "demo-76",
        "demo-84",
        "demo-80",
        "demo-88",
        "demo-108"
      ],
      "sample_size": 85,
      "confidence": "low",
      "sub_splits": [
        {
          "label": "Parlays",
          "bets": 85,
          "roi_pct": -30.22,
          "net_usd": -764
        },
        {
          "label": "Straight bets",
          "bets": 219,
          "roi_pct": -13.21,
          "net_usd": -2483.61
        }
      ],
      "severity_bar_ratio": 0.25,
      "description_visibility": "visible",
      "evidence_visibility": "visible",
      "fix_visibility": "visible",
      "estimated_cost_visibility": "visible"
    },
    {
      "bias_name": "Stake Volatility",
      "severity": "medium",
      "description": "Your bet sizing is genuinely all over the place. One day you're putting $15 on a parlay, the next you're firing $450 on an NBA spread. That kind of range makes it impossible to manage your bankroll or evaluate whether your process is actually working. The inconsistency also shows up in loss-streak behavior: your average stake climbs from $69 neutral to $75 after three straight losses.",
      "evidence": "Stakes range from $15 to $450 with an average of $70.16 and a variability score of 0.83 (flagged as inconsistent). After 3+ loss streaks, average stake rises to $75 versus $69 neutral. December 13 is the clearest example: stakes of $350, $400, $450, $300, $220, and $150 all in one session.",
      "estimated_cost": 500,
      "fix": "Pick one stake amount before you sit down and bet that same amount every single time, no exceptions.",
      "evidence_bet_ids": [
        "demo-304",
        "demo-303",
        "demo-302",
        "demo-300",
        "demo-301",
        "demo-299",
        "demo-298",
        "demo-34"
      ],
      "sample_size": 304,
      "confidence": "high",
      "severity_bar_ratio": 0.5,
      "description_visibility": "visible",
      "evidence_visibility": "visible",
      "fix_visibility": "visible",
      "estimated_cost_visibility": "visible"
    },
    {
      "bias_name": "Category Concentration Leak",
      "severity": "low",
      "description": "NBA is your most-played category by a wide margin, and it's also your worst-performing one. You're putting 57% of your bets into a market where you're losing at -24.9% ROI. The NBA spread and NBA prop sub-categories are both deep in the red, and the rapid-fire multi-bet NBA days are where the real damage piles up. Your NFL game is actually close to breakeven, which makes the NBA overload even more costly by comparison.",
      "evidence": "175 NBA bets at -24.9% ROI, totaling $-2950 in losses. NBA spread: -26.4% ROI on 55 bets ($-1382). NBA props: -25.8% ROI on 55 bets ($-832). 13 days with 4+ NBA bets combined for $-2210. NFL sits at -0.3% ROI across 114 bets.",
      "estimated_cost": 1500,
      "fix": "Cut NBA volume by a third and redirect those bets toward NFL spreads where your numbers are nearly flat.",
      "evidence_bet_ids": [
        "demo-304",
        "demo-303",
        "demo-302",
        "demo-300",
        "demo-299",
        "demo-163",
        "demo-162",
        "demo-141"
      ],
      "sample_size": 175,
      "confidence": "medium",
      "sub_splits": [
        {
          "label": "NBA",
          "bets": 175,
          "roi_pct": -24.88,
          "net_usd": -2949.97
        }
      ],
      "severity_bar_ratio": 0.25,
      "description_visibility": "visible",
      "evidence_visibility": "visible",
      "fix_visibility": "visible",
      "estimated_cost_visibility": "visible"
    }
  ],
  "strategic_leaks": [
    {
      "category": "NBA prop",
      "detail": "You're betting NBA player props at a high clip (55 bets, 31% of all NBA action) and getting crushed. Props are a recreational trap in the NBA because the books price them sharply and the variance on individual player stats is brutal. You're hitting LeBron overs, Jokic assists, Curry rebounds, and they're not connecting at a rate that justifies the volume.",
      "detail_visibility": "visible",
      "roi_impact": -25.8372165268717,
      "sample_size": 55,
      "suggestion": "Treat NBA props as a bonus play, not a staple. If you do play them, stick to the ones where you have a specific reason tied to matchup or role, not just a feel for a player's ceiling.",
      "suggestion_visibility": "visible",
      "severity": "high",
      "confidence": "medium"
    },
    {
      "category": "NFL parlay",
      "detail": "Your NFL straight bets are nearly breakeven at -0.3% ROI, which is genuinely respectable. But your NFL parlays are destroying that edge at -38.7% ROI. You're essentially building a solid foundation with your NFL straight bets and then torching it with parlay add-ons. The NFL parlay drag is the clearest structural leak in your entire betting profile.",
      "detail_visibility": "visible",
      "roi_impact": -38.666666666666664,
      "sample_size": 40,
      "suggestion": "Stop combining your NFL picks into parlays. Your straight NFL game is working. Let it work on its own.",
      "suggestion_visibility": "visible",
      "severity": "critical",
      "confidence": "medium"
    },
    {
      "category": "NBA spread",
      "detail": "NBA spreads are your highest-volume sub-category and one of your worst performers. At -26.4% ROI across 55 bets, you're losing more than a quarter of every dollar wagered here. The rapid-fire multi-bet NBA days amplify this leak significantly.",
      "detail_visibility": "visible",
      "roi_impact": -26.432778733983547,
      "sample_size": 55,
      "suggestion": "Limit yourself to one NBA spread per day. More bets on the same night does not mean more edge, it means more exposure to a market where you're currently running cold.",
      "suggestion_visibility": "visible",
      "severity": "high",
      "confidence": "medium"
    },
    {
      "category": "NHL spread",
      "detail": "Small sample but ugly: 7 bets at -44.6% ROI. You're taking puck-line dogs and chalk at bad prices and it's not working at all. This is a category to either build a real angle in or walk away from entirely.",
      "detail_visibility": "visible",
      "roi_impact": -44.63894967177243,
      "sample_size": 7,
      "suggestion": "Either develop a specific NHL spread angle or cut it. Seven bets at -44.6% is not a sample worth continuing without a clear reason to be there.",
      "suggestion_visibility": "visible",
      "severity": "critical",
      "confidence": "low"
    }
  ],
  "behavioral_patterns": [
    {
      "pattern_name": "Late-Night Collapse Window",
      "description": "Bets placed between 11pm and 4am are running at a 0% win rate across 42 bets. This is not a cold streak, it is a complete shutout. The 11pm window alone shows -43.9% ROI with a 13% win rate. Whether this is fatigue, emotional decisions after a rough evening session, or just bad game selection late at night, the pattern is stark and consistent.",
      "frequency": "42 bets across the sample, 14% of total volume",
      "impact": "negative",
      "data_points": "11pm: -43.9% ROI, 13% win rate, 24 bets, $-720. 12am-3am: -100% ROI across 22 bets, $-2097 combined. Late-night total (11pm-4am): -71.5% ROI."
    },
    {
      "pattern_name": "Thursday Sharp Instinct",
      "description": "Thursday is your best day by a significant margin, with a 55% win rate and +15.9% ROI across 31 bets. This is the one day where your selections are consistently outperforming the implied odds. It stands out sharply against every other day of the week.",
      "frequency": "31 bets on Thursdays across the sample",
      "impact": "positive",
      "data_points": "Thursday: +15.9% ROI, 55% win rate, 31 bets, $+336 profit. Next best day is Wednesday at -2.5% ROI."
    },
    {
      "pattern_name": "Saturday Volume Trap",
      "description": "Saturday is your highest-volume day and your second-worst performer. You're betting more on Saturdays than almost any other day, but the results are consistently poor. High volume on a bad-performing day amplifies losses faster than any other pattern in this data.",
      "frequency": "56 bets on Saturdays, the most of any day",
      "impact": "negative",
      "data_points": "Saturday: -26.5% ROI, 41% win rate, 56 bets, $-1462 profit. Highest single-day loss total in the sample."
    },
    {
      "pattern_name": "December 13 Stake Escalation Session",
      "description": "December 13 shows the clearest example of in-session stake escalation in the entire dataset. Stakes jumped from typical $50-100 range to $350, $400, $450, $300, $220, and $150 across 10 bets in a single session. This is the worst session in the sample and the only F-grade session recorded.",
      "frequency": "Single session (SESSION-052), but the most damaging in the dataset",
      "impact": "negative",
      "data_points": "SESSION-052 on Dec 12-13: 10 bets, $-1317 profit, grade F, flagged as heated. Stakes of $350, $400, $450 on NBA spreads all lost."
    },
    {
      "pattern_name": "6pm-7pm Profitable Window",
      "description": "The early evening window is where your sharpest betting happens. The 6pm slot runs at +54.6% ROI with a 63% win rate, and 7pm holds positive at +4.2% ROI. This is the opposite of the late-night pattern and suggests your best decision-making happens early in the evening before fatigue or session momentum sets in.",
      "frequency": "61 bets between 6pm-7pm across the sample",
      "impact": "positive",
      "data_points": "6pm: +54.6% ROI, 63% win rate, 16 bets, $+711. 7pm: +4.2% ROI, 49% win rate, 45 bets, $+126."
    },
    {
      "pattern_name": "NFL Spread Discipline",
      "description": "Your NFL spread game is legitimately one of the better parts of this profile. At +7.7% ROI across 60 bets, you're actually making money here. This is a real edge worth protecting, and it gets buried under the parlay losses and NBA volume.",
      "frequency": "60 NFL spread bets across the sample",
      "impact": "positive",
      "data_points": "NFL spread: +7.7% ROI, 60 bets, $+463 profit. NFL overall: -0.3% ROI, 114 bets, nearly breakeven."
    }
  ],
  "recommendations": [
    {
      "priority": 1,
      "title": "Stop Betting After 10pm",
      "description": "The data is unambiguous: bets placed after 10pm are not working. The 11pm-4am window is a 0% win rate across 42 bets. This is not bad luck, it is a consistent behavioral pattern across three months. Set a hard stop at 10pm and do not place any bets after that time, regardless of what games are on.",
      "expected_improvement": "Eliminating the late-night window removes your single worst-performing behavioral pattern and keeps your decision-making in the hours where you actually have a track record.",
      "difficulty": "medium",
      "description_visibility": "visible",
      "expected_improvement_visibility": "visible"
    },
    {
      "priority": 2,
      "title": "Cut NBA Volume by a Third",
      "description": "NBA is 57% of your bets and your worst-performing sport. Your NFL game is nearly breakeven and your NFL spreads are actually profitable. The fix is not to stop betting NBA entirely, but to stop treating it as your primary market. Reduce NBA bets and shift that attention toward the NFL spread game where your instincts are clearly sharper.",
      "expected_improvement": "Reducing NBA overexposure and leaning into your NFL spread strength shifts your volume toward the market where your selections are actually working. Save ~$1,500.",
      "difficulty": "medium",
      "tied_to_finding": "Category Concentration Leak",
      "description_visibility": "visible",
      "expected_improvement_visibility": "visible"
    },
    {
      "priority": 3,
      "title": "Drop NFL Parlays Entirely",
      "description": "Your NFL straight bets are one of the few genuinely profitable categories in this entire dataset. Your NFL parlays are destroying that profit at -38.7% ROI. These two things are directly connected: you are building real edge with your NFL picks and then giving it back by combining them into parlays. Bet your NFL picks straight and let the edge compound on its own.",
      "expected_improvement": "Removing NFL parlays stops the single clearest structural leak in your betting and lets your legitimate NFL spread edge actually show up in your results. Save ~$700.",
      "difficulty": "easy",
      "tied_to_finding": "Heavy Parlay Tendency",
      "description_visibility": "visible",
      "expected_improvement_visibility": "visible"
    },
    {
      "priority": 4,
      "title": "Lock In One Stake Amount Before Every Session",
      "description": "Your bet sizing swings from $15 to $450 within the same sport on the same day. That range makes it impossible to know whether your process is working or whether you just ran hot or cold on a big bet. Before you place your first bet of any session, decide what you are betting on every play that day and do not change it based on how the session is going.",
      "expected_improvement": "Consistent stake sizing makes your results reflect your actual selection quality rather than how much you happened to bet on your winners versus your losers. Save ~$500.",
      "difficulty": "medium",
      "tied_to_finding": "Stake Volatility",
      "description_visibility": "visible",
      "expected_improvement_visibility": "visible"
    },
    {
      "priority": 5,
      "title": "Protect Your Thursday Edge",
      "description": "Thursday is the one day where your selections are genuinely outperforming the market at +15.9% ROI and 55% win rate. That is a real signal worth protecting. Make sure your Thursday bets are straight bets at consistent stakes, not parlays or inflated sizes that could distort the results.",
      "expected_improvement": "Treating Thursday as your sharpest betting day and keeping those bets clean and consistent lets a genuine edge compound over time rather than getting diluted by parlay drag.",
      "difficulty": "easy",
      "description_visibility": "visible",
      "expected_improvement_visibility": "visible"
    }
  ],
  "emotion_score": 53,
  "tilt_score": 53,
  "emotion_breakdown": {
    "stake_volatility": 7,
    "loss_chasing": 0,
    "streak_behavior": 21,
    "session_discipline": 25
  },
  "tilt_breakdown": {
    "stake_volatility": 7,
    "loss_chasing": 0,
    "streak_behavior": 21,
    "session_discipline": 25
  },
  "bankroll_health": "caution",
  "personal_rules": [
    {
      "rule": "No bets after 10pm, full stop.",
      "reason": "42 bets placed between 11pm and 4am produced a 0% win rate and -71.5% ROI. That window is costing you money every time you open the app late.",
      "based_on": "Late-night time-of-day ROI breakdown showing complete shutout from 11pm through 4am"
    },
    {
      "rule": "Maximum 2 NBA bets per day.",
      "reason": "The 13 days with 4+ NBA bets combined for $-2210 in losses. More NBA bets per day does not mean more edge, it means more exposure to your worst-performing market.",
      "based_on": "NBA rapid-fire sessions finding: 13 days with 4+ NBA bets at combined $-2210"
    },
    {
      "rule": "No NFL parlays. Bet every NFL pick straight.",
      "reason": "NFL straight bets made $497. NFL parlays lost $522. You have a real NFL edge that parlays are erasing completely.",
      "based_on": "NFL parlay drag: NFL straight bets +$497, NFL parlays -$522 at -38.7% ROI"
    },
    {
      "rule": "Decide your stake for the session before placing the first bet, and do not change it.",
      "reason": "Your stakes range from $15 to $450 with a variability score of 0.83. The December 13 session shows what happens when sizing escalates mid-session: $-1317 in a single day.",
      "based_on": "Stake Volatility bias: variability score 0.83, max stake $450, worst session $-1317"
    },
    {
      "rule": "On Saturdays, bet half your normal volume.",
      "reason": "Saturday is your highest-volume day at 56 bets and your second-worst performer at -26.5% ROI and $-1462 in losses. More bets on your worst day amplifies the damage.",
      "based_on": "Day-of-week breakdown: Saturday -26.5% ROI, 56 bets, $-1462 profit"
    }
  ],
  "session_analysis": {
    "total_sessions": 108,
    "avg_bets_per_winning_session": 2.88,
    "avg_bets_per_losing_session": 2.78,
    "worst_session": {
      "date": "Dec 12, 2025",
      "bets": 10,
      "duration": "7:35 PM - 2:19 AM",
      "starting_stake": 59,
      "ending_stake": 450,
      "net": -1316.73,
      "description": "SESSION-052 on December 12, 2025 is the one to learn from. Ten bets, $-1317 in losses, the only F-grade session in 108 total, and flagged as heated. This is where the stake escalation pattern is most visible in the raw data, with NBA spread bets climbing to $350, $400, and $450 in a single sitting."
    },
    "best_session": {
      "date": "Nov 14, 2025",
      "bets": 4,
      "duration": "6:01 PM - 10:43 PM",
      "starting_stake": 41,
      "ending_stake": 67,
      "net": 329.82,
      "description": "SESSION-020 on November 14, 2025 is what disciplined betting looks like for this bettor: 4 bets, $330 profit, grade A. A clean NFL parlay hit at +500 combined with a solid NFL spread win kept the session tight and profitable without chasing or overextending."
    },
    "insight": "Most sessions look disciplined, but 4 of 108 had heated moments worth reviewing."
  },
  "edge_profile": {
    "profitable_areas": [
      {
        "category": "NFL spread",
        "roi": 7.69,
        "sample_size": 60,
        "confidence": "medium"
      },
      {
        "category": "NFL moneyline",
        "roi": 3.09,
        "sample_size": 14,
        "confidence": "low"
      }
    ],
    "unprofitable_areas": [
      {
        "category": "NBA spread",
        "roi": -26.43,
        "sample_size": 55,
        "estimated_loss": 1382.17
      },
      {
        "category": "NBA prop",
        "roi": -25.84,
        "sample_size": 55,
        "estimated_loss": 831.7
      },
      {
        "category": "NFL parlay",
        "roi": -38.67,
        "sample_size": 40,
        "estimated_loss": 522
      },
      {
        "category": "NHL spread",
        "roi": -44.64,
        "sample_size": 7,
        "estimated_loss": 204
      }
    ],
    "reallocation_advice": "Your NFL spread game is the clearest real edge in this profile at +7.7% ROI across 60 bets. That is where your attention and your stakes belong. Pull back on NBA props and NBA spreads, which are bleeding money at -25% or worse, and stop combining your NFL picks into parlays that erase the profit your straight bets are generating. The Thursday window and the 6pm-7pm time slot are where your sharpest decisions happen. Build your sessions around those windows and treat everything after 10pm as off-limits.",
    "sharp_score": 41
  },
  "betting_archetype": {
    "name": "The Methodical",
    "description": "Consistent and steady. You've got a foundation. The analysis shows where to build on it."
  },
  "timing_analysis": {
    "by_hour": [
      {
        "label": "12am",
        "bets": 4,
        "wins": 0,
        "losses": 4,
        "staked": 498,
        "profit": -498,
        "roi": -100,
        "win_rate": 0,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "1am",
        "bets": 5,
        "wins": 0,
        "losses": 5,
        "staked": 537,
        "profit": -537,
        "roi": -100,
        "win_rate": 0,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "2am",
        "bets": 7,
        "wins": 0,
        "losses": 7,
        "staked": 722,
        "profit": -722,
        "roi": -100,
        "win_rate": 0,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "3am",
        "bets": 6,
        "wins": 0,
        "losses": 6,
        "staked": 340,
        "profit": -340,
        "roi": -100,
        "win_rate": 0,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "4am",
        "bets": 0,
        "wins": 0,
        "losses": 0,
        "staked": 0,
        "profit": 0,
        "roi": 0,
        "win_rate": 0,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "5am",
        "bets": 0,
        "wins": 0,
        "losses": 0,
        "staked": 0,
        "profit": 0,
        "roi": 0,
        "win_rate": 0,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "6am",
        "bets": 0,
        "wins": 0,
        "losses": 0,
        "staked": 0,
        "profit": 0,
        "roi": 0,
        "win_rate": 0,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "7am",
        "bets": 0,
        "wins": 0,
        "losses": 0,
        "staked": 0,
        "profit": 0,
        "roi": 0,
        "win_rate": 0,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "8am",
        "bets": 0,
        "wins": 0,
        "losses": 0,
        "staked": 0,
        "profit": 0,
        "roi": 0,
        "win_rate": 0,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "9am",
        "bets": 0,
        "wins": 0,
        "losses": 0,
        "staked": 0,
        "profit": 0,
        "roi": 0,
        "win_rate": 0,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "10am",
        "bets": 0,
        "wins": 0,
        "losses": 0,
        "staked": 0,
        "profit": 0,
        "roi": 0,
        "win_rate": 0,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "11am",
        "bets": 0,
        "wins": 0,
        "losses": 0,
        "staked": 0,
        "profit": 0,
        "roi": 0,
        "win_rate": 0,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "12pm",
        "bets": 0,
        "wins": 0,
        "losses": 0,
        "staked": 0,
        "profit": 0,
        "roi": 0,
        "win_rate": 0,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "1pm",
        "bets": 0,
        "wins": 0,
        "losses": 0,
        "staked": 0,
        "profit": 0,
        "roi": 0,
        "win_rate": 0,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "2pm",
        "bets": 0,
        "wins": 0,
        "losses": 0,
        "staked": 0,
        "profit": 0,
        "roi": 0,
        "win_rate": 0,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "3pm",
        "bets": 0,
        "wins": 0,
        "losses": 0,
        "staked": 0,
        "profit": 0,
        "roi": 0,
        "win_rate": 0,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "4pm",
        "bets": 0,
        "wins": 0,
        "losses": 0,
        "staked": 0,
        "profit": 0,
        "roi": 0,
        "win_rate": 0,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "5pm",
        "bets": 20,
        "wins": 10,
        "losses": 10,
        "staked": 1690,
        "profit": -82.8,
        "roi": -4.9,
        "win_rate": 50,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "6pm",
        "bets": 16,
        "wins": 10,
        "losses": 6,
        "staked": 1304,
        "profit": 711.47,
        "roi": 54.56,
        "win_rate": 62.5,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "7pm",
        "bets": 45,
        "wins": 22,
        "losses": 23,
        "staked": 3004,
        "profit": 126.2,
        "roi": 4.2,
        "win_rate": 48.89,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "8pm",
        "bets": 65,
        "wins": 28,
        "losses": 37,
        "staked": 4119,
        "profit": -126.36,
        "roi": -3.07,
        "win_rate": 43.08,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "9pm",
        "bets": 64,
        "wins": 24,
        "losses": 40,
        "staked": 4575,
        "profit": -690.06,
        "roi": -15.08,
        "win_rate": 37.5,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "10pm",
        "bets": 48,
        "wins": 17,
        "losses": 31,
        "staked": 2897,
        "profit": -369.06,
        "roi": -12.74,
        "win_rate": 35.42,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "11pm",
        "bets": 24,
        "wins": 3,
        "losses": 21,
        "staked": 1642,
        "profit": -720,
        "roi": -43.85,
        "win_rate": 12.5,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      }
    ],
    "by_day": [
      {
        "label": "Mon",
        "bets": 49,
        "wins": 16,
        "losses": 33,
        "staked": 3421,
        "profit": -851.49,
        "roi": -24.89,
        "win_rate": 32.65,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "Tue",
        "bets": 40,
        "wins": 13,
        "losses": 27,
        "staked": 2543,
        "profit": -489.92,
        "roi": -19.27,
        "win_rate": 32.5,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "Wed",
        "bets": 37,
        "wins": 15,
        "losses": 22,
        "staked": 2552,
        "profit": -64.24,
        "roi": -2.52,
        "win_rate": 40.54,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "Thu",
        "bets": 31,
        "wins": 17,
        "losses": 14,
        "staked": 2115,
        "profit": 335.72,
        "roi": 15.87,
        "win_rate": 54.84,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "Fri",
        "bets": 46,
        "wins": 16,
        "losses": 30,
        "staked": 2850,
        "profit": -288.73,
        "roi": -10.13,
        "win_rate": 34.78,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "Sat",
        "bets": 56,
        "wins": 23,
        "losses": 33,
        "staked": 5523,
        "profit": -1462.09,
        "roi": -26.47,
        "win_rate": 41.07,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "Sun",
        "bets": 45,
        "wins": 14,
        "losses": 31,
        "staked": 2324,
        "profit": -426.86,
        "roi": -18.37,
        "win_rate": 31.11,
        "profit_visibility": "visible",
        "staked_visibility": "visible"
      }
    ],
    "best_window": {
      "label": "6pm",
      "roi": 54.56,
      "count": 16
    },
    "worst_window": {
      "label": "12am",
      "roi": -100,
      "count": 4
    },
    "late_night_stats": {
      "count": 42,
      "roi": -71.55,
      "pct_of_total": 13.82
    },
    "has_time_data": true
  },
  "odds_analysis": {
    "buckets": [
      {
        "label": "Heavy Chalk",
        "range": "-300 or worse",
        "bets": 0,
        "wins": 0,
        "losses": 0,
        "staked": 0,
        "profit": 0,
        "roi": 0,
        "win_rate": 0,
        "implied_prob": 0,
        "actual_win_rate": 0,
        "edge": 0,
        "profit_visibility": "visible",
        "roi_visibility": "visible",
        "win_rate_visibility": "visible",
        "implied_prob_visibility": "visible",
        "actual_win_rate_visibility": "visible",
        "edge_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "Moderate Favorite",
        "range": "-200 to -299",
        "bets": 2,
        "wins": 2,
        "losses": 0,
        "staked": 132,
        "profit": 66,
        "roi": 50,
        "win_rate": 100,
        "implied_prob": 66.67,
        "actual_win_rate": 100,
        "edge": 33.33,
        "profit_visibility": "visible",
        "roi_visibility": "visible",
        "win_rate_visibility": "visible",
        "implied_prob_visibility": "visible",
        "actual_win_rate_visibility": "visible",
        "edge_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "Slight Favorite",
        "range": "-110 to -199",
        "bets": 160,
        "wins": 80,
        "losses": 80,
        "staked": 14468,
        "profit": -1547.08,
        "roi": -10.69,
        "win_rate": 50,
        "implied_prob": 53.27,
        "actual_win_rate": 50,
        "edge": -3.27,
        "profit_visibility": "visible",
        "roi_visibility": "visible",
        "win_rate_visibility": "visible",
        "implied_prob_visibility": "visible",
        "actual_win_rate_visibility": "visible",
        "edge_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "Pick'em",
        "range": "-109 to +109",
        "bets": 34,
        "wins": 15,
        "losses": 19,
        "staked": 2149,
        "profit": -221.83,
        "roi": -10.32,
        "win_rate": 44.12,
        "implied_prob": 49.82,
        "actual_win_rate": 44.12,
        "edge": -5.7,
        "profit_visibility": "visible",
        "roi_visibility": "visible",
        "win_rate_visibility": "visible",
        "implied_prob_visibility": "visible",
        "actual_win_rate_visibility": "visible",
        "edge_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "Slight Dog",
        "range": "+110 to +175",
        "bets": 23,
        "wins": 8,
        "losses": 15,
        "staked": 2051,
        "profit": -780.7,
        "roi": -38.06,
        "win_rate": 34.78,
        "implied_prob": 44.22,
        "actual_win_rate": 34.78,
        "edge": -9.44,
        "profit_visibility": "visible",
        "roi_visibility": "visible",
        "win_rate_visibility": "visible",
        "implied_prob_visibility": "visible",
        "actual_win_rate_visibility": "visible",
        "edge_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "Moderate Dog",
        "range": "+176 to +300",
        "bets": 0,
        "wins": 0,
        "losses": 0,
        "staked": 0,
        "profit": 0,
        "roi": 0,
        "win_rate": 0,
        "implied_prob": 0,
        "actual_win_rate": 0,
        "edge": 0,
        "profit_visibility": "visible",
        "roi_visibility": "visible",
        "win_rate_visibility": "visible",
        "implied_prob_visibility": "visible",
        "actual_win_rate_visibility": "visible",
        "edge_visibility": "visible",
        "staked_visibility": "visible"
      },
      {
        "label": "Longshot",
        "range": "+301 or longer",
        "bets": 85,
        "wins": 9,
        "losses": 76,
        "staked": 2528,
        "profit": -764,
        "roi": -30.22,
        "win_rate": 10.59,
        "implied_prob": 16.67,
        "actual_win_rate": 10.59,
        "edge": -6.08,
        "profit_visibility": "visible",
        "roi_visibility": "visible",
        "win_rate_visibility": "visible",
        "implied_prob_visibility": "visible",
        "actual_win_rate_visibility": "visible",
        "edge_visibility": "visible",
        "staked_visibility": "visible"
      }
    ],
    "expected_wins": 127.84,
    "actual_wins": 114,
    "luck_rating": -13.84,
    "luck_label": "Running cold",
    "total_settled": 304,
    "best_bucket": {
      "label": "Slight Favorite",
      "edge": -3.27,
      "count": 160
    },
    "worst_bucket": {
      "label": "Slight Dog",
      "edge": -9.44,
      "count": 23
    }
  },
  "dfs_mode": false,
  "betiq": {
    "score": 62,
    "components": {
      "line_value": 18,
      "calibration": 15,
      "sophistication": 6,
      "specialization": 3,
      "timing": 8,
      "confidence": 12
    },
    "percentile": null,
    "interpretation": "Above-average skill. You have identifiable edges. The question is whether you're exploiting them enough.",
    "insufficient_data": false
  },
  "emotion_percentile": 30,
  "emotion_score_insufficient_data": false,
  "tilt_score_insufficient_data": false,
  "enhanced_tilt": {
    "score": 53,
    "signals": {
      "bet_sizing_volatility": 7,
      "loss_reaction": 0,
      "streak_behavior": 21,
      "session_discipline": 25,
      "session_acceleration": 15,
      "odds_drift_after_loss": 10
    },
    "risk_level": "elevated",
    "worst_trigger": "Your losing sessions run much longer than your winning ones. You don't know when to stop.",
    "percentile": 30
  },
  "sport_specific_findings": [
    {
      "id": "NFL-PARLAY-DRAG",
      "name": "NFL parlay drag",
      "sport": "NFL",
      "severity": "medium",
      "description": "Your NFL straight bets are profitable, but NFL parlays are dragging your overall NFL ROI down.",
      "evidence": "NFL straight bets: +$497. NFL parlays (35%): $-522.",
      "estimated_cost": -522,
      "recommendation": "Take your NFL reads and make them singles. Your NFL edge is in straight bets. Parlays are erasing it.",
      "sample_size": 114,
      "confidence": "high",
      "sub_splits": [
        {
          "label": "NFL parlays",
          "bets": 40,
          "roi_pct": null,
          "net_usd": -522
        },
        {
          "label": "NFL straight bets",
          "bets": 74,
          "roi_pct": null,
          "net_usd": 497
        }
      ],
      "description_visibility": "visible",
      "evidence_visibility": "visible",
      "estimated_cost_visibility": "visible",
      "recommendation_visibility": "visible"
    },
    {
      "id": "NBA-PROP-OVEREXPOSURE",
      "name": "NBA player prop overexposure",
      "sport": "NBA",
      "severity": "high",
      "description": "Heavy NBA player prop volume with negative returns. The prop market is sharp and the juice is high.",
      "evidence": "31% of NBA bets are props (55). Props ROI: -25.8%, net $-832.",
      "estimated_cost": -832,
      "recommendation": "Cut NBA prop volume by at least 50%. Focus on spreads and totals where inefficiency is greater.",
      "sample_size": 55,
      "confidence": "medium",
      "sub_splits": [
        {
          "label": "NBA props",
          "bets": 55,
          "roi_pct": -25.84,
          "net_usd": -832
        }
      ],
      "description_visibility": "visible",
      "evidence_visibility": "visible",
      "estimated_cost_visibility": "visible",
      "recommendation_visibility": "visible"
    },
    {
      "id": "NBA-RAPID-BETTING",
      "name": "NBA rapid-fire sessions",
      "sport": "NBA",
      "severity": "high",
      "description": "Multiple days with 4+ NBA bets suggest live/in-play betting or emotional reactions to game flow.",
      "evidence": "13 days with 4+ NBA bets. Combined: $-2210.",
      "estimated_cost": -2210,
      "recommendation": "Limit yourself to pre-game NBA bets only. Live betting NBA is where emotional decisions get expensive.",
      "sample_size": 61,
      "confidence": "medium",
      "sub_splits": [
        {
          "label": "Bets on 13 rapid-fire days (4+ NBA bets/day)",
          "bets": 61,
          "roi_pct": null,
          "net_usd": -2210
        }
      ],
      "description_visibility": "visible",
      "evidence_visibility": "visible",
      "estimated_cost_visibility": "visible",
      "recommendation_visibility": "visible"
    }
  ],
  "session_detection": {
    "sessions": [
      {
        "id": "SESSION-001",
        "date": "Nov 1, 2025",
        "dayOfWeek": "Saturday",
        "startTime": "3:43 AM",
        "endTime": "3:44 AM",
        "durationMinutes": 1,
        "bets": 2,
        "wins": 0,
        "losses": 2,
        "pushes": 0,
        "staked": 129,
        "profit": -129,
        "roi": -100,
        "avgStake": 64.5,
        "startingStake": 34,
        "endingStake": 95,
        "stakeEscalation": 2.79,
        "maxStake": 95,
        "minStake": 34,
        "stakeCv": 0.47,
        "betsPerHour": 20,
        "longestLossStreak": 2,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "D",
        "gradeReasons": [
          "Stakes escalated more than 2x from start to finish",
          "Rapid-fire betting at 20.0 bets/hour",
          "Stepped up stakes from a prior losing bet"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          0,
          1
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-002",
        "date": "Nov 1, 2025",
        "dayOfWeek": "Saturday",
        "startTime": "5:47 PM",
        "endTime": "9:58 PM",
        "durationMinutes": 251,
        "bets": 5,
        "wins": 4,
        "losses": 1,
        "pushes": 0,
        "staked": 376,
        "profit": 166.19,
        "roi": 44.2,
        "avgStake": 75.2,
        "startingStake": 107,
        "endingStake": 72,
        "stakeEscalation": 0.67,
        "maxStake": 107,
        "minStake": 48,
        "stakeCv": 0.33,
        "betsPerHour": 1.2,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          2,
          3,
          4,
          5,
          6
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-003",
        "date": "Nov 2, 2025",
        "dayOfWeek": "Sunday",
        "startTime": "9:58 PM",
        "endTime": "9:58 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 41,
        "profit": -41,
        "roi": -100,
        "avgStake": 41,
        "startingStake": 41,
        "endingStake": 41,
        "stakeEscalation": 1,
        "maxStake": 41,
        "minStake": 41,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          7
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-004",
        "date": "Nov 3, 2025",
        "dayOfWeek": "Monday",
        "startTime": "6:24 PM",
        "endTime": "6:24 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 1,
        "losses": 0,
        "pushes": 0,
        "staked": 113,
        "profit": 102.73,
        "roi": 90.91,
        "avgStake": 113,
        "startingStake": 113,
        "endingStake": 113,
        "stakeEscalation": 1,
        "maxStake": 113,
        "minStake": 113,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 0,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          8
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-005",
        "date": "Nov 3, 2025",
        "dayOfWeek": "Monday",
        "startTime": "9:25 PM",
        "endTime": "9:25 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 23,
        "profit": -23,
        "roi": -100,
        "avgStake": 23,
        "startingStake": 23,
        "endingStake": 23,
        "stakeEscalation": 1,
        "maxStake": 23,
        "minStake": 23,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          9
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-006",
        "date": "Nov 4, 2025",
        "dayOfWeek": "Tuesday",
        "startTime": "7:30 PM",
        "endTime": "10:47 PM",
        "durationMinutes": 197,
        "bets": 3,
        "wins": 1,
        "losses": 2,
        "pushes": 0,
        "staked": 150,
        "profit": 31.36,
        "roi": 20.91,
        "avgStake": 50,
        "startingStake": 20,
        "endingStake": 95,
        "stakeEscalation": 4.75,
        "maxStake": 95,
        "minStake": 20,
        "stakeCv": 0.65,
        "betsPerHour": 0.91,
        "longestLossStreak": 2,
        "chasedAfterLoss": true,
        "chaseCount": 2,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "C",
        "gradeReasons": [
          "Stakes escalated more than 2x from start to finish",
          "Stepped up stakes from a prior losing bet",
          "Moderately inconsistent stake sizing within session"
        ],
        "isHeated": true,
        "framing": "win-but-risky",
        "heatSignals": [
          "Stakes more than doubled while chasing losses"
        ],
        "betIndices": [
          10,
          11,
          12
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-007",
        "date": "Nov 5, 2025",
        "dayOfWeek": "Wednesday",
        "startTime": "8:49 PM",
        "endTime": "11:36 PM",
        "durationMinutes": 167,
        "bets": 3,
        "wins": 1,
        "losses": 2,
        "pushes": 0,
        "staked": 161,
        "profit": -69.24,
        "roi": -43.01,
        "avgStake": 53.67,
        "startingStake": 47,
        "endingStake": 34,
        "stakeEscalation": 0.72,
        "maxStake": 80,
        "minStake": 34,
        "stakeCv": 0.36,
        "betsPerHour": 1.08,
        "longestLossStreak": 2,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": true,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Heavy losses this session (-43.0% ROI)",
          "Late-night betting (after 11pm)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          13,
          14,
          15
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-008",
        "date": "Nov 6, 2025",
        "dayOfWeek": "Thursday",
        "startTime": "5:15 PM",
        "endTime": "9:56 PM",
        "durationMinutes": 281,
        "bets": 5,
        "wins": 3,
        "losses": 2,
        "pushes": 0,
        "staked": 484,
        "profit": 37.18,
        "roi": 7.68,
        "avgStake": 96.8,
        "startingStake": 110,
        "endingStake": 101,
        "stakeEscalation": 0.92,
        "maxStake": 134,
        "minStake": 62,
        "stakeCv": 0.26,
        "betsPerHour": 1.07,
        "longestLossStreak": 2,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Stepped up stakes from a prior losing bet"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          16,
          17,
          18,
          19,
          20
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-009",
        "date": "Nov 7, 2025",
        "dayOfWeek": "Friday",
        "startTime": "2:17 AM",
        "endTime": "2:17 AM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 65,
        "profit": -65,
        "roi": -100,
        "avgStake": 65,
        "startingStake": 65,
        "endingStake": 65,
        "stakeEscalation": 1,
        "maxStake": 65,
        "minStake": 65,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          21
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-010",
        "date": "Nov 7, 2025",
        "dayOfWeek": "Friday",
        "startTime": "9:50 PM",
        "endTime": "10:14 PM",
        "durationMinutes": 24,
        "bets": 3,
        "wins": 2,
        "losses": 1,
        "pushes": 0,
        "staked": 214,
        "profit": 172.73,
        "roi": 80.71,
        "avgStake": 71.33,
        "startingStake": 102,
        "endingStake": 80,
        "stakeEscalation": 0.78,
        "maxStake": 102,
        "minStake": 32,
        "stakeCv": 0.41,
        "betsPerHour": 7.5,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Rapid-fire betting at 7.5 bets/hour"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          22,
          23,
          24
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-011",
        "date": "Nov 8, 2025",
        "dayOfWeek": "Saturday",
        "startTime": "7:23 PM",
        "endTime": "10:50 PM",
        "durationMinutes": 207,
        "bets": 3,
        "wins": 2,
        "losses": 1,
        "pushes": 0,
        "staked": 177,
        "profit": 113.18,
        "roi": 63.94,
        "avgStake": 59,
        "startingStake": 100,
        "endingStake": 52,
        "stakeEscalation": 0.52,
        "maxStake": 100,
        "minStake": 25,
        "stakeCv": 0.53,
        "betsPerHour": 0.87,
        "longestLossStreak": 1,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Stepped up stakes from a prior losing bet",
          "Moderately inconsistent stake sizing within session"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          25,
          26,
          27
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-012",
        "date": "Nov 9, 2025",
        "dayOfWeek": "Sunday",
        "startTime": "2:20 AM",
        "endTime": "3:58 AM",
        "durationMinutes": 98,
        "bets": 2,
        "wins": 0,
        "losses": 2,
        "pushes": 0,
        "staked": 90,
        "profit": -90,
        "roi": -100,
        "avgStake": 45,
        "startingStake": 28,
        "endingStake": 62,
        "stakeEscalation": 2.21,
        "maxStake": 62,
        "minStake": 28,
        "stakeCv": 0.38,
        "betsPerHour": 1.22,
        "longestLossStreak": 2,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "C",
        "gradeReasons": [
          "Stakes escalated more than 2x from start to finish",
          "Stepped up stakes from a prior losing bet",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          28,
          29
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-013",
        "date": "Nov 9, 2025",
        "dayOfWeek": "Sunday",
        "startTime": "10:12 PM",
        "endTime": "10:58 PM",
        "durationMinutes": 46,
        "bets": 2,
        "wins": 1,
        "losses": 1,
        "pushes": 0,
        "staked": 72,
        "profit": 12,
        "roi": 16.67,
        "avgStake": 36,
        "startingStake": 56,
        "endingStake": 16,
        "stakeEscalation": 0.29,
        "maxStake": 56,
        "minStake": 16,
        "stakeCv": 0.56,
        "betsPerHour": 2.61,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Moderately inconsistent stake sizing within session",
          "Elevated pace at 2.6 bets/hour"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          30,
          31
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-014",
        "date": "Nov 10, 2025",
        "dayOfWeek": "Monday",
        "startTime": "9:29 PM",
        "endTime": "3:03 AM",
        "durationMinutes": 334,
        "bets": 6,
        "wins": 1,
        "losses": 5,
        "pushes": 0,
        "staked": 409,
        "profit": -262,
        "roi": -64.06,
        "avgStake": 68.17,
        "startingStake": 83,
        "endingStake": 57,
        "stakeEscalation": 0.69,
        "maxStake": 84,
        "minStake": 28,
        "stakeCv": 0.3,
        "betsPerHour": 1.08,
        "longestLossStreak": 4,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": true,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Stepped up stakes from a prior losing bet",
          "Heavy losses this session (-64.1% ROI)",
          "Late-night betting (after 11pm)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          32,
          33,
          34,
          35,
          36,
          37
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-015",
        "date": "Nov 11, 2025",
        "dayOfWeek": "Tuesday",
        "startTime": "5:00 PM",
        "endTime": "6:34 PM",
        "durationMinutes": 94,
        "bets": 2,
        "wins": 0,
        "losses": 2,
        "pushes": 0,
        "staked": 88,
        "profit": -88,
        "roi": -100,
        "avgStake": 44,
        "startingStake": 44,
        "endingStake": 44,
        "stakeEscalation": 1,
        "maxStake": 44,
        "minStake": 44,
        "stakeCv": 0,
        "betsPerHour": 1.28,
        "longestLossStreak": 2,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          38,
          39
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-016",
        "date": "Nov 11, 2025",
        "dayOfWeek": "Tuesday",
        "startTime": "9:54 PM",
        "endTime": "10:05 PM",
        "durationMinutes": 11,
        "bets": 2,
        "wins": 0,
        "losses": 2,
        "pushes": 0,
        "staked": 136,
        "profit": -136,
        "roi": -100,
        "avgStake": 68,
        "startingStake": 60,
        "endingStake": 76,
        "stakeEscalation": 1.27,
        "maxStake": 76,
        "minStake": 60,
        "stakeCv": 0.12,
        "betsPerHour": 10.91,
        "longestLossStreak": 2,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.9 bets/hour",
          "Stepped up stakes from a prior losing bet",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          40,
          41
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-017",
        "date": "Nov 12, 2025",
        "dayOfWeek": "Wednesday",
        "startTime": "1:07 AM",
        "endTime": "1:07 AM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 32,
        "profit": -32,
        "roi": -100,
        "avgStake": 32,
        "startingStake": 32,
        "endingStake": 32,
        "stakeEscalation": 1,
        "maxStake": 32,
        "minStake": 32,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          42
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-018",
        "date": "Nov 12, 2025",
        "dayOfWeek": "Wednesday",
        "startTime": "10:04 PM",
        "endTime": "10:04 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 65,
        "profit": -65,
        "roi": -100,
        "avgStake": 65,
        "startingStake": 65,
        "endingStake": 65,
        "stakeEscalation": 1,
        "maxStake": 65,
        "minStake": 65,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          43
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-019",
        "date": "Nov 13, 2025",
        "dayOfWeek": "Thursday",
        "startTime": "7:00 PM",
        "endTime": "9:50 PM",
        "durationMinutes": 170,
        "bets": 5,
        "wins": 4,
        "losses": 1,
        "pushes": 0,
        "staked": 316,
        "profit": 149.37,
        "roi": 47.27,
        "avgStake": 63.2,
        "startingStake": 57,
        "endingStake": 79,
        "stakeEscalation": 1.39,
        "maxStake": 79,
        "minStake": 47,
        "stakeCv": 0.17,
        "betsPerHour": 1.76,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          44,
          45,
          46,
          47,
          48
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-020",
        "date": "Nov 14, 2025",
        "dayOfWeek": "Friday",
        "startTime": "6:01 PM",
        "endTime": "10:43 PM",
        "durationMinutes": 282,
        "bets": 4,
        "wins": 3,
        "losses": 1,
        "pushes": 0,
        "staked": 319,
        "profit": 329.82,
        "roi": 103.39,
        "avgStake": 79.75,
        "startingStake": 41,
        "endingStake": 67,
        "stakeEscalation": 1.63,
        "maxStake": 124,
        "minStake": 41,
        "stakeCv": 0.38,
        "betsPerHour": 0.85,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Stakes escalated more than 1.5x during the session"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          49,
          50,
          51,
          52
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-021",
        "date": "Nov 15, 2025",
        "dayOfWeek": "Saturday",
        "startTime": "8:08 PM",
        "endTime": "10:23 PM",
        "durationMinutes": 135,
        "bets": 3,
        "wins": 1,
        "losses": 2,
        "pushes": 0,
        "staked": 152,
        "profit": 6,
        "roi": 3.95,
        "avgStake": 50.67,
        "startingStake": 79,
        "endingStake": 24,
        "stakeEscalation": 0.3,
        "maxStake": 79,
        "minStake": 24,
        "stakeCv": 0.44,
        "betsPerHour": 1.33,
        "longestLossStreak": 2,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          53,
          54,
          55
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-022",
        "date": "Nov 16, 2025",
        "dayOfWeek": "Sunday",
        "startTime": "8:19 PM",
        "endTime": "8:19 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 17,
        "profit": -17,
        "roi": -100,
        "avgStake": 17,
        "startingStake": 17,
        "endingStake": 17,
        "stakeEscalation": 1,
        "maxStake": 17,
        "minStake": 17,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          56
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-023",
        "date": "Nov 17, 2025",
        "dayOfWeek": "Monday",
        "startTime": "7:51 PM",
        "endTime": "10:32 PM",
        "durationMinutes": 161,
        "bets": 6,
        "wins": 2,
        "losses": 4,
        "pushes": 0,
        "staked": 418,
        "profit": -96.03,
        "roi": -22.97,
        "avgStake": 69.67,
        "startingStake": 35,
        "endingStake": 39,
        "stakeEscalation": 1.11,
        "maxStake": 113,
        "minStake": 35,
        "stakeCv": 0.4,
        "betsPerHour": 2.24,
        "longestLossStreak": 2,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Stepped up stakes from a prior losing bet",
          "Significant losses this session (-23.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          57,
          58,
          59,
          60,
          61,
          62
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-024",
        "date": "Nov 18, 2025",
        "dayOfWeek": "Tuesday",
        "startTime": "8:07 PM",
        "endTime": "8:07 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 33,
        "profit": -33,
        "roi": -100,
        "avgStake": 33,
        "startingStake": 33,
        "endingStake": 33,
        "stakeEscalation": 1,
        "maxStake": 33,
        "minStake": 33,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          63
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-025",
        "date": "Nov 19, 2025",
        "dayOfWeek": "Wednesday",
        "startTime": "8:05 PM",
        "endTime": "10:49 PM",
        "durationMinutes": 164,
        "bets": 5,
        "wins": 2,
        "losses": 3,
        "pushes": 0,
        "staked": 329,
        "profit": 46.55,
        "roi": 14.15,
        "avgStake": 65.8,
        "startingStake": 33,
        "endingStake": 84,
        "stakeEscalation": 2.55,
        "maxStake": 94,
        "minStake": 25,
        "stakeCv": 0.46,
        "betsPerHour": 1.83,
        "longestLossStreak": 2,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Stakes escalated more than 2x from start to finish",
          "Stepped up stakes from a prior losing bet"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          64,
          65,
          66,
          67,
          68
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-026",
        "date": "Nov 20, 2025",
        "dayOfWeek": "Thursday",
        "startTime": "7:23 PM",
        "endTime": "10:10 PM",
        "durationMinutes": 167,
        "bets": 3,
        "wins": 1,
        "losses": 2,
        "pushes": 0,
        "staked": 148,
        "profit": -60.13,
        "roi": -40.63,
        "avgStake": 49.33,
        "startingStake": 47,
        "endingStake": 64,
        "stakeEscalation": 1.36,
        "maxStake": 64,
        "minStake": 37,
        "stakeCv": 0.23,
        "betsPerHour": 1.08,
        "longestLossStreak": 2,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Stepped up stakes from a prior losing bet",
          "Heavy losses this session (-40.6% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          69,
          70,
          71
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-027",
        "date": "Nov 21, 2025",
        "dayOfWeek": "Friday",
        "startTime": "5:53 PM",
        "endTime": "1:13 AM",
        "durationMinutes": 440,
        "bets": 7,
        "wins": 0,
        "losses": 7,
        "pushes": 0,
        "staked": 273,
        "profit": -273,
        "roi": -100,
        "avgStake": 39,
        "startingStake": 32,
        "endingStake": 26,
        "stakeEscalation": 0.81,
        "maxStake": 88,
        "minStake": 25,
        "stakeCv": 0.52,
        "betsPerHour": 0.95,
        "longestLossStreak": 7,
        "chasedAfterLoss": true,
        "chaseCount": 2,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "C",
        "gradeReasons": [
          "7 consecutive losses without stopping",
          "Stepped up stakes from a prior losing bet",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          72,
          73,
          74,
          75,
          76,
          77,
          78
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-028",
        "date": "Nov 22, 2025",
        "dayOfWeek": "Saturday",
        "startTime": "8:09 PM",
        "endTime": "11:10 PM",
        "durationMinutes": 181,
        "bets": 3,
        "wins": 0,
        "losses": 3,
        "pushes": 0,
        "staked": 104,
        "profit": -104,
        "roi": -100,
        "avgStake": 34.67,
        "startingStake": 15,
        "endingStake": 56,
        "stakeEscalation": 3.73,
        "maxStake": 56,
        "minStake": 15,
        "stakeCv": 0.48,
        "betsPerHour": 0.99,
        "longestLossStreak": 3,
        "chasedAfterLoss": true,
        "chaseCount": 2,
        "lateNight": true,
        "lateNightKnown": true,
        "grade": "D",
        "gradeReasons": [
          "Stakes escalated more than 2x from start to finish",
          "Stepped up stakes from a prior losing bet",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": true,
        "framing": "loss",
        "heatSignals": [
          "Stakes more than doubled while chasing losses"
        ],
        "betIndices": [
          79,
          80,
          81
        ],
        "triggerEvent": {
          "type": "late_night",
          "description": "Late-night session starting at 8:09 PM."
        },
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-029",
        "date": "Nov 23, 2025",
        "dayOfWeek": "Sunday",
        "startTime": "8:00 PM",
        "endTime": "9:07 PM",
        "durationMinutes": 67,
        "bets": 2,
        "wins": 1,
        "losses": 1,
        "pushes": 0,
        "staked": 108,
        "profit": 8.77,
        "roi": 8.12,
        "avgStake": 54,
        "startingStake": 66,
        "endingStake": 42,
        "stakeEscalation": 0.64,
        "maxStake": 66,
        "minStake": 42,
        "stakeCv": 0.22,
        "betsPerHour": 1.79,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          82,
          83
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-030",
        "date": "Nov 24, 2025",
        "dayOfWeek": "Monday",
        "startTime": "9:27 PM",
        "endTime": "11:30 PM",
        "durationMinutes": 123,
        "bets": 2,
        "wins": 0,
        "losses": 2,
        "pushes": 0,
        "staked": 99,
        "profit": -99,
        "roi": -100,
        "avgStake": 49.5,
        "startingStake": 76,
        "endingStake": 23,
        "stakeEscalation": 0.3,
        "maxStake": 76,
        "minStake": 23,
        "stakeCv": 0.54,
        "betsPerHour": 0.98,
        "longestLossStreak": 2,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": true,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Heavy losses this session (-100.0% ROI)",
          "Moderately inconsistent stake sizing within session",
          "Late-night betting (after 11pm)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          84,
          85
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-031",
        "date": "Nov 25, 2025",
        "dayOfWeek": "Tuesday",
        "startTime": "7:12 PM",
        "endTime": "7:12 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 71,
        "profit": -71,
        "roi": -100,
        "avgStake": 71,
        "startingStake": 71,
        "endingStake": 71,
        "stakeEscalation": 1,
        "maxStake": 71,
        "minStake": 71,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          86
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-032",
        "date": "Nov 26, 2025",
        "dayOfWeek": "Wednesday",
        "startTime": "9:21 PM",
        "endTime": "9:21 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 17,
        "profit": -17,
        "roi": -100,
        "avgStake": 17,
        "startingStake": 17,
        "endingStake": 17,
        "stakeEscalation": 1,
        "maxStake": 17,
        "minStake": 17,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          87
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-033",
        "date": "Nov 27, 2025",
        "dayOfWeek": "Thursday",
        "startTime": "5:00 PM",
        "endTime": "9:14 PM",
        "durationMinutes": 254,
        "bets": 3,
        "wins": 1,
        "losses": 2,
        "pushes": 0,
        "staked": 255,
        "profit": -25.91,
        "roi": -10.16,
        "avgStake": 85,
        "startingStake": 27,
        "endingStake": 108,
        "stakeEscalation": 4,
        "maxStake": 120,
        "minStake": 27,
        "stakeCv": 0.49,
        "betsPerHour": 0.71,
        "longestLossStreak": 1,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Stakes escalated more than 2x from start to finish",
          "Stepped up stakes from a prior losing bet"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          88,
          89,
          90
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-034",
        "date": "Nov 28, 2025",
        "dayOfWeek": "Friday",
        "startTime": "7:23 PM",
        "endTime": "8:58 PM",
        "durationMinutes": 95,
        "bets": 3,
        "wins": 2,
        "losses": 1,
        "pushes": 0,
        "staked": 164,
        "profit": 58.4,
        "roi": 35.61,
        "avgStake": 54.67,
        "startingStake": 56,
        "endingStake": 64,
        "stakeEscalation": 1.14,
        "maxStake": 64,
        "minStake": 44,
        "stakeCv": 0.15,
        "betsPerHour": 1.89,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          91,
          92,
          93
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-035",
        "date": "Nov 29, 2025",
        "dayOfWeek": "Saturday",
        "startTime": "7:21 PM",
        "endTime": "10:05 PM",
        "durationMinutes": 164,
        "bets": 2,
        "wins": 1,
        "losses": 1,
        "pushes": 0,
        "staked": 99,
        "profit": 38.45,
        "roi": 38.84,
        "avgStake": 49.5,
        "startingStake": 72,
        "endingStake": 27,
        "stakeEscalation": 0.38,
        "maxStake": 72,
        "minStake": 27,
        "stakeCv": 0.45,
        "betsPerHour": 0.73,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          94,
          95
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-036",
        "date": "Nov 30, 2025",
        "dayOfWeek": "Sunday",
        "startTime": "1:51 AM",
        "endTime": "1:51 AM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 43,
        "profit": -43,
        "roi": -100,
        "avgStake": 43,
        "startingStake": 43,
        "endingStake": 43,
        "stakeEscalation": 1,
        "maxStake": 43,
        "minStake": 43,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          96
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-037",
        "date": "Nov 30, 2025",
        "dayOfWeek": "Sunday",
        "startTime": "8:32 PM",
        "endTime": "11:04 PM",
        "durationMinutes": 152,
        "bets": 4,
        "wins": 1,
        "losses": 3,
        "pushes": 0,
        "staked": 141,
        "profit": -54.9,
        "roi": -38.94,
        "avgStake": 35.25,
        "startingStake": 25,
        "endingStake": 46,
        "stakeEscalation": 1.84,
        "maxStake": 46,
        "minStake": 25,
        "stakeCv": 0.25,
        "betsPerHour": 1.58,
        "longestLossStreak": 2,
        "chasedAfterLoss": true,
        "chaseCount": 2,
        "lateNight": true,
        "lateNightKnown": true,
        "grade": "C",
        "gradeReasons": [
          "Stakes escalated more than 1.5x during the session",
          "Stepped up stakes from a prior losing bet",
          "Heavy losses this session (-38.9% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          97,
          98,
          99,
          100
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-038",
        "date": "Dec 1, 2025",
        "dayOfWeek": "Monday",
        "startTime": "8:21 PM",
        "endTime": "9:14 PM",
        "durationMinutes": 53,
        "bets": 2,
        "wins": 1,
        "losses": 1,
        "pushes": 0,
        "staked": 176,
        "profit": -32.82,
        "roi": -18.65,
        "avgStake": 88,
        "startingStake": 75,
        "endingStake": 101,
        "stakeEscalation": 1.35,
        "maxStake": 101,
        "minStake": 75,
        "stakeCv": 0.15,
        "betsPerHour": 2.26,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Significant losses this session (-18.6% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          101,
          102
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-039",
        "date": "Dec 2, 2025",
        "dayOfWeek": "Tuesday",
        "startTime": "8:00 PM",
        "endTime": "11:40 PM",
        "durationMinutes": 220,
        "bets": 4,
        "wins": 1,
        "losses": 3,
        "pushes": 0,
        "staked": 317,
        "profit": -143,
        "roi": -45.11,
        "avgStake": 79.25,
        "startingStake": 106,
        "endingStake": 29,
        "stakeEscalation": 0.27,
        "maxStake": 115,
        "minStake": 29,
        "stakeCv": 0.43,
        "betsPerHour": 1.09,
        "longestLossStreak": 3,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": true,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Stepped up stakes from a prior losing bet",
          "Heavy losses this session (-45.1% ROI)",
          "Late-night betting (after 11pm)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          103,
          104,
          105,
          106
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-040",
        "date": "Dec 3, 2025",
        "dayOfWeek": "Wednesday",
        "startTime": "7:52 PM",
        "endTime": "10:44 PM",
        "durationMinutes": 172,
        "bets": 2,
        "wins": 1,
        "losses": 1,
        "pushes": 0,
        "staked": 154,
        "profit": 75.09,
        "roi": 48.76,
        "avgStake": 77,
        "startingStake": 120,
        "endingStake": 34,
        "stakeEscalation": 0.28,
        "maxStake": 120,
        "minStake": 34,
        "stakeCv": 0.56,
        "betsPerHour": 0.7,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Moderately inconsistent stake sizing within session"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          107,
          108
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-041",
        "date": "Dec 4, 2025",
        "dayOfWeek": "Thursday",
        "startTime": "8:58 PM",
        "endTime": "8:58 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 1,
        "losses": 0,
        "pushes": 0,
        "staked": 40,
        "profit": 34.78,
        "roi": 86.95,
        "avgStake": 40,
        "startingStake": 40,
        "endingStake": 40,
        "stakeEscalation": 1,
        "maxStake": 40,
        "minStake": 40,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 0,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          109
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-042",
        "date": "Dec 5, 2025",
        "dayOfWeek": "Friday",
        "startTime": "8:40 PM",
        "endTime": "10:22 PM",
        "durationMinutes": 102,
        "bets": 2,
        "wins": 1,
        "losses": 1,
        "pushes": 0,
        "staked": 127,
        "profit": 6.64,
        "roi": 5.23,
        "avgStake": 63.5,
        "startingStake": 70,
        "endingStake": 57,
        "stakeEscalation": 0.81,
        "maxStake": 70,
        "minStake": 57,
        "stakeCv": 0.1,
        "betsPerHour": 1.18,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          110,
          111
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-043",
        "date": "Dec 6, 2025",
        "dayOfWeek": "Saturday",
        "startTime": "2:52 AM",
        "endTime": "2:52 AM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 78,
        "profit": -78,
        "roi": -100,
        "avgStake": 78,
        "startingStake": 78,
        "endingStake": 78,
        "stakeEscalation": 1,
        "maxStake": 78,
        "minStake": 78,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          112
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-044",
        "date": "Dec 6, 2025",
        "dayOfWeek": "Saturday",
        "startTime": "6:19 PM",
        "endTime": "9:20 PM",
        "durationMinutes": 181,
        "bets": 3,
        "wins": 1,
        "losses": 2,
        "pushes": 0,
        "staked": 347,
        "profit": -95,
        "roi": -27.38,
        "avgStake": 115.67,
        "startingStake": 132,
        "endingStake": 95,
        "stakeEscalation": 0.72,
        "maxStake": 132,
        "minStake": 95,
        "stakeCv": 0.13,
        "betsPerHour": 0.99,
        "longestLossStreak": 2,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Significant losses this session (-27.4% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          113,
          114,
          115
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-045",
        "date": "Dec 7, 2025",
        "dayOfWeek": "Sunday",
        "startTime": "5:17 PM",
        "endTime": "10:45 PM",
        "durationMinutes": 328,
        "bets": 5,
        "wins": 2,
        "losses": 3,
        "pushes": 0,
        "staked": 347,
        "profit": -119.45,
        "roi": -34.42,
        "avgStake": 69.4,
        "startingStake": 132,
        "endingStake": 31,
        "stakeEscalation": 0.23,
        "maxStake": 132,
        "minStake": 31,
        "stakeCv": 0.5,
        "betsPerHour": 0.91,
        "longestLossStreak": 2,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Heavy losses this session (-34.4% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          116,
          117,
          118,
          119,
          120
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-046",
        "date": "Dec 8, 2025",
        "dayOfWeek": "Monday",
        "startTime": "3:10 AM",
        "endTime": "3:10 AM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 27,
        "profit": -27,
        "roi": -100,
        "avgStake": 27,
        "startingStake": 27,
        "endingStake": 27,
        "stakeEscalation": 1,
        "maxStake": 27,
        "minStake": 27,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          121
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-047",
        "date": "Dec 8, 2025",
        "dayOfWeek": "Monday",
        "startTime": "6:04 PM",
        "endTime": "10:13 PM",
        "durationMinutes": 249,
        "bets": 4,
        "wins": 2,
        "losses": 2,
        "pushes": 0,
        "staked": 293,
        "profit": 56.42,
        "roi": 19.26,
        "avgStake": 73.25,
        "startingStake": 24,
        "endingStake": 85,
        "stakeEscalation": 3.54,
        "maxStake": 97,
        "minStake": 24,
        "stakeCv": 0.39,
        "betsPerHour": 0.96,
        "longestLossStreak": 1,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Stakes escalated more than 2x from start to finish",
          "Stepped up stakes from a prior losing bet"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          122,
          123,
          124,
          125
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-048",
        "date": "Dec 9, 2025",
        "dayOfWeek": "Tuesday",
        "startTime": "8:32 PM",
        "endTime": "9:57 PM",
        "durationMinutes": 85,
        "bets": 2,
        "wins": 1,
        "losses": 1,
        "pushes": 0,
        "staked": 157,
        "profit": 104.55,
        "roi": 66.59,
        "avgStake": 78.5,
        "startingStake": 20,
        "endingStake": 137,
        "stakeEscalation": 6.85,
        "maxStake": 137,
        "minStake": 20,
        "stakeCv": 0.75,
        "betsPerHour": 1.41,
        "longestLossStreak": 1,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "C",
        "gradeReasons": [
          "Stakes escalated more than 2x from start to finish",
          "Stepped up stakes from a prior losing bet",
          "Moderately inconsistent stake sizing within session"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          126,
          127
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-049",
        "date": "Dec 10, 2025",
        "dayOfWeek": "Wednesday",
        "startTime": "9:33 PM",
        "endTime": "11:28 PM",
        "durationMinutes": 115,
        "bets": 2,
        "wins": 0,
        "losses": 2,
        "pushes": 0,
        "staked": 83,
        "profit": -83,
        "roi": -100,
        "avgStake": 41.5,
        "startingStake": 44,
        "endingStake": 39,
        "stakeEscalation": 0.89,
        "maxStake": 44,
        "minStake": 39,
        "stakeCv": 0.06,
        "betsPerHour": 1.04,
        "longestLossStreak": 2,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": true,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Heavy losses this session (-100.0% ROI)",
          "Late-night betting (after 11pm)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          128,
          129
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-050",
        "date": "Dec 11, 2025",
        "dayOfWeek": "Thursday",
        "startTime": "2:42 AM",
        "endTime": "2:42 AM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 24,
        "profit": -24,
        "roi": -100,
        "avgStake": 24,
        "startingStake": 24,
        "endingStake": 24,
        "stakeEscalation": 1,
        "maxStake": 24,
        "minStake": 24,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          130
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-051",
        "date": "Dec 11, 2025",
        "dayOfWeek": "Thursday",
        "startTime": "5:40 PM",
        "endTime": "5:40 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 106,
        "profit": -106,
        "roi": -100,
        "avgStake": 106,
        "startingStake": 106,
        "endingStake": 106,
        "stakeEscalation": 1,
        "maxStake": 106,
        "minStake": 106,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          131
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-052",
        "date": "Dec 12, 2025",
        "dayOfWeek": "Friday",
        "startTime": "7:35 PM",
        "endTime": "2:19 AM",
        "durationMinutes": 404,
        "bets": 10,
        "wins": 2,
        "losses": 8,
        "pushes": 0,
        "staked": 1647,
        "profit": -1316.73,
        "roi": -79.95,
        "avgStake": 164.7,
        "startingStake": 59,
        "endingStake": 450,
        "stakeEscalation": 7.63,
        "maxStake": 450,
        "minStake": 25,
        "stakeCv": 0.95,
        "betsPerHour": 1.49,
        "longestLossStreak": 7,
        "chasedAfterLoss": true,
        "chaseCount": 5,
        "lateNight": true,
        "lateNightKnown": true,
        "grade": "F",
        "gradeReasons": [
          "Stakes escalated more than 2x from start to finish",
          "Chased losses 5 times in a single session",
          "Highly inconsistent stake sizing within session"
        ],
        "isHeated": true,
        "framing": "loss",
        "heatSignals": [
          "Session grade: F",
          "Stakes more than doubled while chasing losses",
          "Extended session with heavy losses while chasing"
        ],
        "betIndices": [
          132,
          133,
          134,
          135,
          136,
          137,
          138,
          139,
          140,
          141
        ],
        "triggerEvent": {
          "type": "late_night",
          "description": "Late-night session starting at 7:35 PM."
        },
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-053",
        "date": "Dec 13, 2025",
        "dayOfWeek": "Saturday",
        "startTime": "7:49 PM",
        "endTime": "11:52 PM",
        "durationMinutes": 243,
        "bets": 8,
        "wins": 4,
        "losses": 4,
        "pushes": 0,
        "staked": 1270,
        "profit": -135.16,
        "roi": -10.64,
        "avgStake": 158.75,
        "startingStake": 50,
        "endingStake": 300,
        "stakeEscalation": 6,
        "maxStake": 300,
        "minStake": 50,
        "stakeCv": 0.61,
        "betsPerHour": 1.98,
        "longestLossStreak": 2,
        "chasedAfterLoss": true,
        "chaseCount": 3,
        "lateNight": true,
        "lateNightKnown": true,
        "grade": "D",
        "gradeReasons": [
          "Stakes escalated more than 2x from start to finish",
          "Chased losses 3 times in a single session",
          "Stepped up stakes from a prior losing bet"
        ],
        "isHeated": true,
        "framing": "loss",
        "heatSignals": [
          "Stakes more than doubled while chasing losses"
        ],
        "betIndices": [
          142,
          143,
          144,
          145,
          146,
          147,
          148,
          149
        ],
        "triggerEvent": {
          "type": "loss",
          "description": "Preceded by a $450 losing bet on Dec 13.",
          "triggeringBetId": "demo-304"
        },
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-054",
        "date": "Dec 14, 2025",
        "dayOfWeek": "Sunday",
        "startTime": "8:50 PM",
        "endTime": "8:50 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 1,
        "losses": 0,
        "pushes": 0,
        "staked": 86,
        "profit": 94.6,
        "roi": 110,
        "avgStake": 86,
        "startingStake": 86,
        "endingStake": 86,
        "stakeEscalation": 1,
        "maxStake": 86,
        "minStake": 86,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 0,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          150
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-055",
        "date": "Dec 15, 2025",
        "dayOfWeek": "Monday",
        "startTime": "9:15 PM",
        "endTime": "10:31 PM",
        "durationMinutes": 76,
        "bets": 4,
        "wins": 0,
        "losses": 4,
        "pushes": 0,
        "staked": 305,
        "profit": -305,
        "roi": -100,
        "avgStake": 76.25,
        "startingStake": 82,
        "endingStake": 67,
        "stakeEscalation": 0.82,
        "maxStake": 100,
        "minStake": 56,
        "stakeCv": 0.22,
        "betsPerHour": 3.16,
        "longestLossStreak": 4,
        "chasedAfterLoss": true,
        "chaseCount": 2,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Stepped up stakes from a prior losing bet",
          "Heavy losses this session (-100.0% ROI)",
          "Elevated pace at 3.2 bets/hour"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          151,
          152,
          153,
          154
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-056",
        "date": "Dec 16, 2025",
        "dayOfWeek": "Tuesday",
        "startTime": "9:24 PM",
        "endTime": "9:24 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 1,
        "losses": 0,
        "pushes": 0,
        "staked": 107,
        "profit": 97.27,
        "roi": 90.91,
        "avgStake": 107,
        "startingStake": 107,
        "endingStake": 107,
        "stakeEscalation": 1,
        "maxStake": 107,
        "minStake": 107,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 0,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          155
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-057",
        "date": "Dec 17, 2025",
        "dayOfWeek": "Wednesday",
        "startTime": "3:16 AM",
        "endTime": "3:16 AM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 65,
        "profit": -65,
        "roi": -100,
        "avgStake": 65,
        "startingStake": 65,
        "endingStake": 65,
        "stakeEscalation": 1,
        "maxStake": 65,
        "minStake": 65,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          156
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-058",
        "date": "Dec 17, 2025",
        "dayOfWeek": "Wednesday",
        "startTime": "5:35 PM",
        "endTime": "5:49 PM",
        "durationMinutes": 14,
        "bets": 2,
        "wins": 1,
        "losses": 1,
        "pushes": 0,
        "staked": 201,
        "profit": -59.73,
        "roi": -29.72,
        "avgStake": 100.5,
        "startingStake": 127,
        "endingStake": 74,
        "stakeEscalation": 0.58,
        "maxStake": 127,
        "minStake": 74,
        "stakeCv": 0.26,
        "betsPerHour": 8.57,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Rapid-fire betting at 8.6 bets/hour",
          "Significant losses this session (-29.7% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          157,
          158
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-059",
        "date": "Dec 17, 2025",
        "dayOfWeek": "Wednesday",
        "startTime": "9:13 PM",
        "endTime": "9:13 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 19,
        "profit": -19,
        "roi": -100,
        "avgStake": 19,
        "startingStake": 19,
        "endingStake": 19,
        "stakeEscalation": 1,
        "maxStake": 19,
        "minStake": 19,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          159
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-060",
        "date": "Dec 18, 2025",
        "dayOfWeek": "Thursday",
        "startTime": "9:23 PM",
        "endTime": "10:57 PM",
        "durationMinutes": 94,
        "bets": 3,
        "wins": 2,
        "losses": 1,
        "pushes": 0,
        "staked": 153,
        "profit": 159.6,
        "roi": 104.31,
        "avgStake": 51,
        "startingStake": 58,
        "endingStake": 66,
        "stakeEscalation": 1.14,
        "maxStake": 66,
        "minStake": 29,
        "stakeCv": 0.31,
        "betsPerHour": 1.91,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          160,
          161,
          162
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-061",
        "date": "Dec 20, 2025",
        "dayOfWeek": "Saturday",
        "startTime": "10:49 PM",
        "endTime": "11:55 PM",
        "durationMinutes": 66,
        "bets": 2,
        "wins": 0,
        "losses": 2,
        "pushes": 0,
        "staked": 128,
        "profit": -128,
        "roi": -100,
        "avgStake": 64,
        "startingStake": 77,
        "endingStake": 51,
        "stakeEscalation": 0.66,
        "maxStake": 77,
        "minStake": 51,
        "stakeCv": 0.2,
        "betsPerHour": 1.82,
        "longestLossStreak": 2,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": true,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Heavy losses this session (-100.0% ROI)",
          "Late-night betting (after 11pm)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          163,
          164
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-062",
        "date": "Dec 21, 2025",
        "dayOfWeek": "Sunday",
        "startTime": "6:00 PM",
        "endTime": "11:16 PM",
        "durationMinutes": 316,
        "bets": 5,
        "wins": 1,
        "losses": 4,
        "pushes": 0,
        "staked": 248,
        "profit": -30.36,
        "roi": -12.24,
        "avgStake": 49.6,
        "startingStake": 35,
        "endingStake": 16,
        "stakeEscalation": 0.46,
        "maxStake": 114,
        "minStake": 16,
        "stakeCv": 0.72,
        "betsPerHour": 0.95,
        "longestLossStreak": 3,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": true,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Stepped up stakes from a prior losing bet",
          "Moderately inconsistent stake sizing within session",
          "Late-night betting (after 11pm)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          165,
          166,
          167,
          168,
          169
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-063",
        "date": "Dec 22, 2025",
        "dayOfWeek": "Monday",
        "startTime": "10:12 PM",
        "endTime": "12:18 AM",
        "durationMinutes": 126,
        "bets": 3,
        "wins": 2,
        "losses": 1,
        "pushes": 0,
        "staked": 170,
        "profit": 236.8,
        "roi": 139.29,
        "avgStake": 56.67,
        "startingStake": 31,
        "endingStake": 43,
        "stakeEscalation": 1.39,
        "maxStake": 96,
        "minStake": 31,
        "stakeCv": 0.5,
        "betsPerHour": 1.43,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          170,
          171,
          172
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-064",
        "date": "Dec 24, 2025",
        "dayOfWeek": "Wednesday",
        "startTime": "7:16 PM",
        "endTime": "9:53 PM",
        "durationMinutes": 157,
        "bets": 3,
        "wins": 3,
        "losses": 0,
        "pushes": 0,
        "staked": 287,
        "profit": 260.91,
        "roi": 90.91,
        "avgStake": 95.67,
        "startingStake": 84,
        "endingStake": 90,
        "stakeEscalation": 1.07,
        "maxStake": 113,
        "minStake": 84,
        "stakeCv": 0.13,
        "betsPerHour": 1.15,
        "longestLossStreak": 0,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          173,
          174,
          175
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-065",
        "date": "Dec 26, 2025",
        "dayOfWeek": "Friday",
        "startTime": "7:20 PM",
        "endTime": "11:31 PM",
        "durationMinutes": 251,
        "bets": 3,
        "wins": 1,
        "losses": 2,
        "pushes": 0,
        "staked": 143,
        "profit": -17,
        "roi": -11.89,
        "avgStake": 47.67,
        "startingStake": 48,
        "endingStake": 29,
        "stakeEscalation": 0.6,
        "maxStake": 66,
        "minStake": 29,
        "stakeCv": 0.32,
        "betsPerHour": 0.72,
        "longestLossStreak": 1,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": true,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Stepped up stakes from a prior losing bet",
          "Late-night betting (after 11pm)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          176,
          177,
          178
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-066",
        "date": "Dec 27, 2025",
        "dayOfWeek": "Saturday",
        "startTime": "5:44 PM",
        "endTime": "5:44 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 1,
        "losses": 0,
        "pushes": 0,
        "staked": 104,
        "profit": 94.55,
        "roi": 90.91,
        "avgStake": 104,
        "startingStake": 104,
        "endingStake": 104,
        "stakeEscalation": 1,
        "maxStake": 104,
        "minStake": 104,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 0,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          179
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-067",
        "date": "Dec 27, 2025",
        "dayOfWeek": "Saturday",
        "startTime": "8:50 PM",
        "endTime": "10:06 PM",
        "durationMinutes": 76,
        "bets": 3,
        "wins": 3,
        "losses": 0,
        "pushes": 0,
        "staked": 185,
        "profit": 303.18,
        "roi": 163.88,
        "avgStake": 61.67,
        "startingStake": 74,
        "endingStake": 33,
        "stakeEscalation": 0.45,
        "maxStake": 78,
        "minStake": 33,
        "stakeCv": 0.33,
        "betsPerHour": 2.37,
        "longestLossStreak": 0,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          180,
          181,
          182
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-068",
        "date": "Dec 28, 2025",
        "dayOfWeek": "Sunday",
        "startTime": "7:11 PM",
        "endTime": "7:26 PM",
        "durationMinutes": 15,
        "bets": 2,
        "wins": 1,
        "losses": 1,
        "pushes": 0,
        "staked": 168,
        "profit": 15.27,
        "roi": 9.09,
        "avgStake": 84,
        "startingStake": 96,
        "endingStake": 72,
        "stakeEscalation": 0.75,
        "maxStake": 96,
        "minStake": 72,
        "stakeCv": 0.14,
        "betsPerHour": 8,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Rapid-fire betting at 8.0 bets/hour"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          183,
          184
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-069",
        "date": "Dec 28, 2025",
        "dayOfWeek": "Sunday",
        "startTime": "10:31 PM",
        "endTime": "10:31 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 79,
        "profit": -79,
        "roi": -100,
        "avgStake": 79,
        "startingStake": 79,
        "endingStake": 79,
        "stakeEscalation": 1,
        "maxStake": 79,
        "minStake": 79,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          185
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-070",
        "date": "Dec 29, 2025",
        "dayOfWeek": "Monday",
        "startTime": "5:19 PM",
        "endTime": "5:19 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 121,
        "profit": -121,
        "roi": -100,
        "avgStake": 121,
        "startingStake": 121,
        "endingStake": 121,
        "stakeEscalation": 1,
        "maxStake": 121,
        "minStake": 121,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          186
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-071",
        "date": "Dec 29, 2025",
        "dayOfWeek": "Monday",
        "startTime": "9:52 PM",
        "endTime": "9:52 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 36,
        "profit": -36,
        "roi": -100,
        "avgStake": 36,
        "startingStake": 36,
        "endingStake": 36,
        "stakeEscalation": 1,
        "maxStake": 36,
        "minStake": 36,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          187
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-072",
        "date": "Dec 30, 2025",
        "dayOfWeek": "Tuesday",
        "startTime": "5:54 PM",
        "endTime": "5:55 PM",
        "durationMinutes": 1,
        "bets": 2,
        "wins": 1,
        "losses": 1,
        "pushes": 0,
        "staked": 151,
        "profit": -21,
        "roi": -13.91,
        "avgStake": 75.5,
        "startingStake": 78,
        "endingStake": 73,
        "stakeEscalation": 0.94,
        "maxStake": 78,
        "minStake": 73,
        "stakeCv": 0.03,
        "betsPerHour": 20,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Rapid-fire betting at 20.0 bets/hour"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          188,
          189
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-073",
        "date": "Dec 30, 2025",
        "dayOfWeek": "Tuesday",
        "startTime": "10:40 PM",
        "endTime": "10:40 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 21,
        "profit": -21,
        "roi": -100,
        "avgStake": 21,
        "startingStake": 21,
        "endingStake": 21,
        "stakeEscalation": 1,
        "maxStake": 21,
        "minStake": 21,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          190
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-074",
        "date": "Dec 31, 2025",
        "dayOfWeek": "Wednesday",
        "startTime": "6:05 PM",
        "endTime": "11:15 PM",
        "durationMinutes": 310,
        "bets": 3,
        "wins": 3,
        "losses": 0,
        "pushes": 0,
        "staked": 205,
        "profit": 325.91,
        "roi": 158.98,
        "avgStake": 68.33,
        "startingStake": 122,
        "endingStake": 33,
        "stakeEscalation": 0.27,
        "maxStake": 122,
        "minStake": 33,
        "stakeCv": 0.56,
        "betsPerHour": 0.58,
        "longestLossStreak": 0,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": true,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Moderately inconsistent stake sizing within session",
          "Late-night betting (after 11pm)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          191,
          192,
          193
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-075",
        "date": "Jan 1, 2026",
        "dayOfWeek": "Thursday",
        "startTime": "7:27 PM",
        "endTime": "7:27 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 1,
        "losses": 0,
        "pushes": 0,
        "staked": 104,
        "profit": 94.55,
        "roi": 90.91,
        "avgStake": 104,
        "startingStake": 104,
        "endingStake": 104,
        "stakeEscalation": 1,
        "maxStake": 104,
        "minStake": 104,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 0,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          194
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-076",
        "date": "Jan 2, 2026",
        "dayOfWeek": "Friday",
        "startTime": "8:12 PM",
        "endTime": "9:49 PM",
        "durationMinutes": 97,
        "bets": 2,
        "wins": 1,
        "losses": 1,
        "pushes": 0,
        "staked": 131,
        "profit": 73.27,
        "roi": 55.93,
        "avgStake": 65.5,
        "startingStake": 24,
        "endingStake": 107,
        "stakeEscalation": 4.46,
        "maxStake": 107,
        "minStake": 24,
        "stakeCv": 0.63,
        "betsPerHour": 1.24,
        "longestLossStreak": 1,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "C",
        "gradeReasons": [
          "Stakes escalated more than 2x from start to finish",
          "Stepped up stakes from a prior losing bet",
          "Moderately inconsistent stake sizing within session"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          195,
          196
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-077",
        "date": "Jan 3, 2026",
        "dayOfWeek": "Saturday",
        "startTime": "6:06 PM",
        "endTime": "10:57 PM",
        "durationMinutes": 291,
        "bets": 6,
        "wins": 3,
        "losses": 3,
        "pushes": 0,
        "staked": 501,
        "profit": -94.67,
        "roi": -18.9,
        "avgStake": 83.5,
        "startingStake": 75,
        "endingStake": 52,
        "stakeEscalation": 0.69,
        "maxStake": 116,
        "minStake": 52,
        "stakeCv": 0.27,
        "betsPerHour": 1.24,
        "longestLossStreak": 2,
        "chasedAfterLoss": true,
        "chaseCount": 2,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Stepped up stakes from a prior losing bet",
          "Significant losses this session (-18.9% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          197,
          198,
          199,
          200,
          201,
          202
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-078",
        "date": "Jan 4, 2026",
        "dayOfWeek": "Sunday",
        "startTime": "2:57 AM",
        "endTime": "2:57 AM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 44,
        "profit": -44,
        "roi": -100,
        "avgStake": 44,
        "startingStake": 44,
        "endingStake": 44,
        "stakeEscalation": 1,
        "maxStake": 44,
        "minStake": 44,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          203
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-079",
        "date": "Jan 4, 2026",
        "dayOfWeek": "Sunday",
        "startTime": "7:33 PM",
        "endTime": "9:45 PM",
        "durationMinutes": 132,
        "bets": 4,
        "wins": 2,
        "losses": 2,
        "pushes": 0,
        "staked": 211,
        "profit": 118.73,
        "roi": 56.27,
        "avgStake": 52.75,
        "startingStake": 69,
        "endingStake": 81,
        "stakeEscalation": 1.17,
        "maxStake": 81,
        "minStake": 28,
        "stakeCv": 0.43,
        "betsPerHour": 1.82,
        "longestLossStreak": 1,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Stepped up stakes from a prior losing bet"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          204,
          205,
          206,
          207
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-080",
        "date": "Jan 5, 2026",
        "dayOfWeek": "Monday",
        "startTime": "7:13 PM",
        "endTime": "11:49 PM",
        "durationMinutes": 276,
        "bets": 5,
        "wins": 2,
        "losses": 3,
        "pushes": 0,
        "staked": 274,
        "profit": -16.1,
        "roi": -5.88,
        "avgStake": 54.8,
        "startingStake": 41,
        "endingStake": 29,
        "stakeEscalation": 0.71,
        "maxStake": 92,
        "minStake": 29,
        "stakeCv": 0.41,
        "betsPerHour": 1.09,
        "longestLossStreak": 1,
        "chasedAfterLoss": true,
        "chaseCount": 2,
        "lateNight": true,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Stepped up stakes from a prior losing bet",
          "Late-night betting (after 11pm)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          208,
          209,
          210,
          211,
          212
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-081",
        "date": "Jan 6, 2026",
        "dayOfWeek": "Tuesday",
        "startTime": "6:45 PM",
        "endTime": "9:04 PM",
        "durationMinutes": 139,
        "bets": 3,
        "wins": 1,
        "losses": 2,
        "pushes": 0,
        "staked": 161,
        "profit": -56,
        "roi": -34.78,
        "avgStake": 53.67,
        "startingStake": 63,
        "endingStake": 33,
        "stakeEscalation": 0.52,
        "maxStake": 65,
        "minStake": 33,
        "stakeCv": 0.27,
        "betsPerHour": 1.29,
        "longestLossStreak": 2,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Heavy losses this session (-34.8% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          213,
          214,
          215
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-082",
        "date": "Jan 8, 2026",
        "dayOfWeek": "Thursday",
        "startTime": "5:43 PM",
        "endTime": "5:43 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 72,
        "profit": -72,
        "roi": -100,
        "avgStake": 72,
        "startingStake": 72,
        "endingStake": 72,
        "stakeEscalation": 1,
        "maxStake": 72,
        "minStake": 72,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          216
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-083",
        "date": "Jan 9, 2026",
        "dayOfWeek": "Friday",
        "startTime": "8:56 PM",
        "endTime": "9:51 PM",
        "durationMinutes": 55,
        "bets": 2,
        "wins": 1,
        "losses": 1,
        "pushes": 0,
        "staked": 120,
        "profit": -6,
        "roi": -5,
        "avgStake": 60,
        "startingStake": 76,
        "endingStake": 44,
        "stakeEscalation": 0.58,
        "maxStake": 76,
        "minStake": 44,
        "stakeCv": 0.27,
        "betsPerHour": 2.18,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          217,
          218
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-084",
        "date": "Jan 10, 2026",
        "dayOfWeek": "Saturday",
        "startTime": "5:12 PM",
        "endTime": "5:12 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 1,
        "losses": 0,
        "pushes": 0,
        "staked": 82,
        "profit": 74.55,
        "roi": 90.91,
        "avgStake": 82,
        "startingStake": 82,
        "endingStake": 82,
        "stakeEscalation": 1,
        "maxStake": 82,
        "minStake": 82,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 0,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          219
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-085",
        "date": "Jan 10, 2026",
        "dayOfWeek": "Saturday",
        "startTime": "10:11 PM",
        "endTime": "10:11 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 63,
        "profit": -63,
        "roi": -100,
        "avgStake": 63,
        "startingStake": 63,
        "endingStake": 63,
        "stakeEscalation": 1,
        "maxStake": 63,
        "minStake": 63,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          220
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-086",
        "date": "Jan 11, 2026",
        "dayOfWeek": "Sunday",
        "startTime": "7:04 PM",
        "endTime": "11:16 PM",
        "durationMinutes": 252,
        "bets": 4,
        "wins": 1,
        "losses": 3,
        "pushes": 0,
        "staked": 172,
        "profit": -89.91,
        "roi": -52.27,
        "avgStake": 43,
        "startingStake": 79,
        "endingStake": 28,
        "stakeEscalation": 0.35,
        "maxStake": 79,
        "minStake": 22,
        "stakeCv": 0.52,
        "betsPerHour": 0.95,
        "longestLossStreak": 2,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": true,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Stepped up stakes from a prior losing bet",
          "Heavy losses this session (-52.3% ROI)",
          "Moderately inconsistent stake sizing within session"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          221,
          222,
          223,
          224
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-087",
        "date": "Jan 12, 2026",
        "dayOfWeek": "Monday",
        "startTime": "8:02 PM",
        "endTime": "10:28 PM",
        "durationMinutes": 146,
        "bets": 4,
        "wins": 2,
        "losses": 2,
        "pushes": 0,
        "staked": 351,
        "profit": -55.09,
        "roi": -15.7,
        "avgStake": 87.75,
        "startingStake": 136,
        "endingStake": 66,
        "stakeEscalation": 0.49,
        "maxStake": 136,
        "minStake": 60,
        "stakeCv": 0.34,
        "betsPerHour": 1.64,
        "longestLossStreak": 2,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Stepped up stakes from a prior losing bet",
          "Significant losses this session (-15.7% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          225,
          226,
          227,
          228
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-088",
        "date": "Jan 13, 2026",
        "dayOfWeek": "Tuesday",
        "startTime": "7:19 PM",
        "endTime": "8:34 PM",
        "durationMinutes": 75,
        "bets": 6,
        "wins": 4,
        "losses": 2,
        "pushes": 0,
        "staked": 481,
        "profit": 129.91,
        "roi": 27.01,
        "avgStake": 80.17,
        "startingStake": 94,
        "endingStake": 69,
        "stakeEscalation": 0.73,
        "maxStake": 108,
        "minStake": 53,
        "stakeCv": 0.28,
        "betsPerHour": 4.8,
        "longestLossStreak": 2,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 4.8 bets/hour",
          "Stepped up stakes from a prior losing bet"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          229,
          230,
          231,
          232,
          233,
          234
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-089",
        "date": "Jan 14, 2026",
        "dayOfWeek": "Wednesday",
        "startTime": "5:32 PM",
        "endTime": "7:12 PM",
        "durationMinutes": 100,
        "bets": 3,
        "wins": 2,
        "losses": 1,
        "pushes": 0,
        "staked": 244,
        "profit": 37.67,
        "roi": 15.44,
        "avgStake": 81.33,
        "startingStake": 100,
        "endingStake": 98,
        "stakeEscalation": 0.98,
        "maxStake": 100,
        "minStake": 46,
        "stakeCv": 0.31,
        "betsPerHour": 1.8,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          235,
          236,
          237
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-090",
        "date": "Jan 14, 2026",
        "dayOfWeek": "Wednesday",
        "startTime": "10:37 PM",
        "endTime": "11:51 PM",
        "durationMinutes": 74,
        "bets": 3,
        "wins": 1,
        "losses": 2,
        "pushes": 0,
        "staked": 213,
        "profit": -70.4,
        "roi": -33.05,
        "avgStake": 71,
        "startingStake": 62,
        "endingStake": 87,
        "stakeEscalation": 1.4,
        "maxStake": 87,
        "minStake": 62,
        "stakeCv": 0.16,
        "betsPerHour": 2.43,
        "longestLossStreak": 2,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": true,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Stepped up stakes from a prior losing bet",
          "Heavy losses this session (-33.1% ROI)",
          "Late-night betting (after 11pm)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          238,
          239,
          240
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-091",
        "date": "Jan 15, 2026",
        "dayOfWeek": "Thursday",
        "startTime": "8:47 PM",
        "endTime": "8:47 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 1,
        "losses": 0,
        "pushes": 0,
        "staked": 79,
        "profit": 71.82,
        "roi": 90.91,
        "avgStake": 79,
        "startingStake": 79,
        "endingStake": 79,
        "stakeEscalation": 1,
        "maxStake": 79,
        "minStake": 79,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 0,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          241
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-092",
        "date": "Jan 16, 2026",
        "dayOfWeek": "Friday",
        "startTime": "6:10 PM",
        "endTime": "11:12 PM",
        "durationMinutes": 302,
        "bets": 5,
        "wins": 2,
        "losses": 3,
        "pushes": 0,
        "staked": 276,
        "profit": 10.32,
        "roi": 3.74,
        "avgStake": 55.2,
        "startingStake": 93,
        "endingStake": 34,
        "stakeEscalation": 0.37,
        "maxStake": 93,
        "minStake": 21,
        "stakeCv": 0.49,
        "betsPerHour": 0.99,
        "longestLossStreak": 3,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": true,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Stepped up stakes from a prior losing bet",
          "Late-night betting (after 11pm)",
          "3 consecutive losses"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          242,
          243,
          244,
          245,
          246
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-093",
        "date": "Jan 17, 2026",
        "dayOfWeek": "Saturday",
        "startTime": "8:17 PM",
        "endTime": "1:56 AM",
        "durationMinutes": 339,
        "bets": 6,
        "wins": 1,
        "losses": 5,
        "pushes": 0,
        "staked": 363,
        "profit": -177.82,
        "roi": -48.99,
        "avgStake": 60.5,
        "startingStake": 47,
        "endingStake": 36,
        "stakeEscalation": 0.77,
        "maxStake": 129,
        "minStake": 25,
        "stakeCv": 0.64,
        "betsPerHour": 1.06,
        "longestLossStreak": 3,
        "chasedAfterLoss": true,
        "chaseCount": 2,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Stepped up stakes from a prior losing bet",
          "Heavy losses this session (-49.0% ROI)",
          "Moderately inconsistent stake sizing within session"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          247,
          248,
          249,
          250,
          251,
          252
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-094",
        "date": "Jan 18, 2026",
        "dayOfWeek": "Sunday",
        "startTime": "8:30 PM",
        "endTime": "8:30 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 54,
        "profit": -54,
        "roi": -100,
        "avgStake": 54,
        "startingStake": 54,
        "endingStake": 54,
        "stakeEscalation": 1,
        "maxStake": 54,
        "minStake": 54,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          253
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-095",
        "date": "Jan 19, 2026",
        "dayOfWeek": "Monday",
        "startTime": "7:43 PM",
        "endTime": "9:44 PM",
        "durationMinutes": 121,
        "bets": 5,
        "wins": 1,
        "losses": 4,
        "pushes": 0,
        "staked": 379,
        "profit": -209.09,
        "roi": -55.17,
        "avgStake": 75.8,
        "startingStake": 26,
        "endingStake": 77,
        "stakeEscalation": 2.96,
        "maxStake": 110,
        "minStake": 26,
        "stakeCv": 0.36,
        "betsPerHour": 2.48,
        "longestLossStreak": 2,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "C",
        "gradeReasons": [
          "Stakes escalated more than 2x from start to finish",
          "Stepped up stakes from a prior losing bet",
          "Heavy losses this session (-55.2% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          254,
          255,
          256,
          257,
          258
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-096",
        "date": "Jan 20, 2026",
        "dayOfWeek": "Tuesday",
        "startTime": "7:03 PM",
        "endTime": "9:13 PM",
        "durationMinutes": 130,
        "bets": 2,
        "wins": 1,
        "losses": 1,
        "pushes": 0,
        "staked": 103,
        "profit": 23.9,
        "roi": 23.2,
        "avgStake": 51.5,
        "startingStake": 38,
        "endingStake": 65,
        "stakeEscalation": 1.71,
        "maxStake": 65,
        "minStake": 38,
        "stakeCv": 0.26,
        "betsPerHour": 0.92,
        "longestLossStreak": 1,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Stakes escalated more than 1.5x during the session",
          "Stepped up stakes from a prior losing bet"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          259,
          260
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-097",
        "date": "Jan 21, 2026",
        "dayOfWeek": "Wednesday",
        "startTime": "8:32 PM",
        "endTime": "9:36 PM",
        "durationMinutes": 64,
        "bets": 2,
        "wins": 0,
        "losses": 2,
        "pushes": 0,
        "staked": 169,
        "profit": -169,
        "roi": -100,
        "avgStake": 84.5,
        "startingStake": 97,
        "endingStake": 72,
        "stakeEscalation": 0.74,
        "maxStake": 97,
        "minStake": 72,
        "stakeCv": 0.15,
        "betsPerHour": 1.88,
        "longestLossStreak": 2,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          261,
          262
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-098",
        "date": "Jan 22, 2026",
        "dayOfWeek": "Thursday",
        "startTime": "5:08 PM",
        "endTime": "9:12 PM",
        "durationMinutes": 244,
        "bets": 5,
        "wins": 2,
        "losses": 3,
        "pushes": 0,
        "staked": 280,
        "profit": 27.37,
        "roi": 9.78,
        "avgStake": 56,
        "startingStake": 79,
        "endingStake": 24,
        "stakeEscalation": 0.3,
        "maxStake": 82,
        "minStake": 24,
        "stakeCv": 0.39,
        "betsPerHour": 1.23,
        "longestLossStreak": 3,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Stepped up stakes from a prior losing bet",
          "3 consecutive losses"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          263,
          264,
          265,
          266,
          267
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-099",
        "date": "Jan 23, 2026",
        "dayOfWeek": "Friday",
        "startTime": "6:17 PM",
        "endTime": "11:31 PM",
        "durationMinutes": 314,
        "bets": 6,
        "wins": 0,
        "losses": 6,
        "pushes": 0,
        "staked": 410,
        "profit": -410,
        "roi": -100,
        "avgStake": 68.33,
        "startingStake": 70,
        "endingStake": 104,
        "stakeEscalation": 1.49,
        "maxStake": 104,
        "minStake": 21,
        "stakeCv": 0.44,
        "betsPerHour": 1.15,
        "longestLossStreak": 6,
        "chasedAfterLoss": true,
        "chaseCount": 2,
        "lateNight": true,
        "lateNightKnown": true,
        "grade": "C",
        "gradeReasons": [
          "6 consecutive losses without stopping",
          "Stepped up stakes from a prior losing bet",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          268,
          269,
          270,
          271,
          272,
          273
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-100",
        "date": "Jan 24, 2026",
        "dayOfWeek": "Saturday",
        "startTime": "5:22 PM",
        "endTime": "10:09 PM",
        "durationMinutes": 287,
        "bets": 4,
        "wins": 1,
        "losses": 3,
        "pushes": 0,
        "staked": 200,
        "profit": -88.54,
        "roi": -44.27,
        "avgStake": 50,
        "startingStake": 63,
        "endingStake": 30,
        "stakeEscalation": 0.48,
        "maxStake": 67,
        "minStake": 30,
        "stakeCv": 0.31,
        "betsPerHour": 0.84,
        "longestLossStreak": 3,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Heavy losses this session (-44.3% ROI)",
          "3 consecutive losses"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          274,
          275,
          276,
          277
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-101",
        "date": "Jan 25, 2026",
        "dayOfWeek": "Sunday",
        "startTime": "6:14 PM",
        "endTime": "11:32 PM",
        "durationMinutes": 318,
        "bets": 6,
        "wins": 3,
        "losses": 3,
        "pushes": 0,
        "staked": 342,
        "profit": 47.39,
        "roi": 13.86,
        "avgStake": 57,
        "startingStake": 96,
        "endingStake": 89,
        "stakeEscalation": 0.93,
        "maxStake": 96,
        "minStake": 19,
        "stakeCv": 0.5,
        "betsPerHour": 1.13,
        "longestLossStreak": 2,
        "chasedAfterLoss": true,
        "chaseCount": 2,
        "lateNight": true,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Stepped up stakes from a prior losing bet",
          "Late-night betting (after 11pm)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          278,
          279,
          280,
          281,
          282,
          283
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-102",
        "date": "Jan 26, 2026",
        "dayOfWeek": "Monday",
        "startTime": "7:00 PM",
        "endTime": "10:46 PM",
        "durationMinutes": 226,
        "bets": 6,
        "wins": 2,
        "losses": 4,
        "pushes": 0,
        "staked": 407,
        "profit": -145.31,
        "roi": -35.7,
        "avgStake": 67.83,
        "startingStake": 59,
        "endingStake": 40,
        "stakeEscalation": 0.68,
        "maxStake": 89,
        "minStake": 40,
        "stakeCv": 0.25,
        "betsPerHour": 1.59,
        "longestLossStreak": 3,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Stepped up stakes from a prior losing bet",
          "Heavy losses this session (-35.7% ROI)",
          "3 consecutive losses"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          284,
          285,
          286,
          287,
          288,
          289
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-103",
        "date": "Jan 27, 2026",
        "dayOfWeek": "Tuesday",
        "startTime": "2:10 AM",
        "endTime": "2:10 AM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 0,
        "losses": 1,
        "pushes": 0,
        "staked": 33,
        "profit": -33,
        "roi": -100,
        "avgStake": 33,
        "startingStake": 33,
        "endingStake": 33,
        "stakeEscalation": 1,
        "maxStake": 33,
        "minStake": 33,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour",
          "Heavy losses this session (-100.0% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          290
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-104",
        "date": "Jan 27, 2026",
        "dayOfWeek": "Tuesday",
        "startTime": "7:08 PM",
        "endTime": "7:09 PM",
        "durationMinutes": 1,
        "bets": 2,
        "wins": 0,
        "losses": 2,
        "pushes": 0,
        "staked": 129,
        "profit": -129,
        "roi": -100,
        "avgStake": 64.5,
        "startingStake": 35,
        "endingStake": 94,
        "stakeEscalation": 2.69,
        "maxStake": 94,
        "minStake": 35,
        "stakeCv": 0.46,
        "betsPerHour": 20,
        "longestLossStreak": 2,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "D",
        "gradeReasons": [
          "Stakes escalated more than 2x from start to finish",
          "Rapid-fire betting at 20.0 bets/hour",
          "Stepped up stakes from a prior losing bet"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          291,
          292
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-105",
        "date": "Jan 27, 2026",
        "dayOfWeek": "Tuesday",
        "startTime": "10:12 PM",
        "endTime": "10:48 PM",
        "durationMinutes": 36,
        "bets": 4,
        "wins": 2,
        "losses": 2,
        "pushes": 0,
        "staked": 225,
        "profit": 34.09,
        "roi": 15.15,
        "avgStake": 56.25,
        "startingStake": 76,
        "endingStake": 23,
        "stakeEscalation": 0.3,
        "maxStake": 76,
        "minStake": 23,
        "stakeCv": 0.37,
        "betsPerHour": 6.67,
        "longestLossStreak": 1,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Rapid-fire betting at 6.7 bets/hour",
          "Stepped up stakes from a prior losing bet"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          293,
          294,
          295,
          296
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-106",
        "date": "Jan 28, 2026",
        "dayOfWeek": "Wednesday",
        "startTime": "5:57 PM",
        "endTime": "8:46 PM",
        "durationMinutes": 169,
        "bets": 4,
        "wins": 1,
        "losses": 3,
        "pushes": 0,
        "staked": 308,
        "profit": -161,
        "roi": -52.27,
        "avgStake": 77,
        "startingStake": 77,
        "endingStake": 75,
        "stakeEscalation": 0.97,
        "maxStake": 105,
        "minStake": 51,
        "stakeCv": 0.25,
        "betsPerHour": 1.42,
        "longestLossStreak": 3,
        "chasedAfterLoss": true,
        "chaseCount": 1,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "B",
        "gradeReasons": [
          "Stepped up stakes from a prior losing bet",
          "Heavy losses this session (-52.3% ROI)",
          "3 consecutive losses"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          297,
          298,
          299,
          300
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-107",
        "date": "Jan 29, 2026",
        "dayOfWeek": "Thursday",
        "startTime": "9:21 PM",
        "endTime": "9:21 PM",
        "durationMinutes": 0,
        "bets": 1,
        "wins": 1,
        "losses": 0,
        "pushes": 0,
        "staked": 54,
        "profit": 49.09,
        "roi": 90.91,
        "avgStake": 54,
        "startingStake": 54,
        "endingStake": 54,
        "stakeEscalation": 1,
        "maxStake": 54,
        "minStake": 54,
        "stakeCv": 0,
        "betsPerHour": 10,
        "longestLossStreak": 0,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Rapid-fire betting at 10.0 bets/hour"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          301
        ],
        "profitVisibility": "visible"
      },
      {
        "id": "SESSION-108",
        "date": "Jan 30, 2026",
        "dayOfWeek": "Friday",
        "startTime": "7:09 PM",
        "endTime": "9:50 PM",
        "durationMinutes": 161,
        "bets": 2,
        "wins": 1,
        "losses": 1,
        "pushes": 0,
        "staked": 187,
        "profit": -78.18,
        "roi": -41.81,
        "avgStake": 93.5,
        "startingStake": 130,
        "endingStake": 57,
        "stakeEscalation": 0.44,
        "maxStake": 130,
        "minStake": 57,
        "stakeCv": 0.39,
        "betsPerHour": 0.75,
        "longestLossStreak": 1,
        "chasedAfterLoss": false,
        "chaseCount": 0,
        "lateNight": false,
        "lateNightKnown": true,
        "grade": "A",
        "gradeReasons": [
          "Heavy losses this session (-41.8% ROI)"
        ],
        "isHeated": false,
        "heatSignals": [],
        "betIndices": [
          302,
          303
        ],
        "profitVisibility": "visible"
      }
    ],
    "totalSessions": 108,
    "avgSessionLength": 2.81,
    "avgSessionDuration": 113.6,
    "sessionGradeDistribution": [
      {
        "grade": "A",
        "count": 51,
        "percent": 47.22
      },
      {
        "grade": "B",
        "count": 44,
        "percent": 40.74
      },
      {
        "grade": "C",
        "count": 8,
        "percent": 7.41
      },
      {
        "grade": "D",
        "count": 4,
        "percent": 3.7
      },
      {
        "grade": "F",
        "count": 1,
        "percent": 0.93
      }
    ],
    "heatedSessionCount": 4,
    "heatedSessionPercent": 3.7,
    "avgGradedROI": {
      "A": 26.1,
      "B": -70.27,
      "C": -31.33,
      "D": -77.66,
      "F": -79.95
    },
    "bestSession": {
      "id": "SESSION-020",
      "date": "Nov 14, 2025",
      "dayOfWeek": "Friday",
      "startTime": "6:01 PM",
      "endTime": "10:43 PM",
      "durationMinutes": 282,
      "bets": 4,
      "wins": 3,
      "losses": 1,
      "pushes": 0,
      "staked": 319,
      "profit": 329.82,
      "roi": 103.39,
      "avgStake": 79.75,
      "startingStake": 41,
      "endingStake": 67,
      "stakeEscalation": 1.63,
      "maxStake": 124,
      "minStake": 41,
      "stakeCv": 0.38,
      "betsPerHour": 0.85,
      "longestLossStreak": 1,
      "chasedAfterLoss": false,
      "chaseCount": 0,
      "lateNight": false,
      "lateNightKnown": true,
      "grade": "A",
      "gradeReasons": [
        "Stakes escalated more than 1.5x during the session"
      ],
      "isHeated": false,
      "heatSignals": [],
      "betIndices": [
        49,
        50,
        51,
        52
      ],
      "betSnapshots": [
        {
          "placed_at": "2025-11-14T18:01:00.000Z",
          "description": "3-leg NFL parlay: Chiefs + Texans + Texans",
          "stake": 41,
          "profit": 205,
          "result": "win"
        },
        {
          "placed_at": "2025-11-14T20:23:00.000Z",
          "description": "Cowboys +2",
          "stake": 124,
          "profit": 112.73,
          "result": "win"
        },
        {
          "placed_at": "2025-11-14T21:32:00.000Z",
          "description": "76ers -9",
          "stake": 87,
          "profit": 79.09,
          "result": "win"
        },
        {
          "placed_at": "2025-11-14T22:43:00.000Z",
          "description": "Panthers -1.5",
          "stake": 67,
          "profit": -67,
          "result": "loss"
        }
      ],
      "profitVisibility": "visible"
    },
    "worstSession": {
      "id": "SESSION-052",
      "date": "Dec 12, 2025",
      "dayOfWeek": "Friday",
      "startTime": "7:35 PM",
      "endTime": "2:19 AM",
      "durationMinutes": 404,
      "bets": 10,
      "wins": 2,
      "losses": 8,
      "pushes": 0,
      "staked": 1647,
      "profit": -1316.73,
      "roi": -79.95,
      "avgStake": 164.7,
      "startingStake": 59,
      "endingStake": 450,
      "stakeEscalation": 7.63,
      "maxStake": 450,
      "minStake": 25,
      "stakeCv": 0.95,
      "betsPerHour": 1.49,
      "longestLossStreak": 7,
      "chasedAfterLoss": true,
      "chaseCount": 5,
      "lateNight": true,
      "lateNightKnown": true,
      "grade": "F",
      "gradeReasons": [
        "Stakes escalated more than 2x from start to finish",
        "Chased losses 5 times in a single session",
        "Highly inconsistent stake sizing within session"
      ],
      "isHeated": true,
      "framing": "loss",
      "heatSignals": [
        "Session grade: F",
        "Stakes more than doubled while chasing losses",
        "Extended session with heavy losses while chasing"
      ],
      "betIndices": [
        132,
        133,
        134,
        135,
        136,
        137,
        138,
        139,
        140,
        141
      ],
      "triggerEvent": {
        "type": "late_night",
        "description": "Late-night session starting at 7:35 PM."
      },
      "betSnapshots": [
        {
          "placed_at": "2025-12-12T19:35:00.000Z",
          "description": "Thunder +2.5",
          "stake": 59,
          "profit": -59,
          "result": "loss"
        },
        {
          "placed_at": "2025-12-12T19:54:00.000Z",
          "description": "Packers +5",
          "stake": 111,
          "profit": 100.91,
          "result": "win"
        },
        {
          "placed_at": "2025-12-12T20:49:00.000Z",
          "description": "Chiefs +1",
          "stake": 62,
          "profit": 56.36,
          "result": "win"
        },
        {
          "placed_at": "2025-12-12T21:41:00.000Z",
          "description": "Curry Over 8.5 reb",
          "stake": 60,
          "profit": -60,
          "result": "loss"
        },
        {
          "placed_at": "2025-12-12T22:02:00.000Z",
          "description": "Jokic Over 5.5 ast",
          "stake": 56,
          "profit": -56,
          "result": "loss"
        },
        {
          "placed_at": "2025-12-12T23:14:00.000Z",
          "description": "3-leg NBA parlay: Heat + Magic + Warriors",
          "stake": 25,
          "profit": -25,
          "result": "loss"
        },
        {
          "placed_at": "2025-12-12T23:27:00.000Z",
          "description": "Jokic Over 31.5 pts",
          "stake": 74,
          "profit": -74,
          "result": "loss"
        },
        {
          "placed_at": "2025-12-13T00:45:00.000Z",
          "description": "Warriors +6.5",
          "stake": 350,
          "profit": -350,
          "result": "loss"
        },
        {
          "placed_at": "2025-12-13T01:39:00.000Z",
          "description": "Knicks ML",
          "stake": 400,
          "profit": -400,
          "result": "loss"
        },
        {
          "placed_at": "2025-12-13T02:19:00.000Z",
          "description": "Nuggets +6.5",
          "stake": 450,
          "profit": -450,
          "result": "loss"
        }
      ],
      "profitVisibility": "visible"
    },
    "insight": "Most sessions look disciplined, but 4 of 108 had heated moments worth reviewing."
  },
  "bet_annotations": {
    "annotations": [
      {
        "betIndex": 0,
        "betId": "demo-278",
        "classification": "neutral",
        "confidence": 40,
        "signals": [
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 3am",
            "category": "emotional"
          }
        ],
        "primaryReason": "Placed at 3am",
        "sessionId": "SESSION-001",
        "sessionGrade": "D",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.52,
        "timeSinceLastBet": null,
        "currentStreak": 0
      },
      {
        "betIndex": 1,
        "betId": "demo-122",
        "classification": "chasing",
        "confidence": 95,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 2.8x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 3am",
            "category": "emotional"
          },
          {
            "name": "rapid_session_bet",
            "weight": 4,
            "description": "Only 1.0 min since last bet",
            "category": "emotional"
          },
          {
            "name": "instant_rebet",
            "weight": 7,
            "description": "Rebet in under 1.0 minutes",
            "category": "impulsive"
          }
        ],
        "primaryReason": "Stake stepped up 2.8x from the prior losing bet",
        "sessionId": "SESSION-001",
        "sessionGrade": "D",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.46,
        "timeSinceLastBet": 1,
        "currentStreak": -1
      },
      {
        "betIndex": 2,
        "betId": "demo-25",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "843 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "843 min since last bet",
        "sessionId": "SESSION-002",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.65,
        "timeSinceLastBet": 843,
        "currentStreak": -2
      },
      {
        "betIndex": 3,
        "betId": "demo-289",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "4th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "134 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-002",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.74,
        "timeSinceLastBet": 134,
        "currentStreak": -3
      },
      {
        "betIndex": 4,
        "betId": "demo-156",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "5th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "61 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "5th bet on a weekend day",
        "sessionId": "SESSION-002",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.55,
        "timeSinceLastBet": 61,
        "currentStreak": 1
      },
      {
        "betIndex": 5,
        "betId": "demo-199",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "6th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-002",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.74,
        "timeSinceLastBet": 11,
        "currentStreak": 2
      },
      {
        "betIndex": 6,
        "betId": "demo-223",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "7th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          },
          {
            "name": "win_streak_no_escalation",
            "weight": -4,
            "description": "On a 3-win streak without increasing stakes",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-002",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.11,
        "timeSinceLastBet": 45,
        "currentStreak": 3
      },
      {
        "betIndex": 7,
        "betId": "demo-201",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1440 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          },
          {
            "name": "win_streak_no_escalation",
            "weight": -4,
            "description": "On a 4-win streak without increasing stakes",
            "category": "disciplined"
          }
        ],
        "primaryReason": "On a 4-win streak without increasing stakes",
        "sessionId": "SESSION-003",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.63,
        "timeSinceLastBet": 1440,
        "currentStreak": 4
      },
      {
        "betIndex": 8,
        "betId": "demo-36",
        "classification": "chasing",
        "confidence": 60,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 2.8x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1226 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 2.8x from the prior losing bet",
        "sessionId": "SESSION-004",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.74,
        "timeSinceLastBet": 1226,
        "currentStreak": -1
      },
      {
        "betIndex": 9,
        "betId": "demo-78",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "181 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "181 min since last bet",
        "sessionId": "SESSION-005",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.35,
        "timeSinceLastBet": 181,
        "currentStreak": 1
      },
      {
        "betIndex": 10,
        "betId": "demo-257",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1325 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Part of a heated session",
        "sessionId": "SESSION-006",
        "sessionGrade": "C",
        "isInHeatedSession": true,
        "stakeVsMedian": 0.31,
        "timeSinceLastBet": 1325,
        "currentStreak": -1
      },
      {
        "betIndex": 11,
        "betId": "demo-109",
        "classification": "chasing",
        "confidence": 47,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 8,
            "description": "Stake stepped up 1.8x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "154 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.8x from the prior losing bet",
        "sessionId": "SESSION-006",
        "sessionGrade": "C",
        "isInHeatedSession": true,
        "stakeVsMedian": 0.54,
        "timeSinceLastBet": 154,
        "currentStreak": -2
      },
      {
        "betIndex": 12,
        "betId": "demo-130",
        "classification": "chasing",
        "confidence": 95,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 2.7x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          }
        ],
        "primaryReason": "Stake stepped up 2.7x from the prior losing bet",
        "sessionId": "SESSION-006",
        "sessionGrade": "C",
        "isInHeatedSession": true,
        "stakeVsMedian": 1.46,
        "timeSinceLastBet": 43,
        "currentStreak": -3
      },
      {
        "betIndex": 13,
        "betId": "demo-195",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1322 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-007",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.72,
        "timeSinceLastBet": 1322,
        "currentStreak": 1
      },
      {
        "betIndex": 14,
        "betId": "demo-153",
        "classification": "disciplined",
        "confidence": 60,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-007",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.23,
        "timeSinceLastBet": 40,
        "currentStreak": 2
      },
      {
        "betIndex": 15,
        "betId": "demo-87",
        "classification": "chasing",
        "confidence": 47,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "127 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-007",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.52,
        "timeSinceLastBet": 127,
        "currentStreak": -1
      },
      {
        "betIndex": 16,
        "betId": "demo-26",
        "classification": "chasing",
        "confidence": 60,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 3.2x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1059 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 3.2x from the prior losing bet",
        "sessionId": "SESSION-008",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.69,
        "timeSinceLastBet": 1059,
        "currentStreak": -2
      },
      {
        "betIndex": 17,
        "betId": "demo-4",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "106 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-008",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.95,
        "timeSinceLastBet": 106,
        "currentStreak": 1
      },
      {
        "betIndex": 18,
        "betId": "demo-286",
        "classification": "disciplined",
        "confidence": 60,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-008",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.18,
        "timeSinceLastBet": 32,
        "currentStreak": 2
      },
      {
        "betIndex": 19,
        "betId": "demo-31",
        "classification": "chasing",
        "confidence": 70,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 8,
            "description": "Stake stepped up 1.7x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "oversized_bet",
            "weight": 4,
            "description": "Stake is 2.1x the median",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "97 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.7x from the prior losing bet",
        "sessionId": "SESSION-008",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 2.06,
        "timeSinceLastBet": 97,
        "currentStreak": -1
      },
      {
        "betIndex": 20,
        "betId": "demo-60",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NFL spread) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Same sport+type (NFL spread) as the prior losing bet",
        "sessionId": "SESSION-008",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.55,
        "timeSinceLastBet": 46,
        "currentStreak": -2
      },
      {
        "betIndex": 21,
        "betId": "demo-285",
        "classification": "neutral",
        "confidence": 53,
        "signals": [
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 2am",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "261 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-009",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1,
        "timeSinceLastBet": 261,
        "currentStreak": 1
      },
      {
        "betIndex": 22,
        "betId": "demo-126",
        "classification": "neutral",
        "confidence": 40,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 7,
            "description": "Stake stepped up 1.6x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1173 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.6x from the prior losing bet",
        "sessionId": "SESSION-010",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.57,
        "timeSinceLastBet": 1173,
        "currentStreak": -1
      },
      {
        "betIndex": 23,
        "betId": "demo-244",
        "classification": "impulsive",
        "confidence": 75,
        "signals": [
          {
            "name": "rapid_session_bet",
            "weight": 4,
            "description": "Only 0.0 min since last bet",
            "category": "emotional"
          },
          {
            "name": "instant_rebet",
            "weight": 7,
            "description": "Rebet in under 0.0 minutes",
            "category": "impulsive"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Rebet in under 0.0 minutes",
        "sessionId": "SESSION-010",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.49,
        "timeSinceLastBet": 0,
        "currentStreak": 1
      },
      {
        "betIndex": 24,
        "betId": "demo-164",
        "classification": "disciplined",
        "confidence": 60,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-010",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.23,
        "timeSinceLastBet": 24,
        "currentStreak": 2
      },
      {
        "betIndex": 25,
        "betId": "demo-159",
        "classification": "neutral",
        "confidence": 20,
        "signals": [
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NBA spread) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1269 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Same sport+type (NBA spread) as the prior losing bet",
        "sessionId": "SESSION-011",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.54,
        "timeSinceLastBet": 1269,
        "currentStreak": -1
      },
      {
        "betIndex": 26,
        "betId": "demo-248",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "63 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "63 min since last bet",
        "sessionId": "SESSION-011",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.38,
        "timeSinceLastBet": 63,
        "currentStreak": 1
      },
      {
        "betIndex": 27,
        "betId": "demo-136",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 9,
            "description": "Stake stepped up 2.1x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "144 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 2.1x from the prior losing bet",
        "sessionId": "SESSION-011",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.8,
        "timeSinceLastBet": 144,
        "currentStreak": -1
      },
      {
        "betIndex": 28,
        "betId": "demo-276",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 2am",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "210 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Placed at 2am",
        "sessionId": "SESSION-012",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.43,
        "timeSinceLastBet": 210,
        "currentStreak": 1
      },
      {
        "betIndex": 29,
        "betId": "demo-69",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 2.2x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 3am",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "98 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 2.2x from the prior losing bet",
        "sessionId": "SESSION-012",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.95,
        "timeSinceLastBet": 98,
        "currentStreak": -1
      },
      {
        "betIndex": 30,
        "betId": "demo-178",
        "classification": "disciplined",
        "confidence": 89,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1094 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-013",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.86,
        "timeSinceLastBet": 1094,
        "currentStreak": -2
      },
      {
        "betIndex": 31,
        "betId": "demo-273",
        "classification": "neutral",
        "confidence": 40,
        "signals": [
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "4th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "undersized_throwaway",
            "weight": 3,
            "description": "Tiny stake (0.25x median) on a longshot (+500)",
            "category": "impulsive"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Tiny stake (0.25x median) on a longshot (+500)",
        "sessionId": "SESSION-013",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.25,
        "timeSinceLastBet": 46,
        "currentStreak": 1
      },
      {
        "betIndex": 32,
        "betId": "demo-44",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 5.2x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1351 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 5.2x from the prior losing bet",
        "sessionId": "SESSION-014",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.28,
        "timeSinceLastBet": 1351,
        "currentStreak": -1
      },
      {
        "betIndex": 33,
        "betId": "demo-121",
        "classification": "disciplined",
        "confidence": 89,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "83 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-014",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.18,
        "timeSinceLastBet": 83,
        "currentStreak": -2
      },
      {
        "betIndex": 34,
        "betId": "demo-155",
        "classification": "neutral",
        "confidence": 40,
        "signals": [
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-014",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.29,
        "timeSinceLastBet": 16,
        "currentStreak": 1
      },
      {
        "betIndex": 35,
        "betId": "demo-261",
        "classification": "chasing",
        "confidence": 83,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-014",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.43,
        "timeSinceLastBet": 7,
        "currentStreak": -1
      },
      {
        "betIndex": 36,
        "betId": "demo-145",
        "classification": "chasing",
        "confidence": 53,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 2.9x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 0am",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "99 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 2.9x from the prior losing bet",
        "sessionId": "SESSION-014",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.23,
        "timeSinceLastBet": 99,
        "currentStreak": -2
      },
      {
        "betIndex": 37,
        "betId": "demo-197",
        "classification": "disciplined",
        "confidence": 65,
        "signals": [
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 3am",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "129 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-014",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.88,
        "timeSinceLastBet": 129,
        "currentStreak": -3
      },
      {
        "betIndex": 38,
        "betId": "demo-75",
        "classification": "chasing",
        "confidence": 47,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 4-loss streak",
            "category": "chasing"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "837 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-015",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.68,
        "timeSinceLastBet": 837,
        "currentStreak": -4
      },
      {
        "betIndex": 39,
        "betId": "demo-81",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NFL parlay) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 5-loss streak",
            "category": "chasing"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "94 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-015",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.68,
        "timeSinceLastBet": 94,
        "currentStreak": -5
      },
      {
        "betIndex": 40,
        "betId": "demo-167",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 6,
            "description": "Stake stepped up 1.4x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 6-loss streak",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "200 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.4x from the prior losing bet",
        "sessionId": "SESSION-016",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.92,
        "timeSinceLastBet": 200,
        "currentStreak": -6
      },
      {
        "betIndex": 41,
        "betId": "demo-142",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 7-loss streak",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-016",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.17,
        "timeSinceLastBet": 11,
        "currentStreak": -7
      },
      {
        "betIndex": 42,
        "betId": "demo-241",
        "classification": "chasing",
        "confidence": 86,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 8-loss streak",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 1am",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "182 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-017",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.49,
        "timeSinceLastBet": 182,
        "currentStreak": -8
      },
      {
        "betIndex": 43,
        "betId": "demo-290",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 9,
            "description": "Stake stepped up 2.0x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 9-loss streak",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1257 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 2.0x from the prior losing bet",
        "sessionId": "SESSION-018",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1,
        "timeSinceLastBet": 1257,
        "currentStreak": -9
      },
      {
        "betIndex": 44,
        "betId": "demo-161",
        "classification": "disciplined",
        "confidence": 80,
        "signals": [
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 10-loss streak",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1256 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-019",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.88,
        "timeSinceLastBet": 1256,
        "currentStreak": -10
      },
      {
        "betIndex": 45,
        "betId": "demo-123",
        "classification": "disciplined",
        "confidence": 60,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-019",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.02,
        "timeSinceLastBet": 17,
        "currentStreak": 1
      },
      {
        "betIndex": 46,
        "betId": "demo-294",
        "classification": "disciplined",
        "confidence": 60,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-019",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.03,
        "timeSinceLastBet": 44,
        "currentStreak": 2
      },
      {
        "betIndex": 47,
        "betId": "demo-288",
        "classification": "disciplined",
        "confidence": 86,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "99 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          },
          {
            "name": "win_streak_no_escalation",
            "weight": -4,
            "description": "On a 3-win streak without increasing stakes",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-019",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.72,
        "timeSinceLastBet": 99,
        "currentStreak": 3
      },
      {
        "betIndex": 48,
        "betId": "demo-209",
        "classification": "disciplined",
        "confidence": 80,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          },
          {
            "name": "win_streak_no_escalation",
            "weight": -4,
            "description": "On a 4-win streak without increasing stakes",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-019",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.22,
        "timeSinceLastBet": 10,
        "currentStreak": 4
      },
      {
        "betIndex": 49,
        "betId": "demo-94",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1211 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-020",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.63,
        "timeSinceLastBet": 1211,
        "currentStreak": -1
      },
      {
        "betIndex": 50,
        "betId": "demo-21",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "142 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "142 min since last bet",
        "sessionId": "SESSION-020",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.91,
        "timeSinceLastBet": 142,
        "currentStreak": 1
      },
      {
        "betIndex": 51,
        "betId": "demo-151",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "69 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "69 min since last bet",
        "sessionId": "SESSION-020",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.34,
        "timeSinceLastBet": 69,
        "currentStreak": 2
      },
      {
        "betIndex": 52,
        "betId": "demo-282",
        "classification": "disciplined",
        "confidence": 86,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "71 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          },
          {
            "name": "win_streak_no_escalation",
            "weight": -4,
            "description": "On a 3-win streak without increasing stakes",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-020",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.03,
        "timeSinceLastBet": 71,
        "currentStreak": 3
      },
      {
        "betIndex": 53,
        "betId": "demo-191",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1285 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-021",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.22,
        "timeSinceLastBet": 1285,
        "currentStreak": -1
      },
      {
        "betIndex": 54,
        "betId": "demo-190",
        "classification": "disciplined",
        "confidence": 60,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-021",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.75,
        "timeSinceLastBet": 26,
        "currentStreak": 1
      },
      {
        "betIndex": 55,
        "betId": "demo-85",
        "classification": "chasing",
        "confidence": 60,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "109 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-021",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.37,
        "timeSinceLastBet": 109,
        "currentStreak": -1
      },
      {
        "betIndex": 56,
        "betId": "demo-259",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1316 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "1316 min since last bet",
        "sessionId": "SESSION-022",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.26,
        "timeSinceLastBet": 1316,
        "currentStreak": -2
      },
      {
        "betIndex": 57,
        "betId": "demo-271",
        "classification": "chasing",
        "confidence": 65,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 9,
            "description": "Stake stepped up 2.1x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NBA parlay) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1412 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 2.1x from the prior losing bet",
        "sessionId": "SESSION-023",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.54,
        "timeSinceLastBet": 1412,
        "currentStreak": -3
      },
      {
        "betIndex": 58,
        "betId": "demo-62",
        "classification": "chasing",
        "confidence": 83,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 3.2x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 4-loss streak",
            "category": "chasing"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 3.2x from the prior losing bet",
        "sessionId": "SESSION-023",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.74,
        "timeSinceLastBet": 11,
        "currentStreak": -4
      },
      {
        "betIndex": 59,
        "betId": "demo-214",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 5-loss streak",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-023",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.12,
        "timeSinceLastBet": 8,
        "currentStreak": -5
      },
      {
        "betIndex": 60,
        "betId": "demo-133",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "104 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "104 min since last bet",
        "sessionId": "SESSION-023",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.45,
        "timeSinceLastBet": 104,
        "currentStreak": 1
      },
      {
        "betIndex": 61,
        "betId": "demo-194",
        "classification": "disciplined",
        "confidence": 60,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-023",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.98,
        "timeSinceLastBet": 26,
        "currentStreak": 2
      },
      {
        "betIndex": 62,
        "betId": "demo-112",
        "classification": "neutral",
        "confidence": 40,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-023",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.6,
        "timeSinceLastBet": 12,
        "currentStreak": -1
      },
      {
        "betIndex": 63,
        "betId": "demo-101",
        "classification": "neutral",
        "confidence": 53,
        "signals": [
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NFL parlay) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1295 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-024",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.51,
        "timeSinceLastBet": 1295,
        "currentStreak": -2
      },
      {
        "betIndex": 64,
        "betId": "demo-254",
        "classification": "disciplined",
        "confidence": 60,
        "signals": [
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1438 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-025",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.51,
        "timeSinceLastBet": 1438,
        "currentStreak": -3
      },
      {
        "betIndex": 65,
        "betId": "demo-256",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "In a grade-B session",
        "sessionId": "SESSION-025",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.38,
        "timeSinceLastBet": 7,
        "currentStreak": 1
      },
      {
        "betIndex": 66,
        "betId": "demo-64",
        "classification": "chasing",
        "confidence": 70,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 3.8x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 3.8x from the prior losing bet",
        "sessionId": "SESSION-025",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.45,
        "timeSinceLastBet": 25,
        "currentStreak": -1
      },
      {
        "betIndex": 67,
        "betId": "demo-147",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "In a grade-B session",
        "sessionId": "SESSION-025",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.43,
        "timeSinceLastBet": 46,
        "currentStreak": -2
      },
      {
        "betIndex": 68,
        "betId": "demo-137",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "86 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-025",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.29,
        "timeSinceLastBet": 86,
        "currentStreak": 1
      },
      {
        "betIndex": 69,
        "betId": "demo-218",
        "classification": "disciplined",
        "confidence": 89,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1234 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-026",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.72,
        "timeSinceLastBet": 1234,
        "currentStreak": -1
      },
      {
        "betIndex": 70,
        "betId": "demo-83",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "In a grade-B session",
        "sessionId": "SESSION-026",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.57,
        "timeSinceLastBet": 26,
        "currentStreak": 1
      },
      {
        "betIndex": 71,
        "betId": "demo-215",
        "classification": "neutral",
        "confidence": 53,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 8,
            "description": "Stake stepped up 1.7x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "141 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.7x from the prior losing bet",
        "sessionId": "SESSION-026",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.98,
        "timeSinceLastBet": 141,
        "currentStreak": -1
      },
      {
        "betIndex": 72,
        "betId": "demo-97",
        "classification": "chasing",
        "confidence": 70,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1183 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-027",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.49,
        "timeSinceLastBet": 1183,
        "currentStreak": -2
      },
      {
        "betIndex": 73,
        "betId": "demo-106",
        "classification": "chasing",
        "confidence": 53,
        "signals": [
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NFL parlay) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "101 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Same sport+type (NFL parlay) as the prior losing bet",
        "sessionId": "SESSION-027",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.38,
        "timeSinceLastBet": 101,
        "currentStreak": -3
      },
      {
        "betIndex": 74,
        "betId": "demo-238",
        "classification": "chasing",
        "confidence": 47,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 6,
            "description": "Stake stepped up 1.3x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 4-loss streak",
            "category": "chasing"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.3x from the prior losing bet",
        "sessionId": "SESSION-027",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.51,
        "timeSinceLastBet": 22,
        "currentStreak": -4
      },
      {
        "betIndex": 75,
        "betId": "demo-279",
        "classification": "chasing",
        "confidence": 65,
        "signals": [
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NBA parlay) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 5-loss streak",
            "category": "chasing"
          }
        ],
        "primaryReason": "Same sport+type (NBA parlay) as the prior losing bet",
        "sessionId": "SESSION-027",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.49,
        "timeSinceLastBet": 8,
        "currentStreak": -5
      },
      {
        "betIndex": 76,
        "betId": "demo-295",
        "classification": "chasing",
        "confidence": 83,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 2.8x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 6-loss streak",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "103 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 2.8x from the prior losing bet",
        "sessionId": "SESSION-027",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.35,
        "timeSinceLastBet": 103,
        "currentStreak": -6
      },
      {
        "betIndex": 77,
        "betId": "demo-92",
        "classification": "chasing",
        "confidence": 70,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 7-loss streak",
            "category": "chasing"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-027",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.57,
        "timeSinceLastBet": 54,
        "currentStreak": -7
      },
      {
        "betIndex": 78,
        "betId": "demo-113",
        "classification": "chasing",
        "confidence": 70,
        "signals": [
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NFL parlay) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 8-loss streak",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 1am",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "152 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Same sport+type (NFL parlay) as the prior losing bet",
        "sessionId": "SESSION-027",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.4,
        "timeSinceLastBet": 152,
        "currentStreak": -8
      },
      {
        "betIndex": 79,
        "betId": "demo-255",
        "classification": "chasing",
        "confidence": 65,
        "signals": [
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 9-loss streak",
            "category": "chasing"
          },
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          },
          {
            "name": "undersized_throwaway",
            "weight": 3,
            "description": "Tiny stake (0.23x median) on a longshot (+500)",
            "category": "impulsive"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1136 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Betting during a 9-loss streak",
        "sessionId": "SESSION-028",
        "sessionGrade": "D",
        "isInHeatedSession": true,
        "stakeVsMedian": 0.23,
        "timeSinceLastBet": 1136,
        "currentStreak": -9
      },
      {
        "betIndex": 80,
        "betId": "demo-239",
        "classification": "chasing",
        "confidence": 95,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 2.2x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NBA parlay) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 10-loss streak",
            "category": "chasing"
          },
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 2.2x from the prior losing bet",
        "sessionId": "SESSION-028",
        "sessionGrade": "D",
        "isInHeatedSession": true,
        "stakeVsMedian": 0.51,
        "timeSinceLastBet": 60,
        "currentStreak": -10
      },
      {
        "betIndex": 81,
        "betId": "demo-181",
        "classification": "chasing",
        "confidence": 70,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 8,
            "description": "Stake stepped up 1.7x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 11-loss streak",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          },
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          },
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "4th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "121 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.7x from the prior losing bet",
        "sessionId": "SESSION-028",
        "sessionGrade": "D",
        "isInHeatedSession": true,
        "stakeVsMedian": 0.86,
        "timeSinceLastBet": 121,
        "currentStreak": -11
      },
      {
        "betIndex": 82,
        "betId": "demo-72",
        "classification": "disciplined",
        "confidence": 80,
        "signals": [
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 12-loss streak",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1250 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-029",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.02,
        "timeSinceLastBet": 1250,
        "currentStreak": -12
      },
      {
        "betIndex": 83,
        "betId": "demo-183",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "67 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "67 min since last bet",
        "sessionId": "SESSION-029",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.65,
        "timeSinceLastBet": 67,
        "currentStreak": 1
      },
      {
        "betIndex": 84,
        "betId": "demo-158",
        "classification": "neutral",
        "confidence": 53,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 8,
            "description": "Stake stepped up 1.8x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1460 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.8x from the prior losing bet",
        "sessionId": "SESSION-030",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.17,
        "timeSinceLastBet": 1460,
        "currentStreak": -1
      },
      {
        "betIndex": 85,
        "betId": "demo-258",
        "classification": "chasing",
        "confidence": 75,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "123 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-030",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.35,
        "timeSinceLastBet": 123,
        "currentStreak": -2
      },
      {
        "betIndex": 86,
        "betId": "demo-124",
        "classification": "neutral",
        "confidence": 20,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 3.1x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1182 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 3.1x from the prior losing bet",
        "sessionId": "SESSION-031",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.09,
        "timeSinceLastBet": 1182,
        "currentStreak": -3
      },
      {
        "betIndex": 87,
        "betId": "demo-275",
        "classification": "chasing",
        "confidence": 75,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 4-loss streak",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1569 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-032",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.26,
        "timeSinceLastBet": 1569,
        "currentStreak": -4
      },
      {
        "betIndex": 88,
        "betId": "demo-111",
        "classification": "chasing",
        "confidence": 60,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 7,
            "description": "Stake stepped up 1.6x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 5-loss streak",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1179 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.6x from the prior losing bet",
        "sessionId": "SESSION-033",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.42,
        "timeSinceLastBet": 1179,
        "currentStreak": -5
      },
      {
        "betIndex": 89,
        "betId": "demo-27",
        "classification": "chasing",
        "confidence": 75,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 4.4x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 6-loss streak",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "98 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 4.4x from the prior losing bet",
        "sessionId": "SESSION-033",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.85,
        "timeSinceLastBet": 98,
        "currentStreak": -6
      },
      {
        "betIndex": 90,
        "betId": "demo-162",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "156 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "156 min since last bet",
        "sessionId": "SESSION-033",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.66,
        "timeSinceLastBet": 156,
        "currentStreak": 1
      },
      {
        "betIndex": 91,
        "betId": "demo-213",
        "classification": "disciplined",
        "confidence": 89,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1329 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-034",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.86,
        "timeSinceLastBet": 1329,
        "currentStreak": -1
      },
      {
        "betIndex": 92,
        "betId": "demo-185",
        "classification": "neutral",
        "confidence": 40,
        "signals": [
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NBA prop) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-034",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.68,
        "timeSinceLastBet": 26,
        "currentStreak": -2
      },
      {
        "betIndex": 93,
        "betId": "demo-174",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "69 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-034",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.98,
        "timeSinceLastBet": 69,
        "currentStreak": 1
      },
      {
        "betIndex": 94,
        "betId": "demo-12",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1343 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-035",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.11,
        "timeSinceLastBet": 1343,
        "currentStreak": 2
      },
      {
        "betIndex": 95,
        "betId": "demo-90",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "164 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          },
          {
            "name": "win_streak_no_escalation",
            "weight": -4,
            "description": "On a 3-win streak without increasing stakes",
            "category": "disciplined"
          }
        ],
        "primaryReason": "On a 3-win streak without increasing stakes",
        "sessionId": "SESSION-035",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.42,
        "timeSinceLastBet": 164,
        "currentStreak": 3
      },
      {
        "betIndex": 96,
        "betId": "demo-192",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 7,
            "description": "Stake stepped up 1.6x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 1am",
            "category": "emotional"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "226 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.6x from the prior losing bet",
        "sessionId": "SESSION-036",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.66,
        "timeSinceLastBet": 226,
        "currentStreak": -1
      },
      {
        "betIndex": 97,
        "betId": "demo-260",
        "classification": "chasing",
        "confidence": 70,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1121 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-037",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.38,
        "timeSinceLastBet": 1121,
        "currentStreak": -2
      },
      {
        "betIndex": 98,
        "betId": "demo-268",
        "classification": "chasing",
        "confidence": 65,
        "signals": [
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NBA parlay) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          }
        ],
        "primaryReason": "Same sport+type (NBA parlay) as the prior losing bet",
        "sessionId": "SESSION-037",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.43,
        "timeSinceLastBet": 16,
        "currentStreak": -3
      },
      {
        "betIndex": 99,
        "betId": "demo-186",
        "classification": "chasing",
        "confidence": 65,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 7,
            "description": "Stake stepped up 1.5x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 4-loss streak",
            "category": "chasing"
          },
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "4th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.5x from the prior losing bet",
        "sessionId": "SESSION-037",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.65,
        "timeSinceLastBet": 34,
        "currentStreak": -4
      },
      {
        "betIndex": 100,
        "betId": "demo-228",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          },
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "5th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "102 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-037",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.71,
        "timeSinceLastBet": 102,
        "currentStreak": 1
      },
      {
        "betIndex": 101,
        "betId": "demo-207",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 7,
            "description": "Stake stepped up 1.6x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NBA prop) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1277 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.6x from the prior losing bet",
        "sessionId": "SESSION-038",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.15,
        "timeSinceLastBet": 1277,
        "currentStreak": -1
      },
      {
        "betIndex": 102,
        "betId": "demo-54",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "In a grade-A session",
        "sessionId": "SESSION-038",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.55,
        "timeSinceLastBet": 53,
        "currentStreak": 1
      },
      {
        "betIndex": 103,
        "betId": "demo-116",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1366 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "1366 min since last bet",
        "sessionId": "SESSION-039",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.63,
        "timeSinceLastBet": 1366,
        "currentStreak": -1
      },
      {
        "betIndex": 104,
        "betId": "demo-8",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "72 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "72 min since last bet",
        "sessionId": "SESSION-039",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.77,
        "timeSinceLastBet": 72,
        "currentStreak": -2
      },
      {
        "betIndex": 105,
        "betId": "demo-150",
        "classification": "disciplined",
        "confidence": 80,
        "signals": [
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "99 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-039",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.03,
        "timeSinceLastBet": 99,
        "currentStreak": -3
      },
      {
        "betIndex": 106,
        "betId": "demo-246",
        "classification": "chasing",
        "confidence": 92,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 4-loss streak",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-039",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.45,
        "timeSinceLastBet": 49,
        "currentStreak": -4
      },
      {
        "betIndex": 107,
        "betId": "demo-14",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1212 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "1212 min since last bet",
        "sessionId": "SESSION-040",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.85,
        "timeSinceLastBet": 1212,
        "currentStreak": 1
      },
      {
        "betIndex": 108,
        "betId": "demo-270",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "172 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "172 min since last bet",
        "sessionId": "SESSION-040",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.52,
        "timeSinceLastBet": 172,
        "currentStreak": 2
      },
      {
        "betIndex": 109,
        "betId": "demo-221",
        "classification": "disciplined",
        "confidence": 75,
        "signals": [
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1334 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-041",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.62,
        "timeSinceLastBet": 1334,
        "currentStreak": -1
      },
      {
        "betIndex": 110,
        "betId": "demo-1",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1422 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-042",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.08,
        "timeSinceLastBet": 1422,
        "currentStreak": 1
      },
      {
        "betIndex": 111,
        "betId": "demo-226",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "102 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-042",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.88,
        "timeSinceLastBet": 102,
        "currentStreak": 2
      },
      {
        "betIndex": 112,
        "betId": "demo-18",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 6,
            "description": "Stake stepped up 1.4x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 2am",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "270 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.4x from the prior losing bet",
        "sessionId": "SESSION-043",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.2,
        "timeSinceLastBet": 270,
        "currentStreak": -1
      },
      {
        "betIndex": 113,
        "betId": "demo-23",
        "classification": "chasing",
        "confidence": 86,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 8,
            "description": "Stake stepped up 1.7x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NFL spread) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "oversized_bet",
            "weight": 4,
            "description": "Stake is 2.0x the median",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "927 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.7x from the prior losing bet",
        "sessionId": "SESSION-044",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 2.03,
        "timeSinceLastBet": 927,
        "currentStreak": -2
      },
      {
        "betIndex": 114,
        "betId": "demo-57",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "rapid_session_bet",
            "weight": 4,
            "description": "Only 4.0 min since last bet",
            "category": "emotional"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Only 4.0 min since last bet",
        "sessionId": "SESSION-044",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.85,
        "timeSinceLastBet": 4,
        "currentStreak": 1
      },
      {
        "betIndex": 115,
        "betId": "demo-173",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "4th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "177 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "4th bet on a weekend day",
        "sessionId": "SESSION-044",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.46,
        "timeSinceLastBet": 177,
        "currentStreak": -1
      },
      {
        "betIndex": 116,
        "betId": "demo-53",
        "classification": "chasing",
        "confidence": 60,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 6,
            "description": "Stake stepped up 1.4x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "oversized_bet",
            "weight": 4,
            "description": "Stake is 2.0x the median",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1197 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.4x from the prior losing bet",
        "sessionId": "SESSION-045",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 2.03,
        "timeSinceLastBet": 1197,
        "currentStreak": -2
      },
      {
        "betIndex": 117,
        "betId": "demo-231",
        "classification": "disciplined",
        "confidence": 80,
        "signals": [
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "136 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-045",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.71,
        "timeSinceLastBet": 136,
        "currentStreak": -3
      },
      {
        "betIndex": 118,
        "betId": "demo-229",
        "classification": "disciplined",
        "confidence": 60,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-045",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.09,
        "timeSinceLastBet": 30,
        "currentStreak": 1
      },
      {
        "betIndex": 119,
        "betId": "demo-193",
        "classification": "disciplined",
        "confidence": 60,
        "signals": [
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "4th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "139 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-045",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.03,
        "timeSinceLastBet": 139,
        "currentStreak": 2
      },
      {
        "betIndex": 120,
        "betId": "demo-95",
        "classification": "chasing",
        "confidence": 80,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "5th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-045",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.48,
        "timeSinceLastBet": 23,
        "currentStreak": -1
      },
      {
        "betIndex": 121,
        "betId": "demo-253",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 3am",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "265 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Placed at 3am",
        "sessionId": "SESSION-046",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.42,
        "timeSinceLastBet": 265,
        "currentStreak": -2
      },
      {
        "betIndex": 122,
        "betId": "demo-99",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "894 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Betting during a 3-loss streak",
        "sessionId": "SESSION-047",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.37,
        "timeSinceLastBet": 894,
        "currentStreak": -3
      },
      {
        "betIndex": 123,
        "betId": "demo-293",
        "classification": "chasing",
        "confidence": 75,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 3.6x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 4-loss streak",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "65 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 3.6x from the prior losing bet",
        "sessionId": "SESSION-047",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.34,
        "timeSinceLastBet": 65,
        "currentStreak": -4
      },
      {
        "betIndex": 124,
        "betId": "demo-144",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "83 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "83 min since last bet",
        "sessionId": "SESSION-047",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.49,
        "timeSinceLastBet": 83,
        "currentStreak": 1
      },
      {
        "betIndex": 125,
        "betId": "demo-176",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "101 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "101 min since last bet",
        "sessionId": "SESSION-047",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.31,
        "timeSinceLastBet": 101,
        "currentStreak": -1
      },
      {
        "betIndex": 126,
        "betId": "demo-272",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1339 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "1339 min since last bet",
        "sessionId": "SESSION-048",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.31,
        "timeSinceLastBet": 1339,
        "currentStreak": 1
      },
      {
        "betIndex": 127,
        "betId": "demo-34",
        "classification": "chasing",
        "confidence": 86,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 6.8x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "oversized_bet",
            "weight": 4,
            "description": "Stake is 2.1x the median",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "85 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 6.8x from the prior losing bet",
        "sessionId": "SESSION-048",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 2.11,
        "timeSinceLastBet": 85,
        "currentStreak": -1
      },
      {
        "betIndex": 128,
        "betId": "demo-206",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1416 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "1416 min since last bet",
        "sessionId": "SESSION-049",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.68,
        "timeSinceLastBet": 1416,
        "currentStreak": 1
      },
      {
        "betIndex": 129,
        "betId": "demo-102",
        "classification": "chasing",
        "confidence": 47,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "115 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-049",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.6,
        "timeSinceLastBet": 115,
        "currentStreak": -1
      },
      {
        "betIndex": 130,
        "betId": "demo-267",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 2am",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "194 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Placed at 2am",
        "sessionId": "SESSION-050",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.37,
        "timeSinceLastBet": 194,
        "currentStreak": -2
      },
      {
        "betIndex": 131,
        "betId": "demo-47",
        "classification": "chasing",
        "confidence": 75,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 4.4x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "898 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 4.4x from the prior losing bet",
        "sessionId": "SESSION-051",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.63,
        "timeSinceLastBet": 898,
        "currentStreak": -3
      },
      {
        "betIndex": 132,
        "betId": "demo-119",
        "classification": "neutral",
        "confidence": 53,
        "signals": [
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 4-loss streak",
            "category": "chasing"
          },
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1555 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-052",
        "sessionGrade": "F",
        "isInHeatedSession": true,
        "stakeVsMedian": 0.91,
        "timeSinceLastBet": 1555,
        "currentStreak": -4
      },
      {
        "betIndex": 133,
        "betId": "demo-32",
        "classification": "chasing",
        "confidence": 92,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 8,
            "description": "Stake stepped up 1.9x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 5-loss streak",
            "category": "chasing"
          },
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          }
        ],
        "primaryReason": "Stake stepped up 1.9x from the prior losing bet",
        "sessionId": "SESSION-052",
        "sessionGrade": "F",
        "isInHeatedSession": true,
        "stakeVsMedian": 1.71,
        "timeSinceLastBet": 19,
        "currentStreak": -5
      },
      {
        "betIndex": 134,
        "betId": "demo-43",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-052",
        "sessionGrade": "F",
        "isInHeatedSession": true,
        "stakeVsMedian": 0.95,
        "timeSinceLastBet": 55,
        "currentStreak": 1
      },
      {
        "betIndex": 135,
        "betId": "demo-224",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-052",
        "sessionGrade": "F",
        "isInHeatedSession": true,
        "stakeVsMedian": 0.92,
        "timeSinceLastBet": 52,
        "currentStreak": 2
      },
      {
        "betIndex": 136,
        "betId": "demo-216",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NBA prop) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-052",
        "sessionGrade": "F",
        "isInHeatedSession": true,
        "stakeVsMedian": 0.86,
        "timeSinceLastBet": 21,
        "currentStreak": -1
      },
      {
        "betIndex": 137,
        "betId": "demo-265",
        "classification": "chasing",
        "confidence": 92,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          },
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "72 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-052",
        "sessionGrade": "F",
        "isInHeatedSession": true,
        "stakeVsMedian": 0.38,
        "timeSinceLastBet": 72,
        "currentStreak": -2
      },
      {
        "betIndex": 138,
        "betId": "demo-200",
        "classification": "chasing",
        "confidence": 80,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 3.0x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          },
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 3.0x from the prior losing bet",
        "sessionId": "SESSION-052",
        "sessionGrade": "F",
        "isInHeatedSession": true,
        "stakeVsMedian": 1.14,
        "timeSinceLastBet": 13,
        "currentStreak": -3
      },
      {
        "betIndex": 139,
        "betId": "demo-302",
        "classification": "emotional",
        "confidence": 95,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 4.7x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 4-loss streak",
            "category": "chasing"
          },
          {
            "name": "oversized_bet",
            "weight": 8,
            "description": "Stake is 5.4x the median",
            "category": "emotional"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 0am",
            "category": "emotional"
          },
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "78 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 4.7x from the prior losing bet",
        "sessionId": "SESSION-052",
        "sessionGrade": "F",
        "isInHeatedSession": true,
        "stakeVsMedian": 5.38,
        "timeSinceLastBet": 78,
        "currentStreak": -4
      },
      {
        "betIndex": 140,
        "betId": "demo-303",
        "classification": "emotional",
        "confidence": 95,
        "signals": [
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 5-loss streak",
            "category": "chasing"
          },
          {
            "name": "oversized_bet",
            "weight": 8,
            "description": "Stake is 6.2x the median",
            "category": "emotional"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 1am",
            "category": "emotional"
          },
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          }
        ],
        "primaryReason": "Stake is 6.2x the median",
        "sessionId": "SESSION-052",
        "sessionGrade": "F",
        "isInHeatedSession": true,
        "stakeVsMedian": 6.15,
        "timeSinceLastBet": 54,
        "currentStreak": -5
      },
      {
        "betIndex": 141,
        "betId": "demo-304",
        "classification": "emotional",
        "confidence": 95,
        "signals": [
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 6-loss streak",
            "category": "chasing"
          },
          {
            "name": "oversized_bet",
            "weight": 8,
            "description": "Stake is 6.9x the median",
            "category": "emotional"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 2am",
            "category": "emotional"
          },
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          }
        ],
        "primaryReason": "Stake is 6.9x the median",
        "sessionId": "SESSION-052",
        "sessionGrade": "F",
        "isInHeatedSession": true,
        "stakeVsMedian": 6.92,
        "timeSinceLastBet": 40,
        "currentStreak": -6
      },
      {
        "betIndex": 142,
        "betId": "demo-182",
        "classification": "neutral",
        "confidence": 40,
        "signals": [
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 7-loss streak",
            "category": "chasing"
          },
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          },
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "4th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1050 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-053",
        "sessionGrade": "D",
        "isInHeatedSession": true,
        "stakeVsMedian": 0.77,
        "timeSinceLastBet": 1050,
        "currentStreak": -7
      },
      {
        "betIndex": 143,
        "betId": "demo-66",
        "classification": "emotional",
        "confidence": 95,
        "signals": [
          {
            "name": "rapid_session_bet",
            "weight": 4,
            "description": "Only 1.0 min since last bet",
            "category": "emotional"
          },
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          },
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "5th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "instant_rebet",
            "weight": 7,
            "description": "Rebet in under 1.0 minutes",
            "category": "impulsive"
          }
        ],
        "primaryReason": "Rebet in under 1.0 minutes",
        "sessionId": "SESSION-053",
        "sessionGrade": "D",
        "isInHeatedSession": true,
        "stakeVsMedian": 1.54,
        "timeSinceLastBet": 1,
        "currentStreak": 1
      },
      {
        "betIndex": 144,
        "betId": "demo-296",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          },
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "6th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-053",
        "sessionGrade": "D",
        "isInHeatedSession": true,
        "stakeVsMedian": 0.77,
        "timeSinceLastBet": 10,
        "currentStreak": 2
      },
      {
        "betIndex": 145,
        "betId": "demo-297",
        "classification": "chasing",
        "confidence": 92,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 9,
            "description": "Stake stepped up 2.0x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          },
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "7th bet on a weekend day",
            "category": "emotional"
          }
        ],
        "primaryReason": "Stake stepped up 2.0x from the prior losing bet",
        "sessionId": "SESSION-053",
        "sessionGrade": "D",
        "isInHeatedSession": true,
        "stakeVsMedian": 1.54,
        "timeSinceLastBet": 39,
        "currentStreak": -1
      },
      {
        "betIndex": 146,
        "betId": "demo-298",
        "classification": "emotional",
        "confidence": 95,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 7,
            "description": "Stake stepped up 1.5x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "oversized_bet",
            "weight": 5,
            "description": "Stake is 2.3x the median",
            "category": "emotional"
          },
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          },
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "8th bet on a weekend day",
            "category": "emotional"
          }
        ],
        "primaryReason": "Stake stepped up 1.5x from the prior losing bet",
        "sessionId": "SESSION-053",
        "sessionGrade": "D",
        "isInHeatedSession": true,
        "stakeVsMedian": 2.31,
        "timeSinceLastBet": 49,
        "currentStreak": -2
      },
      {
        "betIndex": 147,
        "betId": "demo-299",
        "classification": "emotional",
        "confidence": 86,
        "signals": [
          {
            "name": "oversized_bet",
            "weight": 7,
            "description": "Stake is 3.4x the median",
            "category": "emotional"
          },
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          },
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "9th bet on a weekend day",
            "category": "emotional"
          }
        ],
        "primaryReason": "Stake is 3.4x the median",
        "sessionId": "SESSION-053",
        "sessionGrade": "D",
        "isInHeatedSession": true,
        "stakeVsMedian": 3.38,
        "timeSinceLastBet": 53,
        "currentStreak": 1
      },
      {
        "betIndex": 148,
        "betId": "demo-300",
        "classification": "emotional",
        "confidence": 95,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 6,
            "description": "Stake stepped up 1.4x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "oversized_bet",
            "weight": 8,
            "description": "Stake is 4.6x the median",
            "category": "emotional"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          },
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          },
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "10th bet on a weekend day",
            "category": "emotional"
          }
        ],
        "primaryReason": "Stake is 4.6x the median",
        "sessionId": "SESSION-053",
        "sessionGrade": "D",
        "isInHeatedSession": true,
        "stakeVsMedian": 4.62,
        "timeSinceLastBet": 40,
        "currentStreak": -1
      },
      {
        "betIndex": 149,
        "betId": "demo-301",
        "classification": "emotional",
        "confidence": 95,
        "signals": [
          {
            "name": "oversized_bet",
            "weight": 8,
            "description": "Stake is 4.6x the median",
            "category": "emotional"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          },
          {
            "name": "heated_session_context",
            "weight": 3,
            "description": "Part of a heated session",
            "category": "emotional"
          },
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "11th bet on a weekend day",
            "category": "emotional"
          }
        ],
        "primaryReason": "Stake is 4.6x the median",
        "sessionId": "SESSION-053",
        "sessionGrade": "D",
        "isInHeatedSession": true,
        "stakeVsMedian": 4.62,
        "timeSinceLastBet": 51,
        "currentStreak": -2
      },
      {
        "betIndex": 150,
        "betId": "demo-168",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1258 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "1258 min since last bet",
        "sessionId": "SESSION-054",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.32,
        "timeSinceLastBet": 1258,
        "currentStreak": 1
      },
      {
        "betIndex": 151,
        "betId": "demo-165",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1465 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-055",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.26,
        "timeSinceLastBet": 1465,
        "currentStreak": 2
      },
      {
        "betIndex": 152,
        "betId": "demo-149",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "In a grade-B session",
        "sessionId": "SESSION-055",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.54,
        "timeSinceLastBet": 16,
        "currentStreak": -1
      },
      {
        "betIndex": 153,
        "betId": "demo-204",
        "classification": "disciplined",
        "confidence": 83,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-055",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.86,
        "timeSinceLastBet": 8,
        "currentStreak": -2
      },
      {
        "betIndex": 154,
        "betId": "demo-134",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-055",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.03,
        "timeSinceLastBet": 52,
        "currentStreak": -3
      },
      {
        "betIndex": 155,
        "betId": "demo-56",
        "classification": "chasing",
        "confidence": 60,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 7,
            "description": "Stake stepped up 1.6x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 4-loss streak",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1373 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.6x from the prior losing bet",
        "sessionId": "SESSION-056",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.65,
        "timeSinceLastBet": 1373,
        "currentStreak": -4
      },
      {
        "betIndex": 156,
        "betId": "demo-227",
        "classification": "neutral",
        "confidence": 53,
        "signals": [
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 3am",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "352 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-057",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1,
        "timeSinceLastBet": 352,
        "currentStreak": 1
      },
      {
        "betIndex": 157,
        "betId": "demo-24",
        "classification": "chasing",
        "confidence": 53,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 9,
            "description": "Stake stepped up 2.0x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "859 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 2.0x from the prior losing bet",
        "sessionId": "SESSION-058",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.95,
        "timeSinceLastBet": 859,
        "currentStreak": -1
      },
      {
        "betIndex": 158,
        "betId": "demo-28",
        "classification": "disciplined",
        "confidence": 65,
        "signals": [
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NFL spread) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-058",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.14,
        "timeSinceLastBet": 14,
        "currentStreak": -2
      },
      {
        "betIndex": 159,
        "betId": "demo-252",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "204 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "204 min since last bet",
        "sessionId": "SESSION-059",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.29,
        "timeSinceLastBet": 204,
        "currentStreak": 1
      },
      {
        "betIndex": 160,
        "betId": "demo-67",
        "classification": "neutral",
        "confidence": 40,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 3.1x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1450 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 3.1x from the prior losing bet",
        "sessionId": "SESSION-060",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.89,
        "timeSinceLastBet": 1450,
        "currentStreak": -1
      },
      {
        "betIndex": 161,
        "betId": "demo-264",
        "classification": "chasing",
        "confidence": 60,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "68 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-060",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.45,
        "timeSinceLastBet": 68,
        "currentStreak": -2
      },
      {
        "betIndex": 162,
        "betId": "demo-177",
        "classification": "disciplined",
        "confidence": 60,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-060",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.02,
        "timeSinceLastBet": 26,
        "currentStreak": 1
      },
      {
        "betIndex": 163,
        "betId": "demo-217",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "2872 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-061",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.18,
        "timeSinceLastBet": 2872,
        "currentStreak": 2
      },
      {
        "betIndex": 164,
        "betId": "demo-154",
        "classification": "disciplined",
        "confidence": 80,
        "signals": [
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "66 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-061",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.78,
        "timeSinceLastBet": 66,
        "currentStreak": -1
      },
      {
        "betIndex": 165,
        "betId": "demo-105",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1085 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-062",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.54,
        "timeSinceLastBet": 1085,
        "currentStreak": -2
      },
      {
        "betIndex": 166,
        "betId": "demo-9",
        "classification": "chasing",
        "confidence": 83,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 3.3x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 3.3x from the prior losing bet",
        "sessionId": "SESSION-062",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.75,
        "timeSinceLastBet": 24,
        "currentStreak": -3
      },
      {
        "betIndex": 167,
        "betId": "demo-287",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "73 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-062",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.94,
        "timeSinceLastBet": 73,
        "currentStreak": 1
      },
      {
        "betIndex": 168,
        "betId": "demo-243",
        "classification": "chasing",
        "confidence": 70,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "4th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "74 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-062",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.34,
        "timeSinceLastBet": 74,
        "currentStreak": -1
      },
      {
        "betIndex": 169,
        "betId": "demo-250",
        "classification": "emotional",
        "confidence": 70,
        "signals": [
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NBA parlay) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          },
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "5th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "undersized_throwaway",
            "weight": 3,
            "description": "Tiny stake (0.25x median) on a longshot (+500)",
            "category": "impulsive"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "145 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Same sport+type (NBA parlay) as the prior losing bet",
        "sessionId": "SESSION-062",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.25,
        "timeSinceLastBet": 145,
        "currentStreak": -2
      },
      {
        "betIndex": 170,
        "betId": "demo-104",
        "classification": "chasing",
        "confidence": 70,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 9,
            "description": "Stake stepped up 1.9x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1376 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.9x from the prior losing bet",
        "sessionId": "SESSION-063",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.48,
        "timeSinceLastBet": 1376,
        "currentStreak": -3
      },
      {
        "betIndex": 171,
        "betId": "demo-171",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "In a grade-A session",
        "sessionId": "SESSION-063",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.48,
        "timeSinceLastBet": 37,
        "currentStreak": 1
      },
      {
        "betIndex": 172,
        "betId": "demo-84",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 0am",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "89 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Placed at 0am",
        "sessionId": "SESSION-063",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.66,
        "timeSinceLastBet": 89,
        "currentStreak": 2
      },
      {
        "betIndex": 173,
        "betId": "demo-59",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 9,
            "description": "Stake stepped up 2.0x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "2578 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 2.0x from the prior losing bet",
        "sessionId": "SESSION-064",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.29,
        "timeSinceLastBet": 2578,
        "currentStreak": -1
      },
      {
        "betIndex": 174,
        "betId": "demo-48",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "83 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "83 min since last bet",
        "sessionId": "SESSION-064",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.74,
        "timeSinceLastBet": 83,
        "currentStreak": 1
      },
      {
        "betIndex": 175,
        "betId": "demo-131",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "74 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "74 min since last bet",
        "sessionId": "SESSION-064",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.38,
        "timeSinceLastBet": 74,
        "currentStreak": 2
      },
      {
        "betIndex": 176,
        "betId": "demo-234",
        "classification": "disciplined",
        "confidence": 86,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "2727 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          },
          {
            "name": "win_streak_no_escalation",
            "weight": -4,
            "description": "On a 3-win streak without increasing stakes",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-065",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.74,
        "timeSinceLastBet": 2727,
        "currentStreak": 3
      },
      {
        "betIndex": 177,
        "betId": "demo-222",
        "classification": "neutral",
        "confidence": 40,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 6,
            "description": "Stake stepped up 1.4x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NBA prop) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "81 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.4x from the prior losing bet",
        "sessionId": "SESSION-065",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.02,
        "timeSinceLastBet": 81,
        "currentStreak": -1
      },
      {
        "betIndex": 178,
        "betId": "demo-277",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "170 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Placed at 11pm",
        "sessionId": "SESSION-065",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.45,
        "timeSinceLastBet": 170,
        "currentStreak": 1
      },
      {
        "betIndex": 179,
        "betId": "demo-2",
        "classification": "chasing",
        "confidence": 60,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 3.6x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1093 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 3.6x from the prior losing bet",
        "sessionId": "SESSION-066",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.6,
        "timeSinceLastBet": 1093,
        "currentStreak": -1
      },
      {
        "betIndex": 180,
        "betId": "demo-117",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "186 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-067",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.14,
        "timeSinceLastBet": 186,
        "currentStreak": 1
      },
      {
        "betIndex": 181,
        "betId": "demo-160",
        "classification": "disciplined",
        "confidence": 60,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-067",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.2,
        "timeSinceLastBet": 58,
        "currentStreak": 2
      },
      {
        "betIndex": 182,
        "betId": "demo-103",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "4th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          },
          {
            "name": "win_streak_no_escalation",
            "weight": -4,
            "description": "On a 3-win streak without increasing stakes",
            "category": "disciplined"
          }
        ],
        "primaryReason": "On a 3-win streak without increasing stakes",
        "sessionId": "SESSION-067",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.51,
        "timeSinceLastBet": 18,
        "currentStreak": 3
      },
      {
        "betIndex": 183,
        "betId": "demo-40",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1265 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "1265 min since last bet",
        "sessionId": "SESSION-068",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.48,
        "timeSinceLastBet": 1265,
        "currentStreak": 4
      },
      {
        "betIndex": 184,
        "betId": "demo-179",
        "classification": "disciplined",
        "confidence": 80,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          },
          {
            "name": "win_streak_no_escalation",
            "weight": -4,
            "description": "On a 5-win streak without increasing stakes",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-068",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.11,
        "timeSinceLastBet": 15,
        "currentStreak": 5
      },
      {
        "betIndex": 185,
        "betId": "demo-198",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "185 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-069",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.22,
        "timeSinceLastBet": 185,
        "currentStreak": -1
      },
      {
        "betIndex": 186,
        "betId": "demo-46",
        "classification": "neutral",
        "confidence": 40,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 7,
            "description": "Stake stepped up 1.5x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1128 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.5x from the prior losing bet",
        "sessionId": "SESSION-070",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.86,
        "timeSinceLastBet": 1128,
        "currentStreak": -2
      },
      {
        "betIndex": 187,
        "betId": "demo-93",
        "classification": "chasing",
        "confidence": 47,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "273 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-071",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.55,
        "timeSinceLastBet": 273,
        "currentStreak": -3
      },
      {
        "betIndex": 188,
        "betId": "demo-63",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 9,
            "description": "Stake stepped up 2.2x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 4-loss streak",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1202 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 2.2x from the prior losing bet",
        "sessionId": "SESSION-072",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.2,
        "timeSinceLastBet": 1202,
        "currentStreak": -4
      },
      {
        "betIndex": 189,
        "betId": "demo-55",
        "classification": "impulsive",
        "confidence": 53,
        "signals": [
          {
            "name": "rapid_session_bet",
            "weight": 4,
            "description": "Only 1.0 min since last bet",
            "category": "emotional"
          },
          {
            "name": "instant_rebet",
            "weight": 7,
            "description": "Rebet in under 1.0 minutes",
            "category": "impulsive"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Rebet in under 1.0 minutes",
        "sessionId": "SESSION-072",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.12,
        "timeSinceLastBet": 1,
        "currentStreak": 1
      },
      {
        "betIndex": 190,
        "betId": "demo-245",
        "classification": "chasing",
        "confidence": 60,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "285 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-073",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.32,
        "timeSinceLastBet": 285,
        "currentStreak": -1
      },
      {
        "betIndex": 191,
        "betId": "demo-41",
        "classification": "chasing",
        "confidence": 60,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 5.8x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1165 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 5.8x from the prior losing bet",
        "sessionId": "SESSION-074",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.88,
        "timeSinceLastBet": 1165,
        "currentStreak": -2
      },
      {
        "betIndex": 192,
        "betId": "demo-212",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "176 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-074",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.77,
        "timeSinceLastBet": 176,
        "currentStreak": 1
      },
      {
        "betIndex": 193,
        "betId": "demo-251",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "134 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Placed at 11pm",
        "sessionId": "SESSION-074",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.51,
        "timeSinceLastBet": 134,
        "currentStreak": 2
      },
      {
        "betIndex": 194,
        "betId": "demo-29",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1212 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "1212 min since last bet",
        "sessionId": "SESSION-075",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.6,
        "timeSinceLastBet": 1212,
        "currentStreak": 3
      },
      {
        "betIndex": 195,
        "betId": "demo-237",
        "classification": "disciplined",
        "confidence": 60,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1485 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "win_streak_no_escalation",
            "weight": -4,
            "description": "On a 4-win streak without increasing stakes",
            "category": "disciplined"
          }
        ],
        "primaryReason": "On a 4-win streak without increasing stakes",
        "sessionId": "SESSION-076",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.37,
        "timeSinceLastBet": 1485,
        "currentStreak": 4
      },
      {
        "betIndex": 196,
        "betId": "demo-20",
        "classification": "chasing",
        "confidence": 70,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 4.5x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "97 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 4.5x from the prior losing bet",
        "sessionId": "SESSION-076",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.65,
        "timeSinceLastBet": 97,
        "currentStreak": -1
      },
      {
        "betIndex": 197,
        "betId": "demo-16",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1217 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-077",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.15,
        "timeSinceLastBet": 1217,
        "currentStreak": 1
      },
      {
        "betIndex": 198,
        "betId": "demo-187",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "146 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-077",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.03,
        "timeSinceLastBet": 146,
        "currentStreak": 2
      },
      {
        "betIndex": 199,
        "betId": "demo-22",
        "classification": "disciplined",
        "confidence": 60,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-077",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.26,
        "timeSinceLastBet": 23,
        "currentStreak": -1
      },
      {
        "betIndex": 200,
        "betId": "demo-163",
        "classification": "neutral",
        "confidence": 20,
        "signals": [
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "4th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "4th bet on a weekend day",
        "sessionId": "SESSION-077",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.68,
        "timeSinceLastBet": 40,
        "currentStreak": 1
      },
      {
        "betIndex": 201,
        "betId": "demo-38",
        "classification": "neutral",
        "confidence": 20,
        "signals": [
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "5th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "5th bet on a weekend day",
        "sessionId": "SESSION-077",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.78,
        "timeSinceLastBet": 8,
        "currentStreak": -1
      },
      {
        "betIndex": 202,
        "betId": "demo-205",
        "classification": "disciplined",
        "confidence": 83,
        "signals": [
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "6th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "74 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-077",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.8,
        "timeSinceLastBet": 74,
        "currentStreak": -2
      },
      {
        "betIndex": 203,
        "betId": "demo-107",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 2am",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "240 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Placed at 2am",
        "sessionId": "SESSION-078",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.68,
        "timeSinceLastBet": 240,
        "currentStreak": 1
      },
      {
        "betIndex": 204,
        "betId": "demo-138",
        "classification": "disciplined",
        "confidence": 60,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 7,
            "description": "Stake stepped up 1.6x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "996 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.6x from the prior losing bet",
        "sessionId": "SESSION-079",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.06,
        "timeSinceLastBet": 996,
        "currentStreak": -1
      },
      {
        "betIndex": 205,
        "betId": "demo-263",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "74 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "74 min since last bet",
        "sessionId": "SESSION-079",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.43,
        "timeSinceLastBet": 74,
        "currentStreak": 1
      },
      {
        "betIndex": 206,
        "betId": "demo-79",
        "classification": "neutral",
        "confidence": 53,
        "signals": [
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "4th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-079",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.51,
        "timeSinceLastBet": 56,
        "currentStreak": -1
      },
      {
        "betIndex": 207,
        "betId": "demo-115",
        "classification": "neutral",
        "confidence": 20,
        "signals": [
          {
            "name": "rapid_session_bet",
            "weight": 4,
            "description": "Only 2.0 min since last bet",
            "category": "emotional"
          },
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "5th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Only 2.0 min since last bet",
        "sessionId": "SESSION-079",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.25,
        "timeSinceLastBet": 2,
        "currentStreak": 1
      },
      {
        "betIndex": 208,
        "betId": "demo-291",
        "classification": "disciplined",
        "confidence": 75,
        "signals": [
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1288 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-080",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.63,
        "timeSinceLastBet": 1288,
        "currentStreak": -1
      },
      {
        "betIndex": 209,
        "betId": "demo-233",
        "classification": "disciplined",
        "confidence": 75,
        "signals": [
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "104 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-080",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.68,
        "timeSinceLastBet": 104,
        "currentStreak": -2
      },
      {
        "betIndex": 210,
        "betId": "demo-135",
        "classification": "disciplined",
        "confidence": 60,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-080",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.05,
        "timeSinceLastBet": 14,
        "currentStreak": 1
      },
      {
        "betIndex": 211,
        "betId": "demo-140",
        "classification": "chasing",
        "confidence": 60,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 6,
            "description": "Stake stepped up 1.4x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NBA spread) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "81 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.4x from the prior losing bet",
        "sessionId": "SESSION-080",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.42,
        "timeSinceLastBet": 81,
        "currentStreak": -1
      },
      {
        "betIndex": 212,
        "betId": "demo-262",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "77 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Placed at 11pm",
        "sessionId": "SESSION-080",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.45,
        "timeSinceLastBet": 77,
        "currentStreak": 1
      },
      {
        "betIndex": 213,
        "betId": "demo-61",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 9,
            "description": "Stake stepped up 2.2x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1136 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 2.2x from the prior losing bet",
        "sessionId": "SESSION-081",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.97,
        "timeSinceLastBet": 1136,
        "currentStreak": -1
      },
      {
        "betIndex": 214,
        "betId": "demo-188",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "116 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-081",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1,
        "timeSinceLastBet": 116,
        "currentStreak": 1
      },
      {
        "betIndex": 215,
        "betId": "demo-280",
        "classification": "neutral",
        "confidence": 40,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-081",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.51,
        "timeSinceLastBet": 23,
        "currentStreak": -1
      },
      {
        "betIndex": 216,
        "betId": "demo-15",
        "classification": "neutral",
        "confidence": 40,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 2.2x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "2679 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 2.2x from the prior losing bet",
        "sessionId": "SESSION-082",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.11,
        "timeSinceLastBet": 2679,
        "currentStreak": -2
      },
      {
        "betIndex": 217,
        "betId": "demo-166",
        "classification": "disciplined",
        "confidence": 80,
        "signals": [
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1633 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-083",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.17,
        "timeSinceLastBet": 1633,
        "currentStreak": -3
      },
      {
        "betIndex": 218,
        "betId": "demo-76",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "In a grade-A session",
        "sessionId": "SESSION-083",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.68,
        "timeSinceLastBet": 55,
        "currentStreak": 1
      },
      {
        "betIndex": 219,
        "betId": "demo-7",
        "classification": "neutral",
        "confidence": 20,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 8,
            "description": "Stake stepped up 1.9x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1161 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.9x from the prior losing bet",
        "sessionId": "SESSION-084",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.26,
        "timeSinceLastBet": 1161,
        "currentStreak": -1
      },
      {
        "betIndex": 220,
        "betId": "demo-235",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "299 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-085",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.97,
        "timeSinceLastBet": 299,
        "currentStreak": 1
      },
      {
        "betIndex": 221,
        "betId": "demo-180",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1253 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-086",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.22,
        "timeSinceLastBet": 1253,
        "currentStreak": -1
      },
      {
        "betIndex": 222,
        "betId": "demo-236",
        "classification": "chasing",
        "confidence": 70,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-086",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.34,
        "timeSinceLastBet": 45,
        "currentStreak": -2
      },
      {
        "betIndex": 223,
        "betId": "demo-196",
        "classification": "neutral",
        "confidence": 40,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 9,
            "description": "Stake stepped up 2.0x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "86 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 2.0x from the prior losing bet",
        "sessionId": "SESSION-086",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.66,
        "timeSinceLastBet": 86,
        "currentStreak": -3
      },
      {
        "betIndex": 224,
        "betId": "demo-96",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          },
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "4th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "121 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Placed at 11pm",
        "sessionId": "SESSION-086",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.43,
        "timeSinceLastBet": 121,
        "currentStreak": 1
      },
      {
        "betIndex": 225,
        "betId": "demo-3",
        "classification": "chasing",
        "confidence": 80,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 4.9x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "oversized_bet",
            "weight": 4,
            "description": "Stake is 2.1x the median",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1246 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 4.9x from the prior losing bet",
        "sessionId": "SESSION-087",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 2.09,
        "timeSinceLastBet": 1246,
        "currentStreak": -1
      },
      {
        "betIndex": 226,
        "betId": "demo-184",
        "classification": "disciplined",
        "confidence": 83,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-087",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.92,
        "timeSinceLastBet": 34,
        "currentStreak": -2
      },
      {
        "betIndex": 227,
        "betId": "demo-37",
        "classification": "chasing",
        "confidence": 70,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 7,
            "description": "Stake stepped up 1.5x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.5x from the prior losing bet",
        "sessionId": "SESSION-087",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.37,
        "timeSinceLastBet": 10,
        "currentStreak": -3
      },
      {
        "betIndex": 228,
        "betId": "demo-128",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "102 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-087",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.02,
        "timeSinceLastBet": 102,
        "currentStreak": 1
      },
      {
        "betIndex": 229,
        "betId": "demo-19",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1251 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "1251 min since last bet",
        "sessionId": "SESSION-088",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.45,
        "timeSinceLastBet": 1251,
        "currentStreak": 2
      },
      {
        "betIndex": 230,
        "betId": "demo-141",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "In a grade-B session",
        "sessionId": "SESSION-088",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.66,
        "timeSinceLastBet": 38,
        "currentStreak": 3
      },
      {
        "betIndex": 231,
        "betId": "demo-118",
        "classification": "disciplined",
        "confidence": 65,
        "signals": [
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NBA spread) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-088",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.82,
        "timeSinceLastBet": 25,
        "currentStreak": -1
      },
      {
        "betIndex": 232,
        "betId": "demo-148",
        "classification": "neutral",
        "confidence": 40,
        "signals": [
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NBA spread) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "rapid_session_bet",
            "weight": 4,
            "description": "Only 4.0 min since last bet",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-088",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.85,
        "timeSinceLastBet": 4,
        "currentStreak": -2
      },
      {
        "betIndex": 233,
        "betId": "demo-52",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "rapid_session_bet",
            "weight": 4,
            "description": "Only 4.0 min since last bet",
            "category": "emotional"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Only 4.0 min since last bet",
        "sessionId": "SESSION-088",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.57,
        "timeSinceLastBet": 4,
        "currentStreak": 1
      },
      {
        "betIndex": 234,
        "betId": "demo-146",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "rapid_session_bet",
            "weight": 4,
            "description": "Only 4.0 min since last bet",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Only 4.0 min since last bet",
        "sessionId": "SESSION-088",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.06,
        "timeSinceLastBet": 4,
        "currentStreak": 2
      },
      {
        "betIndex": 235,
        "betId": "demo-68",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1258 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "1258 min since last bet",
        "sessionId": "SESSION-089",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.54,
        "timeSinceLastBet": 1258,
        "currentStreak": 3
      },
      {
        "betIndex": 236,
        "betId": "demo-281",
        "classification": "disciplined",
        "confidence": 86,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "98 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          },
          {
            "name": "win_streak_no_escalation",
            "weight": -4,
            "description": "On a 4-win streak without increasing stakes",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-089",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.71,
        "timeSinceLastBet": 98,
        "currentStreak": 4
      },
      {
        "betIndex": 237,
        "betId": "demo-30",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "rapid_session_bet",
            "weight": 4,
            "description": "Only 2.0 min since last bet",
            "category": "emotional"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Only 2.0 min since last bet",
        "sessionId": "SESSION-089",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.51,
        "timeSinceLastBet": 2,
        "currentStreak": 5
      },
      {
        "betIndex": 238,
        "betId": "demo-283",
        "classification": "disciplined",
        "confidence": 89,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "205 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-090",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.95,
        "timeSinceLastBet": 205,
        "currentStreak": -1
      },
      {
        "betIndex": 239,
        "betId": "demo-220",
        "classification": "disciplined",
        "confidence": 60,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-090",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.98,
        "timeSinceLastBet": 7,
        "currentStreak": 1
      },
      {
        "betIndex": 240,
        "betId": "demo-172",
        "classification": "chasing",
        "confidence": 53,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 6,
            "description": "Stake stepped up 1.4x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "67 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.4x from the prior losing bet",
        "sessionId": "SESSION-090",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.34,
        "timeSinceLastBet": 67,
        "currentStreak": -1
      },
      {
        "betIndex": 241,
        "betId": "demo-6",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1256 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-091",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.22,
        "timeSinceLastBet": 1256,
        "currentStreak": -2
      },
      {
        "betIndex": 242,
        "betId": "demo-65",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1283 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "1283 min since last bet",
        "sessionId": "SESSION-092",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.43,
        "timeSinceLastBet": 1283,
        "currentStreak": 1
      },
      {
        "betIndex": 243,
        "betId": "demo-225",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "87 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-092",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.75,
        "timeSinceLastBet": 87,
        "currentStreak": 2
      },
      {
        "betIndex": 244,
        "betId": "demo-247",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "84 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          },
          {
            "name": "win_streak_no_escalation",
            "weight": -4,
            "description": "On a 3-win streak without increasing stakes",
            "category": "disciplined"
          }
        ],
        "primaryReason": "On a 3-win streak without increasing stakes",
        "sessionId": "SESSION-092",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.32,
        "timeSinceLastBet": 84,
        "currentStreak": 3
      },
      {
        "betIndex": 245,
        "betId": "demo-169",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 3.8x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "73 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 3.8x from the prior losing bet",
        "sessionId": "SESSION-092",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.22,
        "timeSinceLastBet": 73,
        "currentStreak": -1
      },
      {
        "betIndex": 246,
        "betId": "demo-269",
        "classification": "chasing",
        "confidence": 60,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-092",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.52,
        "timeSinceLastBet": 58,
        "currentStreak": -2
      },
      {
        "betIndex": 247,
        "betId": "demo-210",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 6,
            "description": "Stake stepped up 1.4x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1265 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.4x from the prior losing bet",
        "sessionId": "SESSION-093",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.72,
        "timeSinceLastBet": 1265,
        "currentStreak": -3
      },
      {
        "betIndex": 248,
        "betId": "demo-77",
        "classification": "chasing",
        "confidence": 95,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 4-loss streak",
            "category": "chasing"
          },
          {
            "name": "rapid_session_bet",
            "weight": 4,
            "description": "Only 4.0 min since last bet",
            "category": "emotional"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-093",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.45,
        "timeSinceLastBet": 4,
        "currentStreak": -4
      },
      {
        "betIndex": 249,
        "betId": "demo-17",
        "classification": "chasing",
        "confidence": 83,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 4.4x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 5-loss streak",
            "category": "chasing"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 4.4x from the prior losing bet",
        "sessionId": "SESSION-093",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.98,
        "timeSinceLastBet": 46,
        "currentStreak": -5
      },
      {
        "betIndex": 250,
        "betId": "demo-39",
        "classification": "chasing",
        "confidence": 83,
        "signals": [
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NFL spread) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 6-loss streak",
            "category": "chasing"
          },
          {
            "name": "rapid_session_bet",
            "weight": 4,
            "description": "Only 4.0 min since last bet",
            "category": "emotional"
          },
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "4th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Same sport+type (NFL spread) as the prior losing bet",
        "sessionId": "SESSION-093",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.49,
        "timeSinceLastBet": 4,
        "currentStreak": -6
      },
      {
        "betIndex": 251,
        "betId": "demo-98",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 0am",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "172 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Placed at 0am",
        "sessionId": "SESSION-093",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.38,
        "timeSinceLastBet": 172,
        "currentStreak": 1
      },
      {
        "betIndex": 252,
        "betId": "demo-91",
        "classification": "chasing",
        "confidence": 53,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 7,
            "description": "Stake stepped up 1.4x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NFL parlay) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 1am",
            "category": "emotional"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "113 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.4x from the prior losing bet",
        "sessionId": "SESSION-093",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.55,
        "timeSinceLastBet": 113,
        "currentStreak": -1
      },
      {
        "betIndex": 253,
        "betId": "demo-175",
        "classification": "disciplined",
        "confidence": 60,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 7,
            "description": "Stake stepped up 1.5x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1114 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.5x from the prior losing bet",
        "sessionId": "SESSION-094",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.83,
        "timeSinceLastBet": 1114,
        "currentStreak": -2
      },
      {
        "betIndex": 254,
        "betId": "demo-249",
        "classification": "chasing",
        "confidence": 83,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1393 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-095",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.4,
        "timeSinceLastBet": 1393,
        "currentStreak": -3
      },
      {
        "betIndex": 255,
        "betId": "demo-45",
        "classification": "chasing",
        "confidence": 89,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 4.2x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 4-loss streak",
            "category": "chasing"
          }
        ],
        "primaryReason": "Stake stepped up 4.2x from the prior losing bet",
        "sessionId": "SESSION-095",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.69,
        "timeSinceLastBet": 29,
        "currentStreak": -4
      },
      {
        "betIndex": 256,
        "betId": "demo-143",
        "classification": "neutral",
        "confidence": 40,
        "signals": [
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 5-loss streak",
            "category": "chasing"
          }
        ],
        "primaryReason": "Betting during a 5-loss streak",
        "sessionId": "SESSION-095",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.37,
        "timeSinceLastBet": 46,
        "currentStreak": -5
      },
      {
        "betIndex": 257,
        "betId": "demo-284",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-095",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.18,
        "timeSinceLastBet": 8,
        "currentStreak": 1
      },
      {
        "betIndex": 258,
        "betId": "demo-230",
        "classification": "disciplined",
        "confidence": 75,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-095",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.18,
        "timeSinceLastBet": 38,
        "currentStreak": -1
      },
      {
        "betIndex": 259,
        "betId": "demo-100",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1279 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-096",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.58,
        "timeSinceLastBet": 1279,
        "currentStreak": -2
      },
      {
        "betIndex": 260,
        "betId": "demo-208",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 8,
            "description": "Stake stepped up 1.7x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "130 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.7x from the prior losing bet",
        "sessionId": "SESSION-096",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1,
        "timeSinceLastBet": 130,
        "currentStreak": -3
      },
      {
        "betIndex": 261,
        "betId": "demo-73",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1399 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "1399 min since last bet",
        "sessionId": "SESSION-097",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.49,
        "timeSinceLastBet": 1399,
        "currentStreak": 1
      },
      {
        "betIndex": 262,
        "betId": "demo-203",
        "classification": "disciplined",
        "confidence": 89,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "64 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-097",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.11,
        "timeSinceLastBet": 64,
        "currentStreak": -1
      },
      {
        "betIndex": 263,
        "betId": "demo-58",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1172 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-098",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.22,
        "timeSinceLastBet": 1172,
        "currentStreak": -2
      },
      {
        "betIndex": 264,
        "betId": "demo-50",
        "classification": "disciplined",
        "confidence": 60,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-098",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.26,
        "timeSinceLastBet": 19,
        "currentStreak": 1
      },
      {
        "betIndex": 265,
        "betId": "demo-80",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "In a grade-A session",
        "sessionId": "SESSION-098",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.65,
        "timeSinceLastBet": 53,
        "currentStreak": 2
      },
      {
        "betIndex": 266,
        "betId": "demo-129",
        "classification": "disciplined",
        "confidence": 89,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "100 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-098",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.82,
        "timeSinceLastBet": 100,
        "currentStreak": -1
      },
      {
        "betIndex": 267,
        "betId": "demo-242",
        "classification": "chasing",
        "confidence": 60,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "72 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-098",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.37,
        "timeSinceLastBet": 72,
        "currentStreak": -2
      },
      {
        "betIndex": 268,
        "betId": "demo-51",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 2.9x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1265 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 2.9x from the prior losing bet",
        "sessionId": "SESSION-099",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.08,
        "timeSinceLastBet": 1265,
        "currentStreak": -3
      },
      {
        "betIndex": 269,
        "betId": "demo-89",
        "classification": "chasing",
        "confidence": 60,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 4-loss streak",
            "category": "chasing"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "137 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-099",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.6,
        "timeSinceLastBet": 137,
        "currentStreak": -4
      },
      {
        "betIndex": 270,
        "betId": "demo-110",
        "classification": "chasing",
        "confidence": 65,
        "signals": [
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NFL parlay) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 5-loss streak",
            "category": "chasing"
          }
        ],
        "primaryReason": "Same sport+type (NFL parlay) as the prior losing bet",
        "sessionId": "SESSION-099",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.32,
        "timeSinceLastBet": 43,
        "currentStreak": -5
      },
      {
        "betIndex": 271,
        "betId": "demo-5",
        "classification": "chasing",
        "confidence": 89,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 4.8x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 6-loss streak",
            "category": "chasing"
          }
        ],
        "primaryReason": "Stake stepped up 4.8x from the prior losing bet",
        "sessionId": "SESSION-099",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.55,
        "timeSinceLastBet": 21,
        "currentStreak": -6
      },
      {
        "betIndex": 272,
        "betId": "demo-71",
        "classification": "neutral",
        "confidence": 53,
        "signals": [
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 7-loss streak",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "104 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-099",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.15,
        "timeSinceLastBet": 104,
        "currentStreak": -7
      },
      {
        "betIndex": 273,
        "betId": "demo-35",
        "classification": "chasing",
        "confidence": 86,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 6,
            "description": "Stake stepped up 1.4x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 8-loss streak",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          }
        ],
        "primaryReason": "Stake stepped up 1.4x from the prior losing bet",
        "sessionId": "SESSION-099",
        "sessionGrade": "C",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.6,
        "timeSinceLastBet": 9,
        "currentStreak": -8
      },
      {
        "betIndex": 274,
        "betId": "demo-70",
        "classification": "disciplined",
        "confidence": 80,
        "signals": [
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 9-loss streak",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1071 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-100",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.97,
        "timeSinceLastBet": 1071,
        "currentStreak": -9
      },
      {
        "betIndex": 275,
        "betId": "demo-42",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "168 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-100",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.03,
        "timeSinceLastBet": 168,
        "currentStreak": 1
      },
      {
        "betIndex": 276,
        "betId": "demo-88",
        "classification": "neutral",
        "confidence": 40,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-100",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.62,
        "timeSinceLastBet": 13,
        "currentStreak": -1
      },
      {
        "betIndex": 277,
        "betId": "demo-240",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "4th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "106 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "4th bet on a weekend day",
        "sessionId": "SESSION-100",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.46,
        "timeSinceLastBet": 106,
        "currentStreak": -2
      },
      {
        "betIndex": 278,
        "betId": "demo-11",
        "classification": "chasing",
        "confidence": 75,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 3.2x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1205 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 3.2x from the prior losing bet",
        "sessionId": "SESSION-101",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.48,
        "timeSinceLastBet": 1205,
        "currentStreak": -3
      },
      {
        "betIndex": 279,
        "betId": "demo-157",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "124 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-101",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.91,
        "timeSinceLastBet": 124,
        "currentStreak": 1
      },
      {
        "betIndex": 280,
        "betId": "demo-274",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "93 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "93 min since last bet",
        "sessionId": "SESSION-101",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.29,
        "timeSinceLastBet": 93,
        "currentStreak": 2
      },
      {
        "betIndex": 281,
        "betId": "demo-211",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 2.6x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "4th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 2.6x from the prior losing bet",
        "sessionId": "SESSION-101",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.77,
        "timeSinceLastBet": 32,
        "currentStreak": -1
      },
      {
        "betIndex": 282,
        "betId": "demo-266",
        "classification": "neutral",
        "confidence": 40,
        "signals": [
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          },
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "5th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Placed at 11pm",
        "sessionId": "SESSION-101",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.45,
        "timeSinceLastBet": 49,
        "currentStreak": 1
      },
      {
        "betIndex": 283,
        "betId": "demo-292",
        "classification": "chasing",
        "confidence": 89,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 3.1x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 11pm",
            "category": "emotional"
          },
          {
            "name": "weekend_volume_spike",
            "weight": 2,
            "description": "6th bet on a weekend day",
            "category": "emotional"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 3.1x from the prior losing bet",
        "sessionId": "SESSION-101",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.37,
        "timeSinceLastBet": 20,
        "currentStreak": -1
      },
      {
        "betIndex": 284,
        "betId": "demo-74",
        "classification": "disciplined",
        "confidence": 89,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1168 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-102",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.91,
        "timeSinceLastBet": 1168,
        "currentStreak": -2
      },
      {
        "betIndex": 285,
        "betId": "demo-10",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "In a grade-B session",
        "sessionId": "SESSION-102",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.34,
        "timeSinceLastBet": 5,
        "currentStreak": 1
      },
      {
        "betIndex": 286,
        "betId": "demo-152",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "In a grade-B session",
        "sessionId": "SESSION-102",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.37,
        "timeSinceLastBet": 10,
        "currentStreak": -1
      },
      {
        "betIndex": 287,
        "betId": "demo-120",
        "classification": "disciplined",
        "confidence": 70,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "97 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-102",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.02,
        "timeSinceLastBet": 97,
        "currentStreak": 1
      },
      {
        "betIndex": 288,
        "betId": "demo-202",
        "classification": "disciplined",
        "confidence": 89,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "61 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-102",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.02,
        "timeSinceLastBet": 61,
        "currentStreak": -1
      },
      {
        "betIndex": 289,
        "betId": "demo-108",
        "classification": "neutral",
        "confidence": 40,
        "signals": [
          {
            "name": "odds_shift_to_longshot",
            "weight": 5,
            "description": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "parlay_after_straight_loss",
            "weight": 5,
            "description": "Jumped to a parlay from a prior losing straight bet",
            "category": "chasing"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Shifted to longshot odds (+500) from shorter odds on the prior losing bet",
        "sessionId": "SESSION-102",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.62,
        "timeSinceLastBet": 53,
        "currentStreak": -2
      },
      {
        "betIndex": 290,
        "betId": "demo-86",
        "classification": "neutral",
        "confidence": 27,
        "signals": [
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NFL parlay) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "late_night",
            "weight": 3,
            "description": "Placed at 2am",
            "category": "emotional"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "204 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-103",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.51,
        "timeSinceLastBet": 204,
        "currentStreak": -3
      },
      {
        "betIndex": 291,
        "betId": "demo-114",
        "classification": "neutral",
        "confidence": 20,
        "signals": [
          {
            "name": "double_down_after_loss",
            "weight": 4,
            "description": "Same sport+type (NFL parlay) as the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 4-loss streak",
            "category": "chasing"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1018 min since last bet",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-104",
        "sessionGrade": "D",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.54,
        "timeSinceLastBet": 1018,
        "currentStreak": -4
      },
      {
        "betIndex": 292,
        "betId": "demo-127",
        "classification": "chasing",
        "confidence": 95,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 2.7x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 5-loss streak",
            "category": "chasing"
          },
          {
            "name": "rapid_session_bet",
            "weight": 4,
            "description": "Only 1.0 min since last bet",
            "category": "emotional"
          },
          {
            "name": "instant_rebet",
            "weight": 7,
            "description": "Rebet in under 1.0 minutes",
            "category": "impulsive"
          }
        ],
        "primaryReason": "Stake stepped up 2.7x from the prior losing bet",
        "sessionId": "SESSION-104",
        "sessionGrade": "D",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.45,
        "timeSinceLastBet": 1,
        "currentStreak": -5
      },
      {
        "betIndex": 293,
        "betId": "demo-232",
        "classification": "disciplined",
        "confidence": 80,
        "signals": [
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 6-loss streak",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "183 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-105",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.17,
        "timeSinceLastBet": 183,
        "currentStreak": -6
      },
      {
        "betIndex": 294,
        "betId": "demo-219",
        "classification": "disciplined",
        "confidence": 60,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake is near the median",
        "sessionId": "SESSION-105",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.83,
        "timeSinceLastBet": 5,
        "currentStreak": 1
      },
      {
        "betIndex": 295,
        "betId": "demo-170",
        "classification": "neutral",
        "confidence": 53,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 6,
            "description": "Stake stepped up 1.3x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.3x from the prior losing bet",
        "sessionId": "SESSION-105",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.11,
        "timeSinceLastBet": 13,
        "currentStreak": -1
      },
      {
        "betIndex": 296,
        "betId": "demo-82",
        "classification": "neutral",
        "confidence": 33,
        "signals": [
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "In a grade-B session",
        "sessionId": "SESSION-105",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.35,
        "timeSinceLastBet": 18,
        "currentStreak": 1
      },
      {
        "betIndex": 297,
        "betId": "demo-49",
        "classification": "neutral",
        "confidence": 40,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 10,
            "description": "Stake stepped up 3.3x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1149 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 3.3x from the prior losing bet",
        "sessionId": "SESSION-106",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.18,
        "timeSinceLastBet": 1149,
        "currentStreak": -1
      },
      {
        "betIndex": 298,
        "betId": "demo-13",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "158 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "158 min since last bet",
        "sessionId": "SESSION-106",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.62,
        "timeSinceLastBet": 158,
        "currentStreak": 1
      },
      {
        "betIndex": 299,
        "betId": "demo-139",
        "classification": "disciplined",
        "confidence": 83,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-106",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.78,
        "timeSinceLastBet": 6,
        "currentStreak": -1
      },
      {
        "betIndex": 300,
        "betId": "demo-189",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "post_loss_escalation",
            "weight": 7,
            "description": "Stake stepped up 1.5x from the prior losing bet",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-B session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Stake stepped up 1.5x from the prior losing bet",
        "sessionId": "SESSION-106",
        "sessionGrade": "B",
        "isInHeatedSession": false,
        "stakeVsMedian": 1.15,
        "timeSinceLastBet": 5,
        "currentStreak": -2
      },
      {
        "betIndex": 301,
        "betId": "demo-132",
        "classification": "disciplined",
        "confidence": 80,
        "signals": [
          {
            "name": "loss_streak_continuation",
            "weight": 3,
            "description": "Betting during a 3-loss streak",
            "category": "chasing"
          },
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1475 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-107",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.83,
        "timeSinceLastBet": 1475,
        "currentStreak": -3
      },
      {
        "betIndex": 302,
        "betId": "demo-33",
        "classification": "neutral",
        "confidence": 47,
        "signals": [
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "1308 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "1308 min since last bet",
        "sessionId": "SESSION-108",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 2,
        "timeSinceLastBet": 1308,
        "currentStreak": 1
      },
      {
        "betIndex": 303,
        "betId": "demo-125",
        "classification": "disciplined",
        "confidence": 89,
        "signals": [
          {
            "name": "flat_stake",
            "weight": -4,
            "description": "Stake is near the median",
            "category": "disciplined"
          },
          {
            "name": "consistent_after_loss",
            "weight": -5,
            "description": "Held stake near the median following a losing bet",
            "category": "disciplined"
          },
          {
            "name": "reasonable_pace",
            "weight": -2,
            "description": "161 min since last bet",
            "category": "disciplined"
          },
          {
            "name": "controlled_in_good_session",
            "weight": -2,
            "description": "In a grade-A session",
            "category": "disciplined"
          }
        ],
        "primaryReason": "Held stake near the median following a losing bet",
        "sessionId": "SESSION-108",
        "sessionGrade": "A",
        "isInHeatedSession": false,
        "stakeVsMedian": 0.88,
        "timeSinceLastBet": 161,
        "currentStreak": -1
      }
    ],
    "distribution": {
      "disciplined": {
        "count": 90,
        "percent": 29.6,
        "totalStaked": 5617,
        "totalProfit": -75.18,
        "roi": -1.34
      },
      "emotional": {
        "count": 9,
        "percent": 3,
        "totalStaked": 2286,
        "totalProfit": -1244.64,
        "roi": -54.45
      },
      "chasing": {
        "count": 75,
        "percent": 24.7,
        "totalStaked": 5003,
        "totalProfit": -895.7,
        "roi": -17.9
      },
      "impulsive": {
        "count": 2,
        "percent": 0.7,
        "totalStaked": 105,
        "totalProfit": 87,
        "roi": 82.86
      },
      "neutral": {
        "count": 128,
        "percent": 42.1,
        "totalStaked": 8317,
        "totalProfit": -1119.09,
        "roi": -13.46
      }
    },
    "emotionalCost": 1954.26,
    "worstAnnotatedBet": {
      "betIndex": 1,
      "betId": "demo-122",
      "classification": "chasing",
      "confidence": 95,
      "signals": [
        {
          "name": "post_loss_escalation",
          "weight": 10,
          "description": "Stake stepped up 2.8x from the prior losing bet",
          "category": "chasing"
        },
        {
          "name": "late_night",
          "weight": 3,
          "description": "Placed at 3am",
          "category": "emotional"
        },
        {
          "name": "rapid_session_bet",
          "weight": 4,
          "description": "Only 1.0 min since last bet",
          "category": "emotional"
        },
        {
          "name": "instant_rebet",
          "weight": 7,
          "description": "Rebet in under 1.0 minutes",
          "category": "impulsive"
        }
      ],
      "primaryReason": "Stake stepped up 2.8x from the prior losing bet",
      "sessionId": "SESSION-001",
      "sessionGrade": "D",
      "isInHeatedSession": false,
      "stakeVsMedian": 1.46,
      "timeSinceLastBet": 1,
      "currentStreak": -1
    },
    "bestAnnotatedBet": {
      "betIndex": 30,
      "betId": "demo-178",
      "classification": "disciplined",
      "confidence": 89,
      "signals": [
        {
          "name": "flat_stake",
          "weight": -4,
          "description": "Stake is near the median",
          "category": "disciplined"
        },
        {
          "name": "consistent_after_loss",
          "weight": -5,
          "description": "Held stake near the median following a losing bet",
          "category": "disciplined"
        },
        {
          "name": "reasonable_pace",
          "weight": -2,
          "description": "1094 min since last bet",
          "category": "disciplined"
        },
        {
          "name": "controlled_in_good_session",
          "weight": -2,
          "description": "In a grade-A session",
          "category": "disciplined"
        }
      ],
      "primaryReason": "Held stake near the median following a losing bet",
      "sessionId": "SESSION-013",
      "sessionGrade": "A",
      "isInHeatedSession": false,
      "stakeVsMedian": 0.86,
      "timeSinceLastBet": 1094,
      "currentStreak": -2
    },
    "streakInfluence": {
      "avgStakeAfterWinStreak3": 63.71,
      "avgStakeAfterLossStreak3": 75.27,
      "avgStakeNeutral": 68.93
    },
    "insight": "29.6% of bets follow a disciplined process, but selections are still losing. The issue is bet selection, not process."
  },
  "executive_diagnosis": "This bettor runs disciplined sessions but bleeds out in NBA. 175 NBA bets at -24.9% ROI account for nearly all the damage. The late-night window (11pm-4am) is a 0% win rate black hole.",
  "executiveDiagnosis": {
    "insightSnapshot": "Your betting shows heavy parlay tendency patterns. The full report breaks down 304 bets across 108 sessions.",
    "insightFull": "This bettor runs disciplined sessions but bleeds out in NBA. 175 NBA bets at -24.9% ROI account for nearly all the damage. The late-night window (11pm-4am) is a 0% win rate black hole."
  },
  "pertinent_negatives": [
    {
      "pattern": "Loss Chasing",
      "finding": "Not detected",
      "detail": "Your stake sizing stays steady across the bet sequence. 73% of bettors show measurable in-session stake escalation.",
      "populationPercent": 73
    },
    {
      "pattern": "Emotional Betting",
      "finding": "Not detected",
      "detail": "Session behavior stays disciplined under pressure. 61% of bettors show heated sessions exceeding 25% of total.",
      "populationPercent": 61
    },
    {
      "pattern": "Favorite Bias",
      "finding": "Not detected",
      "detail": "No systematic over-betting of favorites detected. 52% of bettors lean too heavily on chalk.",
      "populationPercent": 52
    },
    {
      "pattern": "Sunk Cost",
      "finding": "Not detected",
      "detail": "No pattern of chasing losing teams or players. 38% of bettors double down on losing selections.",
      "populationPercent": 38
    }
  ],
  "contradictions": [],
  "summaryCounts": {
    "sessionsAnalyzed": 108,
    "biasesDetected": 3,
    "patternsIdentified": 0,
    "leakPatternsFlagged": 16,
    "sportLevelFindings": 3
  },
  "sufficiency": {
    "settledBets": 304,
    "tier": "full",
    "gated": []
  },
  "control_system": {
    "controlStatus": "support_mode",
    "headline": "Your report should end in operating rules, not vague advice.",
    "topRisks": [
      {
        "title": "Heavy Parlay Tendency",
        "detail": "You're throwing 3-leg parlays at +500 consistently, which sounds exciting until you see the hit rate.",
        "evidence": "85 parlays at -30."
      },
      {
        "title": "Stake Volatility",
        "detail": "Your bet sizing is genuinely all over the place.",
        "evidence": "Stakes range from $15 to $450 with an average of $70."
      },
      {
        "title": "Heated session relapse",
        "detail": "You logged 4 heated sessions. Those are the moments your control system needs to treat differently.",
        "evidence": "Most sessions look disciplined, but 4 of 108 had heated moments worth reviewing."
      }
    ],
    "hardRules": [
      {
        "title": "No bets after 10pm, full stop",
        "description": "No bets after 10pm, full stop.",
        "rationale": "42 bets placed between 11pm and 4am produced a 0% win rate and -71.5% ROI. That window is costing you money every time you open the app late.",
        "rule_type": "late_night_cutoff",
        "scope": "global",
        "scope_value": null,
        "severity": "critical",
        "enforcement": "hard",
        "provenance": "engine_recommended",
        "trigger": {
          "startHour": 22
        },
        "source": "Late-night time-of-day ROI breakdown showing complete shutout from 11pm through 4am"
      },
      {
        "title": "No NFL parlays. Bet every NFL pick straight",
        "description": "No NFL parlays. Bet every NFL pick straight.",
        "rationale": "NFL straight bets made $497. NFL parlays lost $522. You have a real NFL edge that parlays are erasing completely.",
        "rule_type": "ban_category",
        "scope": "global",
        "scope_value": null,
        "severity": "critical",
        "enforcement": "hard",
        "provenance": "engine_recommended",
        "trigger": {
          "category": "parlay"
        },
        "source": "NFL parlay drag: NFL straight bets +$497, NFL parlays -$522 at -38.7% ROI"
      },
      {
        "title": "Cap stake at $90",
        "description": "No single bet can exceed $90 until your next report.",
        "rationale": "Your control system should defend you from the outsized bet that usually follows a bad sequence.",
        "rule_type": "stake_cap",
        "scope": "global",
        "scope_value": null,
        "severity": "guardrail",
        "enforcement": "hard",
        "provenance": "engine_recommended",
        "trigger": {
          "maxStake": 90,
          "maxStakeMultiplier": 1.25
        },
        "source": "Sizing discipline"
      }
    ],
    "softRules": [
      {
        "title": "Maximum 2 NBA bets per day",
        "description": "Maximum 2 NBA bets per day.",
        "rationale": "The 13 days with 4+ NBA bets combined for $-2210 in losses. More NBA bets per day does not mean more edge, it means more exposure to your worst-performing market.",
        "rule_type": "custom",
        "scope": "global",
        "scope_value": null,
        "severity": "guardrail",
        "enforcement": "soft",
        "provenance": "engine_recommended",
        "trigger": {},
        "source": "NBA rapid-fire sessions finding: 13 days with 4+ NBA bets at combined $-2210"
      },
      {
        "title": "Decide your stake for the session before placing the first bet, and do not change it",
        "description": "Decide your stake for the session before placing the first bet, and do not change it.",
        "rationale": "Your stakes range from $15 to $450 with a variability score of 0.83. The December 13 session shows what happens when sizing escalates mid-session: $-1317 in a single day.",
        "rule_type": "session_limit",
        "scope": "global",
        "scope_value": null,
        "severity": "guardrail",
        "enforcement": "soft",
        "provenance": "engine_recommended",
        "trigger": {},
        "source": "Stake Volatility bias: variability score 0.83, max stake $450, worst session $-1317"
      },
      {
        "title": "On Saturdays, bet half your normal volume",
        "description": "On Saturdays, bet half your normal volume.",
        "rationale": "Saturday is your highest-volume day at 56 bets and your second-worst performer at -26.5% ROI and $-1462 in losses. More bets on your worst day amplifies the damage.",
        "rule_type": "custom",
        "scope": "global",
        "scope_value": null,
        "severity": "guardrail",
        "enforcement": "soft",
        "provenance": "engine_recommended",
        "trigger": {},
        "source": "Day-of-week breakdown: Saturday -26.5% ROI, 56 bets, $-1462 profit"
      }
    ],
    "cooldownSuggestions": [
      {
        "trigger": "Heated session",
        "label": "Next-day lockout after a heated session",
        "durationLabel": "24 hours",
        "durationHours": 24,
        "reason": "Your data shows same-day follow-ups after heated sessions tend to extend the damage, not repair it."
      },
      {
        "trigger": "Late-night behavior",
        "label": "Sleep-on-it cooldown",
        "durationLabel": "Until tomorrow at 8:00 AM",
        "durationHours": 8,
        "reason": "If the cutoff is already broken, the safest next move is to hand the decision to tomorrow-you."
      }
    ],
    "relapseTriggers": [
      "Late-night betting windows",
      "Bets placed shortly after a loss",
      "Returning to the same leaking category under stress"
    ],
    "nextWeekFocus": "No bets after 10pm, full stop.",
    "planTemplate": {
      "bettingHours": {
        "startHour": null,
        "endHour": 22,
        "timezoneLabel": "Local time"
      },
      "maximumUnitSize": 90,
      "bannedBetCategories": [
        "parlay"
      ],
      "sessionLimit": 4,
      "lossStreakStop": null,
      "lateNightCutoffHour": 22,
      "postLossWaitingPeriodMinutes": null,
      "reflectionQuestion": "Would I still place this if my last bet had won?"
    },
    "recoveryModeRecommended": false,
    "riskTier": "none",
    "supportResources": [
      {
        "label": "National Problem Gambling Helpline",
        "value": "Call or text 1-800-MY-RESET. Free and confidential, 24/7.",
        "href": "tel:18006973738"
      },
      {
        "label": "Problem gambling chat",
        "value": "Start a confidential live chat through the National Council on Problem Gambling.",
        "href": "https://www.ncpgambling.org/chat/"
      },
      {
        "label": "Help by state",
        "value": "Find local treatment, counseling, and peer-support options in your state.",
        "href": "https://www.ncpgambling.org/help-treatment/help-by-state/"
      },
      {
        "label": "988 Suicide and Crisis Lifeline",
        "value": "If this feels like a crisis or you need immediate emotional support, call or text 988.",
        "href": "https://988lifeline.org/"
      }
    ]
  },
  "discipline_score": {
    "total": 37,
    "tracking": 6,
    "sizing": 11,
    "control": 7,
    "strategy": 13,
    "percentile": 30
  },
  "schema_version": 4
};


// ── DFS Demo Bets (PrizePicks) ──
// 38 entries telling a PrizePicks story: solid 2-pick game,
// multiplier chasing problem, Dec 14 pick-count escalation sequence.

// Part 1: 2-pick (7) + 3-pick (10) entries
const DEMO_DFS_BETS_PART1: Bet[] = [
  // === 2-PICK ENTRIES (7 total: 2P + 5F, 4W + 3L) ===
  { id: 'demo-dfs-1', user_id: 'demo', placed_at: '2025-11-02T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '2-pick Flex: Josh Allen O 245.5 pass yds | Jalen Hurts O 55.5 rush yds', odds: -150, stake: 10, result: 'win', profit: 6.67, payout: 16.67, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 2, tags: null, notes: null, upload_id: null, created_at: '2025-11-02T13:00:00Z' },
  { id: 'demo-dfs-2', user_id: 'demo', placed_at: '2025-11-03T16:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '2-pick Flex: LeBron James O 25.5 pts | Curry O 24.5 pts', odds: -150, stake: 10, result: 'win', profit: 6.67, payout: 16.67, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 2, tags: null, notes: null, upload_id: null, created_at: '2025-11-03T16:00:00Z' },
  { id: 'demo-dfs-3', user_id: 'demo', placed_at: '2025-11-08T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '2-pick Flex: Josh Allen O 250.5 pass yds | Jalen Hurts O 1.5 pass TDs', odds: -150, stake: 15, result: 'win', profit: 10, payout: 25, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 2, tags: null, notes: null, upload_id: null, created_at: '2025-11-08T13:00:00Z' },
  { id: 'demo-dfs-4', user_id: 'demo', placed_at: '2025-11-12T19:30:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '2-pick Flex: Doncic O 28.5 pts | Giannis O 30.5 pts', odds: -150, stake: 15, result: 'loss', profit: -15, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 2, tags: null, notes: null, upload_id: null, created_at: '2025-11-12T19:30:00Z' },
  { id: 'demo-dfs-5', user_id: 'demo', placed_at: '2025-11-19T19:30:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '2-pick Flex: LeBron James O 7.5 ast | Tatum O 26.5 pts', odds: -150, stake: 25, result: 'loss', profit: -25, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 2, tags: null, notes: null, upload_id: null, created_at: '2025-11-19T19:30:00Z' },
  { id: 'demo-dfs-6', user_id: 'demo', placed_at: '2025-12-13T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '2-pick Power: Josh Allen O 252.5 pass yds | Jalen Hurts O 57.5 rush yds', odds: 200, stake: 10, result: 'win', profit: 20, payout: 30, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 2, tags: null, notes: null, upload_id: null, created_at: '2025-12-13T13:00:00Z' },
  { id: 'demo-dfs-7', user_id: 'demo', placed_at: '2025-12-14T18:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '2-pick Power: Josh Allen O 248.5 pass yds | Mahomes O 272.5 pass yds', odds: 200, stake: 10, result: 'loss', profit: -10, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 2, tags: null, notes: null, upload_id: null, created_at: '2025-12-14T18:00:00Z' },

  // === 3-PICK ENTRIES (10 total: 6P + 4F, 3W + 7L) ===
  { id: 'demo-dfs-8', user_id: 'demo', placed_at: '2025-11-05T19:30:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '3-pick Power: Mahomes O 275.5 pass yds | Lamar Jackson O 65.5 rush yds | Lamb O 74.5 rec yds', odds: 500, stake: 30, result: 'loss', profit: -30, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-11-05T19:30:00Z' },
  { id: 'demo-dfs-9', user_id: 'demo', placed_at: '2025-11-09T19:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '3-pick Flex: LeBron James O 7.5 reb | Jokic O 10.5 reb | Tatum O 25.5 pts', odds: 150, stake: 10, result: 'win', profit: 15, payout: 25, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-11-09T19:00:00Z' },
  { id: 'demo-dfs-10', user_id: 'demo', placed_at: '2025-11-10T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '3-pick Power: Jalen Hurts O 60.5 rush yds | Purdy O 240.5 pass yds | Mahomes O 268.5 pass yds', odds: 500, stake: 30, result: 'loss', profit: -30, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-11-10T13:00:00Z' },
  { id: 'demo-dfs-11', user_id: 'demo', placed_at: '2025-11-16T19:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '3-pick Power: LeBron James O 26.5 pts | Curry O 5.5 3pt | Brunson O 22.5 pts', odds: 500, stake: 10, result: 'win', profit: 50, payout: 60, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-11-16T19:00:00Z' },
  { id: 'demo-dfs-12', user_id: 'demo', placed_at: '2025-11-22T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '3-pick Power: Josh Allen O 1.5 pass TDs | Jalen Hurts O 225.5 pass yds | Purdy O 1.5 pass TDs', odds: 500, stake: 35, result: 'loss', profit: -35, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-11-22T13:00:00Z' },
  { id: 'demo-dfs-13', user_id: 'demo', placed_at: '2025-11-26T19:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '3-pick Flex: LeBron James O 25.5 pts | Curry O 25.5 pts | Tatum O 4.5 ast', odds: 150, stake: 15, result: 'loss', profit: -15, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-11-26T19:00:00Z' },
  { id: 'demo-dfs-14', user_id: 'demo', placed_at: '2025-12-01T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '3-pick Flex: Mahomes O 272.5 pass yds | Lamar Jackson O 62.5 rush yds | Lamb O 76.5 rec yds', odds: 150, stake: 30, result: 'loss', profit: -30, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-12-01T13:00:00Z' },
  { id: 'demo-dfs-15', user_id: 'demo', placed_at: '2025-12-09T19:30:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '3-pick Flex: LeBron James O 6.5 reb | Doncic O 27.5 pts | Giannis O 29.5 pts', odds: 150, stake: 15, result: 'loss', profit: -15, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-12-09T19:30:00Z' },
  { id: 'demo-dfs-16', user_id: 'demo', placed_at: '2025-12-17T19:30:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '3-pick Flex: Tatum O 25.5 pts | Doncic O 30.5 pts | Jokic O 9.5 ast', odds: 150, stake: 30, result: 'loss', profit: -30, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-12-17T19:30:00Z' },
  { id: 'demo-dfs-17', user_id: 'demo', placed_at: '2025-12-27T19:30:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '3-pick Flex: Jokic O 10.5 ast | Giannis O 12.5 reb | Brunson O 24.5 pts', odds: 150, stake: 10, result: 'win', profit: 15, payout: 25, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 3, tags: null, notes: null, upload_id: null, created_at: '2025-12-27T19:30:00Z' },
];

// Part 2: 4-pick (8) + first half of 5-pick entries
const DEMO_DFS_BETS_PART2: Bet[] = [
  // === 4-PICK ENTRIES (8 total: 8P + 0F, 1W + 7L) ===
  { id: 'demo-dfs-18', user_id: 'demo', placed_at: '2025-11-15T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '4-pick Power: Josh Allen O 255.5 pass yds | Mahomes O 280.5 pass yds | Lamar Jackson O 1.5 pass TDs | Lamb O 75.5 rec yds', odds: 900, stake: 35, result: 'loss', profit: -35, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 4, tags: null, notes: null, upload_id: null, created_at: '2025-11-15T13:00:00Z' },
  { id: 'demo-dfs-19', user_id: 'demo', placed_at: '2025-11-23T16:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '4-pick Power: Jokic O 25.5 pts | Doncic O 8.5 reb | Giannis O 11.5 reb | Brunson O 7.5 ast', odds: 900, stake: 20, result: 'loss', profit: -20, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 4, tags: null, notes: null, upload_id: null, created_at: '2025-11-23T16:00:00Z' },
  { id: 'demo-dfs-20', user_id: 'demo', placed_at: '2025-12-03T19:30:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '4-pick Power: Curry O 27.5 pts | Jokic O 11.5 reb | Doncic O 29.5 pts | Giannis O 28.5 pts', odds: 900, stake: 30, result: 'loss', profit: -30, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 4, tags: null, notes: null, upload_id: null, created_at: '2025-12-03T19:30:00Z' },
  { id: 'demo-dfs-21', user_id: 'demo', placed_at: '2025-12-06T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '4-pick Power: Mahomes O 270.5 pass yds | Purdy O 238.5 pass yds | Lamb O 82.5 rec yds | Lamar Jackson O 68.5 rush yds', odds: 900, stake: 35, result: 'loss', profit: -35, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 4, tags: null, notes: null, upload_id: null, created_at: '2025-12-06T13:00:00Z' },
  { id: 'demo-dfs-22', user_id: 'demo', placed_at: '2025-12-11T19:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '4-pick Power: Curry O 5.5 3pt | Tatum O 26.5 pts | Jokic O 9.5 ast | Brunson O 23.5 pts', odds: 900, stake: 10, result: 'win', profit: 90, payout: 100, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 4, tags: null, notes: null, upload_id: null, created_at: '2025-12-11T19:00:00Z' },
  { id: 'demo-dfs-23', user_id: 'demo', placed_at: '2025-12-14T19:30:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '4-pick Power: Josh Allen O 1.5 pass TDs | Jalen Hurts O 60.5 rush yds | Lamar Jackson O 67.5 rush yds | Lamb O 76.5 rec yds', odds: 900, stake: 20, result: 'loss', profit: -20, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 4, tags: null, notes: null, upload_id: null, created_at: '2025-12-14T19:30:00Z' },
  { id: 'demo-dfs-24', user_id: 'demo', placed_at: '2026-01-04T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '4-pick Power: Mahomes O 282.5 pass yds | Lamar Jackson O 69.5 rush yds | Lamb O 83.5 rec yds | Purdy O 243.5 pass yds', odds: 900, stake: 20, result: 'loss', profit: -20, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 4, tags: null, notes: null, upload_id: null, created_at: '2026-01-04T13:00:00Z' },
  { id: 'demo-dfs-25', user_id: 'demo', placed_at: '2026-01-15T19:30:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '4-pick Power: Curry O 24.5 pts | Jokic O 27.5 pts | Doncic O 8.5 ast | Giannis O 30.5 pts', odds: 900, stake: 15, result: 'loss', profit: -15, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 4, tags: null, notes: null, upload_id: null, created_at: '2026-01-15T19:30:00Z' },

  // === 5-PICK ENTRIES first half (entries 26-29) ===
  { id: 'demo-dfs-26', user_id: 'demo', placed_at: '2025-11-17T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '5-pick Power: Josh Allen O 245.5 pass yds | Mahomes O 270.5 pass yds | Lamar Jackson O 70.5 rush yds | Lamb O 80.5 rec yds | Purdy O 236.5 pass yds', odds: 1900, stake: 30, result: 'loss', profit: -30, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 5, tags: null, notes: null, upload_id: null, created_at: '2025-11-17T13:00:00Z' },
  { id: 'demo-dfs-27', user_id: 'demo', placed_at: '2025-11-24T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '5-pick Power: Mahomes O 285.5 pass yds | Jalen Hurts O 62.5 rush yds | Lamar Jackson O 1.5 pass TDs | Purdy O 245.5 pass yds | Lamb O 80.5 rec yds', odds: 1900, stake: 35, result: 'loss', profit: -35, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 5, tags: null, notes: null, upload_id: null, created_at: '2025-11-24T13:00:00Z' },
  { id: 'demo-dfs-28', user_id: 'demo', placed_at: '2025-12-07T19:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '5-pick Power: Curry O 26.5 pts | Tatum O 27.5 pts | Jokic O 24.5 pts | Brunson O 21.5 pts | Doncic O 28.5 pts', odds: 1900, stake: 15, result: 'loss', profit: -15, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 5, tags: null, notes: null, upload_id: null, created_at: '2025-12-07T19:00:00Z' },
  { id: 'demo-dfs-29', user_id: 'demo', placed_at: '2025-12-14T21:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '5-pick Power: Josh Allen O 255.5 pass yds | Mahomes O 280.5 pass yds | Lamar Jackson O 1.5 pass TDs | Purdy O 242.5 pass yds | Lamb O 76.5 rec yds', odds: 1900, stake: 30, result: 'loss', profit: -30, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 5, tags: null, notes: null, upload_id: null, created_at: '2025-12-14T21:00:00Z' },
];

// Part 3: remaining 5-pick (5) + 6-pick (4) entries
const DEMO_DFS_BETS_PART3: Bet[] = [
  // === 5-PICK ENTRIES continued (entries 30-34) ===
  { id: 'demo-dfs-30', user_id: 'demo', placed_at: '2025-12-20T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '5-pick Power: Mahomes O 268.5 pass yds | Lamar Jackson O 64.5 rush yds | Purdy O 238.5 pass yds | Lamb O 79.5 rec yds | Saquon Barkley O 78.5 rush yds', odds: 1900, stake: 35, result: 'loss', profit: -35, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 5, tags: null, notes: null, upload_id: null, created_at: '2025-12-20T13:00:00Z' },
  { id: 'demo-dfs-31', user_id: 'demo', placed_at: '2025-12-29T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '5-pick Power: Mahomes O 276.5 pass yds | Lamar Jackson O 66.5 rush yds | Lamb O 79.5 rec yds | Purdy O 241.5 pass yds | Derrick Henry O 82.5 rush yds', odds: 1900, stake: 30, result: 'loss', profit: -30, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 5, tags: null, notes: null, upload_id: null, created_at: '2025-12-29T13:00:00Z' },
  { id: 'demo-dfs-32', user_id: 'demo', placed_at: '2026-01-07T19:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '5-pick Power: Curry O 26.5 pts | Tatum O 24.5 pts | Jokic O 25.5 pts | Doncic O 27.5 pts | Giannis O 29.5 pts', odds: 1900, stake: 15, result: 'loss', profit: -15, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 5, tags: null, notes: null, upload_id: null, created_at: '2026-01-07T19:00:00Z' },
  { id: 'demo-dfs-33', user_id: 'demo', placed_at: '2026-01-11T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '5-pick Power: Josh Allen O 249.5 pass yds | Mahomes O 274.5 pass yds | Lamar Jackson O 66.5 rush yds | Lamb O 77.5 rec yds | Purdy O 239.5 pass yds', odds: 1900, stake: 10, result: 'win', profit: 190, payout: 200, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 5, tags: null, notes: null, upload_id: null, created_at: '2026-01-11T13:00:00Z' },
  { id: 'demo-dfs-34', user_id: 'demo', placed_at: '2026-01-25T16:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '5-pick Power: Curry O 24.5 pts | Tatum O 26.5 pts | Jokic O 23.5 pts | Brunson O 22.5 pts | Giannis O 30.5 pts', odds: 1900, stake: 30, result: 'loss', profit: -30, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 5, tags: null, notes: null, upload_id: null, created_at: '2026-01-25T16:00:00Z' },

  // === 6-PICK ENTRIES (4 total: 4P + 0F, 0W + 4L) ===
  { id: 'demo-dfs-35', user_id: 'demo', placed_at: '2025-11-29T19:30:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '6-pick Power: Mahomes O 275.5 pass yds | Lamar Jackson O 68.5 rush yds | Lamb O 78.5 rec yds | Purdy O 235.5 pass yds | Saquon Barkley O 80.5 rush yds | Derrick Henry O 85.5 rush yds', odds: 3500, stake: 25, result: 'loss', profit: -25, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 6, tags: null, notes: null, upload_id: null, created_at: '2025-11-29T19:30:00Z' },
  { id: 'demo-dfs-36', user_id: 'demo', placed_at: '2025-12-14T23:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '6-pick Power: Josh Allen O 260.5 pass yds | Mahomes O 278.5 pass yds | Lamar Jackson O 72.5 rush yds | Lamb O 85.5 rec yds | Purdy O 250.5 pass yds | Saquon Barkley O 76.5 rush yds', odds: 3500, stake: 50, result: 'loss', profit: -50, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 6, tags: null, notes: null, upload_id: null, created_at: '2025-12-14T23:00:00Z' },
  { id: 'demo-dfs-37', user_id: 'demo', placed_at: '2025-12-22T19:00:00Z', sport: 'NBA', league: 'NBA', bet_type: 'parlay', description: '6-pick Power: Curry O 27.5 pts | Jokic O 26.5 pts | Tatum O 28.5 pts | Doncic O 29.5 pts | Giannis O 31.5 pts | Brunson O 23.5 pts', odds: 3500, stake: 15, result: 'loss', profit: -15, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 6, tags: null, notes: null, upload_id: null, created_at: '2025-12-22T19:00:00Z' },
  { id: 'demo-dfs-38', user_id: 'demo', placed_at: '2026-01-19T13:00:00Z', sport: 'NFL', league: 'NFL', bet_type: 'parlay', description: '6-pick Power: Mahomes O 277.5 pass yds | Lamar Jackson O 71.5 rush yds | Lamb O 81.5 rec yds | Purdy O 247.5 pass yds | Saquon Barkley O 82.5 rush yds | Derrick Henry O 88.5 rush yds', odds: 3500, stake: 35, result: 'loss', profit: -35, payout: 0, sportsbook: 'PrizePicks', is_bonus_bet: false, parlay_legs: 6, tags: null, notes: null, upload_id: null, created_at: '2026-01-19T13:00:00Z' },
];

export const DEMO_DFS_BETS: Bet[] = [...DEMO_DFS_BETS_PART1, ...DEMO_DFS_BETS_PART2, ...DEMO_DFS_BETS_PART3];

// ── DFS Demo Analysis (PrizePicks) ──

export const DEMO_DFS_ANALYSIS: AutopsyAnalysis = {
  summary: {
    total_bets: 200,
    record: '64-136-0',
    total_profit: -1480,
    roi_percent: -8.2,
    avg_stake: 18,
    date_range: 'Nov 1, 2025 – Jan 31, 2026',
    overall_grade: 'C-',
  },

  emotion_score: 68,
  tilt_score: 68,
  emotion_breakdown: {
    stake_volatility: 14,
    loss_chasing: 24,
    streak_behavior: 20,
    session_discipline: 10,
  },
  tilt_breakdown: {
    stake_volatility: 14,
    loss_chasing: 24,
    streak_behavior: 20,
    session_discipline: 10,
  },

  bankroll_health: 'caution',

  betting_archetype: {
    name: 'The Multiplier Chaser',
    description: 'Bigger payout always calling. Your 2-pick game is actually solid. The 5-6 pick entries are where your bankroll goes to die, and you reach for them more on bets following a loss, not less.',
  },

  dfs_mode: true,
  dfs_platform: 'Prizepicks',

  discipline_score: {
    total: 42,
    tracking: 14,
    sizing: 10,
    control: 8,
    strategy: 10,
    percentile: 32,
  },

  emotion_percentile: 72,

  biases_detected: [
    {
      bias_name: 'High-Pick Reliance',
      severity: 'critical',
      description: '51% of your entries are 5-6 picks. Those hit at under 12%. Your 2-3 pick entries hit at 48%, but those are only 45% of your volume.',
      evidence: '22 entries at 5-6 picks (51%) with -34% ROI vs 17 entries at 2-3 picks with +6% ROI.',
      estimated_cost: 620,
      fix: 'Cap your entries at 3 picks. Your hit rate at 2-3 picks is real. At 5-6 picks, the multiplier is doing the work your research is not.',
    },
    {
      bias_name: 'Multiplier Chasing',
      severity: 'high',
      description: 'Your average pick count jumps from 2.8 on entries following a win to 4.4 on entries following a loss. You are not researching more players, you are buying a bigger lottery ticket.',
      evidence: 'Avg picks following a loss: 4.4 vs following a win: 2.8 (57% increase). 3 of your worst 5 sessions opened with a 2-3 pick loss and stepped up to 5-6 pick entries.',
      estimated_cost: 490,
      fix: 'Pre-commit to a pick count before your session starts. Losing a 2-pick entry is not a signal to go bigger, it is a signal to stop.',
    },
    {
      bias_name: 'Power Play Preference',
      severity: 'high',
      description: 'You default to Power Play 71% of the time. Flex gives you partial payouts on near-misses. Your Flex ROI is positive. Your Power ROI is not.',
      evidence: '27 Power entries (71%) at -12% ROI vs 11 Flex entries at +4% ROI.',
      estimated_cost: 370,
      fix: 'Switch to Flex as your default. Reserve Power for rare max-conviction entries. Flex smooths variance and keeps your bankroll in play longer.',
    },
    {
      bias_name: 'Player Concentration Risk',
      severity: 'medium',
      description: 'Josh Allen appears in 29% of your entries. When he has an off game, multiple entries go down together. You have built correlation into what should be independent picks.',
      evidence: 'Josh Allen in 11 of 38 entries (29%) with -18% ROI. Jalen Hurts second at 18% exposure, -24% ROI.',
      estimated_cost: 180,
      fix: 'No single player in more than 15% of your entries. Forced diversification eliminates correlation risk.',
    },
  ],
  strategic_leaks: [
    {
      category: '5-6 pick entries',
      detail: 'Volume concentrated where hit rate collapses. Over half your entries are 5-6 picks, but they hit at under 12%.',
      roi_impact: -34,
      sample_size: 22,
      suggestion: 'Cap at 3 picks. Your research pays at low pick counts.',
    },
    {
      category: 'Power Plays',
      detail: 'Default format has worse EV than the available alternative. Flex partial payouts absorb variance that Power does not.',
      roi_impact: -12,
      sample_size: 27,
      suggestion: 'Make Flex your default. Reserve Power for max-conviction entries.',
    },
    {
      category: 'Josh Allen entries',
      detail: 'Over-concentrated exposure to single player variance. When Allen has an off game, multiple entries collapse.',
      roi_impact: -18,
      sample_size: 11,
      suggestion: 'Cap single-player exposure at 15% of entries.',
    },
    {
      category: 'Post-loss entries',
      detail: 'Pick count escalates within a losing sequence. A 2-pick loss is followed by a 5-pick entry, not by stopping.',
      roi_impact: -26,
      sample_size: 14,
      suggestion: 'Lock pick count before session starts. Never adjust based on intermediate results.',
    },
  ],
  behavioral_patterns: [
    {
      pattern_name: 'Pick Count Escalation',
      description: 'Pick count escalates through losing sequences, not winning ones. Your average pick count jumps from 2.8 on entries following a win to 4.4 following a loss.',
      frequency: '3 of 5 losing sessions',
      impact: 'negative',
      data_points: 'Avg picks following a loss: 4.4 vs following a win: 2.8. Dec 14 sequence: 2-pick to 4-pick to 5-pick to 6-pick.',
    },
    {
      pattern_name: 'Weekend Heavy',
      description: 'Saturday and Sunday represent 58% of your entries, with lower discipline and higher pick counts than weekday entries.',
      frequency: 'Every week',
      impact: 'negative',
      data_points: '116 weekend entries at -11.4% ROI vs 84 weekday entries at -3.8% ROI.',
    },
    {
      pattern_name: '2-3 Pick Discipline',
      description: 'When you stick to 2-3 picks, your research actually pays. Your hit rate at low pick counts is where your edge lives.',
      frequency: 'Consistent across sample',
      impact: 'positive',
      data_points: '2-3 pick entries: 48% hit rate, +6% ROI. Your best category by far.',
    },
  ],
  recommendations: [
    {
      priority: 1,
      title: 'Cap entries at 3 picks maximum',
      description: 'Your 2-3 pick hit rate at 48% is where your research actually pays. 5-6 pick entries are effectively lottery tickets disguised as analysis.',
      expected_improvement: 'Recover ~$620/quarter',
      difficulty: 'easy',
    },
    {
      priority: 2,
      title: 'Make Flex your default, Power your exception',
      description: 'Flex partial payouts absorb near-miss variance. Reserve Power for max-conviction entries only.',
      expected_improvement: 'Recover ~$370/quarter',
      difficulty: 'easy',
    },
    {
      priority: 3,
      title: 'Lock pick count before each session',
      description: 'Write down your pick count for the night before you log in. Never deviate based on intermediate results.',
      expected_improvement: 'Recover ~$490/quarter',
      difficulty: 'medium',
    },
    {
      priority: 4,
      title: 'No player in more than 15% of entries',
      description: 'Diversification is baked into your pick process, not an afterthought. Rotate star players instead of stacking them.',
      expected_improvement: 'Recover ~$180/quarter',
      difficulty: 'medium',
    },
  ],
  personal_rules: [
    { rule: 'Never build an entry with more than 3 picks', reason: 'Your 4+ pick entries are 3-24. That is a 11% hit rate costing you $640.', based_on: 'Pick count analysis' },
    { rule: 'Default to Flex, not Power', reason: 'Your Power entries have -12% ROI. Flex entries have +4% ROI. The math is clear.', based_on: 'Power vs Flex breakdown' },
    { rule: 'Do not raise pick count within a losing session', reason: 'Your pick count jumps 57% on entries following a loss. That is chasing with extra steps.', based_on: 'Loss sequence analysis' },
    { rule: 'No single player in more than 3 entries per week', reason: 'Josh Allen in 29% of entries at -18% ROI. Concentration is killing you.', based_on: 'Player concentration analysis' },
  ],
  sport_specific_findings: [
    {
      id: 'NBA-PLAYER-CONCENTRATION',
      name: 'NBA player prop overexposure',
      sport: 'NBA',
      severity: 'medium',
      description: 'LeBron James appears in 16% of entries. When he has an off shooting night, multiple entries collapse together.',
      evidence: 'LeBron in 6 of 38 entries (16%). 4 of those 6 were losses. Combined ROI on LeBron entries: +8%, but variance is high.',
      estimated_cost: -120,
      recommendation: 'Spread NBA prop exposure across more players. No single NBA player in more than 10% of entries.',
    },
    {
      id: 'NFL-PICK-STACKING',
      name: 'NFL pick concentration',
      sport: 'NFL',
      severity: 'high',
      description: 'Josh Allen and Jalen Hurts appear together in 18% of your entries. When one has a bad game, the other often does too because you are picking correlated game scripts.',
      evidence: 'Allen + Hurts stacked in 7 entries. Combined ROI on stacked entries: -22%.',
      estimated_cost: -240,
      recommendation: 'Avoid stacking QB props from the same slate. Diversify across positions and games.',
    },
  ],

  session_analysis: {
    total_sessions: 38,
    avg_bets_per_winning_session: 3.2,
    avg_bets_per_losing_session: 5.8,
    worst_session: {
      date: '2025-12-14',
      bets: 4,
      duration: '5 hours',
      net: -110,
      description: 'Classic pick-count escalation. Started with a 2-pick loss, ended with a $50 6-pick Power Play. Four entries in five hours, each one with more picks than the last.',
    },
    best_session: {
      date: '2025-11-02',
      bets: 3,
      duration: '4 hours',
      net: 23.34,
      description: 'Disciplined 2-pick day. Three Flex entries on researched props. No escalation after the first win.',
    },
    insight: 'Your winning sessions average 3.2 entries. Your losing sessions average 5.8. More entries means more picks per entry means more losses. You are at your best when you keep it to 2-3 picks and walk away.',
  },

  edge_profile: {
    profitable_areas: [
      { category: '2-pick entries', roi: 12, sample_size: 7, confidence: 'medium' },
      { category: '3-pick Flex', roi: 8, sample_size: 4, confidence: 'low' },
      { category: 'NFL props (low pick)', roi: 6, sample_size: 18, confidence: 'medium' },
    ],
    unprofitable_areas: [
      { category: '5-pick Power', roi: -38, sample_size: 9, estimated_loss: 280 },
      { category: '6-pick Power', roi: -100, sample_size: 4, estimated_loss: 125 },
      { category: 'Josh Allen entries', roi: -18, sample_size: 11, estimated_loss: 140 },
    ],
    reallocation_advice: 'Shift volume from 5-6 pick Power entries into 2-3 pick Flex entries. Your profitable categories have enough sample size to trust.',
    sharp_score: 35,
  },

  betiq: {
    score: 55,
    components: {
      line_value: 14,
      calibration: 10,
      sophistication: 6,
      specialization: 10,
      timing: 7,
      confidence: 8,
    },
    percentile: 48,
    interpretation: 'Moderate skill at low pick counts. Your 2-3 pick research translates to real edge. At 5-6 picks, skill dissolves into variance.',
    insufficient_data: false,
  },

  enhanced_tilt: {
    score: 68,
    signals: {
      bet_sizing_volatility: 14,
      loss_reaction: 24,
      streak_behavior: 20,
      session_discipline: 10,
      session_acceleration: 16,
      odds_drift_after_loss: 12,
    },
    risk_level: 'elevated',
    worst_trigger: 'Pick count jumps from 2.8 to 4.4 on entries following a loss. You are not adding research, you are adding lottery tickets.',
    percentile: 28,
  },

  session_detection: {
    sessions: [
      { id: 'SESSION-001', date: '2025-11-02', dayOfWeek: 'Sunday', startTime: '1:00 PM', endTime: '5:00 PM', durationMinutes: 240, bets: 3, wins: 2, losses: 1, pushes: 0, staked: 35, profit: 23.34, roi: 66.7, avgStake: 12, startingStake: 10, endingStake: 15, stakeEscalation: 1.5, maxStake: 15, minStake: 10, stakeCv: 0.2, betsPerHour: 0.75, longestLossStreak: 1, chasedAfterLoss: false, chaseCount: 0, lateNight: false, lateNightKnown: true, grade: 'A', gradeReasons: ['Consistent low pick count', 'No escalation within the session'], isHeated: false, heatSignals: [], betIndices: [0, 1, 2] },
      { id: 'SESSION-007', date: '2025-11-16', dayOfWeek: 'Saturday', startTime: '1:00 PM', endTime: '4:30 PM', durationMinutes: 210, bets: 4, wins: 1, losses: 3, pushes: 0, staked: 85, profit: -25, roi: -29.4, avgStake: 21, startingStake: 10, endingStake: 30, stakeEscalation: 3.0, maxStake: 30, minStake: 10, stakeCv: 0.45, betsPerHour: 1.1, longestLossStreak: 2, chasedAfterLoss: false, chaseCount: 0, lateNight: false, lateNightKnown: true, grade: 'C', gradeReasons: ['Moderate stake escalation', 'Mixed pick counts'], isHeated: false, heatSignals: [], betIndices: [38, 39, 40, 41] },
      { id: 'SESSION-012', date: '2025-12-14', dayOfWeek: 'Saturday', startTime: '6:00 PM', endTime: '11:00 PM', durationMinutes: 300, bets: 4, wins: 0, losses: 4, pushes: 0, staked: 110, profit: -110, roi: -100, avgStake: 28, startingStake: 10, endingStake: 50, stakeEscalation: 5.0, maxStake: 50, minStake: 10, stakeCv: 0.68, betsPerHour: 0.8, longestLossStreak: 4, chasedAfterLoss: true, chaseCount: 3, lateNight: true, lateNightKnown: true, grade: 'F', gradeReasons: ['Pick count escalated from 2 to 6', '3 chase entries following losses', 'Stakes increased 5x from start to finish'], isHeated: true, heatSignals: ['Pick count escalated 2 to 4 to 5 to 6 across session', 'Stakes quintupled while chasing losses'], betIndices: [89, 90, 91, 92] },
      { id: 'SESSION-018', date: '2026-01-11', dayOfWeek: 'Sunday', startTime: '1:00 PM', endTime: '3:00 PM', durationMinutes: 120, bets: 2, wins: 1, losses: 1, pushes: 0, staked: 25, profit: 160, roi: 640, avgStake: 13, startingStake: 15, endingStake: 10, stakeEscalation: 0.67, maxStake: 15, minStake: 10, stakeCv: 0.24, betsPerHour: 1.0, longestLossStreak: 1, chasedAfterLoss: false, chaseCount: 0, lateNight: false, lateNightKnown: true, grade: 'B', gradeReasons: ['Controlled pick count', 'No escalation within the session'], isHeated: false, heatSignals: [], betIndices: [155, 156] },
    ],
    totalSessions: 38,
    avgSessionLength: 5.3,
    avgSessionDuration: 148,
    sessionGradeDistribution: [
      { grade: 'A', count: 6, percent: 16 },
      { grade: 'B', count: 8, percent: 21 },
      { grade: 'C', count: 12, percent: 32 },
      { grade: 'D', count: 7, percent: 18 },
      { grade: 'F', count: 5, percent: 13 },
    ],
    heatedSessionCount: 7,
    heatedSessionPercent: 18,
    avgGradedROI: { A: 14.2, B: 4.8, C: -5.6, D: -18.2, F: -42.1 },
    bestSession: { id: 'SESSION-001', date: '2025-11-02', dayOfWeek: 'Sunday', startTime: '1:00 PM', endTime: '5:00 PM', durationMinutes: 240, bets: 3, wins: 2, losses: 1, pushes: 0, staked: 35, profit: 23.34, roi: 66.7, avgStake: 12, startingStake: 10, endingStake: 15, stakeEscalation: 1.5, maxStake: 15, minStake: 10, stakeCv: 0.2, betsPerHour: 0.75, longestLossStreak: 1, chasedAfterLoss: false, chaseCount: 0, lateNight: false, lateNightKnown: true, grade: 'A', gradeReasons: ['Consistent low pick count', 'No escalation within the session'], isHeated: false, heatSignals: [], betIndices: [] },
    worstSession: { id: 'SESSION-012', date: '2025-12-14', dayOfWeek: 'Saturday', startTime: '6:00 PM', endTime: '11:00 PM', durationMinutes: 300, bets: 4, wins: 0, losses: 4, pushes: 0, staked: 110, profit: -110, roi: -100, avgStake: 28, startingStake: 10, endingStake: 50, stakeEscalation: 5.0, maxStake: 50, minStake: 10, stakeCv: 0.68, betsPerHour: 0.8, longestLossStreak: 4, chasedAfterLoss: true, chaseCount: 3, lateNight: true, lateNightKnown: true, grade: 'F', gradeReasons: ['Pick count escalated from 2 to 6', '3 chase entries', 'Stakes 5x'], isHeated: true, heatSignals: ['Pick count escalated while chasing losses'], betIndices: [] },
    insight: 'Your A-graded sessions average +14.2% ROI. Your F sessions average -42.1%. The pattern is clear: low pick count and no escalation pays. Everything else costs you.',
  },

  bet_annotations: {
    annotations: [
      { betIndex: 0, betId: 'demo-dfs-1', classification: 'disciplined', confidence: 84, signals: [{ name: 'flat_pick_count', weight: -5, description: 'Stayed at 2 picks, within disciplined range', category: 'disciplined' }, { name: 'reasonable_pace', weight: -2, description: 'First entry of session, deliberate timing', category: 'disciplined' }], primaryReason: 'Stayed at 2 picks, within disciplined range', sessionId: 'SESSION-001', sessionGrade: 'A', isInHeatedSession: false, stakeVsMedian: 0.7, timeSinceLastBet: null, currentStreak: 0 },
      { betIndex: 2, betId: 'demo-dfs-3', classification: 'disciplined', confidence: 80, signals: [{ name: 'flat_pick_count', weight: -5, description: 'Maintained 2 picks after previous win', category: 'disciplined' }, { name: 'controlled_sizing', weight: -3, description: 'Modest stake increase to $15, within normal range', category: 'disciplined' }], primaryReason: 'Maintained 2 picks after previous win', sessionId: 'SESSION-001', sessionGrade: 'A', isInHeatedSession: false, stakeVsMedian: 1.0, timeSinceLastBet: 120, currentStreak: 2 },
      { betIndex: 8, betId: 'demo-dfs-9', classification: 'disciplined', confidence: 82, signals: [{ name: 'flat_pick_count', weight: -4, description: 'Kept to 3 picks Flex after mixed results', category: 'disciplined' }, { name: 'reasonable_pace', weight: -2, description: 'Spaced entry with research time', category: 'disciplined' }], primaryReason: 'Kept to 3 picks Flex after mixed results', sessionId: 'SESSION-007', sessionGrade: 'C', isInHeatedSession: false, stakeVsMedian: 0.7, timeSinceLastBet: 90, currentStreak: -1 },
      { betIndex: 89, betId: 'demo-dfs-7', classification: 'neutral', confidence: 60, signals: [{ name: 'session_opener', weight: 0, description: 'First entry of session, no prior context', category: 'neutral' }], primaryReason: 'Session opener at 2 picks, reasonable start', sessionId: 'SESSION-012', sessionGrade: 'F', isInHeatedSession: true, stakeVsMedian: 0.7, timeSinceLastBet: null, currentStreak: 0 },
      { betIndex: 90, betId: 'demo-dfs-23', classification: 'chasing', confidence: 88, signals: [{ name: 'pick_count_escalation', weight: 8, description: 'Pick count jumped from 2 to 4 after previous loss', category: 'chasing' }, { name: 'heated_session_context', weight: 3, description: 'Part of a heated session (Grade F)', category: 'emotional' }], primaryReason: 'Pick count jumped from 2 to 4 after previous loss', sessionId: 'SESSION-012', sessionGrade: 'F', isInHeatedSession: true, stakeVsMedian: 1.4, timeSinceLastBet: 90, currentStreak: -1 },
      { betIndex: 91, betId: 'demo-dfs-29', classification: 'chasing', confidence: 92, signals: [{ name: 'pick_count_escalation', weight: 9, description: 'Pick count stepped up from 4 to 5 over the prior losing entry', category: 'chasing' }, { name: 'stake_escalation', weight: 4, description: 'Stake stepped up from $20 to $30 over the prior losing bet', category: 'chasing' }, { name: 'heated_session_context', weight: 3, description: 'Part of a heated session (Grade F)', category: 'emotional' }], primaryReason: 'Pick count stepped up from 4 to 5 over the prior losing entry', sessionId: 'SESSION-012', sessionGrade: 'F', isInHeatedSession: true, stakeVsMedian: 2.1, timeSinceLastBet: 90, currentStreak: -2 },
      { betIndex: 92, betId: 'demo-dfs-36', classification: 'chasing', confidence: 96, signals: [{ name: 'pick_count_escalation', weight: 10, description: 'Pick count jumped from 5 to 6 after previous loss', category: 'chasing' }, { name: 'stake_escalation', weight: 6, description: 'Stake increased from $30 to $50, largest of session', category: 'chasing' }, { name: 'max_pick_count', weight: 4, description: '6-pick Power Play, maximum multiplier chasing', category: 'emotional' }, { name: 'heated_session_context', weight: 3, description: 'Part of a heated session (Grade F)', category: 'emotional' }], primaryReason: 'Pick count jumped from 5 to 6 after previous loss, stake 5x session start', sessionId: 'SESSION-012', sessionGrade: 'F', isInHeatedSession: true, stakeVsMedian: 3.5, timeSinceLastBet: 120, currentStreak: -3 },
      { betIndex: 155, betId: 'demo-dfs-33', classification: 'disciplined', confidence: 78, signals: [{ name: 'controlled_sizing', weight: -4, description: 'Minimum stake $10 on a 5-pick entry', category: 'disciplined' }, { name: 'recovery_discipline', weight: -3, description: 'Did not escalate after prior session losses', category: 'disciplined' }], primaryReason: 'Minimum stake on higher pick count, showing restraint', sessionId: 'SESSION-018', sessionGrade: 'B', isInHeatedSession: false, stakeVsMedian: 0.7, timeSinceLastBet: 60, currentStreak: -1 },
    ],
    distribution: {
      disciplined: { count: 90, percent: 45, totalStaked: 1620, totalProfit: 220, roi: 13.6 },
      neutral: { count: 42, percent: 21, totalStaked: 756, totalProfit: -40, roi: -5.3 },
      emotional: { count: 36, percent: 18, totalStaked: 900, totalProfit: -480, roi: -53.3 },
      chasing: { count: 22, percent: 11, totalStaked: 660, totalProfit: -520, roi: -78.8 },
      impulsive: { count: 10, percent: 5, totalStaked: 200, totalProfit: -160, roi: -80.0 },
    },
    emotionalCost: 280,
    worstAnnotatedBet: { betIndex: 92, betId: 'demo-dfs-36', classification: 'chasing', confidence: 96, signals: [{ name: 'pick_count_escalation', weight: 10, description: 'Pick count jumped from 5 to 6 after previous loss', category: 'chasing' }], primaryReason: 'Pick count jumped from 5 to 6 after previous loss, stake 5x session start', sessionId: 'SESSION-012', sessionGrade: 'F', isInHeatedSession: true, stakeVsMedian: 3.5, timeSinceLastBet: 120, currentStreak: -3 },
    bestAnnotatedBet: { betIndex: 0, betId: 'demo-dfs-1', classification: 'disciplined', confidence: 84, signals: [{ name: 'flat_pick_count', weight: -5, description: 'Stayed at 2 picks, within disciplined range', category: 'disciplined' }], primaryReason: 'Stayed at 2 picks, within disciplined range', sessionId: 'SESSION-001', sessionGrade: 'A', isInHeatedSession: false, stakeVsMedian: 0.7, timeSinceLastBet: null, currentStreak: 0 },
    streakInfluence: {
      avgStakeAfterWinStreak3: 12,
      avgStakeAfterLossStreak3: 32,
      avgStakeNeutral: 15,
    },
    insight: '34% of your entries show emotional or chasing behavior, costing an estimated $280 in lost edge. Your disciplined entries return +13.6% ROI vs -60%+ on chasing entries.',
  },

  dfs_metrics: {
    pickCountDistribution: [
      { picks: 2, count: 7, winRate: 57, roi: 12, profit: 28 },
      { picks: 3, count: 10, winRate: 30, roi: 2, profit: 8 },
      { picks: 4, count: 8, winRate: 12, roi: -28, profit: -85 },
      { picks: 5, count: 9, winRate: 11, roi: -38, profit: -125 },
      { picks: 6, count: 4, winRate: 0, roi: -100, profit: -200 },
    ],
    powerVsFlex: {
      powerCount: 27, powerROI: -12, powerProfit: -580,
      flexCount: 11, flexROI: 4, flexProfit: 60,
    },
    playerConcentration: [
      { player: 'Josh Allen', count: 11, percent: 29, roi: -18 },
      { player: 'Jalen Hurts', count: 7, percent: 18, roi: -24 },
      { player: 'LeBron James', count: 6, percent: 16, roi: 8 },
    ],
    avgPickCount: 3.8,
    lowPickROI: 6.0,
    highPickROI: -34.0,
    pickCountAfterLoss: 4.4,
    pickCountAfterWin: 2.8,
  },
};

// DEMO_ANALYSIS already carries a real control_system - it's part of
// runAutopsy's own output (lib/autopsy-engine.ts), unlike the DFS fixture
// below which predates that field and still needs it attached here.
DEMO_DFS_ANALYSIS.control_system = buildReportControlSystem(DEMO_DFS_ANALYSIS);

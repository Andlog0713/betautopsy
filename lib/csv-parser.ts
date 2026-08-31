import type { ParsedBet, CSVParseResult, HierarchicalCollapseCounts } from '@/types';
import { parseSourcedTimestamp } from '@/lib/temporal-provenance';

export type CSVParseResultWithDiagnostics = CSVParseResult & {
  rows_in_file: number;
  rows_skipped: number;
};

// ── Column name mappings ──
// Order matters: exact matches are tried first, then substring.
// For each canonical field, list preferred aliases first.

const COLUMN_ALIASES: Record<string, string[]> = {
  date: ['time_placed_iso', 'time_placed', 'date', 'placed', 'placed_at', 'date_placed', 'time', 'created', 'timestamp'],
  sport: ['sports', 'sport', 'category'],
  bet_type: ['bet_type', 'type', 'wager_type', 'market'],
  description: ['bet_info', 'description', 'selection', 'selection_name', 'pick', 'event', 'match'],
  odds: ['odds', 'price', 'line', 'american_odds', 'dec_odds', 'decimal_odds'],
  stake: ['stake', 'amount', 'wager', 'risk', 'bet_amount', 'stake_amount'],
  result: ['result', 'outcome', 'status', 'settlement', 'settled'],
  profit: ['profit', 'net', 'pl', 'p_l', 'gain_loss', 'pnl', 'net_profit'],
  payout: ['payout', 'return', 'returns', 'total_return'],
  sportsbook: ['sportsbook', 'book', 'operator', 'platform', 'bookie'],
  league: ['leagues', 'league'],
  leg_number: ['leg_number', 'leg_num', 'legnum', 'leg_no', 'leg_index'],
  row_id: ['bet_id', 'wager_id', 'ticket_id', 'transaction_id'],
  parent_id: ['parent_bet_id', 'parent_id', 'parent_wager_id', 'parentbetid'],
  row_type: ['row_type', 'rowtype', 'record_type', 'entry_type'],
};

// Headers that should NEVER match certain fields (explicit exclusions)
const FIELD_EXCLUDES: Record<string, string[]> = {
  description: ['bet_id'],
  sport: ['sportsbook', 'book', 'operator', 'platform', 'bookie'],
};

// ── Result normalization ──

const RESULT_MAP: Record<string, ParsedBet['result']> = {
  win: 'win', won: 'win', w: 'win', '1': 'win', hit: 'win', winner: 'win',
  settled_win: 'win', settledwin: 'win',
  loss: 'loss', lost: 'loss', l: 'loss', '0': 'loss', miss: 'loss', loser: 'loss',
  settled_loss: 'loss', settledloss: 'loss',
  push: 'push', draw: 'push', tie: 'push',
  settled_push: 'push', settledpush: 'push',
  void: 'void', voided: 'void', cancelled: 'void', canceled: 'void',
  settled_void: 'void', settledvoid: 'void',
  pending: 'pending', open: 'pending', unsettled: 'pending',
};

// Cash-outs are NOT in RESULT_MAP above (Stage 8) - unlike a genuine
// void/push, which by definition always nets $0 (stake returned), a
// cash-out settles for whatever the sportsbook's live offer was: a real
// win, loss, or breakeven. Lumping it into 'void' silently forced its
// profit to $0 regardless of the CSV's own profit/net column value.
// Detected separately below and reclassified by the row's actual
// settlement value instead.
const CASH_OUT_RESULT_STRINGS = new Set([
  'cashed_out', 'cashedout', 'cashout', 'cashed out', 'cash_out',
]);

// ── League to sport mapping (for Pikkit "sports" + "leagues" columns) ──

const LEAGUE_SPORT_MAP: Record<string, string> = {
  nba: 'NBA', wnba: 'NBA',
  nfl: 'NFL',
  mlb: 'MLB',
  nhl: 'NHL',
  ncaam: 'NCAAB', ncaab: 'NCAAB', ncaaw: 'NCAAB',
  ncaaf: 'NCAAF',
  mls: 'Soccer', epl: 'Soccer', 'premier league': 'Soccer', 'la liga': 'Soccer',
  'serie a': 'Soccer', bundesliga: 'Soccer', 'ligue 1': 'Soccer',
  'champions league': 'Soccer',
  ufc: 'MMA', bellator: 'MMA', pfl: 'MMA',
  atp: 'Tennis', wta: 'Tennis',
};

// ── Pikkit sport name mapping ──

const PIKKIT_SPORT_MAP: Record<string, string> = {
  basketball: 'NBA',
  football: 'NFL',
  baseball: 'MLB',
  hockey: 'NHL',
  soccer: 'Soccer',
  tennis: 'Tennis',
  mma: 'MMA',
  'mixed martial arts': 'MMA',
  // Direct acronym matches (for non-Pikkit CSVs that use abbreviations)
  nba: 'NBA', wnba: 'NBA',
  nfl: 'NFL',
  mlb: 'MLB',
  nhl: 'NHL',
  ncaab: 'NCAAB', ncaam: 'NCAAB', ncaaw: 'NCAAB',
  ncaaf: 'NCAAF',
  ufc: 'MMA',
};

// ── Main parser ──

const EMPTY_COLLAPSE_COUNTS: HierarchicalCollapseCounts = {
  rowsIn: 0, betsOut: 0, legsCollapsed: 0, cashOutsDropped: 0, unclassifiedChildren: 0,
};

export function parseCSV(raw: string): CSVParseResultWithDiagnostics {
  const errors: string[] = [];
  const warnings: string[] = [];

  const lines = parseCSVLines(raw);
  if (lines.length < 2) {
    return {
      bets: [],
      errors: ['File is empty or has no data rows'],
      warnings,
      column_mapping: {},
      collapse: EMPTY_COLLAPSE_COUNTS,
      rows_in_file: 0,
      rows_skipped: 0,
    };
  }

  const rowsInFile = lines.length - 1;

  // Map headers
  const headers = lines[0].map((h) => h.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_'));
  const columnMapping = mapColumns(headers);

  const missingRequired = ['description', 'odds', 'stake'].filter(
    (field) => !columnMapping[field]
  );
  if (missingRequired.length > 0) {
    if (!columnMapping['stake']) {
      errors.push(`Could not find required column: stake. Found columns: ${headers.join(', ')}`);
      return {
        bets: [],
        errors,
        warnings,
        column_mapping: columnMapping,
        collapse: EMPTY_COLLAPSE_COUNTS,
        rows_in_file: rowsInFile,
        rows_skipped: rowsInFile,
      };
    }
  }

  const bets: ParsedBet[] = [];
  const rowMetas: RowGroupMeta[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (row.length === 0 || (row.length === 1 && row[0].trim() === '')) continue;

    try {
      const bet = parseRow(row, headers, columnMapping, i + 1, warnings);
      if (bet) {
        bets.push(bet);
        rowMetas.push({
          lineNum: i + 1,
          rowId: getField(row, headers, columnMapping, 'row_id'),
          parentId: getField(row, headers, columnMapping, 'parent_id'),
          legNumber: getField(row, headers, columnMapping, 'leg_number'),
          rowType: getField(row, headers, columnMapping, 'row_type'),
        });
      }
    } catch (e) {
      errors.push(`Row ${i + 1}: ${e instanceof Error ? e.message : 'Parse error'}`);
    }
  }

  const { bets: collapsedBets, counts } = collapseHierarchicalRows(bets, rowMetas, warnings);

  return {
    bets: collapsedBets,
    errors,
    warnings,
    column_mapping: columnMapping,
    collapse: counts,
    rows_in_file: rowsInFile,
    rows_skipped: rowsInFile - bets.length,
  };
}

// ── Hierarchical row collapse (multi-row wagers: parlay legs, cash-out duplicates) ──
//
// Some real sportsbook exports represent ONE logical wager as MULTIPLE CSV
// rows: a parent BET row, LEG rows for each leg of a parlay, and/or a
// CASH_OUT row duplicating the parent's settlement when a bet was cashed
// out early. Left alone, every row above ingests as an independent bet.
//
// Detection is structural, not tied to any sportsbook's exact column
// names: a row is a child of another row if its own `parent_id` value
// matches the `row_id` of a row that is itself parentless (row_id
// populated, parent_id empty). Real exports sometimes reuse the parent's
// own row_id as a shared "wager group" key on every child row too (rather
// than minting a unique ID per leg) — matching only against parentless
// rows, instead of any row carrying that ID, resolves that correctly.
//
// If no row in the file exhibits this pattern, the whole pass is a no-op
// and every row passes through exactly as parseRow() produced it — this
// is the zero-regression guarantee for every currently-supported flat
// CSV format (Pikkit, plain DraftKings/FanDuel exports, etc.).

interface RowGroupMeta {
  lineNum: number;
  rowId: string;
  parentId: string;
  legNumber: string;
  rowType: string;
}

function collapseHierarchicalRows(
  bets: ParsedBet[],
  metas: RowGroupMeta[],
  warnings: string[]
): { bets: ParsedBet[]; counts: HierarchicalCollapseCounts } {
  const rowsIn = bets.length;

  const parentIndexById = new Map<string, number>();
  metas.forEach((m, i) => {
    if (m.rowId && !m.parentId) parentIndexById.set(m.rowId, i);
  });

  const childIndices = new Set<number>();
  metas.forEach((m, i) => {
    if (m.parentId && parentIndexById.has(m.parentId)) childIndices.add(i);
  });

  if (childIndices.size === 0) {
    return {
      bets,
      counts: { rowsIn, betsOut: rowsIn, legsCollapsed: 0, cashOutsDropped: 0, unclassifiedChildren: 0 },
    };
  }

  const childrenByParent = new Map<number, number[]>();
  childIndices.forEach((childIdx) => {
    const parentIdx = parentIndexById.get(metas[childIdx].parentId)!;
    if (!childrenByParent.has(parentIdx)) childrenByParent.set(parentIdx, []);
    childrenByParent.get(parentIdx)!.push(childIdx);
  });

  let legsCollapsed = 0;
  let cashOutsDropped = 0;
  let unclassifiedChildren = 0;
  const result: ParsedBet[] = [];

  bets.forEach((bet, i) => {
    if (childIndices.has(i)) return; // folded into its parent below, never emitted on its own

    const children = childrenByParent.get(i) ?? [];
    if (children.length === 0) {
      result.push(bet);
      return;
    }

    const parent = { ...bet };
    const legDescriptions: string[] = [];
    const legSports = new Set<string>();

    for (const childIdx of children) {
      const child = bets[childIdx];
      const meta = metas[childIdx];
      const isCashOutChild = child.settlement_type === 'cash_out';
      const looksLikeLeg = meta.legNumber !== '' || /leg/i.test(meta.rowType) || /leg/i.test(child.bet_type);

      if (isCashOutChild) {
        if (parent.result === 'pending') {
          // Parent carries no settlement of its own — the cash-out row is
          // the only source of truth available, so fill the gap. Never
          // overwrites a parent that already has a real result.
          parent.result = child.result;
          parent.profit = child.profit;
          parent.payout = child.payout;
          if (!parent.settlement_type) parent.settlement_type = 'cash_out';
          warnings.push(`Row ${meta.lineNum}: CASH_OUT child row folded into parent's settlement (parent had no result of its own).`);
        } else {
          warnings.push(`Row ${meta.lineNum}: CASH_OUT child row dropped as a duplicate of its parent's already-settled result.`);
        }
        cashOutsDropped++;
      } else if (looksLikeLeg) {
        legDescriptions.push(child.description);
        legSports.add(child.sport);
        warnings.push(`Row ${meta.lineNum}: leg row collapsed into parent bet.`);
        legsCollapsed++;
      } else {
        // Detected as a child (parent_id resolves to a real parent row)
        // but matches neither known sub-type. Unknown is a valid value:
        // fold it in as a leg (the safer of the two — it never
        // contributes profit on its own) rather than guess, and warn so
        // it's visible rather than silently absorbed.
        legDescriptions.push(child.description);
        legSports.add(child.sport);
        warnings.push(`Row ${meta.lineNum}: child row of unrecognized sub-type, folded into parent bet as a leg.`);
        unclassifiedChildren++;
      }
    }

    if (legDescriptions.length > 0) {
      parent.description = [parent.description, ...legDescriptions].join(' | ');
      parent.bet_type = 'parlay';
      parent.parlay_legs = legDescriptions.length;
      // Decision: an explicit "Multi-Sport" label when the parent's own
      // sport matches NONE of its legs' — anything else keeps the
      // parent's own label. A parent tagged NHL on a parlay whose legs
      // are all NCAAB/NFL isn't imprecise, it's wrong.
      if (legSports.size > 0 && !legSports.has(parent.sport)) {
        parent.sport = 'Multi-Sport';
      }
    }

    result.push(parent);
  });

  return {
    bets: result,
    counts: { rowsIn, betsOut: result.length, legsCollapsed, cashOutsDropped, unclassifiedChildren },
  };
}

// ── CSV line parser (handles quoted fields) ──

function parseCSVLines(raw: string): string[][] {
  const lines: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    const next = raw[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++; // skip escaped quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        current.push(field.trim());
        field = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        current.push(field.trim());
        field = '';
        if (current.some((c) => c !== '')) lines.push(current);
        current = [];
        if (ch === '\r') i++; // skip \n after \r
      } else {
        field += ch;
      }
    }
  }

  // Last field/line
  current.push(field.trim());
  if (current.some((c) => c !== '')) lines.push(current);

  return lines;
}

// ── Column mapping (exact match first, then substring, with exclusions) ──

function mapColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const claimed = new Set<number>(); // track which header indices are already claimed

  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    const excludes = FIELD_EXCLUDES[canonical] ?? [];

    // Pass 1: exact match
    let found = false;
    for (const alias of aliases) {
      const idx = headers.findIndex((h, i) =>
        !claimed.has(i) && h === alias && !excludes.some((ex) => h === ex)
      );
      if (idx !== -1) {
        mapping[canonical] = headers[idx];
        claimed.add(idx);
        found = true;
        break;
      }
    }

    // Pass 2: substring match (only if no exact match found)
    if (!found) {
      for (const alias of aliases) {
        const idx = headers.findIndex((h, i) =>
          !claimed.has(i) && h.includes(alias) && !excludes.some((ex) => h.includes(ex))
        );
        if (idx !== -1) {
          mapping[canonical] = headers[idx];
          claimed.add(idx);
          break;
        }
      }
    }
  }

  return mapping;
}

function getField(row: string[], headers: string[], mapping: Record<string, string>, field: string): string {
  const header = mapping[field];
  if (!header) return '';
  const idx = headers.indexOf(header);
  return idx >= 0 && idx < row.length ? row[idx].trim() : '';
}

// ── Row parser ──

function parseRow(
  row: string[],
  headers: string[],
  mapping: Record<string, string>,
  lineNum: number,
  warnings: string[]
): ParsedBet | null {
  const get = (field: string) => getField(row, headers, mapping, field);

  const description = get('description');
  const stakeStr = get('stake');
  const oddsStr = get('odds');
  const isStructuralChild = get('parent_id') !== '';
  const isLegRow = get('leg_number') !== '';

  if (!description) {
    warnings.push(`Row ${lineNum}: Missing description, skipped`);
    return null;
  }

  if (!stakeStr) {
    warnings.push(`Row ${lineNum}: Missing stake, skipped`);
    return null;
  }

  const stake = parseFloat(stakeStr.replace(/[$,]/g, ''));
  if (isNaN(stake) || stake <= 0) {
    warnings.push(`Row ${lineNum}: Invalid stake "${stakeStr}", skipped`);
    return null;
  }

  // Odds are a required analytical input. Zero is not valid American odds,
  // and silently using it poisons implied-probability and what-if math.
  let odds: number;
  if (!oddsStr && isStructuralChild) {
    // Structural children never survive as standalone analytical bets. Their
    // odds do not affect the parent's settlement or report calculations.
    odds = 0;
  } else {
    if (!oddsStr) {
      warnings.push(`Row ${lineNum}: Missing odds, skipped`);
      return null;
    }
    odds = parseOdds(oddsStr);
    if (odds === 0) {
      warnings.push(`Row ${lineNum}: Could not parse odds "${oddsStr}", skipped`);
      return null;
    }
  }

  // Parse result — strip "SETTLED_" prefix for Pikkit format
  const rawResult = get('result');
  const rawResultLower = rawResult.toLowerCase().trim();
  const strippedResultStr = rawResultLower.replace(/^settled[_\s]*/i, '');
  const isCashOut = CASH_OUT_RESULT_STRINGS.has(rawResultLower) || CASH_OUT_RESULT_STRINGS.has(strippedResultStr);

  if (!rawResult) {
    warnings.push(`Row ${lineNum}: Missing result, skipped`);
    return null;
  }

  let result: ParsedBet['result'];
  const settlementType: 'cash_out' | undefined = isCashOut ? 'cash_out' : undefined;
  if (isCashOut) {
    // Reclassified by the explicitly reported settlement value below.
    // This initial value is never emitted for a logical cash-out row.
    result = 'pending';
  } else {
    const normalizedResult = RESULT_MAP[rawResultLower] ?? RESULT_MAP[strippedResultStr];
    if (!normalizedResult) {
      warnings.push(`Row ${lineNum}: Unknown result "${rawResult}", skipped`);
      return null;
    }
    result = normalizedResult;
  }

  // Parse date
  const dateStr = get('date');
  if (!dateStr) {
    warnings.push(`Row ${lineNum}: Missing date, skipped`);
    return null;
  }
  const parsedTimestamp = parseSourcedTimestamp(dateStr);
  if (!parsedTimestamp.value) {
    warnings.push(`Row ${lineNum}: ${parsedTimestamp.error}, skipped`);
    return null;
  }
  const temporal = parsedTimestamp.value;

  // Profit must come from the export. Child leg rows are the sole exception:
  // they never survive the hierarchy collapse and their individual net is not
  // part of the parent wager's settlement math.
  const profitStr = get('profit');
  let profit: number;
  if (!profitStr) {
    if (isStructuralChild && isLegRow) {
      profit = 0;
    } else {
      warnings.push(`Row ${lineNum}: Missing profit, skipped`);
      return null;
    }
  } else {
    profit = parseFloat(profitStr.replace(/[$,]/g, ''));
    if (!Number.isFinite(profit)) {
      warnings.push(`Row ${lineNum}: Could not parse profit "${profitStr}", skipped`);
      return null;
    }
  }

  if (isCashOut) {
    result = profit > 0 ? 'win' : profit < 0 ? 'loss' : 'push';
  } else if ((result === 'push' || result === 'void') && profit !== 0) {
    warnings.push(`Row ${lineNum}: ${result} result has nonzero profit "${profitStr}", skipped`);
    return null;
  }

  if (result === 'win' && profit < 0) {
    warnings.push(`Row ${lineNum}: win result has negative profit "${profitStr}", skipped`);
    return null;
  }
  if (result === 'loss' && profit > 0) {
    warnings.push(`Row ${lineNum}: loss result has positive profit "${profitStr}", skipped`);
    return null;
  }

  const payoutStr = get('payout');
  let payout: number;
  if (payoutStr) {
    payout = parseFloat(payoutStr.replace(/[$,]/g, ''));
    if (!Number.isFinite(payout) || payout < 0) {
      warnings.push(`Row ${lineNum}: Could not parse payout "${payoutStr}", skipped`);
      return null;
    }
  } else if (result === 'pending' && isStructuralChild) {
    // Structural child values are discarded by hierarchy collapse. Keeping a
    // neutral placeholder here preserves the parent relationship without
    // emitting that placeholder as an analytical bet.
    payout = 0;
  } else if (result === 'pending') {
    warnings.push(`Row ${lineNum}: Missing payout for pending bet, skipped`);
    return null;
  } else if (isCashOut) {
    payout = stake + profit;
    if (!Number.isFinite(payout) || payout < 0) {
      warnings.push(`Row ${lineNum}: Cash-out settlement produces an invalid payout, skipped`);
      return null;
    }
  } else {
    payout = result === 'win'
      ? stake + profit
      : result === 'push' || result === 'void'
        ? stake
        : 0;
  }

  // Detect sport — use sports column + leagues column for Pikkit
  let sport = '';
  const rawSport = get('sport');
  const rawLeague = get('league');

  if (rawLeague) {
    // Try league-based mapping first (most accurate for Pikkit)
    const leagueParts = rawLeague.split(/[|,]/).map((s) => s.trim().toLowerCase());
    for (const lp of leagueParts) {
      const mapped = LEAGUE_SPORT_MAP[lp];
      if (mapped) { sport = mapped; break; }
    }
  }

  if (!sport && rawSport) {
    // Parse Pikkit "sports" column: "Basketball", "other | Basketball"
    const sportParts = rawSport.split(/[|,]/).map((s) => s.trim().toLowerCase());
    const meaningful = sportParts.find((s) => s !== 'other' && s !== '') ?? sportParts[0] ?? '';
    const mapped = PIKKIT_SPORT_MAP[meaningful];
    if (mapped) {
      sport = mapped;
    } else if (meaningful) {
      // Short all-letter strings are likely acronyms (e.g. "nhl" → "NHL")
      sport = /^[a-z]{2,6}$/.test(meaningful)
        ? meaningful.toUpperCase()
        : meaningful.charAt(0).toUpperCase() + meaningful.slice(1);
    }
  }

  if (!sport) {
    warnings.push(`Row ${lineNum}: Missing or unrecognized sport, skipped`);
    return null;
  }

  // Bet type is a required source category. Do not infer one from prose.
  let betType = get('bet_type');
  if (betType) betType = betType.toLowerCase().trim();
  if (!betType) {
    warnings.push(`Row ${lineNum}: Missing bet type, skipped`);
    return null;
  }

  // Detect bonus bets
  const allText = row.join(' ').toLowerCase();
  const isBonusBet = /bonus|free\s*bet|promo|risk[\s-]*free/i.test(allText);

  // Detect parlay legs
  let parlayLegs: number | undefined;

  if (betType === 'parlay' && description) {
    // Count legs by splitting on " | " (Pikkit format: "Leg 1 | Leg 2 | Leg 3")
    const legs = description.split(' | ');
    if (legs.length > 1) {
      parlayLegs = legs.length;
    }
  }

  if (!parlayLegs) {
    const legMatch = description.match(/(\d+)[\s-]*leg/i);
    if (legMatch) {
      parlayLegs = parseInt(legMatch[1]);
      if (betType === 'other') betType = 'parlay';
    } else if (betType === 'parlay') {
      // For Pikkit: count " | " segments in bet_info
      const segments = description.split(' | ');
      parlayLegs = segments.length > 1 ? segments.length : 2;
    }
  }

  return {
    ...temporal,
    sport,
    bet_type: betType,
    description,
    odds,
    stake,
    result,
    payout,
    profit,
    sportsbook: get('sportsbook') || undefined,
    league: rawLeague || undefined,
    is_bonus_bet: isBonusBet,
    parlay_legs: parlayLegs,
    settlement_type: settlementType,
  };
}

// ── Odds parsing (handles American and decimal) ──

function parseOdds(str: string): number {
  const cleaned = str.replace(/[^0-9.+\-]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;

  // If it looks like decimal odds (1.01 to ~100.0 without +/-)
  if (!str.includes('+') && !str.includes('-') && num > 0 && num < 100) {
    return decimalToAmerican(num);
  }

  // Already American
  return Math.round(num);
}

function decimalToAmerican(decimal: number): number {
  if (decimal >= 2.0) {
    return Math.round((decimal - 1) * 100);
  } else if (decimal > 1.0) {
    return Math.round(-100 / (decimal - 1));
  }
  return 0;
}

// ── CSV Template ──

export function generateCSVTemplate(): string {
  return `date,sport,bet_type,description,odds,stake,result,profit,sportsbook
2025-01-05T12:00:00Z,NFL,spread,Chiefs -3.5,-110,100,win,91,DraftKings
2025-01-05T12:05:00Z,NFL,spread,Bills +7,-110,100,loss,-100,FanDuel
2025-01-06T12:00:00Z,NBA,prop,Jokic Over 25.5 pts,+100,50,loss,-50,BetMGM
2025-01-06T12:05:00Z,NBA,moneyline,Celtics ML,-150,150,win,100,DraftKings
2025-01-07T12:00:00Z,NBA,parlay,3-leg: Lakers ML + Over 220 + Lebron 25+,+550,25,loss,-25,FanDuel
2025-01-08T12:00:00Z,NFL,moneyline,Ravens ML,-200,200,win,100,Caesars
2025-01-08T12:05:00Z,NBA,prop,Curry Over 28.5 pts,-110,110,loss,-110,DraftKings
2025-01-09T12:00:00Z,NBA,spread,Knicks -4.5,-110,150,loss,-150,BetMGM
2025-01-09T12:05:00Z,NBA,spread,Celtics -6,-110,200,loss,-200,FanDuel
2025-01-10T12:00:00Z,NBA,parlay,4-leg parlay,+1200,50,loss,-50,DraftKings
2025-01-10T12:05:00Z,NBA,moneyline,Thunder ML,-180,180,win,100,FanDuel
2025-01-11T12:00:00Z,NFL,spread,Eagles -3,-110,100,win,91,Caesars
2025-01-11T12:05:00Z,NBA,prop,Tatum Over 27.5 pts,+105,75,win,79,BetMGM
2025-01-12T12:00:00Z,NBA,parlay,3-leg parlay,+450,40,loss,-40,DraftKings
2025-01-12T12:05:00Z,NBA,spread,Bucks -5.5,-110,100,loss,-100,FanDuel`;
}

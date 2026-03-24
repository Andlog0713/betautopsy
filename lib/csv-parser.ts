import type { ParsedBet, CSVParseResult } from '@/types';

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
  profit: ['profit', 'net', 'pl', 'p_l', 'gain_loss', 'pnl', 'net_profit', 'returns'],
  sportsbook: ['sportsbook', 'book', 'operator', 'platform', 'bookie'],
  league: ['leagues', 'league'],
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
  cashed_out: 'void', cashedout: 'void', cashout: 'void', 'cashed out': 'void',
  pending: 'pending', open: 'pending', unsettled: 'pending',
};

// ── Sport detection from descriptions ──

const SPORT_KEYWORDS: Record<string, string[]> = {
  NFL: ['chiefs', 'eagles', 'bills', 'ravens', 'lions', 'niners', '49ers', 'cowboys', 'packers',
        'dolphins', 'jets', 'patriots', 'steelers', 'bengals', 'browns', 'titans', 'colts',
        'jaguars', 'texans', 'broncos', 'raiders', 'chargers', 'seahawks', 'rams', 'cardinals',
        'falcons', 'saints', 'buccaneers', 'bucs', 'panthers', 'vikings', 'bears', 'commanders',
        'giants', 'nfl', 'touchdown', 'passing yards', 'rushing yards'],
  NBA: ['lakers', 'celtics', 'knicks', 'warriors', 'bucks', 'nets', 'heat', 'suns', 'nuggets',
        'thunder', 'clippers', 'mavericks', 'mavs', '76ers', 'sixers', 'cavaliers', 'cavs',
        'grizzlies', 'pelicans', 'kings', 'timberwolves', 'wolves', 'raptors', 'bulls', 'hawks',
        'hornets', 'magic', 'pacers', 'pistons', 'blazers', 'rockets', 'spurs', 'jazz', 'wizards',
        'nba', 'jokic', 'lebron', 'curry', 'tatum', 'points', 'rebounds', 'assists'],
  MLB: ['yankees', 'dodgers', 'astros', 'braves', 'mets', 'phillies', 'padres', 'cubs',
        'red sox', 'guardians', 'orioles', 'rangers', 'twins', 'rays', 'mariners', 'brewers',
        'cardinals', 'marlins', 'pirates', 'reds', 'royals', 'tigers', 'angels', 'athletics',
        'rockies', 'diamondbacks', 'nationals', 'white sox', 'mlb', 'runs', 'strikeouts', 'innings'],
  NHL: ['bruins', 'maple leafs', 'oilers', 'avalanche', 'panthers', 'hurricanes', 'rangers',
        'devils', 'stars', 'wild', 'jets', 'lightning', 'penguins', 'capitals', 'flames',
        'canucks', 'senators', 'islanders', 'kraken', 'predators', 'red wings', 'blues',
        'sabres', 'coyotes', 'ducks', 'sharks', 'blackhawks', 'blue jackets', 'kings',
        'nhl', 'goals', 'saves', 'hockey'],
  NCAAF: ['ncaaf', 'college football', 'cfb', 'bowl game', 'playoff'],
  NCAAB: ['ncaab', 'ncaam', 'ncaaw', 'college basketball', 'cbb', 'march madness'],
  Soccer: ['soccer', 'premier league', 'la liga', 'bundesliga', 'serie a', 'ligue 1',
           'champions league', 'mls', 'epl', 'arsenal', 'manchester', 'liverpool', 'chelsea',
           'barcelona', 'real madrid', 'clean sheet', 'nil'],
  Tennis: ['tennis', 'nadal', 'djokovic', 'federer', 'alcaraz', 'sinner', 'atp', 'wta',
           'grand slam', 'wimbledon', 'us open', 'australian open', 'french open', 'sets'],
  MMA: ['mma', 'ufc', 'fight', 'ko', 'tko', 'submission', 'decision', 'round'],
};

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
};

// ── Bet type detection ──

const BET_TYPE_PATTERNS: [RegExp, string][] = [
  [/parlay|accumulator|combo|multi|(\d+[\s-]?leg)/i, 'parlay'],
  [/spread|pts?|handicap|\+\d+\.5|\-\d+\.5/i, 'spread'],
  [/over|under|total|o\/u|ou\b/i, 'total'],
  [/moneyline|money\s*line|\bml\b|to\s*win\b|match\s*winner/i, 'moneyline'],
  [/prop|player|first\s*(td|goal|basket)|anytime|assists|rebounds|yards|strikeout/i, 'prop'],
  [/futures?|outright|championship|mvp|win\s*total/i, 'futures'],
  [/live|in[\s-]?play|in[\s-]?game/i, 'live'],
];

// ── Main parser ──

export function parseCSV(raw: string): CSVParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const lines = parseCSVLines(raw);
  if (lines.length < 2) {
    return { bets: [], errors: ['File is empty or has no data rows'], warnings, column_mapping: {} };
  }

  // Map headers
  const headers = lines[0].map((h) => h.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_'));
  const columnMapping = mapColumns(headers);

  const missingRequired = ['description', 'odds', 'stake'].filter(
    (field) => !columnMapping[field]
  );
  if (missingRequired.length > 0) {
    if (!columnMapping['stake']) {
      errors.push(`Could not find required column: stake. Found columns: ${headers.join(', ')}`);
      return { bets: [], errors, warnings, column_mapping: columnMapping };
    }
  }

  const bets: ParsedBet[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (row.length === 0 || (row.length === 1 && row[0].trim() === '')) continue;

    try {
      const bet = parseRow(row, headers, columnMapping, i + 1, warnings);
      if (bet) bets.push(bet);
    } catch (e) {
      errors.push(`Row ${i + 1}: ${e instanceof Error ? e.message : 'Parse error'}`);
    }
  }

  return { bets, errors, warnings, column_mapping: columnMapping };
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

  if (!stakeStr) {
    warnings.push(`Row ${lineNum}: Missing stake, skipped`);
    return null;
  }

  const stake = parseFloat(stakeStr.replace(/[$,]/g, ''));
  if (isNaN(stake) || stake <= 0) {
    warnings.push(`Row ${lineNum}: Invalid stake "${stakeStr}", skipped`);
    return null;
  }

  // Parse odds
  let odds = 0;
  if (oddsStr) {
    odds = parseOdds(oddsStr);
    if (odds === 0) {
      warnings.push(`Row ${lineNum}: Could not parse odds "${oddsStr}", using 0`);
    }
  }

  // Parse result — strip "SETTLED_" prefix for Pikkit format
  const rawResult = get('result');
  let resultStr = rawResult.toLowerCase().trim();
  // Try direct match first (e.g. "cashed_out", "cancelled")
  let result = RESULT_MAP[resultStr];
  if (!result) {
    // Strip "SETTLED_" prefix and try again
    resultStr = resultStr.replace(/^settled[_\s]*/i, '');
    result = RESULT_MAP[resultStr] ?? 'pending';
  }
  if (rawResult && !RESULT_MAP[rawResult.toLowerCase().trim()] && !RESULT_MAP[resultStr]) {
    warnings.push(`Row ${lineNum}: Unknown result "${rawResult}", defaulting to pending`);
  }

  // Parse date
  const dateStr = get('date');
  let placedAt: string;
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(d.getTime())) throw new Error('Invalid date');
    placedAt = d.toISOString();
  } catch {
    placedAt = new Date().toISOString();
    if (dateStr) warnings.push(`Row ${lineNum}: Could not parse date "${dateStr}", using today`);
  }

  // Parse profit or calculate it
  let profit = 0;
  const profitStr = get('profit');
  if (profitStr) {
    profit = parseFloat(profitStr.replace(/[$,]/g, ''));
    if (isNaN(profit)) profit = 0;
  }
  if (!profitStr || profit === 0) {
    profit = calculateProfit(odds, stake, result);
  }

  // Push and void ALWAYS have $0 profit — override any CSV value
  if (result === 'push' || result === 'void') {
    profit = 0;
  }

  const payout = result === 'win' ? stake + Math.abs(profit) : (result === 'push' || result === 'void') ? stake : 0;

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
      // Capitalize first letter
      sport = meaningful.charAt(0).toUpperCase() + meaningful.slice(1);
    }
  }

  if (!sport && description) {
    sport = detectSport(description);
  }
  sport = sport || 'Other';

  // Detect bet type
  let betType = get('bet_type');
  if (betType) betType = betType.toLowerCase().trim();
  if (!betType && description) {
    betType = detectBetType(description);
  }
  betType = betType || 'other';

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
    placed_at: placedAt,
    sport,
    bet_type: betType,
    description: description || `Bet on row ${lineNum}`,
    odds,
    stake,
    result,
    payout,
    profit,
    sportsbook: get('sportsbook') || undefined,
    is_bonus_bet: isBonusBet,
    parlay_legs: parlayLegs,
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

// ── Profit calculation ──

function calculateProfit(odds: number, stake: number, result: string): number {
  if (result === 'win') {
    if (odds > 0) return stake * (odds / 100);
    if (odds < 0) return stake * (100 / Math.abs(odds));
    return 0;
  }
  if (result === 'loss') return -stake;
  return 0; // push, void, pending
}

// ── Sport detection ──

function detectSport(description: string): string {
  const lower = description.toLowerCase();
  for (const [sport, keywords] of Object.entries(SPORT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        return sport;
      }
    }
  }
  return '';
}

// ── Bet type detection ──

function detectBetType(description: string): string {
  for (const [pattern, type] of BET_TYPE_PATTERNS) {
    if (pattern.test(description)) return type;
  }
  return '';
}

// ── CSV Template ──

export function generateCSVTemplate(): string {
  return `date,sport,bet_type,description,odds,stake,result,profit,sportsbook
2025-01-05,NFL,spread,Chiefs -3.5,-110,100,win,91,DraftKings
2025-01-05,NFL,spread,Bills +7,-110,100,loss,-100,FanDuel
2025-01-06,NBA,prop,Jokic Over 25.5 pts,+100,50,loss,-50,BetMGM
2025-01-06,NBA,moneyline,Celtics ML,-150,150,win,100,DraftKings
2025-01-07,NBA,parlay,3-leg: Lakers ML + Over 220 + Lebron 25+,+550,25,loss,-25,FanDuel
2025-01-08,NFL,moneyline,Ravens ML,-200,200,win,100,Caesars
2025-01-08,NBA,prop,Curry Over 28.5 pts,-110,110,loss,-110,DraftKings
2025-01-09,NBA,spread,Knicks -4.5,-110,150,loss,-150,BetMGM
2025-01-09,NBA,spread,Celtics -6,-110,200,loss,-200,FanDuel
2025-01-10,NBA,parlay,4-leg parlay,+1200,50,loss,-50,DraftKings
2025-01-10,NBA,moneyline,Thunder ML,-180,180,win,100,FanDuel
2025-01-11,NFL,spread,Eagles -3,-110,100,win,91,Caesars
2025-01-11,NBA,prop,Tatum Over 27.5 pts,+105,75,win,79,BetMGM
2025-01-12,NBA,parlay,3-leg parlay,+450,40,loss,-40,DraftKings
2025-01-12,NBA,spread,Bucks -5.5,-110,100,loss,-100,FanDuel`;
}

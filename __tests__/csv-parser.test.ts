import { describe, it, expect } from 'vitest';
import { parseCSV, generateCSVTemplate } from '@/lib/csv-parser';

// ── Helper ──

function csv(lines: string[]): string {
  return lines.join('\n');
}

// ============================================
// Basic parsing
// ============================================

describe('parseCSV — basic', () => {
  it('parses a simple CSV with standard headers', () => {
    const input = csv([
      'date,sport,bet_type,description,odds,stake,result,profit',
      '2025-01-05,NFL,spread,Chiefs -3.5,-110,100,win,91',
    ]);
    const { bets, errors } = parseCSV(input);
    expect(errors).toHaveLength(0);
    expect(bets).toHaveLength(1);
    expect(bets[0].sport).toBe('Nfl');
    expect(bets[0].bet_type).toBe('spread');
    expect(bets[0].description).toBe('Chiefs -3.5');
    expect(bets[0].odds).toBe(-110);
    expect(bets[0].stake).toBe(100);
    expect(bets[0].result).toBe('win');
    expect(bets[0].profit).toBe(91);
  });

  it('returns error for empty input', () => {
    const { bets, errors } = parseCSV('');
    expect(bets).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns error for header-only input', () => {
    const { bets, errors } = parseCSV('date,sport,description,odds,stake,result');
    expect(bets).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('skips empty rows', () => {
    const input = csv([
      'date,description,odds,stake,result',
      '2025-01-05,Chiefs -3.5,-110,100,win',
      '',
      '',
      '2025-01-06,Bills +7,-110,100,loss',
    ]);
    const { bets } = parseCSV(input);
    expect(bets).toHaveLength(2);
  });

  it('parses multiple rows', () => {
    const input = csv([
      'date,description,odds,stake,result',
      '2025-01-05,Chiefs -3.5,-110,100,win',
      '2025-01-06,Bills +7,-110,100,loss',
      '2025-01-07,Jokic Over 25.5,+100,50,win',
    ]);
    const { bets, errors } = parseCSV(input);
    expect(errors).toHaveLength(0);
    expect(bets).toHaveLength(3);
  });
});

// ============================================
// Quoted fields / CSV edge cases
// ============================================

describe('parseCSV — quoted fields', () => {
  it('handles quoted fields with commas', () => {
    const input = csv([
      'date,description,odds,stake,result',
      '2025-01-05,"Chiefs -3.5, 1st Half",-110,100,win',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].description).toBe('Chiefs -3.5, 1st Half');
  });

  it('handles escaped quotes inside quoted fields', () => {
    const input = csv([
      'date,description,odds,stake,result',
      '2025-01-05,"Chiefs ""to win""",-110,100,win',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].description).toBe('Chiefs "to win"');
  });

  it('handles CRLF line endings', () => {
    const input = 'date,description,odds,stake,result\r\n2025-01-05,Chiefs,-110,100,win\r\n2025-01-06,Bills,-110,50,loss\r\n';
    const { bets } = parseCSV(input);
    expect(bets).toHaveLength(2);
  });
});

// ============================================
// Column mapping
// ============================================

describe('parseCSV — column aliases', () => {
  it('maps Pikkit-style headers (time_placed, bet_info, etc.)', () => {
    const input = csv([
      'time_placed,sports,bet_type,bet_info,odds,stake,result,profit',
      '2025-03-10,Basketball,spread,Celtics -6,-110,100,win,91',
    ]);
    const { bets, errors, column_mapping } = parseCSV(input);
    expect(errors).toHaveLength(0);
    expect(bets).toHaveLength(1);
    expect(column_mapping.date).toBe('time_placed');
    expect(column_mapping.description).toBe('bet_info');
  });

  it('maps DraftKings-style headers (wager, amount, outcome)', () => {
    const input = csv([
      'date,event,odds,amount,outcome,net',
      '2025-01-05,Chiefs -3.5,-110,100,Won,91',
    ]);
    const { bets, column_mapping } = parseCSV(input);
    expect(bets).toHaveLength(1);
    expect(column_mapping.description).toBe('event');
    expect(column_mapping.stake).toBe('amount');
    expect(column_mapping.result).toBe('outcome');
    expect(column_mapping.profit).toBe('net');
  });

  it('requires stake column', () => {
    const input = csv([
      'date,description,odds,result',
      '2025-01-05,Chiefs -3.5,-110,win',
    ]);
    const { bets, errors } = parseCSV(input);
    expect(bets).toHaveLength(0);
    expect(errors.some((e) => e.includes('stake'))).toBe(true);
  });
});

// ============================================
// Odds parsing
// ============================================

describe('parseCSV — odds', () => {
  it('parses positive American odds', () => {
    const input = csv([
      'description,odds,stake,result',
      'Test,+150,100,win',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].odds).toBe(150);
  });

  it('parses negative American odds', () => {
    const input = csv([
      'description,odds,stake,result',
      'Test,-200,100,win',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].odds).toBe(-200);
  });

  it('converts decimal odds to American', () => {
    const input = csv([
      'description,odds,stake,result',
      'Test,2.50,100,win',
    ]);
    const { bets } = parseCSV(input);
    // 2.50 decimal = +150 American
    expect(bets[0].odds).toBe(150);
  });

  it('converts decimal odds < 2.0 to negative American', () => {
    const input = csv([
      'description,odds,stake,result',
      'Test,1.50,100,win',
    ]);
    const { bets } = parseCSV(input);
    // 1.50 decimal = -200 American
    expect(bets[0].odds).toBe(-200);
  });

  it('handles missing odds gracefully', () => {
    const input = csv([
      'description,stake,result',
      'Test,100,win',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].odds).toBe(0);
  });
});

// ============================================
// Result normalization
// ============================================

describe('parseCSV — results', () => {
  it.each([
    ['win', 'win'], ['won', 'win'], ['Won', 'win'], ['W', 'win'],
    ['loss', 'loss'], ['lost', 'loss'], ['Lost', 'loss'], ['L', 'loss'],
    ['push', 'push'], ['draw', 'push'], ['tie', 'push'],
    ['void', 'void'], ['voided', 'void'], ['cancelled', 'void'], ['cashed_out', 'void'],
    ['pending', 'pending'], ['open', 'pending'], ['unsettled', 'pending'],
  ])('normalizes "%s" to "%s"', (input, expected) => {
    const csv_input = csv([
      'description,odds,stake,result',
      `Test,-110,100,${input}`,
    ]);
    const { bets } = parseCSV(csv_input);
    expect(bets[0].result).toBe(expected);
  });

  it('handles Pikkit "SETTLED_WIN" prefix', () => {
    const input = csv([
      'description,odds,stake,result',
      'Test,-110,100,SETTLED_WIN',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].result).toBe('win');
  });

  it('handles Pikkit "settled_loss" prefix', () => {
    const input = csv([
      'description,odds,stake,result',
      'Test,-110,100,settled_loss',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].result).toBe('loss');
  });

  it('defaults unknown result to pending with warning', () => {
    const input = csv([
      'description,odds,stake,result',
      'Test,-110,100,UNKNOWN_STATUS',
    ]);
    const { bets, warnings } = parseCSV(input);
    expect(bets[0].result).toBe('pending');
    expect(warnings.some((w) => w.includes('Unknown result'))).toBe(true);
  });
});

// ============================================
// Profit calculation
// ============================================

describe('parseCSV — profit', () => {
  it('uses profit from CSV when provided', () => {
    const input = csv([
      'description,odds,stake,result,profit',
      'Test,-110,100,win,91',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].profit).toBe(91);
  });

  it('calculates profit for wins with negative odds', () => {
    const input = csv([
      'description,odds,stake,result',
      'Test,-200,200,win',
    ]);
    const { bets } = parseCSV(input);
    // -200 odds: profit = 200 * (100/200) = 100
    expect(bets[0].profit).toBe(100);
  });

  it('calculates profit for wins with positive odds', () => {
    const input = csv([
      'description,odds,stake,result',
      'Test,+150,100,win',
    ]);
    const { bets } = parseCSV(input);
    // +150 odds: profit = 100 * (150/100) = 150
    expect(bets[0].profit).toBe(150);
  });

  it('calculates loss as negative stake', () => {
    const input = csv([
      'description,odds,stake,result',
      'Test,-110,100,loss',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].profit).toBe(-100);
  });

  it('push and void always have $0 profit', () => {
    const input = csv([
      'description,odds,stake,result,profit',
      'Test,-110,100,push,50',
      'Test,-110,100,void,50',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].profit).toBe(0);
    expect(bets[1].profit).toBe(0);
  });
});

// ============================================
// Sport detection
// ============================================

describe('parseCSV — sport detection', () => {
  it('detects sport from description when no sport column', () => {
    const input = csv([
      'description,odds,stake,result',
      'Chiefs -3.5,-110,100,win',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].sport).toBe('NFL');
  });

  it('detects NBA from description', () => {
    const input = csv([
      'description,odds,stake,result',
      'Jokic Over 25.5 pts,+100,50,win',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].sport).toBe('NBA');
  });

  it('uses sport column when provided (capitalizes first letter)', () => {
    const input = csv([
      'description,sport,odds,stake,result',
      'Some game,MLB,-110,100,win',
    ]);
    const { bets } = parseCSV(input);
    // Parser lowercases then capitalizes first letter for non-Pikkit sports
    expect(bets[0].sport).toBe('Mlb');
  });

  it('maps Pikkit sport names (Basketball → NBA)', () => {
    const input = csv([
      'description,sports,odds,stake,result',
      'Some game,Basketball,-110,100,win',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].sport).toBe('NBA');
  });

  it('maps league column to sport (Pikkit)', () => {
    const input = csv([
      'description,sports,leagues,odds,stake,result',
      'Some game,other,nfl,-110,100,win',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].sport).toBe('NFL');
  });

  it('defaults to Other when sport unknown', () => {
    const input = csv([
      'description,odds,stake,result',
      'Random event XYZ,-110,100,win',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].sport).toBe('Other');
  });
});

// ============================================
// Bet type detection
// ============================================

describe('parseCSV — bet type detection', () => {
  it('detects spread', () => {
    const input = csv([
      'description,odds,stake,result',
      'Chiefs -3.5,-110,100,win',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].bet_type).toBe('spread');
  });

  it('detects moneyline', () => {
    const input = csv([
      'description,odds,stake,result',
      'Chiefs Moneyline,-150,100,win',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].bet_type).toBe('moneyline');
  });

  it('detects total/over-under', () => {
    const input = csv([
      'description,odds,stake,result',
      'Over 45.5 total points,-110,100,win',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].bet_type).toBe('total');
  });

  it('detects prop from player-specific description', () => {
    const input = csv([
      'description,odds,stake,result',
      'Jokic anytime scorer,-110,100,win',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].bet_type).toBe('prop');
  });

  it('detects parlay', () => {
    const input = csv([
      'description,odds,stake,result',
      '3-leg parlay,+550,25,loss',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].bet_type).toBe('parlay');
    expect(bets[0].parlay_legs).toBe(3);
  });

  it('uses bet_type column when provided', () => {
    const input = csv([
      'description,bet_type,odds,stake,result',
      'Some game,futures,-110,100,win',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].bet_type).toBe('futures');
  });
});

// ============================================
// Bonus bet detection
// ============================================

describe('parseCSV — bonus bets', () => {
  it('detects bonus bet from row content', () => {
    const input = csv([
      'description,odds,stake,result,notes',
      'Chiefs -3.5 (Bonus Bet),-110,100,win,',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].is_bonus_bet).toBe(true);
  });

  it('detects free bet', () => {
    const input = csv([
      'description,odds,stake,result,notes',
      'Chiefs -3.5,-110,100,win,Free Bet promo',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].is_bonus_bet).toBe(true);
  });

  it('non-bonus bet is false', () => {
    const input = csv([
      'description,odds,stake,result',
      'Chiefs -3.5,-110,100,win',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].is_bonus_bet).toBe(false);
  });
});

// ============================================
// Stake validation
// ============================================

describe('parseCSV — stake validation', () => {
  it('strips dollar sign from stake', () => {
    const input = csv([
      'description,odds,stake,result',
      'Test,-110,$100,win',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].stake).toBe(100);
  });

  it('strips comma from stake', () => {
    const input = csv([
      'description,odds,stake,result',
      'Test,-110,"1,000",win',
    ]);
    const { bets } = parseCSV(input);
    expect(bets[0].stake).toBe(1000);
  });

  it('skips row with missing stake', () => {
    const input = csv([
      'description,odds,stake,result',
      'Test,-110,,win',
    ]);
    const { bets, warnings } = parseCSV(input);
    expect(bets).toHaveLength(0);
    expect(warnings.some((w) => w.includes('Missing stake'))).toBe(true);
  });

  it('skips row with zero stake', () => {
    const input = csv([
      'description,odds,stake,result',
      'Test,-110,0,win',
    ]);
    const { bets, warnings } = parseCSV(input);
    expect(bets).toHaveLength(0);
    expect(warnings.some((w) => w.includes('Invalid stake'))).toBe(true);
  });
});

// ============================================
// Template
// ============================================

describe('generateCSVTemplate', () => {
  it('generates a valid template that parses without errors', () => {
    const template = generateCSVTemplate();
    const { bets, errors } = parseCSV(template);
    expect(errors).toHaveLength(0);
    expect(bets.length).toBeGreaterThan(5);
  });
});

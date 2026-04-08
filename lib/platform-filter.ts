// Sportsbook + DFS + prediction market names for filtering from behavioral analysis
// Keep in sync with PLATFORM_NAMES in autopsy-engine.ts

const PLATFORM_NAMES = [
  'draftkings', 'fanduel', 'betmgm', 'caesars', 'pointsbet', 'hard rock',
  'espn bet', 'bet365', 'barstool', 'wynn', 'betrivers', 'unibet', 'bally',
  'superbook', 'circa', 'pinnacle', 'bovada', 'betonline', 'mybookie',
  'prizepicks', 'prize picks', 'underdog', 'underdog fantasy', 'sleeper',
  'dabble', 'kalshi', 'polymarket', 'predictit', 'thrive', 'betr picks',
  'vivid picks', 'boom fantasy', 'parlayplay', 'pick6', 'fanatics',
];

export function isPlatformCategory(category: string): boolean {
  return PLATFORM_NAMES.some(p => category.toLowerCase().includes(p));
}

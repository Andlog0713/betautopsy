import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Approximate-dollar display for LLM-estimated costs (report-trust). Rounds
// the magnitude to 2 significant figures and prefixes "~" so estimates never
// read as exact accounting figures: 7862 -> "~$7,900", 43163 -> "~$43,000".
export function formatApproxUSD(value: number): string {
  const abs = Math.abs(value);
  if (abs === 0) return '~$0';
  const magnitude = Math.pow(10, Math.floor(Math.log10(abs)) - 1);
  const rounded = Math.round(abs / magnitude) * magnitude;
  return `~$${Math.round(rounded).toLocaleString()}`;
}

export function sanitizeForPrompt(input: string, maxLength: number = 500): string {
  return input
    .slice(0, maxLength)
    .replace(/[<>{}]/g, '')
    .replace(/\n/g, ' ')
    .trim();
}

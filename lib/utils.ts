import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function sanitizeForPrompt(input: string, maxLength: number = 500): string {
  return input
    .slice(0, maxLength)
    .replace(/[<>{}]/g, '')
    .replace(/\n/g, ' ')
    .trim();
}

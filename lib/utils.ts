export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export function sanitizeForPrompt(input: string, maxLength: number = 500): string {
  return input
    .slice(0, maxLength)
    .replace(/[<>{}]/g, '')
    .replace(/\n/g, ' ')
    .trim();
}

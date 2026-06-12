import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Report-trust word cap: archetype descriptions must stay <= 40 words.
 * Archetypes are deterministic constants in determineArchetype /
 * determineDFSArchetype (never LLM-generated), so the cap is enforced as a
 * source lint over those two function bodies rather than a prompt rule.
 */
describe('archetype description word caps', () => {
  it('every archetype description constant is <= 40 words', () => {
    const source = readFileSync(join(process.cwd(), 'lib/autopsy-engine.ts'), 'utf8');

    const start = source.indexOf('function determineArchetype');
    const end = source.indexOf('// ── Discipline Score Calculator');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = source.slice(start, end);

    // description: "..." | '...' | `...`
    const matches = [...body.matchAll(/description:\s*(['"`])((?:\\.|(?!\1).)*)\1/g)];
    expect(matches.length).toBeGreaterThanOrEqual(10); // both functions covered

    for (const m of matches) {
      const text = m[2]
        .replace(/\$\{[^}]+\}/g, 'X') // template placeholder ~ one word
        .replace(/\\(['"`])/g, '$1');
      const words = text.trim().split(/\s+/).filter(Boolean);
      expect(
        words.length,
        `archetype description over 40 words: "${text.slice(0, 60)}..."`,
      ).toBeLessThanOrEqual(40);
    }
  });
});

#!/usr/bin/env node
/**
 * Warning-level design-system lint.
 *
 * Greps `app/` and `components/` for tokens that violate the
 * BetAutopsy forensic spec — off-palette Tailwind colors, soft
 * shadows / glass blur, oversized rounded corners, gradients.
 * Each match is printed as a GitHub Actions `::warning::`
 * annotation so the offending file/line is surfaced in the PR
 * checks UI without failing the build.
 *
 * The script intentionally exits 0 today. A follow-up branch — once
 * the sweep PR clears the existing 51 off-palette color usages and
 * ~41 oversized-radius hits surfaced in `MOBILE_AUDIT.md` — flips
 * `STRICT` to true so new violations break CI.
 *
 * Run locally:    node scripts/check-design-system.mjs
 * Or via npm:     npm run check:design
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const TARGETS = ['app', 'components'];
const STRICT = false; // flip to true after the color sweep lands

const PATTERNS = [
  {
    name: 'off-palette-color',
    // Off-palette Tailwind color families. Design system tokens are
    // bleed/scalpel/win/loss/caution/fg/bg/tier — anything else slips
    // back into shadcn defaults.
    re: /\b(?:text|bg|border|ring|fill|stroke|from|to|via|decoration|outline|divide|placeholder|caret|accent)-(amber|orange|cyan|purple|pink|fuchsia|emerald|sky|rose|indigo|violet|lime|yellow|teal|blue)-\d{2,3}\b/g,
  },
  {
    name: 'backdrop-blur',
    re: /\bbackdrop-blur(?:-(?:none|sm|md|lg|xl|2xl|3xl))?\b/g,
  },
  {
    name: 'oversized-radius',
    re: /\brounded(?:-[a-z]+)?-(2xl|3xl)\b/g,
  },
  {
    name: 'gradient-bg',
    re: /\bbg-gradient-to-[trbl]{1,2}\b/g,
  },
  {
    name: 'soft-shadow',
    re: /\bshadow-(sm|md|lg|xl|2xl|inner)\b/g,
  },
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) yield* walk(full);
    else if (/\.(tsx?|jsx?|css|mdx?)$/.test(name)) yield full;
  }
}

let total = 0;
const byPattern = Object.fromEntries(PATTERNS.map((p) => [p.name, 0]));
const isCI = !!process.env.GITHUB_ACTIONS;

for (const target of TARGETS) {
  for (const file of walk(join(ROOT, target))) {
    const rel = relative(ROOT, file);
    const lines = readFileSync(file, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      for (const { name, re } of PATTERNS) {
        re.lastIndex = 0;
        const matches = [...lines[i].matchAll(re)];
        for (const m of matches) {
          total += 1;
          byPattern[name] += 1;
          const lineNum = i + 1;
          const token = m[0];
          if (isCI) {
            console.log(
              `::warning file=${rel},line=${lineNum},title=design-system::${name} '${token}'`
            );
          } else {
            console.log(`${rel}:${lineNum}\t${name}\t${token}`);
          }
        }
      }
    }
  }
}

console.log('');
console.log(`design-system check — ${total} violation(s)`);
for (const [name, count] of Object.entries(byPattern)) {
  if (count > 0) console.log(`  ${name.padEnd(20)} ${count}`);
}
console.log(STRICT ? '\nstrict mode: failing build' : '\nwarning mode: not failing build');

process.exit(STRICT && total > 0 ? 1 : 0);

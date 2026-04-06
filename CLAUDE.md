# CLAUDE.md — BetAutopsy

## Project
Next.js 14 App Router, TypeScript, Tailwind CSS, deployed on Vercel.
Sports betting behavioral analysis SaaS.

## Commands
- npm run dev — dev server
- npm run build — production build (ALWAYS run after changes)
- npm run lint — ESLint

## Code Style
- Tailwind CSS for ALL styling, no CSS modules
- "use client" required for any component using motion, hooks, or browser APIs
- Mobile-first responsive: base → sm: → md: → lg:
- Never mix Tailwind transition-* classes with motion animations
- Conventional commits: feat: / fix: / refactor:

## Design Tokens (current brand)
- Scalpel teal: #00C9A7
- Loss red: #E8453C
- Caution amber: #D29922
- Win green: #3FB950
- Body font: Inter
- Mono font: JetBrains Mono
- Dark background: use existing gray/slate tones already in codebase

## Rules
- Always run npm run build after making changes
- Commit after each completed feature
- If build fails, fix errors before moving on

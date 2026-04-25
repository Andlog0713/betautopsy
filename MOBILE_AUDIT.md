# Mobile design-system audit

This file is the worklist for the next sweep branch. The Tailwind
config lockdown (`tailwind.config.js`) closes the door on new
violations; `scripts/check-design-system.mjs` flags existing ones as
GitHub Actions warnings. Once every row below has a confident
mapping (or a deliberate decision to add a new token), the sweep
branch can land and `STRICT = true` in the lint script.

**Counts (2026-04-25)**

| category          | count |
|-------------------|------:|
| off-palette-color |    41 |
| gradient-bg       |     7 |
| soft-shadow       |     3 |
| backdrop-blur     |     3 |
| oversized-radius  |     1 |
| **total**         |  **55** |

## Triage instructions

- Rows are grouped by **semantic intent**, not by raw color. The
  same `text-orange-400` may map to `bleed-dim` in one place and
  to a brand-new token in another.
- "Proposed mapping" is either an existing design token or
  `NEW TOKEN NEEDED` — a flag for human design judgment, not a
  guess. Existing tokens live in `tailwind.config.js`:
  - `scalpel` (`#00C9A7`) — brand teal, "evidence highlight"
  - `bleed` (`#C4463A`) — severity red, "loss / high-severity"
  - `caution` (`#C9A04E`) — amber, "medium-severity / warning"
  - `win` (`#00C9A7`) — semantic alias of scalpel
  - `loss` (`#C4463A`) — semantic alias of bleed
  - `fg`, `tier`, `surface`, `border-subtle` — neutrals
- **`INTENT UNCLEAR`** rows need human review before the sweep —
  do not guess a mapping.

## Off-palette color violations

### Group A — "streak / engagement" (Flame icon, orange-400)

Used as a warm, positive engagement indicator on the streak counter.
Distinct from severity: a streak is good, but visually orange to read
as "fire / momentum." No existing token expresses this. **Decision
required**: introduce a `streak` (or `flame`) token, OR fold into
`caution`, OR drop the orange and keep just the icon shape.

| file:line | token | severity |
|---|---|---|
| `app/(dashboard)/DashboardShell.tsx:139` | `text-orange-400` (Flame icon, header streak) | high |
| `app/(dashboard)/DashboardShell.tsx:363` | `text-orange-400` (Flame icon, mobile drawer streak) | high |
| `app/(dashboard)/dashboard/page.tsx:235` | `text-orange-400` (Discipline Streak achievement icon) | high |
| `app/(dashboard)/dashboard/page.tsx:290` | `text-orange-400` (achievement icon) | high |
| `app/(dashboard)/dashboard/page.tsx:319` | `text-orange-400` (achievement icon) | high |
| `app/(dashboard)/dashboard/page.tsx:570` | `text-orange-400` (Flame, streak ≥3) | high |
| `app/(dashboard)/dashboard/page.tsx:571` | `text-orange-400` (Flame, streak ≥10) | high |
| `components/NavBar.tsx:111` | `text-orange-400` (Flame icon, profile dropdown) | high |
| `components/JournalEntryModal.tsx:171` | `text-orange-400` (Flame, "Chasing a loss" toggle) | high |

Proposed: **NEW TOKEN NEEDED** (`flame` or `streak`). The "Chasing a
loss" usage in JournalEntryModal may belong to a different bucket —
that's a negative emotional state, not a positive streak. Decide
per-row.

### Group B — "D grade severity" (orange-400)

D is between C (caution) and F (loss). The current code skips a
shade and uses a Tailwind default.

| file:line | token | severity |
|---|---|---|
| `app/(dashboard)/dashboard/page.tsx:53` | `text-orange-400` (grade D) | high |
| `app/share/[id]/SharedReport.tsx:27` | `text-orange-400` (grade D) | high |

Proposed: **NEW TOKEN NEEDED** — a `bleed-warn` between `caution`
and `loss`. Or compress D → loss, accept the visual collapse.

### Group C — "high-severity bias / warning" (orange-400)

| file:line | token | severity |
|---|---|---|
| `app/(dashboard)/admin/reports/page.tsx:38` | `text-orange-400` (admin row severity) | high |
| `app/(dashboard)/reports/page.tsx:833` | `bg-orange-400/10 text-orange-400 border-orange-400/20` (high-severity bias chip) | high |
| `app/quiz/QuizClient.tsx:461` | `text-orange-400` (emotion 56-75 band) | high |
| `app/quiz/QuizClient.tsx:462` | `bg-orange-400/10` (emotion bar fill 56-75) | high |
| `app/share/[id]/SharedReport.tsx:?` | `text-orange-400` (likely severity, verify in context) | high |

Proposed: same as Group B — a `bleed-warn` token, OR fold into
`caution` and accept that "medium-high" collapses into "medium."

### Group D — "DFS mode" (purple-400/500/600)

DFS (daily fantasy sports) is a distinct feature vertical. Purple
was picked to differentiate it from the sports-betting palette
(scalpel teal / bleed red). Replacing this with an existing token
would erase the visual distinction the feature relies on.

| file:line | token | severity |
|---|---|---|
| `components/AutopsyReport.tsx:745` | `text-purple-400` (DFS report header tag) | medium |
| `components/AutopsyReport.tsx:827` | `border-purple-500/20 bg-purple-500/5` (mixed-data warning card) | medium |
| `components/AutopsyReport.tsx:840` | `bg-purple-500 text-purple-400` (mixed-data toggle) | medium |
| `components/AutopsyReport.tsx:854-855` | `text-purple-400` (mixed-data labels) | medium |
| `components/AutopsyReport.tsx:2028` | `bg-purple-500/10 text-purple-400` (DFS performance badge) | medium |
| `components/SampleModeToggle.tsx:28` | `bg-purple-600` (DFS sample-mode pill) | medium |

Proposed: **NEW TOKEN NEEDED** (`dfs`). One token, three opacity
ramps (5%, 10%, full), to mirror how `scalpel`/`bleed` are used.

### Group E — "snowflake / streak freeze" (cyan-400)

Used on the Snowflake icon for streak freezes. Cool/ice palette is a
deliberate complement to the orange Flame — blue evokes ice. Don't
collapse into scalpel; that erases the metaphor.

| file:line | token | severity |
|---|---|---|
| `app/(dashboard)/dashboard/page.tsx:577` | `text-cyan-400` (Snowflake icon) | medium |
| `app/(dashboard)/settings/page.tsx:236` | `text-cyan-400` (Snowflake icon, settings) | medium |
| `app/(dashboard)/uploads/page.tsx:236` | `text-cyan-400` (verify — likely snowflake or sharp score) | medium |

Proposed: **NEW TOKEN NEEDED** (`freeze` or `frost`). Pairs with
the proposed `flame` token from Group A.

### Group F — "sharp score / data highlight" (cyan-400, cyan-500)

| file:line | token | severity |
|---|---|---|
| `app/page.tsx:205` | `bg-cyan-500` (verify intent — landing page) | INTENT UNCLEAR |
| `app/share/[id]/SharedReport.tsx:114` | `text-cyan-400` (Sharp Score value) | medium |
| `app/share/[id]/SharedReport.tsx:117` | `bg-cyan-400` (verify) | INTENT UNCLEAR |
| `components/report/ChapterNav.tsx:82` | `text-cyan-400/60 hover:text-cyan-400` (active chapter nav) | medium |

Proposed: ChapterNav active state and Sharp Score map to `scalpel`
(the brand teal is the "evidence highlight" token). The two
landing-page / SharedReport background usages need human review.

### Group G — "feature request / bonus bet" (amber-400/500)

| file:line | token | severity |
|---|---|---|
| `app/(dashboard)/admin/feedback/FeedbackStream.tsx:24` | `bg-amber-400/10 text-amber-400 border-amber-400/20` (feature_request feedback chip) | low |
| `app/(dashboard)/admin/reports/page.tsx:37` | `text-amber-400` (admin row, verify) | low |
| `app/(dashboard)/bets/page.tsx:414` | `bg-amber-500/10 text-caution` (Bonus bet pill — bg uses amber, text already uses `caution`) | low |

Proposed: all three map to `caution` (`#C9A04E` — already amber-ish).
The `bets/page.tsx:414` row is closest to mechanical: the text is
already `caution`; just swap the bg.

## Soft-shadow violations

| file:line | token | proposed |
|---|---|---|
| `components/AutopsyReport.tsx:245` | `shadow-lg` | drop entirely (forensic spec is flat) |
| `components/SampleModeToggle.tsx:18` | `shadow-sm` | drop |
| `components/SampleModeToggle.tsx:28` | `shadow-sm` | drop |

## Backdrop-blur violations

| file:line | token | proposed |
|---|---|---|
| `app/(dashboard)/DashboardShell.tsx:150` | `backdrop-blur-sm` | replace with `bg-tier-1/95` |
| `components/NavBar.tsx:70` | `backdrop-blur-xl` | replace with `bg-tier-1/95` |
| `components/report/ChapterNav.tsx:52` | `backdrop-blur-xl` | replace with `bg-tier-0/95` |

## Gradient-bg violations

| file:line | token | proposed |
|---|---|---|
| `app/page.tsx:152` | `bg-gradient-to-r` | INTENT UNCLEAR (landing page hero — may be intentional brand moment) |
| `app/page.tsx:153` | `bg-gradient-to-l` | INTENT UNCLEAR |
| `components/AutopsyReport.tsx:2377` | `bg-gradient-to-r` | INTENT UNCLEAR (chart fill?) |
| `components/AutopsyReport.tsx:2811` | `bg-gradient-to-r` | INTENT UNCLEAR |
| `components/DemoReportWrapper.tsx:65` | `bg-gradient-to-t` | likely a fade-out overlay; replace with a flat `bg-base/60` band |
| `components/ui/animated-shiny-text.tsx:27` | `bg-gradient-to-r` | shiny-text effect — drop component or accept the violation |
| `components/ui/skeleton.tsx:8` | `bg-gradient-to-r` | shimmer effect on skeleton; replace with `bg-tier-2 animate-pulse` |

## Oversized-radius violations

| file:line | token | proposed |
|---|---|---|
| `app/globals.css:182` | `rounded-2xl` | `rounded-lg` (10px) — `2xl` was dropped from the config |

## Sweep workflow

1. Open this file and fill in `INTENT UNCLEAR` rows by reading the
   surrounding 5–10 lines and making a per-row decision.
2. For each `NEW TOKEN NEEDED` group, add the token to
   `tailwind.config.js` `colors` extension before running the sweep.
3. Run `npm run check:design` after each batch — count should drop.
4. When count is 0, flip `STRICT = true` in
   `scripts/check-design-system.mjs` and ship that as a final
   commit so the design system stays locked.

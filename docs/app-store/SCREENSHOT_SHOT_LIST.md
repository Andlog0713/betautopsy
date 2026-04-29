# App Store Screenshot Shot List — BetAutopsy

Required device classes for new iOS submissions (App Store Connect 2026):

| Device class | Viewport (pt) | Render size (px @ 3x) | Required? |
|---|---|---|---|
| **iPhone 6.9"** (iPhone 16 Pro Max) | 430 × 932 | **1290 × 2796** | **Yes — mandatory** |
| iPhone 6.5" (iPhone 8 Plus class) | 414 × 736 | 1242 × 2688 | Apple auto-scales from 6.9" if not provided |
| iPad 13" (iPad Pro M4) | 1024 × 1366 | 2048 × 2732 | Skip — iPhone-only app |

**Submit one set at 1290 × 2796.** Apple now auto-fits to the older 6.5"
slot for the App Store front-end. If the review pipeline rejects
auto-scaling for any device, you can re-export the same six layouts at
1242 × 2688 — the design holds at both ratios.

Per slot you may upload **3–10 screenshots**. Submit the full **6 below**;
slot 7 is optional if you want a "social proof" frame.

---

## Slot order (carousel reads left-to-right)

The first three are what 95% of impressions actually see in the App Store
list view. Lead with positioning, then differentiation, then proof.

### 1 — Hero (positioning)
- **Caption (mono, optional):** *omit — let the headline carry the slide*
- **Headline L1:** Read your bets like a
- **Headline L2 (extrabold italic CAPS):** CASE FILE
- **Phone screen content:** Autopsy report header — archetype "Loss Chaser",
  Grade D+, Emotion 38, Discipline 41, with the EKG heartbeat strip below.
- **Callout (rounded scalpel-teal stroke):** the grade-D+ badge.
- **Bleed-red focus:** the "D+" letter glyph itself.
- **Second phone (peek):** none — full attention on the hero.

### 2 — Diagnosis (the "find the leaks" promise)
- **Caption:** `EVIDENCE // PATTERN 03`
- **Headline L1:** Find the leaks that
- **Headline L2:** COST YOU MOST
- **Phone screen content:** Bias detail card titled "Loss Chasing —
  $340/quarter" with a 12-week timeline chart underneath.
- **Callout:** wraps the `$340/quarter` figure and the chart.
- **Bleed-red focus:** the `$340` figure.
- **Second phone (peek from left edge):** the bias list with three rows
  (Loss Chasing, Parlay Overuse, Recency Bias), each with a $-amount.

### 3 — Quantification (the "behavior, not opinion" proof point)
- **Caption:** `DIAGNOSTIC // EMOTION`
- **Headline L1:** Stake size jumps
- **Headline L2:** 1.8× AFTER A LOSS
- **Phone screen content:** Emotion score gauge (38/100) on the left, stake-
  size trend line over 90 days on the right. Trend line shows two visible
  spikes after losing days.
- **Callout:** the trend line region.
- **Bleed-red focus:** the `1.8×` multiplier text.
- **Second phone (peek):** none.

### 4 — Action (the "fix" promise)
- **Caption:** `PROTOCOL // ACTION PLAN`
- **Headline L1:** Specific patterns.
- **Headline L2:** SPECIFIC FIXES.
- **Phone screen content:** Action plan list view — three personalized rules,
  each with a "+$X/qtr" projected savings figure and a "Why this rule" toggle.
- **Callout:** the top rule's "+$340/qtr" projection.
- **Bleed-red focus:** the savings figure.
- **Second phone (peek from right edge):** the "Why this rule" expanded
  detail with two bullet points and a chart.

### 5 — Coverage (the "any sportsbook" promise)
- **Caption:** `INTAKE // ANY BOOK`
- **Headline L1:** Upload from
- **Headline L2:** ANY SPORTSBOOK
- **Phone screen content:** Upload screen with a row of sportsbook logos
  (DraftKings, FanDuel, PrizePicks, BetMGM, Underdog) and a "Drop CSV here"
  zone. Below: "or paste your bet history" text-area.
- **Callout:** the drop-zone area.
- **Bleed-red focus:** *none — keep this slide calm; not every slide needs an alarm*.
- **Second phone (peek):** none.

### 6 — Pricing (the "no surprise" close)
- **Caption:** *omit*
- **Headline L1:** Pay once.
- **Headline L2:** NO SUBSCRIPTION.
- **Phone screen content:** Pricing card showing the $9.99 Full Report tier
  with its 6-bullet feature list.
- **Callout:** the `$9.99` price.
- **Bleed-red focus:** the `$9.99`.
- **Second phone (peek from right edge):** the Pro tier card ($19.99/mo) for
  users who want recurring tracking.

### 7 — Social proof (optional)
- **Caption:** `EXHIBIT B // RESULTS`
- **Headline L1:** $480 in leaks
- **Headline L2:** RECOVERED IN Q1.
- **Phone screen content:** Progress comparison view — two bias dollar-cost
  bars for Q4 vs Q1, scalpel-teal arrows showing the reduction.
- **Callout:** the delta arrow.
- **Bleed-red focus:** the "$480" recovered.
- **Second phone (peek):** none.

---

## Production pipeline

App Review will reject screenshots that misrepresent the actual UI. AI image
generation **alone** is high-risk for this — the AI invents UI that doesn't
match. Use AI for the **frame** (background, headline, hairline curve, device
mockup, callout stroke) and a real screenshot for the **phone screen content**.

```
1. Boot the simulator at iPhone 16 Pro Max (430 × 932 viewport, 3x).
   xcrun simctl boot "iPhone 16 Pro Max"

2. Sign in to the apple-review-pro@betautopsy.com seeded account so the
   sample data is present without requiring a fresh upload.

3. Navigate to the screen for the slot. Capture:
   xcrun simctl io booted screenshot ~/Desktop/slot-N-raw.png
   Output is exactly 1290 × 2796 px.

4. Open in Figma at 1290 × 2796.
   - Background: solid #0D1117 with optional 1px grid-paper at 3% opacity.
   - Place the headline (Plus Jakarta Sans regular line + extrabold italic
     CAPS line, white #FFFFFF) in the top ~600 px.
   - Place the simulator screenshot tilted -8° in a photoreal device frame
     (Apple ships free iPhone 16 Pro Max device frames in their Marketing
     Resources page — search "Apple Design Resources iPhone").
   - Add the scalpel-teal #00C9A7 hairline curve (1.5–2 px stroke, ~30%
     glow halo) drifting diagonally behind the device.
   - Add the rounded callout stroke around the highlighted UI region in the
     screenshot (4 px corner radius, 2 px stroke, scalpel-teal).
   - Adjust the bleed-red element inside the screenshot to be #C4463A if
     it isn't already.
   - Optional: place the second peek-phone (clipped at the canvas edge).

5. Export PNG, 24-bit, no transparency. Confirm size is exactly
   1290 × 2796 px before uploading to App Store Connect.
```

---

## Style invariants (per BetAutopsy brand — non-negotiable)

- Background: solid `#0D1117` (midnight). No royal blue, no sky cyan, no
  off-palette colors anywhere in the screenshot art.
- Accent: `#00C9A7` (scalpel teal). One curve per slide, one callout per slide.
- Alarm: `#C4463A` (bleed red). At most one bleed-red element per slide.
- Type: Plus Jakarta Sans for everything visible. IBM Plex Mono for case-file
  captions only (uppercase, 3px tracking, color `#9AA0A6`).
- No backdrop-blur, no glassmorphism, no drop shadows on text, no gradient
  fills on type, no rounded corners larger than 6 px on UI panels.
- No emoji, no athlete photography, no mascots, no illustrated characters,
  no confetti, no stock dashboard chart elements.
- One headline, one focal data point, one phone (or one phone + one peek)
  per slide. Resist the urge to add a fourth element.

---

## Asset preview before final upload

When all six are exported, lay them out as a 6-up grid in Figma at
50% scale and squint. The carousel should read as one consistent visual
language, not six different posters. If slot 4 looks like it belongs to a
different app, redo it.

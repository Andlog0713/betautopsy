# App Privacy Nutrition Labels — BetAutopsy

App Store Connect → My App → App Privacy → Edit

## Tracking
**Do you or your third-party partners use data for tracking?**  → **No**

"Tracking" in Apple's framework means linking user data to data from other
companies' apps/websites for targeted advertising, advertising measurement,
or sharing with data brokers. The iOS build excludes Meta Pixel and TikTok
Pixel at compile time (`!isMobileBuild()` in `app/layout.tsx:170`). Sentry
and GA4 are configured as first-party analytics only — no audience
matching, no remarketing, no third-party sharing. Verified absent from the
mobile bundle.

---

## Data Linked to You
*Data the developer collects that is linked to the user's identity.*

### Contact Info → Email Address
- **Linked to user identity:** Yes
- **Used for tracking:** No
- **Purposes:**
  - **App Functionality** — account creation, login, password reset.
  - **Developer's Advertising or Marketing** — only if the user has not unsubscribed; weekly digest emails about their behavior trends. (Optional via `email_digest_enabled` flag in `profiles` table.)

### User Content → Other User Content
*Bet history uploaded by the user (CSV or pasted text) — sportsbook, sport,
stake, odds, result, profit/loss, timestamps. The behavioral analysis is
derived from this.*
- **Linked to user identity:** Yes
- **Used for tracking:** No
- **Purposes:**
  - **App Functionality** — generating the autopsy report, archetype classification, bias detection, dollar-cost calculations. Sent to Anthropic (Claude) as a service provider for the analysis step; Anthropic processes on BetAutopsy's behalf under a data-processing agreement and does not train on it.

### Identifiers → User ID
*Supabase auth UUID; Stripe customer ID for users who have made a purchase.*
- **Linked to user identity:** Yes
- **Used for tracking:** No
- **Purposes:**
  - **App Functionality** — session management, restoring a paid user's report on a new device.

### Usage Data → Product Interaction
*GA4 page views, button clicks, feature usage. No IDFA, no cross-site
tracking. Sent to Google Analytics with `analytics_storage: granted` (US
default) or `denied` (EU/EEA/UK/CH default — geo-gated server-side).*
- **Linked to user identity:** Yes (associated with Supabase user ID after login)
- **Used for tracking:** No
- **Purposes:**
  - **Analytics** — feature usage, funnel optimization, debugging UX issues.

### Diagnostics → Crash Data
*Sentry crash reports.*
- **Linked to user identity:** Yes (Sentry receives the Supabase user ID for affected sessions to deduplicate reports per user)
- **Used for tracking:** No
- **Purposes:**
  - **App Functionality** — diagnosing and fixing app crashes.

### Diagnostics → Performance Data
*Sentry transaction traces (10% sample rate, configured in `sentry.client.config.ts:4` — `tracesSampleRate: 0.1`). Replays disabled (`replaysSessionSampleRate: 0`).*
- **Linked to user identity:** Yes
- **Used for tracking:** No
- **Purposes:**
  - **App Functionality** — identifying slow API routes, hydration regressions.

### Financial Info → Other Financial Info
*Subscription tier (`free` / `pro`), subscription status (`active` / `past_due` / `canceled`), bankroll figure if the user has set one. **Payment card details are never collected by BetAutopsy** — Stripe Checkout owns the card form on its own domain, and only the Stripe customer ID is returned to us.*
- **Linked to user identity:** Yes
- **Used for tracking:** No
- **Purposes:**
  - **App Functionality** — gating the paid report behind subscription state.

---

## Data Not Linked to You
*(none — every data point above is associated with the authenticated user)*

---

## Data Not Collected
- **Health & Fitness** — not collected
- **Location** (precise or coarse) — not collected
- **Sensitive Info** (race, sexual orientation, etc.) — not collected
- **Contacts** — not collected
- **Browsing History** — not collected
- **Search History** — not collected
- **Audio Data** — not collected
- **Photos or Videos** — not collected (no camera, no photo-library access)
- **Gameplay Content** — not collected
- **Customer Support** — not collected via the app (handled via email)
- **Other Diagnostic Data** — not collected beyond Sentry crash + perf above
- **Other Data Types** — not collected

---

## Privacy Policy URL
`https://www.betautopsy.com/privacy`

This already covers Sentry, GA4, Anthropic, and Stripe. If App Review flags a
gap, the most likely fix is adding an explicit "Service Providers" section
naming Anthropic + Sentry by company name (currently they're disclosed but
not named in a single block).

---

## Cross-checks before submitting

- [ ] Confirm Meta + TikTok pixels still gated by `!isMobileBuild()` in
      `app/layout.tsx`. Run `grep "PixelBase\|TikTokPixel" out/index.html`
      after `npm run build:mobile` — should return zero hits.
- [ ] Confirm `replaysSessionSampleRate: 0` and `replaysOnErrorSampleRate: 0`
      in `sentry.client.config.ts`. Session Replay would change the answer
      under Diagnostics (would need to disclose screen content + interactions).
- [ ] Confirm we are not enabling AdMob, AppLovin, or any SDK that triggers
      the App Tracking Transparency prompt. We're not — but verify
      `Info.plist` does **not** contain `NSUserTrackingUsageDescription`.
      Adding that string would force the ATT prompt and require Tracking = Yes.

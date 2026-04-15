# Capacitor Audit #1 — `app/api/` Route Inventory

Enumerates every route handler under `app/api/`, its HTTP method(s), a
one-sentence description, and the server-only secrets it touches
(directly via `process.env` or indirectly through a helper that does).

Helper → secret mapping used below:

| Helper | Server secret |
|---|---|
| `createServerSupabaseClient` (lib/supabase-server.ts) | none from this audit list — uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` + session cookies |
| `createServiceRoleClient` (lib/supabase-server.ts) | `SUPABASE_SERVICE_ROLE_KEY` |
| `logErrorServer` (lib/log-error-server.ts) | `SUPABASE_SERVICE_ROLE_KEY` |
| `checkRateLimit` (lib/rate-limit.ts) | `SUPABASE_SERVICE_ROLE_KEY` |
| `requireCronSecret` (lib/cron-auth.ts) | `CRON_SECRET` |
| `getStripe` / `getOrCreateCustomer` / `create*CheckoutSession` / `createCustomerPortalSession` / `tierFromPriceId` (lib/stripe.ts) | `STRIPE_SECRET_KEY` |
| `runAutopsy` / `runSnapshot` (lib/autopsy-engine.ts) | `ANTHROPIC_API_KEY` |
| `new Anthropic()` (SDK default) | `ANTHROPIC_API_KEY` |

Secrets legend: `ANTHROPIC` = `ANTHROPIC_API_KEY`, `STRIPE_SK` =
`STRIPE_SECRET_KEY`, `SRK` = `SUPABASE_SERVICE_ROLE_KEY`, `CRON` =
`CRON_SECRET`, `STRIPE_WH` = `STRIPE_WEBHOOK_SECRET`.

## Routes

| # | File | Method(s) | Description | Server-only secrets used |
|---|---|---|---|---|
| 1 | `app/api/admin/feedback/route.ts` | GET | Admin-only paginated list of user feedback entries with joined profile metadata. | `SRK` (createServiceRoleClient) |
| 2 | `app/api/admin/reports/route.ts` | GET | Admin-only paginated list of autopsy reports with search across report id / user email. | `SRK` (createServiceRoleClient) |
| 3 | `app/api/admin/reports/[id]/route.ts` | GET | Admin-only fetch of a single autopsy report with its owning profile, bypassing RLS. | `SRK` (createServiceRoleClient) |
| 4 | `app/api/analyze/route.ts` | POST | Runs the main streaming autopsy / snapshot analysis pipeline (metrics, archetype, biases, leaks) for the logged-in user. | `ANTHROPIC` (via autopsy-engine `runAutopsy` / `runSnapshot`), `SRK` (via `checkRateLimit` + `logErrorServer`) |
| 5 | `app/api/ask-report/route.ts` | POST | Anthropic-backed Q&A endpoint answering questions about a specific user report. | `ANTHROPIC` (direct `new Anthropic()`), `SRK` (via `checkRateLimit` + `logErrorServer`) |
| 6 | `app/api/billing/route.ts` | POST | Creates a Stripe customer-portal session for the current user. | `STRIPE_SK` (via `createCustomerPortalSession`), `SRK` (via `logErrorServer`) |
| 7 | `app/api/checkout/route.ts` | POST | Creates a Stripe checkout session for subscription or one-off report purchase with optional promo slug. | `STRIPE_SK` (via stripe helpers), `SRK` (via `logErrorServer`) |
| 8 | `app/api/digest/route.tsx` | GET | Cron-triggered weekly digest email job that emails stats to eligible users. | `CRON` (via `requireCronSecret`), `SRK` (via `createServiceRoleClient`) |
| 9 | `app/api/expire-trials/route.ts` | GET | No-op stub kept to prevent a legacy Vercel cron from 404-ing after the trial system was removed. | none |
| 10 | `app/api/export/route.ts` | GET | Exports the current user's bets as a CSV download. | `SRK` (via `logErrorServer`) |
| 11 | `app/api/feedback/route.ts` | POST | Records a user feedback entry (report_reaction, bug, feature_request, general). | `SRK` (via `logErrorServer`) |
| 12 | `app/api/freeze-refill/route.ts` | GET | Cron job that refills `streak_freezes` on all profiles that are below 1. | `CRON` (via `requireCronSecret`), `SRK` (via `createServiceRoleClient`) |
| 13 | `app/api/inbound-email/route.ts` | POST | Resend inbound-email webhook that forwards incoming support mail to the team mailbox. | none |
| 14 | `app/api/journal/route.ts` | GET, POST | Lists and creates the authenticated user's journal entries. | none (user-scoped supabase only) |
| 15 | `app/api/log-error/route.ts` | POST | Records a client-side error report into the `error_logs` table. | `SRK` (direct `process.env.SUPABASE_SERVICE_ROLE_KEY`) |
| 16 | `app/api/onboarding-emails/route.ts` | GET | Cron job that dispatches the onboarding / drip email sequence (welcome, nudge, reengagement, etc.). | `CRON` (via `requireCronSecret`), `SRK` (via `createServiceRoleClient`) |
| 17 | `app/api/parse-paste/route.ts` | POST | Uses Anthropic to parse pasted sportsbook/spreadsheet text into structured bets. | `ANTHROPIC` (direct `new Anthropic()`), `SRK` (via `checkRateLimit` + `logErrorServer`) |
| 18 | `app/api/parse-screenshot/route.ts` | POST | Uses Anthropic vision to parse screenshots of betting slips into structured bets. | `ANTHROPIC` (direct `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`), `SRK` (via `checkRateLimit` + `logErrorServer`) |
| 19 | `app/api/quiz-lead/route.ts` | POST | Stores a landing-page quiz lead (email + archetype + emotion estimate). | `SRK` (via `createServiceRoleClient`) |
| 20 | `app/api/recent-activity/route.ts` | GET | Public, edge-cached anonymized recent-activity ticker for the /go landing page. | `SRK` (via `createServiceRoleClient` + `logErrorServer`) |
| 21 | `app/api/send-email/route.ts` | GET | Sends a named transactional template (currently `lifetime-pro`) via Resend. | `CRON` (direct `process.env.CRON_SECRET` bearer check) |
| 22 | `app/api/send-welcome/route.ts` | POST | Sends the welcome onboarding email to the newly-authenticated user if not already sent. | `SRK` (via `logErrorServer`) |
| 23 | `app/api/share/route.ts` | POST | Creates a public share link for a user's report (writes a row in the shared-reports table). | `SRK` (via `createServiceRoleClient` + `logErrorServer`) |
| 24 | `app/api/template/route.ts` | GET | Returns the CSV import template as a file download. | none |
| 25 | `app/api/unsubscribe/route.ts` | GET | Unsubscribes a user from email digests by redeeming a one-time token and serves an HTML confirmation page. | `SRK` (via `createServiceRoleClient`) |
| 26 | `app/api/upload/route.ts` | POST | Accepts a CSV upload, parses it, and imports bets for the current user. | `SRK` (via `logErrorServer`) |
| 27 | `app/api/upload-parsed/route.ts` | POST | Imports a pre-parsed `ParsedBet[]` batch produced by the paste/screenshot flows. | `SRK` (via `logErrorServer`) |
| 28 | `app/api/webhook/route.ts` | POST | Stripe webhook handler for subscription lifecycle, payment failures, and receipts. | `STRIPE_WH` (direct `process.env.STRIPE_WEBHOOK_SECRET`), `STRIPE_SK` (via `getStripe` / `createCustomerPortalSession`), `SRK` (direct `process.env.SUPABASE_SERVICE_ROLE_KEY` + via `logErrorServer`) |
| 29 | `app/api/weekend-autopsy/route.ts` | GET | Cron-triggered weekend wrap-up email with weekend sessions + stats. | `CRON` (via `requireCronSecret`), `SRK` (via `createServiceRoleClient`) |

## Totals

- **29** route files across `app/api/`.
- Routes using **`ANTHROPIC_API_KEY`**: 4 — `analyze`, `ask-report`, `parse-paste`, `parse-screenshot`.
- Routes using **`STRIPE_SECRET_KEY`**: 3 — `billing`, `checkout`, `webhook`.
- Routes using **`STRIPE_WEBHOOK_SECRET`**: 1 — `webhook`.
- Routes using **`SUPABASE_SERVICE_ROLE_KEY`** (directly or via helpers): 25 — everything except `expire-trials`, `inbound-email`, `journal`, `send-email` (no SRK path), and `template`.
- Routes using **`CRON_SECRET`**: 6 — `digest`, `freeze-refill`, `onboarding-emails`, `send-email`, `weekend-autopsy`, plus any cron-callable endpoints above. (`send-email` only enforces it when the env var is set.)
- Routes with **no** server-only secrets from this list: 4 — `expire-trials`, `inbound-email`, `journal`, `template`.

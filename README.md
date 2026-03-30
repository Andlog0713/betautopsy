# BetAutopsy

AI-powered behavioral analysis for sports bettors. Not a bet tracker, not a picks service — a sports psychologist for your betting data.

Upload your betting history (CSV from Pikkit, DraftKings, FanDuel, or any sportsbook) and get a forensic breakdown: cognitive bias detection with dollar costs, emotion score, discipline score, BetIQ skill assessment, sport-specific pattern detection, and a personalized action plan.

## Setup

### 1. Create a Supabase project

- Go to [supabase.com](https://supabase.com) and create a new project
- Open the **SQL Editor** and run the contents of `supabase/schema.sql`
- This creates all tables (profiles, bets, uploads, reports, snapshots, share_tokens, feedback, error_logs, rate_limits, quiz_leads, email_unsubscribe_tokens, bet_journal_entries) with RLS policies and indexes
- Go to **Settings → API** and copy your Project URL, anon key, and service role key

### 2. Create Stripe products

- Go to [stripe.com](https://stripe.com) and create an account (or use test mode)
- Create two products with recurring prices:
  - **Pro** — $9.99/month (or $99/year)
  - **Sharp** — $24.99/month (or $199/year)
- Copy the price IDs (starts with `price_`)
- Go to **Developers → Webhooks** and add an endpoint pointing to `https://your-domain.com/api/webhook`
- Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- Copy the webhook signing secret

### 3. Get an Anthropic API key

- Go to [console.anthropic.com](https://console.anthropic.com) and create an API key

### 4. Configure environment

```bash
cp .env.template .env.local
```

Fill in all values in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_SHARP_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
STRIPE_SHARP_ANNUAL_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=re_...
```

### 5. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Test with Stripe CLI (optional)

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

Use test card `4242 4242 4242 4242` for payments.

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **UI**: Tailwind CSS, forensic case-file design system (sharp corners, monospace data, evidence tags)
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **Payments**: Stripe Checkout + Customer Portal + Webhooks (monthly + annual plans)
- **AI**: Anthropic Claude API (Sonnet for behavioral interpretation)
- **Email**: Resend (weekly digest, verification)
- **Hosting**: Vercel (with cron jobs for digest + streak freeze refill)

## Key Features

- **Autopsy Engine**: Hybrid analysis — deterministic JS computes all metrics (ROI, emotion score, biases, timing, odds analysis), then Claude interprets the behavioral patterns
- **BetIQ Score**: 6-component skill assessment (line value, calibration, sophistication, specialization, timing, sample confidence)
- **Enhanced Tilt Index**: 6 behavioral signals including session acceleration and odds drift after loss
- **Sport-Specific Detection**: NFL key number awareness, NBA prop overexposure, MLB moneyline tunnel vision, DFS multiplier chasing
- **Bet DNA Quiz**: 13-question personality quiz with Spotify Wrapped-style reveal sequence
- **Behavioral Journal**: Pre-bet mental state logging for future correlation analysis
- **Weekly Digest**: Automated email with personalized insights (Tuesdays via Vercel cron)
- **Progress Tracking**: Longitudinal snapshots, streak system, milestone badges
- **Share Cards**: Stories-format (1080x1920) share cards with bet-slip aesthetic

## Deployment

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.template` in Vercel's project settings
4. Set `NEXT_PUBLIC_APP_URL` to your production domain
5. Update the Stripe webhook endpoint URL to your production domain
6. Deploy

## Cron Jobs (vercel.json)

- **Weekly Digest**: Tuesdays at 2pm UTC — `/api/digest`
- **Streak Freeze Refill**: 1st of each month — `/api/freeze-refill`

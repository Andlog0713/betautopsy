# BetAutopsy

BetAutopsy is a web app where sports bettors upload their bet history (CSV or manual entry) and get an AI-powered behavioral analysis. Claude scans bets for cognitive biases (loss chasing, parlay addiction, favorite bias, gambler's fallacy), strategic leaks (bad ROI by sport/bet type/odds range), and behavioral patterns (tilt sequences, emotional stake sizing). It's like a sports psychologist reviewing your game tape — not a picks service, not a bet tracker.

## Setup

### 1. Create a Supabase project

- Go to [supabase.com](https://supabase.com) and create a new project
- Open the SQL Editor and run the contents of `supabase/migration.sql`
- Go to **Settings → API** and copy your Project URL, anon key, and service role key

### 2. Create Stripe products

- Go to [stripe.com](https://stripe.com) and create an account (or use test mode)
- Create two products with recurring prices:
  - **Pro** — $19/month
  - **Sharp** — $39/month
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
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
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

## Deployment

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.template` in Vercel's project settings
4. Set `NEXT_PUBLIC_APP_URL` to your production domain
5. Update the Stripe webhook endpoint URL to your production domain
6. Deploy

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **UI**: Tailwind CSS, custom dark theme
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **Payments**: Stripe Checkout + Customer Portal + Webhooks
- **AI**: Anthropic Claude API (Sonnet for analysis)
- **Hosting**: Vercel

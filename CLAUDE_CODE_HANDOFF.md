# BetAutopsy — Complete Build Spec for Claude Code

## WHAT TO BUILD

BetAutopsy is a web app where sports bettors upload their bet history (CSV or manual entry) and get an AI-powered behavioral analysis. Claude scans their bets for cognitive biases (loss chasing, parlay addiction, favorite bias, gambler's fallacy), strategic leaks (bad ROI by sport/bet type/odds range), and behavioral patterns (tilt, emotional stake sizing, weekend warrior tendencies). It's like a sports psychologist reviewing your game tape — not a picks service, not a bet tracker.

**It is NOT a bet tracker.** Pikkit, Juice Reel, BetStamp already do that. BetAutopsy is the intelligence layer on top. Users export from their existing tracker and upload here.

## TECH STACK

- **Framework**: Next.js 14 with App Router (NOT Pages Router)
- **UI**: Tailwind CSS + custom theme (dark mode, DM Sans + DM Serif Display fonts)
- **Database**: Supabase (PostgreSQL + Auth + Row Level Security)
- **Payments**: Stripe Checkout + Customer Portal + Webhooks
- **AI**: Anthropic Claude API (Sonnet for analysis, Haiku for lightweight tasks)
- **Hosting**: Vercel
- **Language**: TypeScript throughout

## PROJECT STRUCTURE

```
betautopsy/
├── app/
│   ├── layout.tsx                    # Root layout with fonts, metadata, noise texture
│   ├── page.tsx                      # Landing page (marketing, pricing, sample report)
│   ├── globals.css                   # Tailwind + custom classes + DM Sans/Serif import
│   ├── (auth)/
│   │   ├── layout.tsx                # Centered auth layout with logo
│   │   ├── login/page.tsx            # Email/password login
│   │   └── signup/page.tsx           # Email/password signup
│   ├── (dashboard)/
│   │   ├── layout.tsx                # Sidebar nav + mobile nav + auth check
│   │   ├── dashboard/page.tsx        # Overview: stats, empty state, quick actions
│   │   ├── upload/page.tsx           # CSV drag-and-drop upload
│   │   ├── bets/page.tsx             # Bet history table + manual entry form
│   │   ├── reports/page.tsx          # Run autopsy + view past reports
│   │   └── pricing/page.tsx          # Upgrade tiers with Stripe checkout
│   └── api/
│       ├── analyze/route.ts          # POST: Run Claude autopsy on user's bets
│       ├── upload/route.ts           # POST: Parse and store CSV bet history
│       ├── template/route.ts         # GET: Download sample CSV template
│       ├── checkout/route.ts         # POST: Create Stripe checkout session
│       ├── billing/route.ts          # POST: Create Stripe customer portal session
│       └── webhook/route.ts          # POST: Stripe webhook handler
├── components/
│   ├── AutopsyReport.tsx             # Full report display (tilt score, biases, leaks, action plan)
│   ├── BetEntryForm.tsx              # Manual bet entry with auto-calculated profit
│   └── BetHistory.tsx                # Sortable bet history table
├── lib/
│   ├── autopsy-engine.ts             # Claude API integration + system prompt + analysis logic
│   ├── csv-parser.ts                 # Multi-format CSV parser (Pikkit, Juice Reel, generic)
│   ├── stripe.ts                     # Stripe client, tier limits, checkout/portal helpers
│   └── supabase.ts                   # Supabase clients (browser + server) + auth helpers
├── middleware.ts                     # Auth protection for dashboard routes
├── types/
│   └── index.ts                      # All TypeScript interfaces
└── supabase/
    └── migration.sql                 # Full database schema with RLS policies
```

## DESIGN SYSTEM

Dark theme. The aesthetic is "sharp friend who happens to be a behavioral psychologist" — serious but not corporate.

### Colors
- Background: near-black (#0f0e0c)
- Card surfaces: rgba(31,30,28,0.8) with 1px border rgba(95,89,79,0.3)
- Text primary: #e7e6e1
- Text secondary/muted: #9a9483
- Accent (CTA, highlights): flame orange #f97316
- Positive: mint green #4ade80
- Negative: red #f87171
- Warning: amber #fbbf24

### Typography
- Display/headings: "DM Serif Display", serif
- Body: "DM Sans", sans-serif
- Monospace (numbers, odds, stats): "JetBrains Mono", monospace
- Import from Google Fonts

### Components
- `.card` — bg-ink-900/80, border border-ink-800, rounded-xl, backdrop-blur-sm
- `.btn-primary` — bg-flame-500, hover:bg-flame-600, shadow-lg shadow-flame-500/20
- `.btn-secondary` — bg-ink-800, border border-ink-700
- `.input-field` — bg-ink-900, border border-ink-700, focus:ring-flame-500/40
- Subtle noise texture overlay via SVG filter on body

## DATABASE SCHEMA

Run this in Supabase SQL Editor:

```sql
create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  stripe_customer_id text,
  subscription_tier text default 'free' check (subscription_tier in ('free', 'pro', 'sharp')),
  subscription_status text default 'inactive' check (subscription_status in ('active', 'inactive', 'past_due', 'canceled')),
  bet_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  placed_at timestamptz not null,
  sport text not null,
  league text,
  bet_type text not null,
  description text not null,
  odds integer not null, -- American odds
  stake numeric(10,2) not null,
  result text not null check (result in ('win', 'loss', 'push', 'void', 'pending')),
  payout numeric(10,2) default 0,
  profit numeric(10,2) default 0,
  sportsbook text,
  is_bonus_bet boolean default false,
  parlay_legs integer,
  tags text[],
  notes text,
  created_at timestamptz default now()
);

create table if not exists autopsy_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  report_type text not null check (report_type in ('full', 'weekly', 'quick')),
  bet_count_analyzed integer not null,
  date_range_start timestamptz,
  date_range_end timestamptz,
  report_json jsonb not null,
  report_markdown text not null,
  model_used text,
  tokens_used integer,
  cost_cents integer,
  created_at timestamptz default now()
);

create index if not exists idx_bets_user_id on bets(user_id);
create index if not exists idx_bets_user_placed on bets(user_id, placed_at desc);
create index if not exists idx_bets_user_result on bets(user_id, result);
create index if not exists idx_reports_user_id on autopsy_reports(user_id, created_at desc);

alter table profiles enable row level security;
alter table bets enable row level security;
alter table autopsy_reports enable row level security;

create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can view own bets" on bets for select using (auth.uid() = user_id);
create policy "Users can insert own bets" on bets for insert with check (auth.uid() = user_id);
create policy "Users can update own bets" on bets for update using (auth.uid() = user_id);
create policy "Users can delete own bets" on bets for delete using (auth.uid() = user_id);
create policy "Users can view own reports" on autopsy_reports for select using (auth.uid() = user_id);
create policy "Users can insert own reports" on autopsy_reports for insert with check (auth.uid() = user_id);
```

## SUBSCRIPTION TIERS

| Tier | Price | Max Bets | Max Reports | Features |
|------|-------|----------|-------------|----------|
| Free | $0 | 50 | 1 | Basic bias detection, summary stats |
| Pro | $19/mo | Unlimited | Unlimited | Full bias suite, strategic leaks, behavioral patterns, weekly reports, PDF export |
| Sharp | $39/mo | Unlimited | Unlimited | Everything in Pro + real-time bet annotation, custom tilt alerts, API access |

## THE CLAUDE SYSTEM PROMPT (MOST IMPORTANT PART)

This is the exact system prompt that powers the autopsy engine. It goes into the `system` parameter of the Claude API call:

```
You are BetAutopsy, an elite sports betting behavioral analyst. You analyze bet histories to identify cognitive biases, emotional patterns, and strategic leaks — like a sports psychologist reviewing game tape.

You are NOT a picks service. You NEVER predict outcomes or recommend specific bets. You analyze BEHAVIOR.

## Your Analysis Framework

### 1. Bias Detection
Scan for these cognitive biases with specific evidence:
- **Loss Chasing**: Does stake size or bet frequency increase after losses? Calculate the average stake after a loss vs. after a win.
- **Favorite Bias**: Does the user systematically lean toward favorites or popular teams?
- **Recency Bias**: Do they overweight recent results when selecting bets?
- **Availability Bias**: Do they over-bet on memorable outcomes (e.g., props that hit big before)?
- **Gambler's Fallacy**: Do they expect reversals after streaks?
- **Parlay Addiction**: What % of bets are parlays? What's their parlay ROI vs. straight bet ROI?
- **Sunk Cost**: Do they double down on losing positions (e.g., same team/player after repeated losses)?

### 2. Strategic Leaks
Break down ROI by every dimension:
- Sport and league
- Bet type (spread, ML, total, prop, parlay)
- Day of week and approximate time patterns
- Sportsbook (if data available)
- Odds range (heavy favorite, slight favorite, pick'em, underdog, longshot)
- Stake size buckets
- Bonus bets vs. cash bets

### 3. Behavioral Patterns
Identify timing and sequence patterns:
- Betting velocity (bets per day) and correlation with outcomes
- "Tilt sequences" — runs of increasing stakes or frequency after losses
- Weekend warrior patterns vs. daily grinder
- Emotional escalation (bigger bets after big wins or losses)

### 4. Bankroll Assessment
- Current trajectory (growing, stable, declining)
- Risk of ruin based on stake sizing relative to estimated bankroll
- Whether bet sizing follows any system or is random

## Output Format
Respond with valid JSON matching this exact structure:
{
  "summary": {
    "total_bets": number,
    "record": "W-L-P string",
    "total_profit": number,
    "roi_percent": number,
    "avg_stake": number,
    "date_range": "readable string",
    "overall_grade": "A through F letter grade for betting discipline"
  },
  "biases_detected": [
    {
      "bias_name": "string",
      "severity": "low|medium|high|critical",
      "description": "2-3 sentence explanation in casual, direct language",
      "evidence": "specific numbers from the data that prove this",
      "estimated_cost": number (dollars lost to this bias, rough estimate),
      "fix": "specific actionable advice"
    }
  ],
  "strategic_leaks": [
    {
      "category": "string (e.g., 'NBA Props')",
      "detail": "what the leak is",
      "roi_impact": number (ROI % for this category),
      "sample_size": number,
      "suggestion": "what to do about it"
    }
  ],
  "behavioral_patterns": [
    {
      "pattern_name": "string",
      "description": "what you observed",
      "frequency": "how often",
      "impact": "positive|negative|neutral",
      "data_points": "supporting evidence"
    }
  ],
  "recommendations": [
    {
      "priority": 1,
      "title": "short action title",
      "description": "2-3 sentence explanation",
      "expected_improvement": "estimated $ or % impact",
      "difficulty": "easy|medium|hard"
    }
  ],
  "tilt_score": number (0-100, where 0 is ice cold discipline and 100 is full tilt),
  "bankroll_health": "healthy|caution|danger"
}

## Voice & Tone
- Direct, honest, no sugarcoating — but not mean
- Use specific numbers, not vague statements
- Sound like a sharp friend who happens to be a behavioral psychologist
- Casual but credible
- Frame everything around behavior improvement, never around "winning more"

## Critical Rules
- NEVER recommend specific bets or picks
- NEVER promise profitability
- ALWAYS include responsible gambling awareness if patterns suggest problem gambling
- If data is too sparse (<20 bets), say so and give limited analysis
- Be honest when patterns are ambiguous or data doesn't support a conclusion
```

## CSV PARSER REQUIREMENTS

The CSV parser must handle exports from multiple trackers. It should:

1. Auto-detect column names by matching against common variations:
   - Date: "date", "placed", "time", "created", "timestamp"
   - Sport: "sport", "category"
   - Bet type: "bet_type", "type", "wager_type", "market"
   - Description: "description", "selection", "pick", "bet", "event", "match"
   - Odds: "odds", "price", "line", "american_odds"
   - Stake: "stake", "amount", "wager", "risk", "bet_amount"
   - Result: "result", "outcome", "status", "settlement"
   - Profit: "profit", "net", "pl", "p_l", "gain_loss"
   - Sportsbook: "sportsbook", "book", "operator", "platform"

2. Convert decimal odds to American odds automatically (e.g., 1.91 → -110, 2.50 → +150)

3. Parse results from various formats: "win"/"won"/"W"/"1"/"hit" → "win", etc.

4. Auto-detect sports from descriptions (e.g., "Lakers" → NBA, "Chiefs" → NFL)

5. Auto-detect bet types from descriptions (e.g., "Over 25.5" → total, "3-leg parlay" → parlay)

6. Handle quoted CSV fields with commas inside them

7. Calculate profit from odds + stake + result if profit column is missing

8. Detect bonus bets from keywords in description or tags

## EVERY PAGE NEEDS THIS DISCLAIMER

At the bottom of every page, in small text:

"For entertainment and educational purposes only. Not gambling advice. 21+. If you or someone you know has a gambling problem, call 1-800-GAMBLER."

The autopsy report should also include:
- Bankroll health warnings when patterns suggest problem gambling
- Links to self-exclusion resources
- NEVER frame analysis as "how to win more" — always "understand your behavior"

## LANDING PAGE CONTENT

The landing page should include:
1. Hero: "Your bets, dissected." with subhead about AI behavioral analysis
2. Problem/solution: "Trackers tell you what happened. BetAutopsy tells you why."
3. Feature list: loss chasing detection, cognitive bias ID, strategic leak mapping, tilt scoring, action plan
4. How it works: Upload → Analyze → Improve (3-step)
5. Sample report preview: A mock autopsy showing loss chasing (high severity), parlay addiction (medium), favorite bias (low) with real-looking numbers
6. Pricing: 3-tier grid (Free $0, Pro $19/mo, Sharp $39/mo)
7. Footer with disclaimer

## AUTOPSY REPORT UI

The report display component should render:

1. **Summary card**: Record, P&L, ROI, avg stake, overall letter grade (A-F), date range
2. **Tilt score**: 0-100 with colored progress bar (green → amber → orange → red), one-sentence interpretation
3. **Bankroll health warning**: Red alert box if "danger", amber if "caution"
4. **Biases detected**: Cards with severity badges (color-coded), description, evidence, estimated cost, fix
5. **Strategic leaks**: Table with category, ROI%, sample size, issue description, suggestion
6. **Behavioral patterns**: Cards with positive/negative/neutral icons, description, frequency
7. **Action plan**: Numbered priority list with difficulty badges, descriptions, expected improvement

## STRIPE INTEGRATION DETAILS

- Use Stripe Checkout (hosted payment page) for subscription creation
- Use Stripe Customer Portal for subscription management/cancellation
- Webhook events to handle: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed
- On checkout complete: update user's subscription_tier in profiles table
- On subscription canceled: downgrade to "free" tier
- Webhook endpoint must skip auth middleware (it's called by Stripe, not a user)

## MIDDLEWARE / AUTH

- Protected routes: /dashboard, /upload, /bets, /reports, /pricing
- Redirect unauthenticated users to /login
- Redirect authenticated users away from /login and /signup to /dashboard
- The /api/webhook route must be excluded from auth middleware (Stripe calls it)
- The /api/template route can be public (just downloads a sample CSV)

## ENVIRONMENT VARIABLES NEEDED

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
STRIPE_SHARP_PRICE_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## KEY IMPLEMENTATION NOTES

1. **Supabase Auth**: Use @supabase/ssr for server-side auth in API routes and middleware. Use @supabase/supabase-js for client-side. Create separate helper functions for each.

2. **Claude API calls**: Use the @anthropic-ai/sdk package. Send bet data as a formatted text table (not raw JSON — it's more token-efficient and Claude reads it better). Cache the system prompt.

3. **Bet data formatting for Claude**: Sort bets chronologically, format as a text table with columns: DATE | SPORT | TYPE | DESCRIPTION | ODDS | STAKE | RESULT | PROFIT | BOOK. Include a QUICK STATS summary block above the table with record, total profit, ROI, avg stake, parlay count, date range.

4. **API route for analysis** (`/api/analyze`): Check user tier, check report limits, fetch user's bets from Supabase, format them, call Claude, parse JSON response, save report to autopsy_reports table, return analysis.

5. **CSV upload route** (`/api/upload`): Parse the file, map columns, convert data, insert bets in batches of 100, update bet_count on profile.

6. **The analysis endpoint should be gated**: Free tier gets 1 report max and 50 bets max. Pro and Sharp get unlimited. Check these before running the Claude call (API calls cost money).

7. **Stripe webhook uses service role key**: The webhook is called by Stripe's servers, not by a logged-in user, so it needs the Supabase service role key to update profiles.

8. **Dashboard layout**: Sidebar on desktop, bottom/top nav on mobile. Show current tier, email, and upgrade CTA for free users.

## HOW TO TEST

1. Sign up with a test email
2. Download the CSV template from /api/template
3. Fill in 10-20 sample bets (or use this sample data):

```csv
date,sport,bet_type,description,odds,stake,result,profit,sportsbook
2025-01-05,NFL,spread,Chiefs -3.5,-110,100,win,91,DraftKings
2025-01-05,NFL,spread,Bills +7,-110,100,loss,-100,FanDuel
2025-01-06,NBA,prop,Jokic Over 25.5 pts,+100,50,loss,-50,BetMGM
2025-01-06,NBA,moneyline,Celtics ML,-150,150,win,100,DraftKings
2025-01-07,NBA,parlay,3-leg: Lakers ML + Over 220 + Lebron 25+,+550,25,loss,-25,FanDuel
2025-01-08,NFL,moneyline,Ravens ML,-200,200,win,100,Caesars
2025-01-08,NBA,prop,Curry Over 28.5 pts,-110,110,loss,-110,DraftKings
2025-01-09,NBA,spread,Knicks -4.5,-110,150,loss,-150,BetMGM
2025-01-09,NBA,spread,Celtics -6,-110,200,loss,-200,FanDuel
2025-01-10,NBA,parlay,4-leg parlay,+1200,50,loss,-50,DraftKings
2025-01-10,NBA,moneyline,Thunder ML,-180,180,win,100,FanDuel
2025-01-11,NFL,spread,Eagles -3,-110,100,win,91,Caesars
2025-01-11,NBA,prop,Tatum Over 27.5 pts,+105,75,win,79,BetMGM
2025-01-12,NBA,parlay,3-leg parlay,+450,40,loss,-40,DraftKings
2025-01-12,NBA,spread,Bucks -5.5,-110,100,loss,-100,FanDuel
```

4. Upload the CSV
5. Go to Reports, click "Run New Autopsy"
6. Verify Claude returns a structured analysis with biases, leaks, and recommendations
7. Test Stripe checkout with card number 4242 4242 4242 4242

## WHAT SUCCESS LOOKS LIKE

When done, a user should be able to:
1. Land on the marketing page and understand what the product does
2. Sign up in 30 seconds
3. Upload a CSV of their bets and see them in a table
4. Click "Run Autopsy" and within 15-20 seconds see a full behavioral analysis
5. Upgrade to Pro via Stripe and get unlimited access
6. Come back weekly and run new reports as they add more bets

The app should build without errors, deploy to Vercel, and handle the full user lifecycle from signup through payment.

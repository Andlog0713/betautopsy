# App Review Notes — BetAutopsy

App Store Connect → My App → App Review Information → Notes

Paste the block below verbatim. It pre-empts the three review questions that
are most likely to come back: (1) test credentials, (2) why payments aren't
in-app, (3) what data goes to a third-party AI provider.

---

```
ABOUT

BetAutopsy is a behavioral-analysis tool for sports bettors. The user uploads
their own bet history (CSV from any major US sportsbook, or pasted text),
and the app produces a forensic report identifying cognitive biases (loss
chasing, parlay overuse, recency bias, etc.) and dollar-quantified leaks.
The app does not facilitate placing bets, does not connect to sportsbook
APIs, and does not provide picks. It is an after-the-fact diagnostic.

The same product runs on the web at https://www.betautopsy.com — the iOS
app is a Capacitor wrapper around the same web codebase, which is why the
HTML inside the WebView is identical to the production site.


TEST CREDENTIALS

Email:    apple-review@betautopsy.com
Password: <SET_BEFORE_SUBMISSION>

This account has a pre-loaded sample autopsy report so the reviewer can
exercise the full UI without uploading any data of their own. It is on the
free tier; we have also pre-paid the Pro tier on a second account if a paid
flow needs to be exercised:

Email:    apple-review-pro@betautopsy.com
Password: <SET_BEFORE_SUBMISSION>


PAYMENTS — NO IN-APP PURCHASES (Guideline 3.1.3(b) Multiplatform Services)

BetAutopsy does NOT use In-App Purchase. The free tier offers a snapshot
report; the Pro tier ($9.99 one-time or $19.99/mo) unlocks the full report.
Both purchases happen exclusively at https://www.betautopsy.com on the web,
using Stripe Checkout, before or after the user installs the iOS app.

This is allowed under Guideline 3.1.3(b) (Multiplatform Services): the same
account works across web and iOS, and the iOS app surfaces content the user
has already paid for via the web account. There are NO in-app prompts to
purchase, NO buttons inside the iOS app that initiate a payment via any
non-IAP system inside the WebView, and NO calls-to-action that direct
users to an external purchase flow from inside the app.

When a user reaches a paywall in the iOS app, they see their account status
and a link to manage their subscription on the web — the actual checkout
flow opens in SFSafariViewController (Apple-approved in-app browser, with
visible URL bar) via @capacitor/browser, which clearly demarcates that the
user is leaving the app context. This pattern is implemented in
`lib/native.ts:openCheckoutUrl`.

We do not sell digital content, virtual currency, in-app upgrades, or any
other unlock that would fall under Guideline 3.1.1.


GENERATIVE AI DISCLOSURE (Guideline 5.1.2(i), Nov 2025 update)

The behavioral analysis is produced by Anthropic's Claude model. On first
launch, the user sees a modal that:
  - Names Anthropic explicitly as the third-party processor.
  - Confirms that bet data is sent to Anthropic for analysis on
    BetAutopsy's behalf and is not used to train Anthropic's models.
  - Notes that the AI output is informational, not financial or medical
    advice.
  - Offers "Decline and exit" as an alternative to acceptance.

Acceptance is persisted via @capacitor/preferences under the key
`ai-consent-v1`. Without acceptance, no bet data leaves the device.


SPORTS BETTING POSITIONING (Guideline 5.3.4)

BetAutopsy does NOT facilitate gambling. There is no real-money wagering,
no in-app bet placement, no integration with sportsbook bet-placement APIs,
no live odds feed, and no encouragement of any particular bet. The app's
explicit product position is harm-reduction: it surfaces patterns
(loss chasing, parlay addiction, emotional staking) so the user can
recognize them and act. Onboarding language reinforces this — the eyebrow
text on the landing page reads "CASE FILE // BEHAVIORAL ANALYSIS UNIT".

Privacy Policy includes a responsible-gambling resources section linking to
1-800-GAMBLER (US) and gamcare.org.uk (UK).

Age rating: 17+ (the standard for any app referencing real-money betting,
even retrospectively). The 17+ rating is set in App Store Connect → Age
Rating → Frequent/Intense Simulated Gambling = Yes.


DATA + ACCOUNT DELETION (Guideline 5.1.1(v))

Account deletion is exercised from Settings → "Delete account". The
endpoint at `/api/account/delete` calls `auth.admin.deleteUser`, which
cascades through Supabase RLS policies to remove the row in `profiles`
and every dependent row (`bets`, `uploads`, `autopsy_reports`,
`progress_snapshots`, `share_tokens`, `bet_journal_entries`,
`feedback`, `error_logs`). The user is signed out and bounced to `/`.
Stripe customer records are retained per Stripe's data-retention policy
for tax/audit purposes only and are not linked to a usable account after
deletion.


CONTACT

For any review questions:  apple-review@betautopsy.com
For technical follow-up:   support@betautopsy.com
```

---

## Pre-submission checklist (before pasting the above)

- [ ] Create the two review accounts (`apple-review@`, `apple-review-pro@`)
      and replace `<SET_BEFORE_SUBMISSION>` with the actual passwords.
- [ ] Pre-load the sample report on the free-tier review account so the
      reviewer doesn't have to upload data (matches the
      "Without acceptance, no bet data leaves the device" claim).
- [ ] Verify `Info.plist` has the right age-rating-adjacent strings:
      no `NSUserTrackingUsageDescription` (would force the ATT prompt
      and conflict with our "No tracking" answer).
- [ ] Confirm `gamcare.org.uk` and `1-800-GAMBLER` references are present
      in `app/privacy/page.tsx` (the responsible-gambling block) — adds
      defensive cover under 5.3.4.

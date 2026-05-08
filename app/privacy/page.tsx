import NavBar from '@/components/NavBar';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen">
      <NavBar />

      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-8 pb-16">
        <h1 className="font-bold text-4xl tracking-tight mb-3">Privacy Policy</h1>
        <p className="text-ink-600 text-sm mb-12">Last updated: April 8, 2026</p>

        <div className="space-y-10 text-sm text-ink-600 leading-relaxed">
          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">1. Who we are</h2>
            <p>
              Diagnostic Sports, LLC, doing business as BetAutopsy (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;), operates the website{' '}
              <span className="text-fg-bright">betautopsy.com</span> and provides sports betting
              behavioral analysis tools. This policy explains how we collect, use, and protect your personal information.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">2. Information we collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-fg-bright mb-1">Account information</h3>
                <p>
                  When you create an account, we collect your email address, display name, and
                  password (hashed, never stored in plain text). If you sign in with Google or
                  Discord, we receive your name, email, and profile picture from those services.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-fg-bright mb-1">Betting data</h3>
                <p>
                  When you upload CSV files or manually enter bets, we store your bet history
                  including dates, sports, odds, stakes, results, and sportsbook names. This data
                  is used solely to generate your analytics and reports.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-fg-bright mb-1">Payment information</h3>
                <p>
                  Payments are processed by <span className="text-fg-bright">Stripe</span>. We
                  never see or store your full credit card number. Stripe provides us with a
                  customer ID and subscription status only.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-fg-bright mb-1">Usage data</h3>
                <p>
                  We collect basic analytics like page views and feature usage through Google Analytics (GA4) to improve the product. We use cookies only as described in Section 7.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">3. How we use your information</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>To provide, maintain, and improve our analytics services</li>
              <li>To generate personalized betting reports and behavioral insights</li>
              <li>To process payments and manage your subscription</li>
              <li>To communicate with you about your account or service updates</li>
              <li>To send weekly email digests and report notifications (you can opt out at any time)</li>
              <li>To detect and prevent fraud or abuse</li>
              <li>To develop anonymized, aggregated benchmarks and improve our analysis engine</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">4. How we protect your data</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>All data is transmitted over HTTPS (TLS encryption)</li>
              <li>Passwords are hashed using industry-standard algorithms</li>
              <li>Database access is restricted with row-level security, so you can only access your own data</li>
              <li>Our infrastructure is hosted on secure, SOC 2-compliant platforms (Vercel and Supabase)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">5. Data sharing</h2>
            <p className="mb-3">
              We do <span className="text-fg-bright font-medium">not</span> sell, rent, or trade
              your personal information. We only share data with:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li><span className="text-fg-bright">Supabase</span>: database and authentication provider</li>
              <li><span className="text-fg-bright">Stripe</span>: payment processing</li>
              <li><span className="text-fg-bright">Vercel</span>: hosting and deployment</li>
              <li><span className="text-fg-bright">Anthropic</span>: analysis engine (your data is sent to generate reports but is not stored by Anthropic or used to train models)</li>
              <li><span className="text-fg-bright">Resend</span>: transactional email delivery</li>
              <li><span className="text-fg-bright">Google Analytics</span>: anonymized usage data only</li>
              <li><span className="text-fg-bright">Sentry</span>: server- and client-side error and performance monitoring (stack traces, request metadata; no bet history or report content)</li>
              <li><span className="text-fg-bright">Meta Pixel</span>: conversion tracking for our ads on Meta platforms (events fire on signup and checkout, not on report content)</li>
            </ul>
            <p className="mt-3">
              We may also disclose information if required by law, subpoena, or court order, or to protect our rights, safety, or the safety of others.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">6. Shared reports</h2>
            <p>
              If you choose to share a report, a public link is created that anyone with the URL
              can view. Shared reports display your betting analytics but do not reveal your email,
              name, or account details. You can delete shared reports at any time.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">7. Cookies</h2>
            <p>
              We use essential cookies for authentication session management (via Supabase). Google Analytics may set cookies for anonymized usage tracking. We do not use advertising or third-party tracking cookies. You can disable non-essential cookies in your browser settings.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">8. Your rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Access and download your data</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and all associated data</li>
              <li>Opt out of non-essential communications</li>
              <li>Request details about what data we hold about you</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:support@betautopsy.com" className="text-scalpel hover:underline">
                support@betautopsy.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">9. Data retention</h2>
            <p>
              We retain your data for as long as your account is active. If you delete your
              account, all personal data and betting history is permanently removed within 30 days.
              Anonymized, aggregated data that cannot identify you may be retained indefinitely.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">10. California residents (CCPA)</h2>
            <p>
              If you are a California resident, you have the right to know what personal information we collect, request deletion, and opt out of the sale of personal information. We do not sell personal information. To exercise your rights, contact{' '}
              <a href="mailto:support@betautopsy.com" className="text-scalpel hover:underline">support@betautopsy.com</a>.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">11. Age requirement</h2>
            <p>
              BetAutopsy is intended for users who are 21 years of age or older. We do not
              knowingly collect information from anyone under 21. If we learn we have collected data from someone under 21, we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">12. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. If we make significant changes, we will
              notify you by email or by posting a notice on the site. Continued use of BetAutopsy
              after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">13. Contact</h2>
            <p>
              Questions or concerns? Reach us at{' '}
              <a href="mailto:support@betautopsy.com" className="text-scalpel hover:underline">
                support@betautopsy.com
              </a>.
            </p>
            <p className="mt-4">
              Diagnostic Sports, LLC d/b/a BetAutopsy<br />
              418 Broadway STE R<br />
              Albany, NY 12207
            </p>
          </section>
        </div>

        <p className="text-ink-700 text-xs text-center mt-16">
          BetAutopsy provides behavioral analysis and educational insights, not gambling or
          financial advice. Past results don&apos;t guarantee future outcomes. 18+. If you or
          someone you know has a gambling problem, call 1-800-GAMBLER.
        </p>
      </div>
    </main>
  );
}

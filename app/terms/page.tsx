import NavBar from '@/components/NavBar';

export default function TermsOfUsePage() {
  return (
    <main className="min-h-screen">
      <NavBar />

      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-28 pb-16">
        <h1 className="font-bold text-4xl tracking-tight mb-3">Terms of Use</h1>
        <p className="text-ink-600 text-sm mb-12">Last updated: April 8, 2026</p>

        <div className="space-y-10 text-sm text-ink-600 leading-relaxed">
          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">1. Acceptance of terms</h2>
            <p>
              By accessing or using BetAutopsy, a product of Diagnostic Sports, LLC (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;), including the website at betautopsy.com, you agree to be bound by these Terms of Use. If you do not agree to these terms, do not use the service. We may update these terms at any time, and your continued use after changes are posted constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">2. Eligibility</h2>
            <p>
              You must be at least 21 years of age to use BetAutopsy. By creating an account, you represent and warrant that you meet this age requirement. You are also responsible for ensuring your use of BetAutopsy complies with all laws and regulations applicable to your jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">3. Description of service</h2>
            <p className="mb-3">
              BetAutopsy is a behavioral analysis tool for sports bettors. You upload your bet history and receive reports identifying cognitive biases, emotional patterns, strategic leaks, and personalized action plans.
            </p>
            <p className="mb-3">
              BetAutopsy is not a picks service, odds comparison tool, or betting advisor. We do not recommend specific bets, predict outcomes, or guarantee improved results. All analysis is educational and intended to help you understand your own behavior.
            </p>
            <p>
              Nothing on this site constitutes gambling advice, financial advice, or a recommendation to wager. Past performance does not guarantee future results.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">4. Account registration</h2>
            <p className="mb-3">
              To use certain features, you must create an account. You agree to provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.
            </p>
            <p>
              You agree to notify us immediately at{' '}
              <a href="mailto:support@betautopsy.com" className="text-scalpel hover:underline">support@betautopsy.com</a>{' '}
              if you become aware of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">5. Payments and billing</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-fg-bright mb-1">Free tier</h3>
                <p>BetAutopsy offers a free tier with limited features. No payment information is required to use the free tier.</p>
              </div>
              <div>
                <h3 className="font-medium text-fg-bright mb-1">One-time purchases</h3>
                <p>Certain features, such as individual full reports, may be purchased as one-time transactions through Stripe. These purchases are non-recurring and grant access to the specific item purchased. All one-time purchases are final and non-refundable.</p>
              </div>
              <div>
                <h3 className="font-medium text-fg-bright mb-1">Paid subscriptions</h3>
                <p>Paid plans are billed on a recurring monthly or annual basis through Stripe. By subscribing, you authorize us to charge your payment method at the beginning of each billing cycle. Prices are listed on our pricing page and may change with 30 days notice.</p>
              </div>
              <div>
                <h3 className="font-medium text-fg-bright mb-1">Cancellation</h3>
                <p>You can cancel your subscription at any time from your account settings. Upon cancellation, you retain access to paid features through the end of your current billing period. We do not offer prorated refunds for partial billing periods.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">6. User content and data</h2>
            <p className="mb-3">
              When you upload bet history data (CSV files or manual entries), you retain full ownership of that data. By uploading, you grant us a limited, non-exclusive license to process your data solely for the purpose of generating your analytics and reports.
            </p>
            <p className="mb-3">
              We may use anonymized, aggregated data (with no personally identifiable information) to improve our service, develop benchmarks, or conduct internal research. Your individual bet data is never sold, shared with third parties for their marketing purposes, or used to identify you.
            </p>
            <p>
              For full details on how we handle your data, see our{' '}
              <a href="/privacy" className="text-scalpel hover:underline">Privacy Policy</a>.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">7. Acceptable use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Use BetAutopsy for any unlawful purpose</li>
              <li>Attempt to reverse-engineer, decompile, or extract source code from the service</li>
              <li>Scrape, crawl, or use automated tools to access the service beyond normal use</li>
              <li>Upload malicious files, viruses, or harmful code</li>
              <li>Impersonate any person or entity, or misrepresent your affiliation</li>
              <li>Interfere with or disrupt the service or its infrastructure</li>
              <li>Share your account credentials with others or allow multiple users on a single account</li>
              <li>Resell, redistribute, or commercially exploit any part of the service without written consent</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">8. Intellectual property</h2>
            <p>
              All content, features, functionality, design elements, trademarks, and code on BetAutopsy are owned by Diagnostic Sports, LLC and protected by applicable intellectual property laws. You may not copy, modify, distribute, or create derivative works from any part of the service without our prior written permission. Your use of the service does not grant you any ownership rights in our intellectual property.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">9. Third-party services</h2>
            <p>
              BetAutopsy integrates with third-party services including Supabase (database and authentication), Stripe (payment processing), Vercel (hosting), and Anthropic (analysis engine). Your use of these services is subject to their respective terms. We are not responsible for the practices, content, or availability of any third-party service.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">10. Disclaimers</h2>
            <p className="mb-3">
              BetAutopsy is provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement.
            </p>
            <p className="mb-3">
              We do not guarantee the accuracy, completeness, or usefulness of any analysis, report, or information provided through the service. Behavioral analysis involves inherent uncertainty, and results should be interpreted as educational insights, not definitive conclusions.
            </p>
            <p>
              We are not affiliated with, endorsed by, or officially connected to any sportsbook, DFS platform, sports league (NFL, NBA, MLB, NHL, etc.), or gambling regulatory body.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">11. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, Diagnostic Sports, LLC d/b/a BetAutopsy, and its owners, employees, affiliates, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the service, including but not limited to loss of profits, data, or goodwill. Our total liability for any claims related to the service shall not exceed the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">12. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless Diagnostic Sports, LLC d/b/a BetAutopsy, and its owners, employees, and affiliates from any claims, losses, damages, liabilities, and expenses (including reasonable legal fees) arising from your use of the service, your violation of these terms, or your violation of any third-party rights.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">13. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at our discretion, with or without notice, for conduct that we determine violates these terms or is harmful to the service, other users, or third parties. Upon termination, your right to use the service ceases immediately. Sections on disclaimers, limitation of liability, indemnification, and governing law survive termination.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">14. Governing law</h2>
            <p>
              These terms are governed by and construed in accordance with the laws of the State of New York, without regard to conflict of law principles. Any disputes arising from these terms or your use of the service shall be resolved exclusively in the state or federal courts located in New York.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">15. Changes to these terms</h2>
            <p>
              We may modify these terms at any time. If we make material changes, we will notify you by email or by posting a notice on the site. Your continued use of BetAutopsy after changes are posted constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-fg-bright mb-3">16. Contact</h2>
            <p>
              Questions about these terms? Reach us at{' '}
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

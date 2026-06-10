import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CRISIS_SUPPORT_DISCLAIMER,
  RESPONSIBLE_GAMBLING_DISCLAIMER,
  SUPPORT_RESOURCES,
} from '@/lib/support-resources';

export const metadata: Metadata = {
  title: 'Support | BetAutopsy',
  description: 'Problem-gambling and crisis support resources, plus guidance on what BetAutopsy can and cannot do when betting behavior is getting out of control.',
  alternates: {
    canonical: '/support',
  },
};

export default function SupportPage() {
  return (
    <main className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-12 space-y-10">
        <section className="space-y-4">
          <p className="case-header text-loss">SUPPORT</p>
          <h1 className="text-4xl font-bold tracking-tight text-fg-bright">Help is available right now.</h1>
          <p className="text-base text-fg-muted leading-relaxed max-w-2xl">
            If betting feels out of control, stop before placing anything else. BetAutopsy can add friction, rules, and cooldowns, but it is not emergency care and it cannot contact support on your behalf.
          </p>
          <div className="border-l-2 border-l-loss pl-4 py-1 space-y-2">
            <p className="text-fg-bright">{RESPONSIBLE_GAMBLING_DISCLAIMER}</p>
            <p className="text-fg-muted">{CRISIS_SUPPORT_DISCLAIMER}</p>
          </div>
        </section>

        <section className="space-y-4">
          <p className="case-header">REACH OUT</p>
          <div className="grid gap-4">
            {SUPPORT_RESOURCES.map((resource) => (
              <div key={resource.label} className="card p-5">
                <p className="text-fg-bright font-medium">{resource.label}</p>
                <p className="text-fg-muted text-sm mt-2 leading-relaxed">{resource.value}</p>
                {resource.href && (
                  <a
                    href={resource.href}
                    target={resource.href.startsWith('http') ? '_blank' : undefined}
                    rel={resource.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="inline-block text-sm text-scalpel link-underline mt-3"
                  >
                    Open resource
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="card p-5">
            <p className="case-header mb-3">WHAT BETAUTOPSY CAN DO</p>
            <div className="space-y-2 text-sm text-fg-muted leading-relaxed">
              <p>Turn on manual Recovery Mode.</p>
              <p>Start a cooldown before the next bet.</p>
              <p>Keep live rules visible inside the Control Center.</p>
              <p>Use pre-bet check-ins to add friction when you are vulnerable.</p>
            </div>
          </div>
          <div className="card p-5">
            <p className="case-header mb-3">WHAT IT CANNOT DO</p>
            <div className="space-y-2 text-sm text-fg-muted leading-relaxed">
              <p>It cannot provide counseling, crisis intervention, or medical advice.</p>
              <p>It cannot self-exclude you from sportsbooks or reach a support service for you.</p>
              <p>If you feel unsafe, overwhelmed, or in crisis, call or text 988 now.</p>
            </div>
          </div>
        </section>

        <section className="flex flex-wrap gap-3">
          <Link href="/control" className="btn-primary text-sm">Open Control Center</Link>
          <Link href="/faq" className="btn-secondary text-sm">Responsible Gaming FAQ</Link>
        </section>
      </div>
    </main>
  );
}

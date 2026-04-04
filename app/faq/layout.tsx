import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'FAQ | BetAutopsy',
  description: 'Answers to common questions about BetAutopsy: how it works, what\'s analyzed, supported formats, pricing, and data privacy.',
  alternates: {
    canonical: '/faq',
  },
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen">
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-28 pb-16">
        {children}
      </div>
      <footer className="border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">
          <p className="text-fg-dim text-xs text-center">
            For entertainment and educational purposes only. Not gambling advice. 21+.
            If you or someone you know has a gambling problem, call 1-800-GAMBLER.
          </p>
        </div>
      </footer>
    </main>
  );
}

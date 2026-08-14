import type { Metadata } from 'next';

// `login/page.tsx` is a client component and cannot export metadata itself,
// so the page-specific title lives here. Without it both auth routes
// inherited the generic root title ("BetAutopsy | Sports Betting Behavioral
// Analysis"), which reads identically to the homepage in tab bars, browser
// history, and search results.
export const metadata: Metadata = {
  title: 'Log In | BetAutopsy',
  description: 'Log in to your BetAutopsy account to view your behavioral analysis reports.',
  alternates: { canonical: '/login' },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}

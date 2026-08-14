import type { Metadata } from 'next';

// See the matching note in `login/layout.tsx` — `signup/page.tsx` is a client
// component, so its page-specific title has to live in a layout.
export const metadata: Metadata = {
  title: 'Sign Up | BetAutopsy',
  description:
    'Create a free BetAutopsy account and get a behavioral analysis of your betting history.',
  alternates: { canonical: '/signup' },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}

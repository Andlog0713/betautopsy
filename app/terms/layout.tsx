import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use | BetAutopsy',
  description: 'BetAutopsy terms of use. Rules for using the service, account registration, payments, and acceptable use.',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

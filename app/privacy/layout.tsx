import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | BetAutopsy',
  description: 'BetAutopsy privacy policy. How we handle your data, bet history, and personal information.',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

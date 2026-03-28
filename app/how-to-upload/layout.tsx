import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Get Your Bet History | BetAutopsy',
  description: 'Step-by-step guide to exporting your sports betting, DFS pick&apos;em, and prediction market history from Pikkit for behavioral analysis in BetAutopsy.',
  alternates: {
    canonical: '/how-to-upload',
  },
};

export default function HowToUploadLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

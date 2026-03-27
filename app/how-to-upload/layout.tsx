import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Get Your Bet History | BetAutopsy',
  description: 'Step-by-step guide to exporting your sports betting and DFS pick&apos;em history from Pikkit for behavioral analysis in BetAutopsy.',
  alternates: {
    canonical: '/how-to-upload',
  },
};

export default function HowToUploadLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

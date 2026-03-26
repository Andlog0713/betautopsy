import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Get Your Bet History | BetAutopsy',
  description: 'Step-by-step guide to exporting your bet history from Pikkit, DraftKings, FanDuel, and other sportsbooks for analysis in BetAutopsy.',
};

export default function HowToUploadLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

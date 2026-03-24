import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BetAutopsy — AI-Powered Betting Behavioral Analysis',
  description:
    'Upload your bet history and get an AI-powered behavioral analysis. Identify cognitive biases, strategic leaks, and tilt patterns.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

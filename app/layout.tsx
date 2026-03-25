import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BetAutopsy — AI-Powered Sports Betting Behavioral Analysis',
  description:
    'Upload your bet history and get an AI-powered sports betting behavioral analysis. Identify cognitive biases, strategic leaks, and emotional betting patterns.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}

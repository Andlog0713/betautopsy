import { Metadata } from 'next';
import QuizClient from './QuizClient';

export const metadata: Metadata = {
  title: 'What\'s Your Bet DNA? | Free Betting Personality Quiz | BetAutopsy',
  description: 'Take the free 2-minute quiz to discover your betting personality type, hidden biases, and what they\'re costing you. No signup required.',
  alternates: {
    canonical: '/quiz',
  },
  openGraph: {
    title: 'What\'s Your Bet DNA? | BetAutopsy',
    description: 'Discover your betting personality type and hidden biases in 2 minutes.',
    url: 'https://www.betautopsy.com/quiz',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'What\'s Your Bet DNA?',
    description: 'Free 2-minute quiz. Discover your betting personality and hidden biases.',
  },
};

const quizJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Quiz',
  name: 'What\'s Your Bet DNA? — Sports Betting Personality Quiz',
  description: 'Discover your betting personality type and hidden cognitive biases in 2 minutes. Free, no signup required.',
  url: 'https://www.betautopsy.com/quiz',
  provider: { '@type': 'Organization', name: 'BetAutopsy' },
};

export default function QuizPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(quizJsonLd) }}
      />
      <QuizClient />
    </>
  );
}

import { Metadata } from 'next';
import QuickQuizClient from './QuickQuizClient';

export const metadata: Metadata = {
  title: 'Quick Bet DNA Quiz — 5 Questions | BetAutopsy',
  description: 'Find your betting personality in 60 seconds. 5 questions. No signup. Instant result.',
  alternates: {
    canonical: '/quiz/quick',
  },
  openGraph: {
    title: 'Quick Bet DNA Quiz | BetAutopsy',
    description: 'Find your betting personality in 60 seconds. 5 questions, instant result.',
    url: 'https://www.betautopsy.com/quiz/quick',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quick Bet DNA Quiz',
    description: '60-second quiz. Find your betting personality and hidden biases.',
  },
};

export default function QuickQuizPage() {
  return <QuickQuizClient />;
}

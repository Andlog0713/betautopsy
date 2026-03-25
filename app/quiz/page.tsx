import { Metadata } from 'next';
import QuizClient from './QuizClient';

export const metadata: Metadata = {
  title: 'What\'s Your Bet DNA? | Free Betting Personality Quiz | BetAutopsy',
  description: 'Take the free 2-minute quiz to discover your betting personality type, hidden biases, and what they\'re costing you. No signup required.',
  openGraph: {
    title: 'What\'s Your Bet DNA? | BetAutopsy',
    description: 'Discover your betting personality type and hidden biases in 2 minutes.',
    url: 'https://betautopsy.com/quiz',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'What\'s Your Bet DNA?',
    description: 'Free 2-minute quiz. Discover your betting personality and hidden biases.',
  },
};

export default function QuizPage() {
  return <QuizClient />;
}

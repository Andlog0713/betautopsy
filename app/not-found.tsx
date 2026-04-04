import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="md" variant="horizontal" theme="dark" />
        </div>
        <h1 className="font-bold text-5xl mb-3">404</h1>
        <p className="text-fg-muted mb-6">This page doesn&apos;t exist or has been moved.</p>
        <div className="flex flex-col gap-3 items-center">
          <Link href="/" className="btn-primary">
            ← Back to BetAutopsy
          </Link>
          <Link href="/quiz" className="text-sm text-scalpel hover:underline">
            Or take the free Bet DNA quiz →
          </Link>
        </div>
      </div>
      <p className="text-fg-dim text-xs text-center mt-16 max-w-sm">
        BetAutopsy provides behavioral analysis and educational insights, not gambling or financial advice. 21+. If you or someone you know has a gambling problem, call 1-800-GAMBLER.
      </p>
    </div>
  );
}

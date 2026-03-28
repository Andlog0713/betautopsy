import { Logo } from '@/components/logo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Logo size="md" variant="stacked" theme="dark" showTagline />
        </div>
        {children}
        <p className="text-ink-700 text-xs text-center mt-8">
          BetAutopsy provides behavioral analysis and educational insights — not
          gambling or financial advice. Past results don&apos;t guarantee future outcomes.
          21+. If you or someone you know has a gambling problem, call 1-800-GAMBLER.
        </p>
      </div>
    </div>
  );
}

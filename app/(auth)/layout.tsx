export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl">
            Bet<span className="text-flame-500">Autopsy</span>
          </h1>
          <p className="text-ink-600 text-sm mt-2">
            Your bets, dissected.
          </p>
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

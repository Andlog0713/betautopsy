import NavBar from '@/components/NavBar';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen">
      <NavBar />
      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-28 pb-16">
        {children}
      </div>

      <footer className="border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
          <p className="text-fg-dim text-xs text-center">
            BetAutopsy provides behavioral analysis and educational insights, not
            gambling or financial advice. Past results don&apos;t guarantee future outcomes.
            21+. If you or someone you know has a gambling problem, call 1-800-GAMBLER.
          </p>
        </div>
      </footer>
    </main>
  );
}

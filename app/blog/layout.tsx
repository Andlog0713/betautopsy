import NavBar from '@/components/NavBar';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen">
      <NavBar />
      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-28 pb-16">
        {children}
      </div>

      <footer className="border-t border-border-subtle">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-3">
          <div className="flex items-center justify-center gap-2">
            <a href="/privacy" className="font-mono text-xs text-fg-dim hover:text-fg transition-colors">Privacy Policy</a>
            <span className="text-fg-dim text-xs">·</span>
            <a href="/terms" className="font-mono text-xs text-fg-dim hover:text-fg transition-colors">Terms of Use</a>
          </div>
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

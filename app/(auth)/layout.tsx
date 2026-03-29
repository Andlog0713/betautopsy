import { Logo } from '@/components/logo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid-paper flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Logo size="md" variant="stacked" theme="dark" showTagline />
        </div>
        {children}
        <p className="font-mono text-[9px] text-fg-dim text-center mt-8 tracking-wider leading-relaxed max-w-sm mx-auto">
          BETAUTOPSY PROVIDES BEHAVIORAL ANALYSIS AND EDUCATIONAL INSIGHTS — NOT
          GAMBLING OR FINANCIAL ADVICE. PAST RESULTS DON&apos;T GUARANTEE FUTURE OUTCOMES.
          21+. IF YOU OR SOMEONE YOU KNOW HAS A GAMBLING PROBLEM, CALL 1-800-GAMBLER.
        </p>
      </div>
    </div>
  );
}

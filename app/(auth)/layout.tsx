import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left — brand panel with grid-paper */}
      <div className="hidden lg:flex flex-1 grid-paper border-r border-white/[0.04] p-12 flex-col justify-center">
        <div className="max-w-md">
          <Link href="/"><Logo size="md" variant="horizontal" theme="dark" /></Link>
          <div className="mt-10 mb-2">
            <div className="text-3xl font-bold text-fg-bright tracking-tight leading-[1.15]">
              Stop guessing.
            </div>
            <div className="text-3xl font-light text-scalpel tracking-tight leading-[1.15]">
              Start understanding.
            </div>
          </div>
          <p className="text-fg-muted text-sm leading-relaxed mt-4 mb-8">
            Upload your betting history and get a full behavioral analysis in 20 seconds.
          </p>
          <div className="space-y-3">
            {[
              'Cognitive bias detection with dollar costs',
              'Emotion Score & Discipline tracking',
              'Strategic leak analysis by sport & bet type',
              'Personalized rules & action plans',
              'Works with Pikkit, sportsbook CSVs, DFS apps',
            ].map(feature => (
              <div key={feature} className="flex items-center gap-3">
                <span className="font-mono text-[9px] text-scalpel border border-scalpel/20 px-1.5 py-0.5 rounded-sm">+</span>
                <span className="text-sm text-fg-muted">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 lg:max-w-[520px] flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile-only logo */}
        <div className="lg:hidden mb-8">
          <Link href="/"><Logo size="md" variant="stacked" theme="dark" showTagline /></Link>
        </div>

        <div className="w-full max-w-sm">
          <div className="case-header mb-6">SUBJECT INTAKE</div>
          {children}
        </div>

        <p className="text-fg-dim text-[10px] font-mono text-center mt-8 max-w-sm leading-relaxed tracking-wider">
          BETAUTOPSY PROVIDES BEHAVIORAL ANALYSIS AND EDUCATIONAL INSIGHTS. NOT GAMBLING
          OR FINANCIAL ADVICE. 21+. IF YOU OR SOMEONE YOU KNOW HAS A GAMBLING PROBLEM, CALL 1-800-GAMBLER.
        </p>
      </div>
    </div>
  );
}

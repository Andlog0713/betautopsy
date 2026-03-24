'use client';

const steps = [
  { num: 1, label: 'Upload your bets' },
  { num: 2, label: 'Run your autopsy' },
  { num: 3, label: 'Review your report' },
];

export default function OnboardingSteps({
  active,
  completed,
}: {
  active: number; // 1, 2, or 3
  completed: number[]; // e.g. [1] means step 1 is done
}) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4">
      {steps.map((step, i) => {
        const isDone = completed.includes(step.num);
        const isActive = step.num === active;

        return (
          <div key={step.num} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                  isDone
                    ? 'bg-mint-500/20 text-mint-500'
                    : isActive
                    ? 'bg-flame-500/20 text-flame-500'
                    : 'bg-ink-800 text-ink-700'
                }`}
              >
                {isDone ? '✓' : step.num}
              </span>
              <span
                className={`text-xs sm:text-sm transition-colors ${
                  isDone
                    ? 'text-mint-500'
                    : isActive
                    ? 'text-[#e7e6e1]'
                    : 'text-ink-700'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-6 sm:w-10 h-px ${
                  isDone ? 'bg-mint-500/30' : 'bg-ink-700/50'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

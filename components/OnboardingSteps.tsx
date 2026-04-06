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
                    ? 'bg-win/20 text-win'
                    : isActive
                    ? 'bg-scalpel-muted text-scalpel'
                    : 'bg-surface-1 text-fg-dim'
                }`}
              >
                {isDone ? '✓' : step.num}
              </span>
              <span
                className={`text-xs sm:text-sm transition-colors ${
                  isDone
                    ? 'text-win'
                    : isActive
                    ? 'text-fg-bright'
                    : 'text-fg-dim'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-6 sm:w-10 h-px ${
                  isDone ? 'bg-win/30' : 'bg-fg-dim/50'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

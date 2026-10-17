/**
 * Step navigation component for form wizard
 */

import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WizardStepMeta } from "../../types/formFill";

interface StepNavigationProps {
  currentIndex: number;
  steps: WizardStepMeta[];
  onStepChange: (index: number) => void;
}

export function StepNavigation({
  currentIndex,
  steps,
  onStepChange,
}: StepNavigationProps) {
  return (
    <div className="shrink-0 border-b border-border/60 px-4 py-2 sm:px-6">
      <nav
        className="grid items-stretch gap-1.5 sm:gap-2"
        style={{
          gridTemplateColumns: `repeat(${Math.max(steps.length, 1)}, minmax(0, 1fr))`,
        }}
      >
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isComplete = index < currentIndex;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                if (index <= currentIndex) {
                  onStepChange(index);
                }
              }}
              className={cn(
                "flex min-w-0 items-center justify-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-colors",
                isCurrent && "border-primary bg-primary/10 text-primary",
                isComplete &&
                  !isCurrent &&
                  "border-primary/40 bg-primary/5 text-primary",
                index > currentIndex && "border-border text-muted-foreground",
              )}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  isComplete
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {isComplete ? <CheckCircle className="h-3 w-3" /> : index + 1}
              </span>
              <span className="truncate font-medium">{step.name}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

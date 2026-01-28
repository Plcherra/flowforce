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
    <div className="border-b border-border/60 px-8 py-3">
      <nav className="flex items-center gap-2 overflow-x-auto pb-1">
        {steps.map((step, index) => {
          const Icon = step.icon;
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
                "group flex min-w-[140px] items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors",
                isCurrent &&
                  "border-primary bg-primary/10 text-primary shadow-sm",
                isComplete &&
                  !isCurrent &&
                  "border-primary/60 bg-primary/5 text-primary",
                index > currentIndex && "border-border text-muted-foreground",
              )}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  isComplete
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCurrent
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border text-muted-foreground",
                )}
              >
                {isComplete ? <CheckCircle className="h-3 w-3" /> : index + 1}
              </span>
              <span className="truncate text-left font-semibold">
                {step.name}
              </span>
              <Icon className="hidden h-4 w-4 text-muted-foreground/70 lg:block" />
            </button>
          );
        })}
      </nav>
    </div>
  );
}

import { cn } from "@/lib/utils";

export interface WizardStep {
  id: number;
  label: string;
}

interface CourseWizardStepsProps {
  steps: WizardStep[];
  current: number;
}

export function CourseWizardSteps({ steps, current }: CourseWizardStepsProps) {
  return (
    <div className="flex items-center gap-3 border-b px-6 py-3 text-sm">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
              index === current
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {index + 1}
          </div>
          <span
            className={cn(
              "font-medium",
              index === current ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <span className="text-muted-foreground">/</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default CourseWizardSteps;

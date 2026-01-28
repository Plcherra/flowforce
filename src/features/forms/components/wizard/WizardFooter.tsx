/**
 * Footer component for form wizard
 */

import { ArrowLeft, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface WizardFooterProps {
  progress: number;
  isSubmitting: boolean;
  currentIndex: number;
  isLastStep: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  canProceedNext: boolean;
}

export function WizardFooter({
  progress,
  isSubmitting,
  currentIndex,
  isLastStep,
  onBack,
  onNext,
  onSubmit,
  canProceedNext,
}: WizardFooterProps) {
  return (
    <footer className="flex flex-col gap-4 border-t border-border bg-muted/20 px-8 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 items-center gap-3">
        <span className="min-w-[120px] text-xs font-semibold text-muted-foreground">
          Completion {Math.round(progress)}%
        </span>
        <Progress value={progress} className="h-2 flex-1" />
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={currentIndex === 0 || isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {!isLastStep ? (
          <Button onClick={onNext} disabled={!canProceedNext || isSubmitting}>
            Next step
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={onSubmit} disabled={isSubmitting || !canProceedNext}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                Submit form
                <CheckCircle className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </footer>
  );
}

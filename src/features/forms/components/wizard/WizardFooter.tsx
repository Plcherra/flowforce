/**
 * Footer component for form wizard
 */

import { ArrowLeft, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  isSubmitting,
  currentIndex,
  isLastStep,
  onBack,
  onNext,
  onSubmit,
  canProceedNext,
}: WizardFooterProps) {
  return (
    <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-muted/20 px-4 py-2.5 sm:px-6">
      <Button
        variant="outline"
        size="sm"
        onClick={onBack}
        disabled={currentIndex === 0 || isSubmitting}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      {!isLastStep ? (
        <Button size="sm" onClick={onNext} disabled={!canProceedNext || isSubmitting}>
          Next step
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      ) : (
        <Button size="sm" onClick={onSubmit} disabled={isSubmitting || !canProceedNext}>
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
    </footer>
  );
}

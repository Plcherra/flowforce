import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

interface CourseWizardFooterProps {
  currentStep: number;
  totalSteps: number;
  canContinue: boolean;
  submitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function CourseWizardFooter({
  currentStep,
  totalSteps,
  canContinue,
  submitting,
  onBack,
  onNext,
  onSubmit,
}: CourseWizardFooterProps) {
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="flex items-center justify-between border-t bg-muted/40 px-6 py-4">
      <Button
        type="button"
        variant="ghost"
        onClick={onBack}
        disabled={currentStep === 0 || submitting}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      {isLastStep ? (
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!canContinue || submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              Create course
              <CheckCircle2 className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onNext}
          disabled={!canContinue || submitting}
        >
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export default CourseWizardFooter;

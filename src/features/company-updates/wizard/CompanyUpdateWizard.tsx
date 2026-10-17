import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { TemplateSelectionStep } from "./steps/TemplateSelectionStep";
import { DesignContentStep } from "./steps/DesignContentStep";
import { RecipientsStep } from "./steps/RecipientsStep";
import { PublishSettingsStep } from "./steps/PublishSettingsStep";
import { SummaryStep } from "./steps/SummaryStep";

import { useCompanyUpdateDraft } from "./useCompanyUpdateDraft";
import { WIZARD_STEPS } from "./steps";
import type {
  CompanyUpdateWizardProps,
  WizardFormData,
  WizardStepId,
} from "./types";

const STEP_COMPONENT_RENDERERS: Record<
  WizardStepId,
  (props: StepComponentProps) => React.ReactElement
> = {
  template: (props) => <TemplateSelectionStep {...props} />,
  design: (props) => <DesignContentStep {...props} />,
  recipients: (props) => <RecipientsStep {...props} />,
  publish: (props) => <PublishSettingsStep {...props} />,
  summary: ({ formData }) => <SummaryStep formData={formData} />,
};

interface StepComponentProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

export function CompanyUpdateWizard({
  open,
  onOpenChange,
  onComplete,
}: CompanyUpdateWizardProps) {
  const draft = useCompanyUpdateDraft();
  const { toast } = useToast();

  const autoSaveLabel = draft.lastSavedAt
    ? `Autosaved ${formatDistanceToNow(draft.lastSavedAt, { addSuffix: true })}`
    : draft.hasPersistedDraft
      ? "Draft restored from previous session"
      : "Autosave enabled";

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen && draft.isSubmitting) {
      return;
    }

    if (!nextOpen) {
      draft.reset();
    }

    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    draft.setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));

      toast({
        title: "Update created",
        description: "Your company update has been published and distributed.",
      });

      onComplete?.(draft.formData);
      onOpenChange(false);
      draft.reset();
    } catch (_error) {
      toast({
        title: "Unable to publish",
        description: "We could not publish the update. Please try again.",
        variant: "destructive",
      });
    } finally {
      draft.setIsSubmitting(false);
    }
  };

  const StepRenderer = STEP_COMPONENT_RENDERERS[draft.currentStep.id];

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="inset-0 left-0 top-0 z-[80] flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-none p-0 shadow-none sm:rounded-none">
        <WizardTopBar
          currentStepIndex={draft.currentStepIndex}
          totalSteps={draft.steps.length}
          statusLabel={autoSaveLabel}
          progress={draft.progress}
        />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <StepNavigation
              currentIndex={draft.currentStepIndex}
              onStepChange={draft.goToStep}
            />

            <div className="flex min-h-0 flex-1 overflow-hidden">
              <div className="min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={draft.currentStep.id}
                    className="w-full min-w-0"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    {StepRenderer({
                      formData: draft.formData,
                      updateFormData: draft.updateFormData,
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <WizardFooter
              canProceedNext={draft.canProceedToNext}
              isSubmitting={draft.isSubmitting}
              currentIndex={draft.currentStepIndex}
              onBack={draft.goBack}
              onNext={draft.goNext}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WizardTopBar({
  currentStepIndex,
  totalSteps,
  statusLabel,
  progress,
}: {
  currentStepIndex: number;
  totalSteps: number;
  statusLabel: string;
  progress: number;
}) {
  return (
    <header className="shrink-0 border-b border-border/80 bg-background/95 px-4 py-3 pr-12 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <DialogTitle className="text-lg font-semibold">
            Create company update
          </DialogTitle>
          <DialogDescription className="mt-0.5 text-sm text-muted-foreground">
            Write it, check the preview, then publish.
          </DialogDescription>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
          <Badge variant="outline" className="border-dashed">
            Step {currentStepIndex + 1} of {totalSteps}
          </Badge>
          <span>{statusLabel}</span>
        </div>
      </div>
      <Progress value={progress} className="mt-3 h-1" />
    </header>
  );
}

function StepNavigation({
  currentIndex,
  onStepChange,
}: {
  currentIndex: number;
  onStepChange: (index: number) => void;
}) {
  return (
    <div className="shrink-0 border-b border-border/60 px-4 py-2 sm:px-6">
      <nav className="grid grid-cols-5 items-stretch gap-1.5 sm:gap-2">
        {WIZARD_STEPS.map((step, index) => {
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

function WizardFooter({
  canProceedNext,
  isSubmitting,
  currentIndex,
  onBack,
  onNext,
  onSubmit,
}: {
  canProceedNext: boolean;
  isSubmitting: boolean;
  currentIndex: number;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  const isLastStep = currentIndex === WIZARD_STEPS.length - 1;

  return (
    <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-muted/20 px-4 py-2.5 sm:px-6">
      <div className="flex items-center justify-end gap-2">
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
                Publishing…
              </>
            ) : (
              <>
                Publish update
                <CheckCircle className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </footer>
  );
}

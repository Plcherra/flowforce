import React, { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { TemplateSelectionStep } from '@/components/updates/steps/TemplateSelectionStep';
import { DesignContentStep } from '@/components/updates/steps/DesignContentStep';
import { RecipientsStep } from '@/components/updates/steps/RecipientsStep';
import { PublishSettingsStep } from '@/components/updates/steps/PublishSettingsStep';
import { SummaryStep } from '@/components/updates/steps/SummaryStep';

import { useCompanyUpdateDraft } from './useCompanyUpdateDraft';
import { WIZARD_STEPS } from './steps';
import type { CompanyUpdateWizardProps, WizardFormData, WizardStepId } from './types';

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
  previewDevice?: 'desktop' | 'mobile';
  onPreviewDeviceChange?: (device: 'desktop' | 'mobile') => void;
}

export function CompanyUpdateWizard({ open, onOpenChange, onComplete }: CompanyUpdateWizardProps) {
  const draft = useCompanyUpdateDraft();
  const { toast } = useToast();
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  const autoSaveLabel = useMemo(() => {
    if (draft.lastSavedAt) {
      return `Autosaved ${formatDistanceToNow(draft.lastSavedAt, { addSuffix: true })}`;
    }
    if (draft.hasPersistedDraft) {
      return 'Draft restored from previous session';
    }
    return 'Autosave enabled';
  }, [draft.hasPersistedDraft, draft.lastSavedAt]);

  const handleDialogChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && draft.isSubmitting) {
        return;
      }

      if (!nextOpen) {
        draft.reset();
      }

      onOpenChange(nextOpen);
    },
    [draft, onOpenChange],
  );

  const handleSubmit = useCallback(async () => {
    draft.setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));

      toast({
        title: 'Update created',
        description: 'Your company update has been published and distributed.',
      });

      onComplete?.(draft.formData);
      onOpenChange(false);
      draft.reset();
    } catch (error) {
      toast({
        title: 'Unable to publish',
        description: 'We could not publish the update. Please try again.',
        variant: 'destructive',
      });
    } finally {
      draft.setIsSubmitting(false);
    }
  }, [draft, onComplete, onOpenChange, toast]);

  const StepRenderer = STEP_COMPONENT_RENDERERS[draft.currentStep.id];

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-5xl overflow-hidden border-none p-0 shadow-2xl">
        <div className="flex h-[85vh] flex-col">
          <WizardHeader currentStepIndex={draft.currentStepIndex} statusLabel={autoSaveLabel} />

          <StepNavigation
            currentIndex={draft.currentStepIndex}
            onStepChange={draft.goToStep}
          />

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={draft.currentStep.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {StepRenderer({
                  formData: draft.formData,
                  updateFormData: draft.updateFormData,
                  ...(draft.currentStep.id === 'design'
                    ? {
                        previewDevice,
                        onPreviewDeviceChange: setPreviewDevice,
                      }
                    : {}),
                })}
              </motion.div>
            </AnimatePresence>
          </div>

          <WizardFooter
            progress={draft.progress}
            canProceedNext={draft.canProceedToNext}
            isSubmitting={draft.isSubmitting}
            currentIndex={draft.currentStepIndex}
            onBack={draft.goBack}
            onNext={draft.goNext}
            onSubmit={handleSubmit}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WizardHeader({ currentStepIndex, statusLabel }: { currentStepIndex: number; statusLabel: string }) {
  return (
    <header className="flex flex-col gap-3 border-b border-border px-6 py-4">
      <div className="flex flex-col gap-2">
        <DialogTitle className="text-xl font-semibold">Create company update</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-muted-foreground">
          Follow the guided steps to craft an announcement, choose recipients, and publish it when you&apos;re ready.
        </DialogDescription>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <Badge variant="outline" className="border-dashed">
          Step {currentStepIndex + 1} of {WIZARD_STEPS.length}
        </Badge>
        <span>{statusLabel}</span>
      </div>
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
    <div className="border-b border-border/60 px-6 py-3">
      <nav className="flex items-center gap-2 overflow-x-auto pb-1">
        {WIZARD_STEPS.map((step, index) => {
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
                'group flex min-w-[140px] items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors',
                isCurrent && 'border-primary bg-primary/10 text-primary shadow-sm',
                isComplete && !isCurrent && 'border-primary/60 bg-primary/5 text-primary',
                index > currentIndex && 'border-border text-muted-foreground',
              )}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                  isComplete
                    ? 'border-primary bg-primary text-primary-foreground'
                    : isCurrent
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-border text-muted-foreground',
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

function WizardFooter({
  progress,
  canProceedNext,
  isSubmitting,
  currentIndex,
  onBack,
  onNext,
  onSubmit,
}: {
  progress: number;
  canProceedNext: boolean;
  isSubmitting: boolean;
  currentIndex: number;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  const isLastStep = currentIndex === WIZARD_STEPS.length - 1;

  return (
    <footer className="flex flex-col gap-4 border-t border-border bg-muted/20 px-6 py-4 md:flex-row md:items-center md:justify-between">
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

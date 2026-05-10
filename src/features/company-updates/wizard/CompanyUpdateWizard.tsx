import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Eye,
  Image as ImageIcon,
  Loader2,
  Palette,
  Send,
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
  previewDevice?: "desktop" | "mobile";
  onPreviewDeviceChange?: (device: "desktop" | "mobile") => void;
}

type QuickAction = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  targetId?: string;
  jumpToStep?: number;
};

export function CompanyUpdateWizard({
  open,
  onOpenChange,
  onComplete,
}: CompanyUpdateWizardProps) {
  const draft = useCompanyUpdateDraft();
  const { toast } = useToast();
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">(
    "desktop",
  );

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
    } catch (error) {
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
  const summaryIndex = draft.steps.findIndex((step) => step.id === "summary");
  const designIndex = draft.steps.findIndex((step) => step.id === "design");

  const quickActions = buildQuickActions(designIndex, summaryIndex);

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent
        style={{ transform: "none" }}
        className="flex h-screen w-screen max-w-none flex-col overflow-hidden rounded-none border-none bg-background p-0 shadow-none"
      >
        <WizardTopBar
          currentStepIndex={draft.currentStepIndex}
          totalSteps={draft.steps.length}
          statusLabel={autoSaveLabel}
          progress={draft.progress}
        />

        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-1 flex-col overflow-hidden">
            <StepNavigation
              currentIndex={draft.currentStepIndex}
              onStepChange={draft.goToStep}
            />

            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-8 py-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={draft.currentStep.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    {StepRenderer({
                      formData: draft.formData,
                      updateFormData: draft.updateFormData,
                      ...(draft.currentStep.id === "design"
                        ? {
                            previewDevice,
                            onPreviewDeviceChange: setPreviewDevice,
                          }
                        : {}),
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>

              <QuickActionRail
                actions={quickActions}
                onJumpToStep={draft.goToStep}
              />
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

function buildQuickActions(
  designIndex: number,
  summaryIndex: number,
): QuickAction[] {
  const actions: QuickAction[] = [
    {
      id: "preview",
      label: "Preview",
      icon: Eye,
      targetId: "wizard-preview",
      jumpToStep: designIndex >= 0 ? designIndex : undefined,
    },
    {
      id: "media",
      label: "Media",
      icon: ImageIcon,
      targetId: "wizard-section-media",
      jumpToStep: designIndex >= 0 ? designIndex : undefined,
    },
    {
      id: "style",
      label: "Style",
      icon: Palette,
      targetId: "wizard-section-style",
      jumpToStep: designIndex >= 0 ? designIndex : undefined,
    },
  ];

  if (summaryIndex >= 0) {
    actions.push({
      id: "publish",
      label: "Publish",
      icon: Send,
      jumpToStep: summaryIndex,
    });
  }

  return actions;
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
    <header className="border-b border-border/80 bg-background/95 px-8 py-4 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <DialogTitle className="text-2xl font-semibold">
            Create company update
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Follow the guided steps to craft an announcement, choose recipients,
            and publish it when you&apos;re ready.
          </DialogDescription>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
          <Badge variant="outline" className="border-dashed">
            Step {currentStepIndex + 1} of {totalSteps}
          </Badge>
          <span>{statusLabel}</span>
        </div>
      </div>
      <Progress value={progress} className="mt-4 h-1.5" />
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
    <div className="border-b border-border/60 px-8 py-3">
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

function QuickActionRail({
  actions,
  onJumpToStep,
}: {
  actions: QuickAction[];
  onJumpToStep: (index: number) => void;
}) {
  const handleClick = (action: QuickAction) => {
    const scrollToTarget = () => {
      if (action.targetId && typeof document !== "undefined") {
        const target = document.getElementById(action.targetId);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    };

    if (typeof action.jumpToStep === "number") {
      onJumpToStep(action.jumpToStep);
      if (action.targetId && typeof window !== "undefined") {
        window.setTimeout(scrollToTarget, 160);
      }
      return;
    }

    scrollToTarget();
  };

  if (actions.length === 0) {
    return null;
  }

  return (
    <aside className="hidden w-16 flex-col items-center gap-4 border-l border-border/60 bg-muted/30 px-2 py-6 lg:flex">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            type="button"
            onClick={() => handleClick(action)}
            className="flex h-16 w-12 flex-col items-center justify-center gap-1 rounded-full border border-dashed bg-background/80 text-xs font-semibold uppercase tracking-tight text-muted-foreground transition hover:border-primary hover:text-primary"
          >
            <Icon className="h-4 w-4" />
            <span className="text-[10px]">{action.label}</span>
          </button>
        );
      })}
    </aside>
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

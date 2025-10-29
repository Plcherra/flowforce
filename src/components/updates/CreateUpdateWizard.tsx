import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  FileText,
  Loader2,
} from 'lucide-react';

import { TemplateSelectionStep } from './steps/TemplateSelectionStep';
import { DesignContentStep } from './steps/DesignContentStep';
import { RecipientsStep } from './steps/RecipientsStep';
import { PublishSettingsStep } from './steps/PublishSettingsStep';
import { SummaryStep } from './steps/SummaryStep';

import {
  UpdateTemplate,
  BackgroundStyle,
  UpdateRecipient,
  PublishingSettings,
} from '@/types/updateTemplates';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CreateUpdateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (update: WizardFormData) => void;
}

export interface WizardFormData {
  template?: UpdateTemplate;
  title: string;
  content: string;
  richContent?: string;
  type: 'announcement' | 'news' | 'event' | 'policy';
  priority: 'high' | 'medium' | 'low';
  backgroundStyle: BackgroundStyle;
  recipients: UpdateRecipient;
  publishingSettings: PublishingSettings;
  category?: string;
}

const STEPS = [
  {
    id: 'template',
    name: 'Template',
    description: 'Select a starting point or begin from scratch.',
    icon: FileText,
  },
  {
    id: 'design',
    name: 'Design & Content',
    description: 'Craft the core message, visuals, and attachments.',
    icon: FileText,
  },
  {
    id: 'recipients',
    name: 'Recipients',
    description: 'Choose who should receive this update.',
    icon: FileText,
  },
  {
    id: 'publish',
    name: 'Publish Settings',
    description: 'Schedule delivery and engagement options.',
    icon: FileText,
  },
  {
    id: 'summary',
    name: 'Summary',
    description: 'Review details before publishing.',
    icon: CheckCircle,
  },
] as const;

export default function CreateUpdateWizard({ open, onOpenChange, onComplete }: CreateUpdateWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<WizardFormData>({
    title: '',
    content: '',
    type: 'announcement',
    priority: 'medium',
    backgroundStyle: {
      type: 'solid',
      primary: '#3b82f6',
    },
    recipients: {
      type: 'all',
      targets: [],
    },
    publishingSettings: {
      publishNow: true,
      notifications: {
        email: true,
        push: true,
        inApp: true,
        reminders: false,
      },
      engagement: {
        allowLikes: true,
        allowComments: true,
        allowSharing: false,
        requireConfirmation: false,
        showAsPopup: false,
      },
      authorAttribution: true,
    },
  });

  const progress = useMemo(() => ((currentStep + 1) / STEPS.length) * 100, [currentStep]);

  const updateFormData = (updates: Partial<WizardFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0:
        return true;
      case 1:
        return Boolean(formData.title.trim() && formData.content.trim());
      case 2:
        return formData.recipients.type === 'all' || formData.recipients.targets.length > 0;
      case 3:
        return formData.publishingSettings.publishNow || Boolean(formData.publishingSettings.scheduledDate);
      case 4:
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (canProceedToNext() && currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const resetWizard = () => {
    setCurrentStep(0);
    setFormData({
      title: '',
      content: '',
      type: 'announcement',
      priority: 'medium',
      backgroundStyle: { type: 'solid', primary: '#3b82f6' },
      recipients: { type: 'all', targets: [] },
      publishingSettings: {
        publishNow: true,
        notifications: {
          email: true,
          push: true,
          inApp: true,
          reminders: false,
        },
        engagement: {
          allowLikes: true,
          allowComments: true,
          allowSharing: false,
          requireConfirmation: false,
          showAsPopup: false,
        },
        authorAttribution: true,
      },
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));

      toast({
        title: 'Update created',
        description: 'Your company update has been published and distributed.',
      });

      onComplete?.(formData);
      onOpenChange(false);
      resetWizard();
    } catch (error) {
      toast({
        title: 'Unable to publish',
        description: 'We could not publish the update. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <TemplateSelectionStep formData={formData} updateFormData={updateFormData} />;
      case 1:
        return <DesignContentStep formData={formData} updateFormData={updateFormData} />;
      case 2:
        return <RecipientsStep formData={formData} updateFormData={updateFormData} />;
      case 3:
        return <PublishSettingsStep formData={formData} updateFormData={updateFormData} />;
      case 4:
        return <SummaryStep formData={formData} />;
      default:
        return null;
    }
  };

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen && isSubmitting) {
      return;
    }

    if (!nextOpen) {
      resetWizard();
    }

    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-5xl overflow-hidden border-none p-0 shadow-2xl">
        <div className="flex h-[85vh] flex-col">
          <header className="flex flex-col gap-3 border-b border-border px-6 py-4">
            <div className="flex flex-col gap-2">
              <DialogTitle className="text-xl font-semibold">Create company update</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Follow the guided steps to craft an announcement, choose recipients, and publish it when you&apos;re ready.
              </DialogDescription>
            </div>
            <Badge variant="outline" className="self-start">
              Step {currentStep + 1} of {STEPS.length}
            </Badge>
          </header>

          <div className="border-b border-border/60 px-6 py-3">
            <nav className="flex items-center gap-2 overflow-x-auto pb-1">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isCurrent = index === currentStep;
                const isComplete = index < currentStep;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      if (index <= currentStep) {
                        setCurrentStep(index);
                      }
                    }}
                    className={cn(
                      'group flex min-w-[140px] items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors',
                      isCurrent && 'border-primary bg-primary/10 text-primary shadow-sm',
                      isComplete && !isCurrent && 'border-primary/60 bg-primary/5 text-primary',
                      index > currentStep && 'border-border text-muted-foreground'
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
                            : 'border-border text-muted-foreground'
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

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>

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
                onClick={goBack}
                disabled={currentStep === 0 || isSubmitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button onClick={goNext} disabled={!canProceedToNext() || isSubmitting}>
                  Next step
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isSubmitting || !canProceedToNext()}>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

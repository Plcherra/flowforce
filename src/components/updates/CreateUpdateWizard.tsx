import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { TemplateSelectionStep } from './steps/TemplateSelectionStep';
import { DesignContentStep } from './steps/DesignContentStep';
import { RecipientsStep } from './steps/RecipientsStep';
import { PublishSettingsStep } from './steps/PublishSettingsStep';
import { SummaryStep } from './steps/SummaryStep';

import { UpdateTemplate, BackgroundStyle, UpdateRecipient, PublishingSettings } from '@/types/updateTemplates';
import { useToast } from '@/hooks/use-toast';

interface CreateUpdateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (update: any) => void;
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
  { id: 'template', name: 'Template', icon: FileText },
  { id: 'design', name: 'Design & Content', icon: FileText },
  { id: 'recipients', name: 'Recipients', icon: FileText },
  { id: 'publish', name: 'Publish Settings', icon: FileText },
  { id: 'summary', name: 'Summary', icon: CheckCircle }
];

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
      primary: '#3b82f6'
    },
    recipients: {
      type: 'all',
      targets: []
    },
    publishingSettings: {
      publishNow: true,
      notifications: {
        email: true,
        push: true,
        inApp: true,
        reminders: false
      },
      engagement: {
        allowLikes: true,
        allowComments: true,
        allowSharing: false,
        requireConfirmation: false,
        showAsPopup: false
      },
      authorAttribution: true
    }
  });

  const updateFormData = (updates: Partial<WizardFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0: // Template selection
        return true; // Can proceed with or without template
      case 1: // Design & Content
        return formData.title.trim() && formData.content.trim();
      case 2: // Recipients
        return formData.recipients.type === 'all' || formData.recipients.targets.length > 0;
      case 3: // Publish Settings
        return formData.publishingSettings.publishNow || formData.publishingSettings.scheduledDate;
      case 4: // Summary
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceedToNext() && currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Update Created Successfully!",
        description: "Your company update has been published."
      });

      onComplete?.(formData);
      onOpenChange(false);
      
      // Reset form
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
            reminders: false
          },
          engagement: {
            allowLikes: true,
            allowComments: true,
            allowSharing: false,
            requireConfirmation: false,
            showAsPopup: false
          },
          authorAttribution: true
        }
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create update. Please try again.",
        variant: "destructive"
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
        return <SummaryStep formData={formData} onSubmit={handleSubmit} isSubmitting={isSubmitting} />;
      default:
        return null;
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">Create Company Update</DialogTitle>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              {STEPS.map((step, index) => (
                <div 
                  key={step.id}
                  className={`flex items-center gap-1 ${
                    index <= currentStep ? 'text-primary font-medium' : ''
                  }`}
                >
                  <step.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{step.name}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="py-6"
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        {currentStep < STEPS.length - 1 && (
          <div className="flex justify-between items-center pt-4 border-t flex-shrink-0">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {STEPS.length}
            </div>

            <Button
              onClick={handleNext}
              disabled={!canProceedToNext()}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
import { useCallback, useMemo, useState } from 'react';

import type { WizardFormData, WizardStepId } from './types';
import { WIZARD_STEPS } from './steps';

const DEFAULT_FORM_DATA: WizardFormData = {
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
};

const STEP_VALIDATORS: Record<WizardStepId, (data: WizardFormData) => boolean> = {
  template: () => true,
  design: (data) => Boolean(data.title.trim() && data.content.trim()),
  recipients: (data) =>
    data.recipients.type === 'all' || (Array.isArray(data.recipients.targets) && data.recipients.targets.length > 0),
  publish: (data) => {
    if (data.publishingSettings.publishNow) return true;
    return Boolean(data.publishingSettings.scheduledDate);
  },
  summary: () => true,
};

export function useCompanyUpdateDraft(initialState?: Partial<WizardFormData>) {
  const [formData, setFormData] = useState<WizardFormData>({ ...DEFAULT_FORM_DATA, ...initialState });
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = WIZARD_STEPS;
  const currentStep = steps[currentStepIndex];

  const progress = useMemo(() => ((currentStepIndex + 1) / steps.length) * 100, [currentStepIndex, steps.length]);

  const updateFormData = useCallback((updates: Partial<WizardFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const canProceedToStep = useCallback(
    (stepId: WizardStepId) => {
      const validator = STEP_VALIDATORS[stepId];
      return validator ? validator(formData) : true;
    },
    [formData],
  );

  const canProceedToNext = useMemo(() => canProceedToStep(currentStep.id), [canProceedToStep, currentStep.id]);

  const goToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= steps.length) return;
      setCurrentStepIndex(index);
    },
    [steps.length],
  );

  const goNext = useCallback(() => {
    if (!canProceedToNext) return;
    setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  }, [canProceedToNext, steps.length]);

  const goBack = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setFormData({ ...DEFAULT_FORM_DATA, ...initialState });
    setCurrentStepIndex(0);
    setIsSubmitting(false);
  }, [initialState]);

  return {
    steps,
    currentStepIndex,
    currentStep,
    formData,
    updateFormData,
    canProceedToNext,
    canProceedToStep,
    goNext,
    goBack,
    goToStep,
    reset,
    progress,
    isSubmitting,
    setIsSubmitting,
  };
}

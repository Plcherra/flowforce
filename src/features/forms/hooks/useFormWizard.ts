/**
 * Hook for managing form wizard state and navigation
 */

import { useState, useCallback, useMemo } from "react";
import type { WizardStepId, WizardStepMeta } from "../types/formFill";
import type { FormSubmissionData } from "@/types/api";

interface UseFormWizardProps {
  steps: WizardStepMeta[];
  form: {
    trigger: (
      names: (keyof FormSubmissionData)[],
      options?: { shouldFocus?: boolean },
    ) => Promise<boolean>;
  };
  visibleFields: Set<string>;
}

export function useFormWizard({
  steps,
  form,
  visibleFields,
}: UseFormWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentStep = steps[currentStepIndex] ?? steps[0];
  const progress =
    steps.length > 1 ? (currentStepIndex / (steps.length - 1)) * 100 : 100;

  const validateStep = useCallback(
    async (stepId: WizardStepId) => {
      const step = steps.find((item) => item.id === stepId);
      if (!step?.fieldIds || step.fieldIds.length === 0) {
        return true;
      }
      const names = step.fieldIds.filter((fieldId) =>
        visibleFields.has(fieldId),
      ) as (keyof FormSubmissionData)[];
      if (names.length === 0) {
        return true;
      }
      return form.trigger(names, { shouldFocus: true });
    },
    [steps, form, visibleFields],
  );

  const handleNext = useCallback(async () => {
    const current = steps[currentStepIndex];
    if (current && current.id !== "review") {
      const isStepValid = await validateStep(current.id);
      if (!isStepValid) {
        return;
      }
    }
    setCurrentStepIndex((index) => Math.min(index + 1, steps.length - 1));
  }, [currentStepIndex, steps, validateStep]);

  const handleBack = useCallback(() => {
    setCurrentStepIndex((index) => Math.max(index - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setCurrentStepIndex(0);
  }, []);

  return {
    currentStepIndex,
    setCurrentStepIndex,
    currentStep,
    progress,
    handleNext,
    handleBack,
    reset,
  };
}

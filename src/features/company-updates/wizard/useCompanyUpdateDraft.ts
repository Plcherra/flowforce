import { useRef, useState } from "react";

import type { WizardFormData, WizardStepId } from "./types";
import { WIZARD_STEPS } from "./steps";
import { logger } from "@/utils/logger";

const DEFAULT_FORM_DATA: WizardFormData = {
  title: "",
  body: "",
  bodyPlainText: "",
  richContent: "",
  type: "announcement",
  priority: "medium",
  backgroundStyle: {
    type: "solid",
    primary: "#3b82f6",
  },
  recipients: {
    type: "all",
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
  updateMedia: [],
};

const STEP_VALIDATORS: Record<WizardStepId, (data: WizardFormData) => boolean> =
  {
    template: () => true,
    design: (data) =>
      Boolean(data.title.trim() && (data.bodyPlainText ?? "").trim()),
    recipients: (data) =>
      data.recipients.type === "all" ||
      (Array.isArray(data.recipients.targets) &&
        data.recipients.targets.length > 0),
    publish: (data) => {
      if (data.publishingSettings.publishNow) return true;
      return Boolean(data.publishingSettings.scheduledDate);
    },
    summary: () => true,
  };

const STORAGE_KEY = "company-update:draft";

type PersistedDraft = {
  data: WizardFormData;
  savedAt: string;
};

const loadPersistedDraft = (): PersistedDraft | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data) return null;
    return parsed as PersistedDraft;
  } catch {
    return null;
  }
};

export function useCompanyUpdateDraft(initialState?: Partial<WizardFormData>) {
  const persistedRef = useRef<PersistedDraft | null>(loadPersistedDraft());

  const [formData, setFormData] = useState<WizardFormData>({
    ...DEFAULT_FORM_DATA,
    ...initialState,
    ...(persistedRef.current?.data ?? {}),
  });
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(() =>
    persistedRef.current?.savedAt
      ? new Date(persistedRef.current.savedAt)
      : null,
  );

  const steps = WIZARD_STEPS;
  const currentStep = steps[currentStepIndex];

  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const canProceedToStep = (stepId: WizardStepId) => {
    const validator = STEP_VALIDATORS[stepId];
    return validator ? validator(formData) : true;
  };

  const canProceedToNext = canProceedToStep(currentStep.id);

  const goToStep = (index: number) => {
    if (index < 0 || index >= steps.length) return;
    setCurrentStepIndex(index);
  };

  const goNext = () => {
    if (!canProceedToNext) return;
    setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const goBack = () => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const clearDraft = () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
    persistedRef.current = null;
    setLastSavedAt(null);
  };

  const persistDraft = (data: WizardFormData) => {
    if (typeof window === "undefined") return;
    const payload: PersistedDraft = {
      data,
      savedAt: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      persistedRef.current = payload;
      setLastSavedAt(new Date(payload.savedAt));
    } catch (error) {
      logger.warn("Failed to persist update draft", {
        error,
        tags: ["warning"],
      });
    }
  };

  const scheduleSaveRef = useRef<number>();

  const handleAutoSave = (data: WizardFormData) => {
    if (typeof window === "undefined") return;
    if (scheduleSaveRef.current) {
      window.clearTimeout(scheduleSaveRef.current);
    }

    scheduleSaveRef.current = window.setTimeout(() => {
      const isDefaultState =
        JSON.stringify({ ...DEFAULT_FORM_DATA, ...initialState }) ===
        JSON.stringify(data);
      if (isDefaultState) {
        clearDraft();
        return;
      }
      persistDraft(data);
    }, 500);
  };

  const updateFormData = (updates: Partial<WizardFormData>) => {
    setFormData((prev) => {
      const next = { ...prev, ...updates };
      handleAutoSave(next);
      return next;
    });
  };

  const reset = () => {
    setFormData({ ...DEFAULT_FORM_DATA, ...initialState });
    setCurrentStepIndex(0);
    setIsSubmitting(false);
    clearDraft();
  };

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
    lastSavedAt,
    hasPersistedDraft: Boolean(persistedRef.current),
    clearDraft,
  };
}

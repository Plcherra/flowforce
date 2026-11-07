import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { COMPANY_DOCS_BUCKET } from "./constants";
import { acknowledgeOnboardingStep, completeOnboarding, uploadOnboardingRequirement } from "./employeeActions";
import type { OnboardingFailureReason } from "./failure";
import { loadEmployeeOnboarding } from "./loadEmployeeOnboarding";
import { openPrivateOnboardingFile } from "./storage";
import type { EmployeeOnboardingState, OnboardingStepView } from "./types";

function reasonMessage(reason: OnboardingFailureReason) {
  switch (reason) {
    case "missing":
      return "employeeOnboarding.missingSchema";
    case "type":
      return "employeeOnboarding.fileType";
    case "incomplete":
      return "employeeOnboarding.finishHelp";
    case "file":
    case "confirm":
      return "employeeOnboarding.uploadFailed";
    default:
      return "employeeOnboarding.saveFailed";
  }
}

export function useEmployeeOnboarding() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<EmployeeOnboardingState>({ kind: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (authLoading) return;
    if (!userId) {
      setState({ kind: "none" });
      return;
    }
    const next = await loadEmployeeOnboarding(userId);
    setState(next);
  }, [authLoading, userId]);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!userId) {
      setState({ kind: "none" });
      return;
    }
    setState({ kind: "loading" });
    loadEmployeeOnboarding(userId).then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [authLoading, userId]);

  const fail = (reason: OnboardingFailureReason) => {
    toast({ title: t(reasonMessage(reason)), variant: "destructive" });
  };

  const onAcknowledge = async (step: OnboardingStepView) => {
    if (!userId || !step.progressId || state.kind !== "ready") return;
    setBusyId(step.id);
    const result = await acknowledgeOnboardingStep(step.progressId, userId);
    setBusyId(null);
    if (result.ok === false) {
      fail(result.reason);
      return;
    }
    await reload();
  };

  const onUpload = async (step: OnboardingStepView, file: File) => {
    if (!userId || !step.progressId || state.kind !== "ready") return;
    setBusyId(step.id);
    const result = await uploadOnboardingRequirement({
      companyId: state.companyId,
      profileId: userId,
      progressId: step.progressId,
      file,
    });
    setBusyId(null);
    if (result.ok === false) {
      fail(result.reason);
      return;
    }
    await reload();
  };

  const onFinish = async () => {
    if (!userId || state.kind !== "ready") return;
    setBusyId("finish");
    const result = await completeOnboarding(state.enrollmentId, userId);
    setBusyId(null);
    if (result.ok === false) {
      fail(result.reason);
      return;
    }
    toast({ title: t("employeeOnboarding.finishedTitle") });
    await reload();
  };

  const onOpenDocument = async (step: OnboardingStepView) => {
    if (!step.documentPath) return;
    try {
      await openPrivateOnboardingFile(COMPANY_DOCS_BUCKET, step.documentPath);
    } catch {
      fail("file");
    }
  };

  return { state, busyId, onAcknowledge, onUpload, onFinish, onOpenDocument };
}

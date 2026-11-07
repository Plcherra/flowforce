import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useCan } from "@/hooks/useCan";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { COMPANY_DOCS_BUCKET, EMPLOYEE_FILES_BUCKET } from "./constants";
import type { OnboardingFailureReason } from "./failure";
import { loadOnboardingSettings, type SettingsLoad } from "./loadOnboardingSettings";
import {
  canManageOnboardingDocuments,
  canManageOnboardingSteps,
  nextStepSortOrder,
  visibleOnboardingSteps,
} from "./model";
import {
  archiveOnboardingStep,
  archiveShopDocument,
  createOnboardingStep,
  saveOnboardingWelcome,
  updateOnboardingStep,
  uploadShopDocument,
} from "./settingsActions";
import { openPrivateOnboardingFile } from "./storage";
import type { OnboardingDocument, OnboardingStepKind, OnboardingSubmission } from "./types";

function reasonMessage(reason: OnboardingFailureReason) {
  if (reason === "missing") return "employeeOnboarding.missingSchema";
  if (reason === "type") return "employeeOnboarding.fileType";
  return "employeeOnboarding.saveFailed";
}

export function useOnboardingSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { can } = useCan();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const userId = user?.id ?? null;
  const [load, setLoad] = useState<SettingsLoad | { kind: "loading" }>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const canManageSteps = canManageOnboardingSteps({ role: profile?.role, can });
  const canManageDocuments = canManageOnboardingDocuments({ role: profile?.role, can });

  const reload = useCallback(async () => {
    if (!companyId) {
      setLoad({ kind: "error" });
      return;
    }
    setLoad(await loadOnboardingSettings(companyId));
  }, [companyId]);

  useEffect(() => {
    let cancelled = false;
    if (!companyId) return;
    loadOnboardingSettings(companyId).then((next) => {
      if (!cancelled) setLoad(next);
    });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const run = async (action: () => Promise<{ ok: boolean; reason?: OnboardingFailureReason }>) => {
    if (!companyId || !userId) return;
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      toast({
        title: t(reasonMessage(result.reason ?? "generic")),
        variant: "destructive",
      });
      return;
    }
    toast({ title: t("employeeOnboarding.saved") });
    await reload();
  };

  return {
    load,
    busy,
    canManageSteps,
    canManageDocuments,
    saveWelcome: (title: string, body: string) =>
      run(async () => {
        if (!companyId || !userId) return { ok: false, reason: "generic" };
        return saveOnboardingWelcome({ companyId, userId, title, body });
      }),
    uploadDocument: (title: string, file: File) =>
      run(async () => {
        if (!companyId || !userId) return { ok: false, reason: "generic" };
        return uploadShopDocument({ companyId, userId, title, file });
      }),
    archiveDocument: (id: string) =>
      run(async () => {
        if (!companyId) return { ok: false, reason: "generic" };
        return archiveShopDocument(id, companyId);
      }),
    createStep: (input: {
      title: string;
      body: string;
      kind: OnboardingStepKind;
      required: boolean;
      documentId: string | null;
    }) =>
      run(async () => {
        if (!companyId || !userId || load.kind !== "ready") return { ok: false, reason: "generic" };
        return createOnboardingStep({
          ...input,
          companyId,
          userId,
          sortOrder: nextStepSortOrder(load.settings.steps),
        });
      }),
    archiveStep: (id: string) =>
      run(async () => {
        if (!companyId) return { ok: false, reason: "generic" };
        return archiveOnboardingStep(id, companyId);
      }),
    moveStep: (id: string, direction: -1 | 1) =>
      run(async () => {
        if (!companyId || load.kind !== "ready") return { ok: false, reason: "generic" };
        const ordered = visibleOnboardingSteps(load.settings.steps);
        const index = ordered.findIndex((step) => step.id === id);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= ordered.length) return { ok: true };
        const next = ordered.slice();
        const current = next[index];
        next[index] = next[target];
        next[target] = current;
        for (let position = 0; position < next.length; position += 1) {
          const step = next[position];
          const result = await updateOnboardingStep({
            id: step.id,
            companyId,
            title: step.title,
            body: step.body,
            required: step.required,
            documentId: step.documentId,
            sortOrder: position + 1,
          });
          if (!result.ok) return result;
        }
        return { ok: true };
      }),
    openDocument: async (document: OnboardingDocument) => {
      try {
        await openPrivateOnboardingFile(COMPANY_DOCS_BUCKET, document.storagePath);
      } catch {
        toast({ title: t("employeeOnboarding.uploadFailed"), variant: "destructive" });
      }
    },
    openSubmission: async (submission: OnboardingSubmission) => {
      try {
        await openPrivateOnboardingFile(EMPLOYEE_FILES_BUCKET, submission.storagePath);
      } catch {
        toast({ title: t("employeeOnboarding.uploadFailed"), variant: "destructive" });
      }
    },
  };
}

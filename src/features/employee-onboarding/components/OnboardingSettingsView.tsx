import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { OnboardingDocument, OnboardingStepKind, OnboardingStepView, OnboardingSubmission } from "../types";
import { HiringBuilder } from "./HiringBuilder";
import { OnboardingDocumentsCard } from "./OnboardingDocumentsCard";
import { OnboardingStepsCard } from "./OnboardingStepsCard";
import { OnboardingSubmissionsCard } from "./OnboardingSubmissionsCard";

export function OnboardingSettingsView({
  welcomeTitle,
  welcomeBody,
  documents,
  steps,
  submissions,
  canManageSteps,
  canManageDocuments,
  busy,
  onSaveWelcome,
  onUploadDocument,
  onArchiveDocument,
  onOpenDocument,
  onCreateStep,
  onArchiveStep,
  onMoveStep,
  onOpenSubmission,
}: {
  welcomeTitle: string;
  welcomeBody: string;
  documents: OnboardingDocument[];
  steps: OnboardingStepView[];
  submissions: OnboardingSubmission[];
  canManageSteps: boolean;
  canManageDocuments: boolean;
  busy: boolean;
  onSaveWelcome: (title: string, body: string) => void;
  onUploadDocument: (title: string, file: File) => void;
  onArchiveDocument: (id: string) => void;
  onOpenDocument: (document: OnboardingDocument) => void;
  onCreateStep: (input: {
    title: string;
    body: string;
    kind: OnboardingStepKind;
    required: boolean;
    documentId: string | null;
  }) => void;
  onArchiveStep: (id: string) => void;
  onMoveStep: (id: string, direction: -1 | 1) => void;
  onOpenSubmission: (submission: OnboardingSubmission) => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(welcomeTitle);
  const [body, setBody] = useState(welcomeBody);
  return (
    <div className="space-y-4" data-testid="onboarding-settings">
      <div>
        <h2 className="text-xl font-semibold">{t("employeeOnboarding.settingsTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("employeeOnboarding.settingsHelp")}</p>
      </div>
      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="space-y-2">
            <Label htmlFor="onboarding-welcome-title">{t("employeeOnboarding.welcomeTitleLabel")}</Label>
            <Input
              id="onboarding-welcome-title"
              value={title}
              disabled={!canManageSteps || busy}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="onboarding-welcome-body">{t("employeeOnboarding.welcomeBodyLabel")}</Label>
            <Textarea
              id="onboarding-welcome-body"
              value={body}
              disabled={!canManageSteps || busy}
              onChange={(event) => setBody(event.target.value)}
            />
          </div>
          {canManageSteps ? (
            <Button type="button" disabled={busy} onClick={() => onSaveWelcome(title, body)}>
              {t("employeeOnboarding.saveWelcome")}
            </Button>
          ) : null}
        </CardContent>
      </Card>
      <HiringBuilder canManage={canManageSteps} />
      <OnboardingDocumentsCard
        documents={documents}
        canManage={canManageDocuments}
        busy={busy}
        onUpload={onUploadDocument}
        onArchive={onArchiveDocument}
        onOpen={onOpenDocument}
      />
      <OnboardingStepsCard
        steps={steps}
        documents={documents}
        canManage={canManageSteps}
        busy={busy}
        onCreate={onCreateStep}
        onArchive={onArchiveStep}
        onMove={onMoveStep}
      />
      {canManageDocuments ? (
        <OnboardingSubmissionsCard submissions={submissions} onOpen={onOpenSubmission} />
      ) : null}
    </div>
  );
}

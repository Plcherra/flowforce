import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { visibleOnboardingSteps } from "../model";
import type { OnboardingDocument, OnboardingStepKind, OnboardingStepView } from "../types";

export function OnboardingStepsCard({
  steps,
  documents,
  canManage,
  busy,
  onCreate,
  onArchive,
  onMove,
}: {
  steps: OnboardingStepView[];
  documents: OnboardingDocument[];
  canManage: boolean;
  busy: boolean;
  onCreate: (input: {
    title: string;
    body: string;
    kind: OnboardingStepKind;
    required: boolean;
    documentId: string | null;
  }) => void;
  onArchive: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<OnboardingStepKind>("acknowledge");
  const [required, setRequired] = useState(true);
  const [documentId, setDocumentId] = useState("");
  const visible = visibleOnboardingSteps(steps);
  const liveDocuments = documents.filter((document) => !document.archivedAt);

  return (
    <Card data-testid="onboarding-steps">
      <CardHeader>
        <CardTitle className="text-lg">{t("employeeOnboarding.stepsTitle")}</CardTitle>
        <CardDescription>{t("employeeOnboarding.stepsHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!canManage ? <p className="text-sm text-muted-foreground">{t("employeeOnboarding.ownersOnly")}</p> : null}
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("employeeOnboarding.noSteps")}</p>
        ) : (
          visible.map((step, index) => (
            <div key={step.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground">
                  {step.kind === "upload"
                    ? t("employeeOnboarding.kindUpload")
                    : t("employeeOnboarding.kindAcknowledge")}
                </p>
              </div>
              {canManage ? (
                <>
                  <Button type="button" size="sm" variant="outline" disabled={busy || index === 0} onClick={() => onMove(step.id, -1)}>
                    {t("employeeOnboarding.moveUp")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy || index === visible.length - 1}
                    onClick={() => onMove(step.id, 1)}
                  >
                    {t("employeeOnboarding.moveDown")}
                  </Button>
                  <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onArchive(step.id)}>
                    {t("employeeOnboarding.archiveStep")}
                  </Button>
                </>
              ) : null}
            </div>
          ))
        )}
        {canManage ? (
          <form
            className="space-y-3 border-t pt-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!title.trim()) return;
              onCreate({
                title,
                body,
                kind,
                required,
                documentId: documentId || null,
              });
              setTitle("");
              setBody("");
              setDocumentId("");
              setRequired(true);
              setKind("acknowledge");
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="onboarding-step-title">{t("employeeOnboarding.stepTitleLabel")}</Label>
              <Input
                id="onboarding-step-title"
                value={title}
                placeholder={
                  kind === "upload"
                    ? t("employeeOnboarding.uploadTitlePlaceholder")
                    : t("employeeOnboarding.stepTitlePlaceholder")
                }
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="onboarding-step-body">{t("employeeOnboarding.stepBodyLabel")}</Label>
              <Textarea
                id="onboarding-step-body"
                value={body}
                placeholder={t("employeeOnboarding.stepBodyPlaceholder")}
                onChange={(event) => setBody(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="onboarding-step-kind">{t("employeeOnboarding.stepKindLabel")}</Label>
              <select
                id="onboarding-step-kind"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={kind}
                onChange={(event) => setKind(event.target.value === "upload" ? "upload" : "acknowledge")}
              >
                <option value="acknowledge">{t("employeeOnboarding.kindAcknowledge")}</option>
                <option value="upload">{t("employeeOnboarding.kindUpload")}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="onboarding-step-document">{t("employeeOnboarding.linkDocument")}</Label>
              <select
                id="onboarding-step-document"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={documentId}
                onChange={(event) => setDocumentId(event.target.value)}
              >
                <option value="">{t("employeeOnboarding.noLinkedDocument")}</option>
                {liveDocuments.map((document) => (
                  <option key={document.id} value={document.id}>
                    {document.title}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm" htmlFor="onboarding-step-required">
              <Checkbox
                id="onboarding-step-required"
                checked={required}
                onCheckedChange={(checked) => setRequired(checked === true)}
              />
              {t("employeeOnboarding.requiredStep")}
            </label>
            <Button type="submit" data-testid="onboarding-add-step" disabled={busy || !title.trim()}>
              {t("employeeOnboarding.addStep")}
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

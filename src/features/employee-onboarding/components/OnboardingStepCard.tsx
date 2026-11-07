import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Upload } from "lucide-react";
import type { OnboardingStepView } from "../types";

export function OnboardingStepCard({
  step,
  busy,
  onOpenDocument,
  onAcknowledge,
  onUpload,
}: {
  step: OnboardingStepView;
  busy: boolean;
  onOpenDocument: (step: OnboardingStepView) => void;
  onAcknowledge: (step: OnboardingStepView) => void;
  onUpload: (step: OnboardingStepView, file: File) => void;
}) {
  const { t } = useTranslation();
  const inputId = `onboarding-file-${step.id}`;
  return (
    <Card data-testid={`onboarding-step-${step.kind}`}>
      <div className="h-2 w-full bg-primary/80" />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {step.kind === "upload" ? (
              <Upload className="h-5 w-5 text-primary" />
            ) : (
              <FileText className="h-5 w-5 text-primary" />
            )}
            {step.title}
          </CardTitle>
          <Badge variant="outline">
            {step.done
              ? t("employeeOnboarding.done")
              : step.required
                ? t("employeeOnboarding.required")
                : t("employeeOnboarding.optional")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {step.body ? <p className="text-muted-foreground">{step.body}</p> : null}
        {step.documentTitle ? (
          <div className="flex items-center gap-3 rounded-lg border bg-primary/5 p-3">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate">{step.documentTitle}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!step.documentPath || busy}
              onClick={() => onOpenDocument(step)}
            >
              {t("employeeOnboarding.openDocument")}
            </Button>
          </div>
        ) : null}
        {step.kind === "acknowledge" ? (
          <label className="flex items-center gap-2" htmlFor={`ack-${step.id}`}>
            <Checkbox
              id={`ack-${step.id}`}
              checked={step.done}
              disabled={step.done || busy || !step.progressId}
              onCheckedChange={(checked) => {
                if (checked === true) onAcknowledge(step);
              }}
            />
            <span>{t("employeeOnboarding.acknowledgeLabel")}</span>
          </label>
        ) : (
          <div className="space-y-2">
            {step.fileName ? (
              <p>
                {t("employeeOnboarding.fileReady")}: {step.fileName}
              </p>
            ) : (
              <>
                <label className="sr-only" htmlFor={inputId}>
                  {t("employeeOnboarding.addFile")}
                </label>
                <input
                  id={inputId}
                  data-testid="onboarding-upload-input"
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  disabled={busy || !step.progressId}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onUpload(step, file);
                    event.target.value = "";
                  }}
                />
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

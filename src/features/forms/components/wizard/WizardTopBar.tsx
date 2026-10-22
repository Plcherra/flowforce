/**
 * Top bar component for form wizard
 */

import { useTranslation } from "react-i18next";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface WizardTopBarProps {
  title: string;
  description?: string;
  control?: string | null;
  onToggleOriginal?: () => void;
  currentStepIndex: number;
  totalSteps: number;
  statusLabel: string;
  progress: number;
  onClose: () => void;
}

export function WizardTopBar({
  title,
  description,
  control,
  onToggleOriginal,
  currentStepIndex,
  totalSteps,
  statusLabel,
  progress,
  onClose,
}: WizardTopBarProps) {
  const { t } = useTranslation();
  return (
    <header className="shrink-0 border-b border-border/80 bg-background/95 px-4 py-3 pr-12 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          {description && (
            <DialogDescription className="mt-0.5 text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          )}
          {control ? (
            <button
              type="button"
              className="mt-1 text-left text-xs text-muted-foreground underline"
              onClick={onToggleOriginal}
            >
              {control}
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
            <Badge variant="outline" className="border-dashed">
              {t("forms.stepProgress", {
                current: currentStepIndex + 1,
                total: totalSteps,
              })}
            </Badge>
            <span>{statusLabel}</span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            {t("common.close")}</Button>
        </div>
      </div>
      <Progress value={progress} className="mt-3 h-1" />
    </header>
  );
}

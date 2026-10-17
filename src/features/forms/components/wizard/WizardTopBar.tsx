/**
 * Top bar component for form wizard
 */

import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface WizardTopBarProps {
  title: string;
  description?: string;
  currentStepIndex: number;
  totalSteps: number;
  statusLabel: string;
  progress: number;
  onClose: () => void;
}

export function WizardTopBar({
  title,
  description,
  currentStepIndex,
  totalSteps,
  statusLabel,
  progress,
  onClose,
}: WizardTopBarProps) {
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
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
            <Badge variant="outline" className="border-dashed">
              Step {currentStepIndex + 1} of {totalSteps}
            </Badge>
            <span>{statusLabel}</span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
      <Progress value={progress} className="mt-3 h-1" />
    </header>
  );
}

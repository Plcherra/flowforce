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
    <header className="border-b border-border/80 bg-background/95 px-8 py-4 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <DialogTitle className="text-2xl font-semibold">{title}</DialogTitle>
          {description && (
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
          <Badge variant="outline" className="border-dashed">
            Step {currentStepIndex + 1} of {totalSteps}
          </Badge>
          <span>{statusLabel}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <Progress value={progress} className="mt-4 h-1.5" />
    </header>
  );
}

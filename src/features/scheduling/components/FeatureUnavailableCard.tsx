/**
 * Feature unavailable card component
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface FeatureUnavailableCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
}

export function FeatureUnavailableCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  disabled,
}: FeatureUnavailableCardProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="rounded-full bg-muted p-3 text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        {actionLabel && onAction && (
          <Button size="sm" onClick={onAction} disabled={disabled}>
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

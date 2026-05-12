import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface FeatureErrorStateProps {
  title?: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function FeatureErrorState({
  title = "Unable to load module",
  description,
  action,
  className,
}: FeatureErrorStateProps) {
  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{description}</p>
        {action}
      </AlertDescription>
    </Alert>
  );
}

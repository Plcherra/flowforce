import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { AlertTriangle } from "lucide-react";

interface FeatureSetupRequiredStateProps {
  title: string;
  description: string;
  setupTitle?: string;
  setupDescription: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}

export function FeatureSetupRequiredState({
  title,
  description,
  setupTitle = "Database setup needed",
  setupDescription,
  icon,
  action,
}: FeatureSetupRequiredStateProps) {
  return (
    <div className="px-4 py-6">
      <EmptyStateCard
        title={title}
        description={description}
        icon={icon}
        action={action}
      />
      <Alert className="mt-4 border-amber-200 bg-amber-50 text-amber-950">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{setupTitle}</AlertTitle>
        <AlertDescription>{setupDescription}</AlertDescription>
      </Alert>
    </div>
  );
}

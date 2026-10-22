"use client";

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface FeatureErrorStateProps {
  title?: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function FeatureErrorState({
  title,
  description,
  action,
  className,
}: FeatureErrorStateProps) {
  const { t } = useTranslation();
  const heading = title ?? t("shell.unableToLoadModule");

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{heading}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{description}</p>
        {action}
      </AlertDescription>
    </Alert>
  );
}

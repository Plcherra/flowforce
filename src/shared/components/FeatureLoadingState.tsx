"use client";

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { cn } from "@/lib/utils";

interface FeatureLoadingStateProps {
  title?: string;
  icon?: ReactNode;
  className?: string;
}

export function FeatureLoadingState({
  title,
  icon,
  className,
}: FeatureLoadingStateProps) {
  const { t } = useTranslation();
  const heading = title ?? t("shell.loadingModule");

  return (
    <div className={cn("flex min-h-[240px] items-center justify-center", className)}>
      <div className="flex flex-col items-center gap-3 text-center">
        {icon}
        <LoadingSpinner text={heading} />
      </div>
    </div>
  );
}

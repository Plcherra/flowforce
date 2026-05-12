import type { ReactNode } from "react";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { cn } from "@/lib/utils";

interface FeatureLoadingStateProps {
  title?: string;
  icon?: ReactNode;
  className?: string;
}

export function FeatureLoadingState({
  title = "Loading module...",
  icon,
  className,
}: FeatureLoadingStateProps) {
  return (
    <div className={cn("flex min-h-[240px] items-center justify-center", className)}>
      <div className="flex flex-col items-center gap-3 text-center">
        {icon}
        <LoadingSpinner text={title} />
      </div>
    </div>
  );
}

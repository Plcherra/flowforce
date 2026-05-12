import type { ReactNode } from "react";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";

interface FeatureEmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function FeatureEmptyState({
  title,
  description,
  icon,
  action,
  className,
}: FeatureEmptyStateProps) {
  return (
    <EmptyStateCard
      title={title}
      description={description}
      icon={icon}
      action={action}
      className={className}
    />
  );
}

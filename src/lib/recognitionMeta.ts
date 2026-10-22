import type { RecognitionSourceType } from "@/types/recognition";
import { Target, CheckCircle, GraduationCap, Star } from "lucide-react";

export type RecognitionIconMeta = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badgeColor: string;
};

export const recognitionSourceMeta: Record<
  RecognitionSourceType,
  RecognitionIconMeta
> = {
  goal_milestone: {
    label: "Goal Milestone",
    icon: Target,
    color: "text-primary",
    badgeColor: "bg-primary/10 text-primary",
  },
  goal_completion: {
    label: "Goal Completion",
    icon: Target,
    color: "text-primary",
    badgeColor: "bg-primary/10 text-primary",
  },
  task_completion: {
    label: "Task Completion",
    icon: CheckCircle,
    color: "text-success",
    badgeColor: "bg-success-muted text-success",
  },
  training_completion: {
    label: "Training Completed",
    icon: GraduationCap,
    color: "text-secondary",
    badgeColor: "bg-secondary/10 text-secondary",
  },
  onboarding_completion: {
    label: "Onboarding Completed",
    icon: GraduationCap,
    color: "text-secondary",
    badgeColor: "bg-secondary/10 text-secondary",
  },
  manual: {
    label: "Recognition",
    icon: Star,
    color: "text-warning",
    badgeColor: "bg-warning-muted text-warning-foreground",
  },
};

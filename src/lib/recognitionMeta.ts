import type { RecognitionSourceType } from '@/types/recognition';
import { Target, CheckCircle, GraduationCap, Star } from 'lucide-react';

export type RecognitionIconMeta = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badgeColor: string;
};

export const recognitionSourceMeta: Record<RecognitionSourceType, RecognitionIconMeta> = {
  goal_milestone: {
    label: 'Goal Milestone',
    icon: Target,
    color: 'text-blue-600',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  goal_completion: {
    label: 'Goal Completion',
    icon: Target,
    color: 'text-blue-600',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  task_completion: {
    label: 'Task Completion',
    icon: CheckCircle,
    color: 'text-emerald-600',
    badgeColor: 'bg-emerald-100 text-emerald-700',
  },
  training_completion: {
    label: 'Training Completed',
    icon: GraduationCap,
    color: 'text-purple-600',
    badgeColor: 'bg-purple-100 text-purple-700',
  },
  onboarding_completion: {
    label: 'Onboarding Completed',
    icon: GraduationCap,
    color: 'text-purple-600',
    badgeColor: 'bg-purple-100 text-purple-700',
  },
  manual: {
    label: 'Recognition',
    icon: Star,
    color: 'text-amber-600',
    badgeColor: 'bg-amber-100 text-amber-700',
  },
};

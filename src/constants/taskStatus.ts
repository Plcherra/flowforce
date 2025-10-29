import type { Tables } from '@/integrations/supabase/public-types';

type TaskRow = Tables<'tasks'>;
export type TaskStatus = TaskRow['status'];

export const TASK_STATUS_FLOW: TaskStatus[] = ['todo', 'in_progress', 'completed'];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  completed: 'Done',
  review: 'In Review',
  cancelled: 'Cancelled',
};

const FALLBACK_LABEL = 'Unknown';
const DEFAULT_BADGE_CLASS = 'bg-gray-100 text-gray-800';

const TASK_STATUS_BADGE_CLASS: Record<TaskStatus, string> = {
  todo: DEFAULT_BADGE_CLASS,
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  review: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
};

export const getTaskStatusLabel = (status?: string | null) => {
  if (!status) return FALLBACK_LABEL;
  return TASK_STATUS_LABELS[status as TaskStatus] ?? status.replace(/_/g, ' ');
};

export const getTaskStatusBadgeClass = (status?: string | null) => {
  if (!status) return DEFAULT_BADGE_CLASS;
  return TASK_STATUS_BADGE_CLASS[status as TaskStatus] ?? DEFAULT_BADGE_CLASS;
};

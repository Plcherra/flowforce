export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'blocked' | 'done' | 'cancelled' | 'completed';

// Use 'completed' instead of 'done' to match database enum
export const TASK_STATUS_FLOW: TaskStatus[] = ['todo', 'in_progress', 'review', 'completed'];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'In Review',
  blocked: 'Blocked',
  done: 'Done',
  cancelled: 'Cancelled',
  completed: 'Done',
};

const FALLBACK_LABEL = 'Unknown';
const DEFAULT_BADGE_CLASS = 'bg-gray-100 text-gray-800';

const TASK_STATUS_BADGE_CLASS: Record<TaskStatus, string> = {
  todo: DEFAULT_BADGE_CLASS,
  in_progress: 'bg-blue-100 text-blue-800',
  review: 'bg-purple-100 text-purple-800',
  blocked: 'bg-amber-100 text-amber-800',
  done: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
};

export const getTaskStatusLabel = (status?: string | null) => {
  if (!status) return FALLBACK_LABEL;
  return TASK_STATUS_LABELS[status as TaskStatus] ?? status.replace(/_/g, ' ');
};

export const getTaskStatusBadgeClass = (status?: string | null) => {
  if (!status) return DEFAULT_BADGE_CLASS;
  return TASK_STATUS_BADGE_CLASS[status as TaskStatus] ?? DEFAULT_BADGE_CLASS;
};

export type TaskStatus =
  | "todo"
  | "in_progress"
  | "review"
  | "blocked"
  | "done"
  | "cancelled"
  | "completed";

// Use 'completed' instead of 'done' to match database enum
export const TASK_STATUS_FLOW: TaskStatus[] = [
  "todo",
  "in_progress",
  "review",
  "completed",
];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "In Review",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
  completed: "Done",
};

const FALLBACK_LABEL = "Unknown";
const DEFAULT_BADGE_CLASS = "bg-muted text-foreground";

const TASK_STATUS_BADGE_CLASS: Record<TaskStatus, string> = {
  todo: DEFAULT_BADGE_CLASS,
  in_progress: "bg-primary/10 text-primary",
  review: "bg-secondary/10 text-secondary",
  blocked: "bg-warning-muted text-warning-foreground",
  done: "bg-success-muted text-success",
  cancelled: "bg-destructive/10 text-destructive",
  completed: "bg-success-muted text-success",
};

export const getTaskStatusLabel = (status?: string | null) => {
  if (!status) return FALLBACK_LABEL;
  return TASK_STATUS_LABELS[status as TaskStatus] ?? status.replace(/_/g, " ");
};

export const getTaskStatusBadgeClass = (status?: string | null) => {
  if (!status) return DEFAULT_BADGE_CLASS;
  return TASK_STATUS_BADGE_CLASS[status as TaskStatus] ?? DEFAULT_BADGE_CLASS;
};

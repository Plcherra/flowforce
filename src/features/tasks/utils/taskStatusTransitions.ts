/**
 * Simple task workflow enforced on the server (and mirrored client-side via useTasks).
 * Open → completed or cancelled; completed/cancelled → todo (undo/uncancel).
 * Legacy in_progress/review/blocked/open rows are treated as open on transition FROM.
 */
export const TASK_STATUS_TRANSITIONS = {
  todo: ["completed", "cancelled"],
  completed: ["todo"],
  cancelled: ["todo"],
} as const;

export type TaskStatusTransitionKey = keyof typeof TASK_STATUS_TRANSITIONS;

const LEGACY_OPEN_FROM = new Set(["open", "in_progress", "review", "blocked"]);

const TARGET_ALIASES: Record<string, TaskStatusTransitionKey> = {
  done: "completed",
  open: "todo",
};

export function normalizeFromStatusForTransition(
  status: string | null | undefined,
): TaskStatusTransitionKey | null {
  if (!status) return null;
  if (LEGACY_OPEN_FROM.has(status)) {
    return "todo";
  }
  if (status === "done") {
    return "completed";
  }
  if (status in TASK_STATUS_TRANSITIONS) {
    return status as TaskStatusTransitionKey;
  }
  return null;
}

export function normalizeToStatusForTransition(
  status: string | null | undefined,
): TaskStatusTransitionKey | null {
  if (!status) return null;
  const aliased = TARGET_ALIASES[status];
  if (aliased) return aliased;
  if (LEGACY_OPEN_FROM.has(status)) {
    return null;
  }
  if (status in TASK_STATUS_TRANSITIONS) {
    return status as TaskStatusTransitionKey;
  }
  return null;
}

export function isAllowedTaskStatusTransition(
  fromStatus: string | null | undefined,
  toStatus: string | null | undefined,
): boolean {
  const from = normalizeFromStatusForTransition(fromStatus);
  const to = normalizeToStatusForTransition(toStatus);
  if (!from || !to) {
    return false;
  }
  if (from === to) {
    return true;
  }
  const allowed = TASK_STATUS_TRANSITIONS[from] as readonly string[];
  return allowed.includes(to);
}
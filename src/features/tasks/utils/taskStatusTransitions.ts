export const TASK_STATUS_TRANSITIONS = {
  todo: ["in_progress", "completed", "cancelled"],
  in_progress: ["review", "completed", "blocked", "cancelled", "todo"],
  review: ["completed", "todo", "cancelled"],
  blocked: ["in_progress", "completed", "cancelled"],
  done: ["todo"],
  completed: ["todo"],
  cancelled: ["todo"],
} as const;

export type TaskStatusTransitionKey = keyof typeof TASK_STATUS_TRANSITIONS;

const LEGACY_FROM_ALIASES: Record<string, TaskStatusTransitionKey> = {
  open: "todo",
};

const TARGET_ALIASES: Record<string, TaskStatusTransitionKey> = {
  done: "completed",
  open: "todo",
};

export function normalizeFromStatusForTransition(
  status: string | null | undefined,
): TaskStatusTransitionKey | null {
  if (!status) return null;
  if (status in TASK_STATUS_TRANSITIONS) {
    return status as TaskStatusTransitionKey;
  }
  return LEGACY_FROM_ALIASES[status] ?? null;
}

export function normalizeToStatusForTransition(
  status: string | null | undefined,
): TaskStatusTransitionKey | null {
  if (!status) return null;
  const aliased = TARGET_ALIASES[status] ?? LEGACY_FROM_ALIASES[status];
  if (aliased) return aliased;
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
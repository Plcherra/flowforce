import {
  compareTaskDue,
  isTaskOverdue,
  DEFAULT_SHOP_TIMEZONE,
  type TaskDueShape,
} from "./taskDueTiming";

export type TaskSortKey = "due" | "priority" | "updated";

const VALID_SORT = new Set<TaskSortKey>(["due", "priority", "updated"]);

export function parseTaskSortKey(value: string | null | undefined): TaskSortKey {
  if (value && VALID_SORT.has(value as TaskSortKey)) {
    return value as TaskSortKey;
  }
  return "due";
}

export type TaskSortable = TaskDueShape & {
  id?: string;
  priority?: string | null;
  status?: string | null;
  updated_at?: string | null;
};

const PRIORITY_RANK: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function priorityRank(priority: string | null | undefined): number {
  if (!priority) return 100;
  return PRIORITY_RANK[priority] ?? 50;
}

export function compareTaskDueForList(
  left: TaskSortable,
  right: TaskSortable,
  timeZone: string = DEFAULT_SHOP_TIMEZONE,
  now: Date = new Date(),
): number {
  const leftOverdue = isTaskOverdue(left, timeZone, now);
  const rightOverdue = isTaskOverdue(right, timeZone, now);
  if (leftOverdue !== rightOverdue) {
    return leftOverdue ? -1 : 1;
  }
  return compareTaskDue(left, right, timeZone);
}

export function compareTasksForSort(
  left: TaskSortable,
  right: TaskSortable,
  sort: TaskSortKey,
  timeZone: string = DEFAULT_SHOP_TIMEZONE,
  now: Date = new Date(),
): number {
  if (sort === "priority") {
    const byPriority = priorityRank(left.priority) - priorityRank(right.priority);
    if (byPriority !== 0) return byPriority;
    return compareTaskDueForList(left, right, timeZone, now);
  }

  if (sort === "updated") {
    const leftStamp = left.updated_at ?? "";
    const rightStamp = right.updated_at ?? "";
    const byUpdated = rightStamp.localeCompare(leftStamp);
    if (byUpdated !== 0) return byUpdated;
    return compareTaskDueForList(left, right, timeZone, now);
  }

  return compareTaskDueForList(left, right, timeZone, now);
}

export function sortTaskList<T extends TaskSortable>(
  tasks: readonly T[],
  sort: TaskSortKey,
  timeZone: string = DEFAULT_SHOP_TIMEZONE,
  now: Date = new Date(),
): T[] {
  return [...tasks].sort((left, right) =>
    compareTasksForSort(left, right, sort, timeZone, now),
  );
}
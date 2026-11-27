import { normalizeStatus } from "./normalization";
import { readAssigneeIds } from "./shiftTaskWrite";
import {
  DEFAULT_SHOP_TIMEZONE,
  isTaskDueToday,
  isTaskOverdue,
  type TaskDueShape,
} from "./taskDueTiming";

export type ReadinessFilter = "overdue" | "unassigned" | "due";

export const READINESS_DEFINITIONS: Record<ReadinessFilter, string> = {
  overdue:
    "Past the due time, or before today when only a due date is set, and the task is not done or cancelled.",
  unassigned: "Nobody is assigned.",
  due: "Due today and not yet overdue, and the task is not done or cancelled.",
};

interface ReadinessTask extends TaskDueShape {
  status?: string | null;
  assigned_to?: string | null;
  links?: unknown;
}

function isClosed(status?: string | null) {
  const normalized = normalizeStatus(status);
  return (
    normalized === "done" ||
    normalized === "completed" ||
    normalized === "cancelled"
  );
}

export function isOverdueTask(
  task: ReadinessTask,
  timeZone: string = DEFAULT_SHOP_TIMEZONE,
  now: Date = new Date(),
): boolean {
  if (!task.due_date && !task.due_at) return false;
  if (isClosed(task.status)) return false;
  return isTaskOverdue(task, timeZone, now);
}

export function isDueTodayTask(
  task: ReadinessTask,
  timeZone: string = DEFAULT_SHOP_TIMEZONE,
  now: Date = new Date(),
): boolean {
  if (!task.due_date && !task.due_at) return false;
  if (isClosed(task.status)) return false;
  return isTaskDueToday(task, timeZone, now);
}

export function isUnassignedTask(task: ReadinessTask): boolean {
  if (task.assigned_to) return false;
  return readAssigneeIds(task.links, null).length === 0;
}

export function readinessCounts(
  tasks: ReadinessTask[],
  timeZone: string = DEFAULT_SHOP_TIMEZONE,
  now: Date = new Date(),
) {
  return {
    overdue: tasks.filter((task) => isOverdueTask(task, timeZone, now)).length,
    unassigned: tasks.filter((task) => isUnassignedTask(task)).length,
    due: tasks.filter((task) => isDueTodayTask(task, timeZone, now)).length,
  };
}

export function applyReadinessFilter<T extends ReadinessTask>(
  tasks: T[],
  filter: ReadinessFilter | null,
  timeZone: string = DEFAULT_SHOP_TIMEZONE,
  now: Date = new Date(),
): T[] {
  if (filter === "overdue") {
    return tasks.filter((task) => isOverdueTask(task, timeZone, now));
  }
  if (filter === "due") {
    return tasks.filter((task) => isDueTodayTask(task, timeZone, now));
  }
  if (filter === "unassigned") {
    return tasks.filter((task) => isUnassignedTask(task));
  }
  return tasks;
}
import { isPast, isToday } from "date-fns";
import { normalizeStatus } from "./normalization";

export type ReadinessFilter = "overdue" | "unassigned" | "due";

export const READINESS_DEFINITIONS: Record<ReadinessFilter, string> = {
  overdue:
    "The due date is before today, and the task is not done or cancelled.",
  unassigned: "Nobody is assigned.",
  due: "The due date is today, and the task is not done or cancelled.",
};

interface ReadinessTask {
  due_date?: string | null;
  status?: string | null;
  assigned_to?: string | null;
}

function isClosed(status?: string | null) {
  const normalized = normalizeStatus(status);
  return (
    normalized === "done" ||
    normalized === "completed" ||
    normalized === "cancelled"
  );
}

export function isOverdueTask(task: ReadinessTask): boolean {
  if (!task.due_date || isClosed(task.status)) return false;
  const due = new Date(task.due_date);
  return isPast(due) && !isToday(due);
}

export function isDueTodayTask(task: ReadinessTask): boolean {
  if (!task.due_date || isClosed(task.status)) return false;
  return isToday(new Date(task.due_date));
}

export function isUnassignedTask(task: ReadinessTask): boolean {
  return !task.assigned_to;
}

export function readinessCounts(tasks: ReadinessTask[]) {
  return {
    overdue: tasks.filter((task) => isOverdueTask(task)).length,
    unassigned: tasks.filter((task) => isUnassignedTask(task)).length,
    due: tasks.filter((task) => isDueTodayTask(task)).length,
  };
}

export function applyReadinessFilter<T extends ReadinessTask>(
  tasks: T[],
  filter: ReadinessFilter | null,
): T[] {
  if (filter === "overdue") return tasks.filter((task) => isOverdueTask(task));
  if (filter === "due") return tasks.filter((task) => isDueTodayTask(task));
  if (filter === "unassigned") {
    return tasks.filter((task) => isUnassignedTask(task));
  }
  return tasks;
}

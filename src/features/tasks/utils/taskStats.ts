/**
 * Utility functions for calculating task statistics
 */

import type { KnownTaskStatus } from "../types/filters";
import { normalizeStatus } from "./normalization";

interface Task {
  status?: string | null;
}

/**
 * Calculate task counts by status
 */
export function calculateTasksByStatus(
  tasks: Task[],
): Record<KnownTaskStatus | "other", number> {
  return tasks.reduce<Record<KnownTaskStatus | "other", number>>(
    (acc, task) => {
      const key = normalizeStatus(task.status);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {} as Record<KnownTaskStatus | "other", number>,
  );
}

/**
 * Count tasks with "other" status
 */
export function countOtherStatusTasks(tasks: Task[]): number {
  return tasks.reduce(
    (count, task) =>
      normalizeStatus(task.status) === "other" ? count + 1 : count,
    0,
  );
}

/**
 * Count tasks with "other" priority
 */
export function countOtherPriorityTasks(
  tasks: Array<{ priority?: string | null }>,
): number {
  return tasks.reduce(
    (count, task) =>
      normalizePriority(task.priority) === "other" ? count + 1 : count,
    0,
  );
}

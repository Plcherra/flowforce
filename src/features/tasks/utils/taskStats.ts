/**
 * Utility functions for calculating task statistics
 */

import type { KnownTaskStatus } from "../types/filters";
import { normalizePriority, normalizeStatus } from "./normalization";
import { statusBucketForTabs } from "./simpleTaskWorkflow";

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
      const bucket = statusBucketForTabs(key);
      if (bucket === "other") {
        acc.other = (acc.other ?? 0) + 1;
      } else {
        acc[bucket] = (acc[bucket] ?? 0) + 1;
      }
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

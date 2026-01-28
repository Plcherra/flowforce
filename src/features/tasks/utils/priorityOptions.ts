/**
 * Utility functions for generating priority filter options
 */

import type { TaskPriorityFilter } from "../types/filters";
import { KNOWN_PRIORITIES } from "../types/filters";
import { PRIORITY_LABELS } from "../constants/labels";
import { countOtherPriorityTasks } from "./taskStats";

interface PriorityOption {
  value: TaskPriorityFilter;
  label: string;
}

/**
 * Generate priority filter options
 */
export function generatePriorityOptions(
  tasks: Array<{ priority?: string | null }>,
): PriorityOption[] {
  const otherPriorityCount = countOtherPriorityTasks(tasks);

  const opts: PriorityOption[] = [{ value: "all", label: "All priorities" }];

  KNOWN_PRIORITIES.forEach((priority) => {
    opts.push({
      value: priority,
      label: PRIORITY_LABELS[priority],
    });
  });

  if (otherPriorityCount > 0) {
    opts.push({ value: "other", label: "Other" });
  }

  return opts;
}

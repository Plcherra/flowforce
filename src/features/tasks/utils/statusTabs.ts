/**
 * Utility functions for generating status tabs
 */

import type { TaskStatusFilter } from "../types/filters";
import { KNOWN_STATUSES } from "../types/filters";
import { STATUS_LABELS } from "../constants/labels";
import { calculateTasksByStatus, countOtherStatusTasks } from "./taskStats";

interface StatusTab {
  value: TaskStatusFilter;
  label: string;
  count: number;
}

/**
 * Generate status tabs with counts
 */
export function generateStatusTabs(
  tasks: Array<{ status?: string | null }>,
  totalTasks: number,
): StatusTab[] {
  const tasksByStatus = calculateTasksByStatus(tasks);
  const otherStatusCount = countOtherStatusTasks(tasks);

  const tabs: StatusTab[] = [{ value: "all", label: "All", count: totalTasks }];

  KNOWN_STATUSES.forEach((status) => {
    tabs.push({
      value: status,
      label: STATUS_LABELS[status],
      count: tasksByStatus[status] ?? 0,
    });
  });

  if (otherStatusCount > 0) {
    tabs.push({
      value: "other",
      label: "Other",
      count: otherStatusCount,
    });
  }

  return tabs;
}

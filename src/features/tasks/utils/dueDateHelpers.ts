/**
 * Utility functions for task due dates
 */

import { format, differenceInDays } from "date-fns";
import type { DueBadge } from "../types/filters";
import { normalizeStatus } from "./normalization";

/**
 * Calculate due badge for a task
 */
export function calculateDueBadge(
  task: {
    due_date?: string | null;
    status?: string | null;
  },
  now: Date = new Date(),
): DueBadge | null {
  if (!task?.due_date) return null;

  const dueDate = new Date(task.due_date);
  const normalizedStatus = normalizeStatus(task.status);

  // Treat both 'done' and 'completed' as completed states
  if (normalizedStatus === "done" || normalizedStatus === "completed") {
    return {
      label: "Completed",
      className:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    };
  }

  if (dueDate < now) {
    return {
      label: "Overdue",
      className: "bg-red-100 text-red-700 dark:bg-red-900/25 dark:text-red-300",
    };
  }

  const daysRemaining = differenceInDays(dueDate, now);

  if (daysRemaining <= 2) {
    return {
      label: "Due Soon",
      className:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/25 dark:text-orange-300",
    };
  }

  return {
    label: `Due ${format(dueDate, "MMM dd")}`,
    className:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  };
}

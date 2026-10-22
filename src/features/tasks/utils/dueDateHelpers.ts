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
        "bg-success-muted text-success",
    };
  }

  if (dueDate < now) {
    return {
      label: "Overdue",
      className: "bg-destructive/10 text-destructive",
    };
  }

  const daysRemaining = differenceInDays(dueDate, now);

  if (daysRemaining <= 2) {
    return {
      label: "Due Soon",
      className:
        "bg-warning-muted text-warning-foreground",
    };
  }

  return {
    label: `Due ${format(dueDate, "MMM dd")}`,
    className:
      "bg-muted text-muted-foreground",
  };
}

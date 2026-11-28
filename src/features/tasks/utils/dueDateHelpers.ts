/**
 * Utility functions for task due dates
 */

import { format, differenceInCalendarDays } from "date-fns";
import type { DueBadge } from "../types/filters";
import { normalizeStatus } from "./normalization";
import {
  DEFAULT_SHOP_TIMEZONE,
  isTaskOverdue,
  resolveTaskDueInstant,
  shopCalendarYmd,
  type TaskDueShape,
} from "./taskDueTiming";

/**
 * Calculate due badge for a task
 */
export function calculateDueBadge(
  task: TaskDueShape & { status?: string | null },
  timeZone: string = DEFAULT_SHOP_TIMEZONE,
  now: Date = new Date(),
): DueBadge | null {
  if (!task?.due_date && !task?.due_at) return null;

  const normalizedStatus = normalizeStatus(task.status);

  if (normalizedStatus === "done" || normalizedStatus === "completed") {
    return {
      label: "Completed",
      className: "bg-success-muted text-success",
    };
  }

  if (isTaskOverdue(task, timeZone, now)) {
    return {
      label: "Overdue",
      className: "bg-destructive/10 text-destructive",
    };
  }

  const dueInstant = resolveTaskDueInstant(task, timeZone);
  if (!dueInstant) return null;

  const dueDay = new Date(`${shopCalendarYmd(dueInstant, timeZone)}T12:00:00`);
  const today = new Date(`${shopCalendarYmd(now, timeZone)}T12:00:00`);
  const daysRemaining = differenceInCalendarDays(dueDay, today);

  if (daysRemaining <= 2) {
    return {
      label: "Due Soon",
      className: "bg-warning-muted text-warning-foreground",
    };
  }

  return {
    label: `Due ${format(dueInstant, "MMM dd")}`,
    className: "bg-muted text-muted-foreground",
  };
}
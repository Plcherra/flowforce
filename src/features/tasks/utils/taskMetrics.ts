/**
 * Utility functions for calculating task metrics
 */

import { differenceInDays } from "date-fns";
import type { TaskMetric } from "../types/filters";
import { normalizeStatus } from "./normalization";

interface Task {
  due_date?: string | null;
  status?: string | null;
}

/**
 * Calculate comprehensive task metrics from a task list
 *
 * Computes metrics including total tasks, active tasks, overdue tasks, and tasks by priority.
 *
 * @param tasks - Array of tasks to analyze
 * @param now - Current date for calculating overdue status (default: new Date())
 * @returns Array of task metrics with counts and percentages
 *
 * @example
 * ```ts
 * const metrics = calculateTaskMetrics(tasks);
 * // Returns: [
 * //   { label: "Total", value: 50, percentage: 100 },
 * //   { label: "Active", value: 30, percentage: 60 },
 * //   { label: "Overdue", value: 5, percentage: 10 },
 * //   ...
 * // ]
 * ```
 */
export function calculateTaskMetrics(
  tasks: Task[],
  now: Date = new Date(),
): TaskMetric[] {
  const totalTasks = tasks.length;

  const activeCount = tasks.reduce((count, task) => {
    const status = normalizeStatus(task.status);
    // Treat both 'done' and 'completed' as inactive states
    return status === "done" || status === "completed" || status === "cancelled"
      ? count
      : count + 1;
  }, 0);

  const overdueCount = tasks.reduce((count, task) => {
    if (!task.due_date) return count;
    const dueDate = new Date(task.due_date);
    const status = normalizeStatus(task.status);
    // Don't count completed tasks as overdue
    return dueDate < now && status !== "done" && status !== "completed"
      ? count + 1
      : count;
  }, 0);

  const dueSoonCount = tasks.reduce((count, task) => {
    if (!task.due_date) return count;
    const dueDate = new Date(task.due_date);
    if (dueDate < now) return count;
    const status = normalizeStatus(task.status);
    // Don't count completed tasks
    if (status === "done" || status === "completed") return count;
    return differenceInDays(dueDate, now) <= 7 ? count + 1 : count;
  }, 0);

  return [
    {
      label: "Total Tasks",
      value: totalTasks,
      helper: "Everything you have access to",
      tone: "neutral",
    },
    {
      label: "Active",
      value: activeCount,
      helper: "Todo · In progress · Review",
      tone: "neutral",
    },
    {
      label: "Due Soon",
      value: dueSoonCount,
      helper: "Next 7 days",
      tone: "neutral",
    },
    {
      label: "Overdue",
      value: overdueCount,
      helper: overdueCount ? "Needs attention" : "On track",
      tone: overdueCount ? "alert" : "neutral",
    },
  ];
}

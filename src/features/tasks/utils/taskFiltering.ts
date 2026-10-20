/**
 * Utility functions for filtering tasks
 */

import type { TaskStatusFilter, TaskPriorityFilter } from "../types/filters";
import { normalizeStatus, normalizePriority } from "./normalization";
import { readScheduleTaskLink } from "./scheduleTaskLink";

interface Task {
  title?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  source?: string | null;
  links?: unknown;
  goal?: { title?: string | null } | null;
  assignedprofile?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
}

/**
 * Filter tasks by status, priority, and search term
 */
export function filterTasks(
  tasks: Task[],
  statusFilter: TaskStatusFilter,
  priorityFilter: TaskPriorityFilter,
  searchTerm: string,
): Task[] {
  const search = searchTerm.trim().toLowerCase();

  return tasks.filter((task) => {
    const normalizedStatus = normalizeStatus(task.status);
    const normalizedPriority = normalizePriority(task.priority);

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "other"
          ? normalizedStatus === "other"
          : normalizedStatus === statusFilter;

    const matchesPriority =
      priorityFilter === "all"
        ? true
        : priorityFilter === "other"
          ? normalizedPriority === "other"
          : normalizedPriority === priorityFilter;

    const shiftTitle = readScheduleTaskLink(task)?.shiftTitle ?? "";
    const matchesSearch = search
      ? `${task.title ?? ""} ${task.description ?? ""} ${task.goal?.title ?? ""} ${shiftTitle} ${task.assignedprofile ? `${task.assignedprofile.first_name} ${task.assignedprofile.last_name}` : ""}`
          .toLowerCase()
          .includes(search)
      : true;

    return matchesStatus && matchesPriority && matchesSearch;
  });
}

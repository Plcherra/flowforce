/**
 * Utility functions for filtering tasks
 */

import type { TaskStatusFilter, TaskPriorityFilter } from "../types/filters";
import { normalizeStatus, normalizePriority } from "./normalization";

interface Task {
  title?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  goal?: { title?: string | null } | null;
  assigned_profile?: {
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

    const matchesSearch = search
      ? `${task.title ?? ""} ${task.description ?? ""} ${task.goal?.title ?? ""} ${task.assigned_profile ? `${task.assigned_profile.first_name} ${task.assigned_profile.last_name}` : ""}`
          .toLowerCase()
          .includes(search)
      : true;

    return matchesStatus && matchesPriority && matchesSearch;
  });
}

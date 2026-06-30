import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";

import { useAuth } from "@/hooks/useAuth";
export type { TaskWithRelations } from "@/features/tasks/repositories/tasksRepository";
import { logger } from "@/utils/logger";

import {
  ensureGoalTaskLink,
  fetchTaskComments,
  fetchTasksByCompany,
  insertTask,
  insertTaskComment,
  removeGoalTaskLink,
  TaskCommentWithUser,
  TaskInsert,
  TaskRow,
  TaskWithRelations,
  updateTaskRow,
  deleteTaskRow,
} from "@/features/tasks/repositories/tasksRepository";
import { fetchCompanyIdForUser } from "@/repositories/companyRepository";
import { fetchTaskTimeline } from "@/features/tasks/repositories/taskActivitiesRepository";

const STATUS_ALIASES: Record<string, TaskStatus> = {
  completed: "done",
};

const STATUS_WRITE_TARGET: Partial<Record<TaskStatus, TaskRow["status"]>> = {
  done: "completed" as TaskRow["status"],
};

export const TASK_STATUS_TRANSITIONS = {
  todo: ["in_progress", "cancelled"],
  in_progress: ["review", "blocked", "cancelled", "todo"],
  review: ["completed", "todo", "cancelled"], // Use 'completed' instead of 'done'
  blocked: ["in_progress", "cancelled"],
  done: [], // Keep for backward compatibility but prefer 'completed'
  completed: [], // Final state
  cancelled: ["todo"],
} as const;

export type TaskStatus = keyof typeof TASK_STATUS_TRANSITIONS;
type TaskStatusValue = TaskStatus | TaskRow["status"];

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "In Review",
  blocked: "Blocked",
  done: "Done",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const labelFor = (status: TaskStatusValue | null | undefined) => {
  if (!status) return "Unknown";
  const normalized = normalizeTaskStatus(status);
  if (!normalized) return capitalizeFallback(String(status));
  return STATUS_LABELS[normalized];
};

export const normalizeTaskStatus = (
  status: TaskStatusValue | null | undefined,
): TaskStatus | null => {
  if (!status) return null;
  if ((status as TaskStatus) in TASK_STATUS_TRANSITIONS) {
    return status as TaskStatus;
  }
  const alias = STATUS_ALIASES[status];
  return alias ?? null;
};

const capitalizeFallback = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

/**
 * useTasks - Hook for managing tasks
 *
 * Provides task data, CRUD operations, comments, and goal linking functionality.
 * Automatically fetches tasks for the current user's company.
 *
 * @returns Task management interface with tasks array, CRUD methods, and utilities
 *
 * @example
 * ```typescript
 * const {
 *   tasks,
 *   loading,
 *   error,
 *   createTask,
 *   updateTask,
 *   deleteTask
 * } = useTasks();
 * ```
 */
export function useTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const tasksQuery = useQuery({
    queryKey: ["tasks", user?.id],
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    throwOnError: false,
    retry: 1,
    queryFn: async () => {
      if (!user) return [];
      const fetchedCompanyId = await fetchCompanyIdForUser(user.id);
      if (!fetchedCompanyId) {
        throw new Error("No company context found for the current profile.");
      }
      setCompanyId(fetchedCompanyId);
      return fetchTasksByCompany(fetchedCompanyId);
    },
  });

  useEffect(() => {
    if (tasksQuery.error) {
      setTasksError((tasksQuery.error as Error).message);
    } else {
      setTasksError(null);
    }
  }, [tasksQuery.error]);

  const tasks = tasksQuery.data ?? [];
  const loading = tasksQuery.isLoading;
  const error = tasksError;

  const invalidateTasks = () => {
    if (user?.id) {
      return queryClient.invalidateQueries({ queryKey: ["tasks", user.id] });
    }
    return Promise.resolve();
  };

  const createTask = async (taskData: TaskInsert) => {
    try {
      if (!companyId) {
        throw new Error("Company context required to create tasks");
      }

      const normalizedTaskData: TaskInsert = {
        ...taskData,
        goal_id: taskData.goal_id ?? null,
        company_id: taskData.company_id ?? companyId, // Ensure company_id is set
      };

      const createdTask = await insertTask(normalizedTaskData);

      if (createdTask.goal_id) {
        await ensureGoalTaskLink(createdTask.goal_id, createdTask.id);
      }

      await invalidateTasks();
      return { data: createdTask, error: null };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create task";
      logger.error("Error creating task:", { error, tags: ["error"] });
      return { data: null, error: errorMessage };
    }
  };

  const updateTask = async (
    id: string,
    updates: Partial<
      Omit<
        TaskWithRelations,
        "assignedprofile" | "createdprofile" | "department" | "goal"
      >
    >,
  ) => {
    try {
      const previousTask = tasks.find((task) => task.id === id);

      if (!companyId) {
        throw new Error("Company context required to update tasks");
      }

      const updatedTask = await updateTaskRow(id, updates, companyId);

      const previousGoalId = previousTask?.goal_id ?? null;
      const newGoalId = updatedTask.goal_id ?? null;

      if (previousGoalId && previousGoalId !== newGoalId) {
        await removeGoalTaskLink(previousGoalId, id);
      }

      if (newGoalId) {
        await ensureGoalTaskLink(newGoalId, id);
      }

      await invalidateTasks();
      return { data: updatedTask, error: null };
    } catch (error) {
      logger.error("Error updating task:", { error, tags: ["error"] });
      return { data: null, error };
    }
  };

  const deleteTask = async (id: string) => {
    try {
      if (!companyId) {
        throw new Error("Company context required to delete tasks");
      }

      await deleteTaskRow(id, companyId);

      await invalidateTasks();
      return { error: null };
    } catch (error) {
      logger.error("Error deleting task:", { error, tags: ["error"] });
      return { error };
    }
  };

  const addComment = async (taskId: string, comment: string) => {
    if (!user) return { data: null, error: "User not authenticated" };

    try {
      const data = await insertTaskComment(taskId, user.id, comment);
      return { data, error: null };
    } catch (error) {
      logger.error("Error adding comment:", { error, tags: ["error"] });
      return { data: null, error };
    }
  };

  const getTaskComments = async (taskId: string) => {
    try {
      const data = await fetchTaskComments(taskId);
      return { data, error: null };
    } catch (error) {
      logger.error("Error fetching comments:", { error, tags: ["error"] });
      return { data: [], error };
    }
  };

  const getTaskTimeline = async (taskId: string) => {
    try {
      const data = await fetchTaskTimeline(taskId);
      return { data, error: null };
    } catch (error) {
      logger.error("Error fetching task timeline:", { error, tags: ["error"] });
      return { data: [], error };
    }
  };

  const updateStatus = async (taskId: string, nextStatus: TaskStatus) => {
    const task = tasks.find((item) => item.id === taskId);
    const current = normalizeTaskStatus(task?.status ?? null);

    if (!task || !current) {
      const error = new Error("Task not found for status transition.");
      logger.warn("Task not found for status transition", {
        context: { taskId, current },
        tags: ["warning"],
      });
      return { data: null, error };
    }

    const allowedTransitions = (TASK_STATUS_TRANSITIONS[current] ??
      []) as readonly TaskStatus[];

    if (!allowedTransitions.includes(nextStatus)) {
      const message = `Invalid status transition from ${current} to ${nextStatus}`;
      logger.warn("Invalid status transition", {
        context: { current, nextStatus, taskId },
        tags: ["warning"],
      });
      return { data: null, error: new Error(message) };
    }

    const statusForWrite = (STATUS_WRITE_TARGET[nextStatus] ??
      nextStatus) as TaskRow["status"];
    const updates: Partial<TaskRow> = {
      status: statusForWrite,
      // Set completed_at when status is 'completed' (or 'done' for backward compatibility)
      completed_at:
        nextStatus === "completed" || nextStatus === "done"
          ? new Date().toISOString()
          : null,
    };

    return updateTask(taskId, updates);
  };

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    addComment,
    getTaskComments,
    getTaskTimeline,
    updateStatus,
    refetchTasks: () => tasksQuery.refetch(),
  };
}

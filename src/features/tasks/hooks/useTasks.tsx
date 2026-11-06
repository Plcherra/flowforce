import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/hooks/useAuth";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
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
  todo: ["in_progress", "completed", "cancelled"],
  in_progress: ["review", "completed", "blocked", "cancelled", "todo"],
  review: ["completed", "todo", "cancelled"],
  blocked: ["in_progress", "completed", "cancelled"],
  done: ["todo"],
  completed: ["todo"],
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
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const sourceLocale = appLanguageFromTag(i18n.resolvedLanguage || i18n.language);
  const queryClient = useQueryClient();
  const [tasksError, setTasksError] = useState<string | null>(null);
  const companyQueryKey = ["task-company", user?.id] as const;

  // Company id is cached with the query, not component state. Create and
  // delete dialogs call useTasks() after the list has already loaded, so a
  // setState inside the list query never reaches them.
  const companyQuery = useQuery({
    queryKey: companyQueryKey,
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    throwOnError: false,
    retry: 1,
    queryFn: async () => {
      if (!user?.id) {
        throw new Error("No company context found for the current profile.");
      }
      const fetchedCompanyId = await fetchCompanyIdForUser(user.id);
      if (!fetchedCompanyId) {
        throw new Error("No company context found for the current profile.");
      }
      return fetchedCompanyId;
    },
  });

  const companyId = companyQuery.data ?? null;

  const tasksQuery = useQuery({
    queryKey: ["tasks", user?.id],
    enabled: Boolean(user?.id && companyId),
    staleTime: 60_000,
    throwOnError: false,
    retry: 1,
    queryFn: async () => {
      if (!companyId) return [];
      return fetchTasksByCompany(companyId);
    },
  });

  const queryError = companyQuery.error ?? tasksQuery.error;

  useEffect(() => {
    if (queryError) {
      setTasksError(
        queryError instanceof Error ? queryError.message : String(queryError),
      );
    } else {
      setTasksError(null);
    }
  }, [queryError]);

  const tasks = tasksQuery.data ?? [];
  const loading =
    Boolean(user?.id) &&
    !companyQuery.isError &&
    !tasksQuery.isError &&
    (companyQuery.isPending || tasksQuery.isPending);
  const error = tasksError;

  const requireCompanyId = () =>
    queryClient.getQueryData<string>(companyQueryKey) ?? companyId;

  const invalidateTasks = () => {
    if (user?.id) {
      return queryClient.invalidateQueries({ queryKey: ["tasks", user.id] });
    }
    return Promise.resolve();
  };

  const createTask = async (taskData: TaskInsert) => {
    try {
      const activeCompanyId = requireCompanyId();
      if (!activeCompanyId) {
        throw new Error("Company context required to create tasks");
      }

      const normalizedTaskData: TaskInsert = {
        ...taskData,
        goal_id: taskData.goal_id ?? null,
        company_id: taskData.company_id ?? activeCompanyId, // Ensure company_id is set
      };

      const createdTask = await insertTask(normalizedTaskData, sourceLocale);

      if (createdTask.goal_id) {
        await ensureGoalTaskLink(createdTask.goal_id, createdTask.id);
      }

      await invalidateTasks();
      return { data: createdTask, error: null };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("literals.failedToCreateTask");
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

      const activeCompanyId = requireCompanyId();
      if (!activeCompanyId) {
        throw new Error("Company context required to update tasks");
      }

      const updatedTask = await updateTaskRow(id, updates, activeCompanyId, sourceLocale);

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
      const activeCompanyId = requireCompanyId();
      if (!activeCompanyId) {
        throw new Error("Company context required to delete tasks");
      }

      await deleteTaskRow(id, activeCompanyId);

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
      const data = await insertTaskComment(
        taskId,
        user.id,
        comment,
        companyId ? { companyId, sourceLocale } : undefined,
      );
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
      const message = t("literals.invalidStatusTransitionFromTo", { current: current, nextStatus: nextStatus });
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

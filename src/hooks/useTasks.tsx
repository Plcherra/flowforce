
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

import { useAuth } from './useAuth';
import { syncGoalProgress } from '@/services/goals/goalProgressService';
export type { TaskWithRelations } from '@/repositories/tasksRepository';

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
} from '@/repositories/tasksRepository';
import { fetchCompanyIdForUser } from '@/repositories/companyRepository';
import { fetchTaskTimeline } from '@/repositories/taskActivitiesRepository';

const STATUS_ALIASES: Record<string, TaskStatus> = {
  completed: 'done',
};

const STATUS_WRITE_TARGET: Partial<Record<TaskStatus, TaskRow['status']>> = {
  done: 'completed' as TaskRow['status'],
};

export const TASK_STATUS_TRANSITIONS = {
  todo: ['in_progress', 'cancelled'],
  in_progress: ['review', 'blocked', 'cancelled', 'todo'],
  review: ['done', 'todo', 'cancelled'],
  blocked: ['in_progress', 'cancelled'],
  done: [],
  cancelled: ['todo'],
} as const;

export type TaskStatus = keyof typeof TASK_STATUS_TRANSITIONS;
type TaskStatusValue = TaskStatus | TaskRow['status'];

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'In Review',
  blocked: 'Blocked',
  done: 'Done',
  cancelled: 'Cancelled',
};

export const labelFor = (status: TaskStatusValue | null | undefined) => {
  if (!status) return 'Unknown';
  const normalized = normalizeTaskStatus(status);
  if (!normalized) return capitalizeFallback(String(status));
  return STATUS_LABELS[normalized];
};

export const normalizeTaskStatus = (status: TaskStatusValue | null | undefined): TaskStatus | null => {
  if (!status) return null;
  if ((status as TaskStatus) in TASK_STATUS_TRANSITIONS) {
    return status as TaskStatus;
  }
  const alias = STATUS_ALIASES[status];
  return alias ?? null;
};

const capitalizeFallback = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export function useTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tasksError, setTasksError] = useState<string | null>(null);

  const tasksQuery = useQuery({
    queryKey: ['tasks', user?.id],
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    queryFn: async () => {
      if (!user) return [];
      const companyId = await fetchCompanyIdForUser(user.id);
      if (!companyId) {
        throw new Error('No company context found for the current profile.');
      }
      return fetchTasksByCompany(companyId);
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
      return queryClient.invalidateQueries({ queryKey: ['tasks', user.id] });
    }
    return Promise.resolve();
  };

  const createTask = async (taskData: TaskInsert) => {
    try {
      const normalizedTaskData: TaskInsert = {
        ...taskData,
        goal_id: taskData.goal_id ?? null,
      };

      const createdTask = await insertTask(normalizedTaskData);

      if (createdTask.goal_id) {
        await ensureGoalTaskLink(createdTask.goal_id, createdTask.id);
        await syncGoalProgress(createdTask.goal_id);
      }

      await invalidateTasks();
      return { data: createdTask, error: null };
    } catch (error) {
      console.error('Error creating task:', error);
      return { data: null, error };
    }
  };

  const updateTask = async (
    id: string,
    updates: Partial<Omit<TaskWithRelations, 'assigned_profile' | 'created_profile' | 'department' | 'goal'>>
  ) => {
    try {
      const previousTask = tasks.find((task) => task.id === id);

      const updatedTask = await updateTaskRow(id, updates);

      const previousGoalId = previousTask?.goal_id ?? null;
      const newGoalId = updatedTask.goal_id ?? null;

      if (previousGoalId && previousGoalId !== newGoalId) {
        await removeGoalTaskLink(previousGoalId, id);
        await syncGoalProgress(previousGoalId);
      }

      if (newGoalId) {
        await ensureGoalTaskLink(newGoalId, id);
        await syncGoalProgress(newGoalId);
      }

      await invalidateTasks();
      return { data: updatedTask, error: null };
    } catch (error) {
      console.error('Error updating task:', error);
      return { data: null, error };
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const taskToDelete = tasks.find((task) => task.id === id);
      const goalId = taskToDelete?.goal_id ?? null;

      await deleteTaskRow(id);

      if (goalId) {
        await syncGoalProgress(goalId);
      }

      await invalidateTasks();
      return { error: null };
    } catch (error) {
      console.error('Error deleting task:', error);
      return { error };
    }
  };

  const addComment = async (taskId: string, comment: string) => {
    if (!user) return { data: null, error: 'User not authenticated' };

    try {
      const data = await insertTaskComment(taskId, user.id, comment);
      return { data, error: null };
    } catch (error) {
      console.error('Error adding comment:', error);
      return { data: null, error };
    }
  };

  const getTaskComments = async (taskId: string) => {
    try {
      const data = await fetchTaskComments(taskId);
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching comments:', error);
      return { data: [], error };
    }
  };

  const getTaskTimeline = async (taskId: string) => {
    try {
      const data = await fetchTaskTimeline(taskId);
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching task timeline:', error);
      return { data: [], error };
    }
  };

  const updateStatus = async (taskId: string, nextStatus: TaskStatus) => {
    const task = tasks.find((item) => item.id === taskId);
    const current = normalizeTaskStatus(task?.status ?? null);

    if (!task || !current) {
      const error = new Error('Task not found for status transition.');
      console.warn(error.message);
      return { data: null, error };
    }

    const allowedTransitions = TASK_STATUS_TRANSITIONS[current] ?? [];

    if (!allowedTransitions.includes(nextStatus)) {
      const message = `Invalid status transition from ${current} to ${nextStatus}`;
      console.warn(message);
      return { data: null, error: new Error(message) };
    }

    const statusForWrite = (STATUS_WRITE_TARGET[nextStatus] ?? nextStatus) as TaskRow['status'];
    const updates: Partial<TaskRow> = {
      status: statusForWrite,
      completed_at: nextStatus === 'done' ? new Date().toISOString() : null,
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

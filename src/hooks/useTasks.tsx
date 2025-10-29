
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables, TablesInsert } from '@/integrations/supabase/public-types';
import { syncGoalProgress } from '@/services/goals/goalProgressService';

type TaskRow = Tables<'tasks'>;

export type TaskWithRelations = TaskRow & {
  assigned_profile?: {
    first_name: string;
    last_name: string;
  } | null;
  created_profile?: {
    first_name: string;
    last_name: string;
  } | null;
  department?: {
    name: string;
  } | null;
  goal?: {
    id: string;
    title: string;
    status: string;
    progress: number;
    target_completion_date: string | null;
  } | null;
};

type TaskInsert = TablesInsert<'tasks'>;
type TaskComment = Tables<'task_comments'>;
type TaskActivity = Tables<'task_activities'>;

export const TASK_STATUS_TRANSITIONS: Record<TaskRow['status'], TaskRow['status'][]> = {
  todo: ['in_progress'],
  in_progress: ['todo', 'completed'],
  completed: ['todo'],
  review: ['in_progress', 'completed'],
  cancelled: [],
};

export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTasks();
    } else {
      setTasks([]);
      setLoading(false);
    }
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_profile:profiles!tasks_assigned_to_fkey(first_name, last_name),
          created_profile:profiles!tasks_created_by_fkey(first_name, last_name),
          department:departments(name),
          goal:goals(id, title, status, progress, target_completion_date)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks((data as TaskWithRelations[]) || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const ensureGoalTaskLink = async (goalId: string, taskId: string) => {
    try {
      const { error } = await supabase
        .from('goal_tasks')
        .upsert(
          {
            goal_id: goalId,
            task_id: taskId,
          },
          { onConflict: 'goal_id,task_id' }
        );

      if (error) {
        console.error('Error ensuring goal-task link:', error);
      }
    } catch (linkError) {
      console.error('Unexpected error ensuring goal-task link:', linkError);
    }
  };

  const removeGoalTaskLink = async (goalId: string, taskId: string) => {
    try {
      const { error } = await supabase
        .from('goal_tasks')
        .delete()
        .eq('goal_id', goalId)
        .eq('task_id', taskId);

      if (error) {
        console.error('Error removing goal-task link:', error);
      }
    } catch (linkError) {
      console.error('Unexpected error removing goal-task link:', linkError);
    }
  };

  const createTask = async (taskData: TaskInsert) => {
    try {
      const normalizedTaskData: TaskInsert = {
        ...taskData,
        goal_id: taskData.goal_id ?? null,
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(normalizedTaskData)
        .select()
        .single();

      if (error) throw error;

      const createdTask = data as TaskRow;

      if (createdTask.goal_id) {
        await ensureGoalTaskLink(createdTask.goal_id, createdTask.id);
        await syncGoalProgress(createdTask.goal_id);
      }

      await fetchTasks(); // Refresh the list
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

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedTask = data as TaskRow;

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

      await fetchTasks(); // Refresh the list
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

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (goalId) {
        await syncGoalProgress(goalId);
      }

      await fetchTasks(); // Refresh the list
      return { error: null };
    } catch (error) {
      console.error('Error deleting task:', error);
      return { error };
    }
  };

  const addComment = async (taskId: string, comment: string) => {
    if (!user) return { data: null, error: 'User not authenticated' };

    try {
      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: user.id,
          comment
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error adding comment:', error);
      return { data: null, error };
    }
  };

  const getTaskComments = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          user:profiles(first_name, last_name)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching comments:', error);
      return { data: [], error };
    }
  };

  const getTaskTimeline = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from('task_activities')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { data: (data as TaskActivity[]) || [], error: null };
    } catch (error) {
      console.error('Error fetching task timeline:', error);
      return { data: [], error };
    }
  };

  const transitionTaskStatus = async (task: TaskRow, nextStatus: TaskRow['status']) => {
    const allowedTransitions = TASK_STATUS_TRANSITIONS[task.status] ?? [];
    if (!allowedTransitions.includes(nextStatus)) {
      const errorMessage = `Invalid status transition from ${task.status} to ${nextStatus}`;
      console.warn(errorMessage);
      return { data: null, error: new Error(errorMessage) };
    }

    const updates: Partial<TaskRow> = {
      status: nextStatus,
      completed_at: nextStatus === 'completed' ? new Date().toISOString() : null,
    };

    return updateTask(task.id, updates);
  };

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    deleteTask,
    addComment,
    getTaskComments,
    getTaskTimeline,
    transitionTaskStatus,
    refetchTasks: fetchTasks
  };
}

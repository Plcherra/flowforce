
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type TaskRow = Tables<'tasks'>;

type Task = TaskRow & {
  assigned_profile?: {
    first_name: string;
    last_name: string;
  };
  created_profile?: {
    first_name: string;
    last_name: string;
  };
  department?: {
    name: string;
  };
};

type TaskInsert = TablesInsert<'tasks'>;
type TaskComment = Tables<'task_comments'>;

export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
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
          department:departments(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (taskData: TaskInsert) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

      if (error) throw error;
      await fetchTasks(); // Refresh the list
      return { data, error: null };
    } catch (error) {
      console.error('Error creating task:', error);
      return { data: null, error };
    }
  };

  const updateTask = async (id: string, updates: Partial<Omit<Task, 'assigned_profile' | 'created_profile' | 'department'>>) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await fetchTasks(); // Refresh the list
      return { data, error: null };
    } catch (error) {
      console.error('Error updating task:', error);
      return { data: null, error };
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
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

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    deleteTask,
    addComment,
    getTaskComments,
    refetchTasks: fetchTasks
  };
}

import { z } from 'zod';

import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/public-types';

type TaskNotificationRow = Tables<'task_notifications'>;
type TaskRow = Tables<'tasks'>;

const notificationSchema: z.ZodType<TaskNotificationRow> = z
  .object({
    id: z.string(),
    user_id: z.string(),
    task_id: z.string().nullable(),
    title: z.string(),
    message: z.string(),
    type: z.string(),
    metadata: z.any().nullable(),
    read_at: z.string().nullable(),
    created_at: z.string(),
  })
  .passthrough();

const taskSummarySchema: z.ZodType<
  Pick<TaskRow, 'id' | 'title' | 'due_date' | 'priority' | 'assigned_to' | 'status'>
> = z
  .object({
    id: z.string(),
    title: z.string(),
    due_date: z.string().nullable(),
    priority: z.string().nullable(),
    assigned_to: z.string().nullable(),
    status: z.string(),
  })
  .passthrough();

export type TaskNotification = z.infer<typeof notificationSchema>;
export type TaskSummary = z.infer<typeof taskSummarySchema>;

export async function fetchNotificationsForUser(userId: string): Promise<TaskNotification[]> {
  const { data, error } = await supabase
    .from('task_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return notificationSchema.array().parse(data ?? []);
}

export type NewNotificationInput = Omit<TaskNotificationRow, 'id' | 'created_at' | 'read_at'> & {
  read_at?: string | null;
};

export async function createTaskNotification(input: NewNotificationInput): Promise<TaskNotification> {
  const { data, error } = await supabase
    .from('task_notifications')
    .insert(input)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return notificationSchema.parse(data);
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('task_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) {
    throw error;
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('task_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    throw error;
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase.from('task_notifications').delete().eq('id', notificationId);

  if (error) {
    throw error;
  }
}

export async function findRecentNotification(
  userId: string,
  taskId: string,
  type: string,
  sinceIso: string
): Promise<TaskNotification | null> {
  const { data, error } = await supabase
    .from('task_notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('task_id', taskId)
    .eq('type', type)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data ? notificationSchema.parse(data) : null;
}

export async function fetchTasksDueSoon(userId: string, upperBoundIso: string): Promise<TaskSummary[]> {
  // Use explicit status filter to avoid enum validation errors
  // Only query for active task statuses (exclude completed/cancelled)
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, due_date, priority, assigned_to, status')
    .eq('assigned_to', userId)
    .gte('due_date', new Date().toISOString())
    .lte('due_date', upperBoundIso)
    .in('status', ['todo', 'in_progress', 'review']);

  if (error) {
    // Handle enum validation errors gracefully
    if (error.message?.includes('invalid input value for enum task_status')) {
      console.warn('Some tasks have invalid status values. Filtering them out.', error);
      // Return empty array if enum validation fails - likely means there are tasks with invalid statuses
      return [];
    }
    throw error;
  }

  // Additional client-side filtering as safety net
  const validStatuses = ['todo', 'in_progress', 'review', 'completed', 'cancelled'];
  const validData = (data ?? []).filter(task => validStatuses.includes(task.status));

  return taskSummarySchema.array().parse(validData);
}

export async function fetchOverdueTasks(userId: string): Promise<TaskSummary[]> {
  // Use explicit status filter to avoid enum validation errors
  // Only query for active task statuses (exclude completed/cancelled)
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, due_date, priority, assigned_to, status')
    .eq('assigned_to', userId)
    .lt('due_date', new Date().toISOString())
    .in('status', ['todo', 'in_progress', 'review']);

  if (error) {
    // Handle enum validation errors gracefully
    if (error.message?.includes('invalid input value for enum task_status')) {
      console.warn('Some tasks have invalid status values. Filtering them out.', error);
      // Return empty array if enum validation fails - likely means there are tasks with invalid statuses
      return [];
    }
    throw error;
  }

  // Additional client-side filtering as safety net
  const validStatuses = ['todo', 'in_progress', 'review', 'completed', 'cancelled'];
  const validData = (data ?? []).filter(task => validStatuses.includes(task.status));

  return taskSummarySchema.array().parse(validData);
}

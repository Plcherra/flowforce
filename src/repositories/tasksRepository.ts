import { z } from 'zod';

import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/public-types';

export type TaskRow = Tables<'tasks'>;
export type TaskInsert = TablesInsert<'tasks'>;
type TaskCommentRow = Tables<'task_comments'>;

const profileSchema = z.object({
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  company_id: z.string().nullable(),
});

const departmentSchema = z.object({
  name: z.string().nullable(),
});

const goalSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  status: z.string().nullable(),
  progress: z.number().nullable(),
  target_completion_date: z.string().nullable(),
});

const taskRowSchema: z.ZodType<TaskRow> = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    status: z.string(),
    priority: z.string().nullable(),
    assigned_to: z.string().nullable(),
    created_by: z.string(),
    department_id: z.string().nullable(),
    goal_id: z.string().nullable(),
    due_date: z.string().nullable(),
    estimated_hours: z.number().nullable(),
    actual_hours: z.number().nullable(),
    attachments: z.any().nullable(),
    completed_at: z.string().nullable(),
    created_at: z.string(),
    links: z.any(),
    parent_task_id: z.string().nullable(),
    origin_document_id: z.string().nullable(),
    origin_event_id: z.string().nullable(),
    tags: z.array(z.string()).nullable(),
    source: z.string().nullable(),
    company_id: z.string().nullable(),
    updated_at: z.string(),
    workflow_id: z.string().nullable(),
  })
  .passthrough();

const taskWithRelationsSchema = taskRowSchema.extend({
  assigned_profile: profileSchema.nullable().optional(),
  created_profile: profileSchema.nullable().optional(),
  department: departmentSchema.nullable().optional(),
  goal: goalSchema.nullable().optional(),
});

const taskCommentSchema: z.ZodType<TaskCommentRow> = z
  .object({
    id: z.string(),
    task_id: z.string(),
    user_id: z.string(),
    comment: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

const taskCommentWithUserSchema = taskCommentSchema.extend({
  user: profileSchema.pick({ first_name: true, last_name: true }).nullable().optional(),
});

export type TaskWithRelations = z.infer<typeof taskWithRelationsSchema>;
export type TaskCommentWithUser = z.infer<typeof taskCommentWithUserSchema>;

export async function fetchTasksByCompany(companyId: string): Promise<TaskWithRelations[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assigned_profile:profiles!tasks_assigned_to_fkey(first_name, last_name, company_id),
      created_profile:profiles!tasks_created_by_fkey(first_name, last_name, company_id),
      department:departments(name),
      goal:goals(id, title, status, progress, target_completion_date)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return taskWithRelationsSchema.array().parse(data ?? []);
}

export async function insertTask(taskData: TaskInsert): Promise<TaskRow> {
  const { data, error } = await supabase.from('tasks').insert(taskData).select().single();

  if (error) {
    throw error;
  }

  return taskRowSchema.parse(data);
}

export async function updateTaskRow(
  id: string,
  updates: Partial<Omit<TaskRow, 'id'>>
): Promise<TaskRow> {
  const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select().single();

  if (error) {
    throw error;
  }

  return taskRowSchema.parse(data);
}

export async function deleteTaskRow(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);

  if (error) {
    throw error;
  }
}

export async function ensureGoalTaskLink(goalId: string, taskId: string): Promise<void> {
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
    throw error;
  }
}

export async function removeGoalTaskLink(goalId: string, taskId: string): Promise<void> {
  const { error } = await supabase
    .from('goal_tasks')
    .delete()
    .eq('goal_id', goalId)
    .eq('task_id', taskId);

  if (error) {
    throw error;
  }
}

export async function insertTaskComment(
  taskId: string,
  userId: string,
  comment: string
): Promise<TaskCommentRow> {
  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: taskId,
      user_id: userId,
      comment,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return taskCommentSchema.parse(data);
}

export async function fetchTaskComments(taskId: string): Promise<TaskCommentWithUser[]> {
  const { data, error } = await supabase
    .from('task_comments')
    .select(
      `
        *,
        user:profiles(first_name, last_name)
      `
    )
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return taskCommentWithUserSchema.array().parse(data ?? []);
}

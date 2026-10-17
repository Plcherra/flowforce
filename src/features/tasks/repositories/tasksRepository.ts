import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type {
  Tables,
  TablesInsert,
} from "@/integrations/supabase/public-types";
import { retrySupabaseQuery } from "@/utils/retry";

export type TaskRow = Tables<"tasks">;
export type TaskInsert = TablesInsert<"tasks">;
type TaskCommentRow = Tables<"task_comments">;

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

const taskRowObjectSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    status: z.string(),
    priority: z.string().nullable(),
    assigned_to: z.string().nullable(),
    created_by: z.string(),
    goal_id: z.string().nullable(),
    due_date: z.string().nullable(),
    estimated_hours: z.number().nullable(),
    actual_hours: z.number().nullable(),
    attachments: z.unknown().nullable(), // Json type from database
    completed_at: z.string().nullable(),
    created_at: z.string(),
    links: z.unknown(), // Custom field, can be array or object
    parent_task_id: z.string().nullable(),
    department_id: z.string().nullable().optional(),
    departmentid: z.string().nullable().optional(),
    origin_document_id: z.string().nullable().optional(),
    origin_documentid: z.string().nullable().optional(),
    origin_event_id: z.string().nullable(),
    tags: z.array(z.string()).nullable(),
    source: z.string().nullable(),
    company_id: z.string().nullable(),
    updated_at: z.string(),
    workflow_id: z.string().nullable().optional(),
    workflowid: z.string().nullable().optional(),
  })
  .passthrough();

function withTaskColumnAliases<Schema extends z.ZodTypeAny>(schema: Schema) {
  return schema.transform((row) => {
    const record = row as {
      department_id?: string | null;
      departmentid?: string | null;
      origin_document_id?: string | null;
      origin_documentid?: string | null;
      workflow_id?: string | null;
      workflowid?: string | null;
    };
    return {
      ...record,
      department_id: record.department_id ?? record.departmentid ?? null,
      departmentid: record.departmentid ?? record.department_id ?? null,
      origin_document_id:
        record.origin_document_id ?? record.origin_documentid ?? null,
      origin_documentid:
        record.origin_documentid ?? record.origin_document_id ?? null,
      workflow_id: record.workflow_id ?? record.workflowid ?? null,
      workflowid: record.workflowid ?? record.workflow_id ?? null,
    };
  });
}

const taskRowSchema = withTaskColumnAliases(taskRowObjectSchema);

const taskWithRelationsSchema = withTaskColumnAliases(
  taskRowObjectSchema.extend({
    assignedprofile: profileSchema.nullable().optional(),
    createdprofile: profileSchema.nullable().optional(),
    department: departmentSchema.nullable().optional(),
    goal: goalSchema.nullable().optional(),
  }),
);

const taskCommentSchema = z
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
  user: profileSchema
    .pick({ first_name: true, last_name: true })
    .nullable()
    .optional(),
});

export type TaskWithRelations = z.infer<typeof taskWithRelationsSchema>;
export type TaskCommentWithUser = z.infer<typeof taskCommentWithUserSchema>;

export async function fetchTasksByCompany(
  companyId: string,
): Promise<TaskWithRelations[]> {
  // Phase 6: Apply retry logic to critical data fetch
  const { data, error } = await retrySupabaseQuery(
    async () =>
      await supabase
        .from("tasks")
        .select(
          `
        *,
        assignedprofile:profiles!tasks_assigned_to_fkey(first_name, last_name, company_id),
        createdprofile:profiles!tasks_created_by_fkey(first_name, last_name, company_id),
        department:departments(name),
        goal:goals(id, title, status, progress, target_completion_date)
      `,
        )
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
    { maxRetries: 2, baseDelay: 500 }, // Fewer retries for read operations
  );

  if (error) {
    throw error;
  }

  return taskWithRelationsSchema.array().parse(data ?? []);
}

type TaskWriteInput = TaskInsert & {
  departmentid?: string | null;
  origin_documentid?: string | null;
  workflowid?: string | null;
};

function toTaskInsert(taskData: TaskWriteInput): TaskInsert {
  const {
    departmentid,
    origin_documentid,
    workflowid,
    ...columns
  } = taskData;

  return {
    ...columns,
    department_id: columns.department_id ?? departmentid ?? null,
    origin_document_id: columns.origin_document_id ?? origin_documentid ?? null,
    workflow_id: columns.workflow_id ?? workflowid ?? null,
  };
}

export async function insertTask(taskData: TaskWriteInput): Promise<TaskRow> {
  // Ensure company_id is set for security
  if (!taskData.company_id) {
    throw new Error("company_id is required when creating a task");
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert(toTaskInsert(taskData))
    .select()
    .single();

  if (error) {
    throw error;
  }

  return taskRowSchema.parse(data);
}

export async function updateTaskRow(
  id: string,
  updates: Partial<Omit<TaskRow, "id">>,
  companyId?: string | null,
): Promise<TaskRow> {
  let query = supabase.from("tasks").update(updates).eq("id", id);

  // Add company_id filter if provided for security
  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Task not found or access denied");
  }

  return taskRowSchema.parse(data);
}

export async function deleteTaskRow(
  id: string,
  companyId?: string | null,
): Promise<void> {
  let query = supabase.from("tasks").delete().eq("id", id);

  // Add company_id filter if provided for security
  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { error } = await query;

  if (error) {
    throw error;
  }
}

export async function ensureGoalTaskLink(
  goalId: string,
  taskId: string,
): Promise<void> {
  const { error } = await supabase.from("goal_tasks").upsert(
    {
      goal_id: goalId,
      task_id: taskId,
    },
    { onConflict: "goal_id,task_id" },
  );

  if (error) {
    throw error;
  }
}

export async function removeGoalTaskLink(
  goalId: string,
  taskId: string,
): Promise<void> {
  const { error } = await supabase
    .from("goal_tasks")
    .delete()
    .eq("goal_id", goalId)
    .eq("task_id", taskId);

  if (error) {
    throw error;
  }
}

export async function insertTaskComment(
  taskId: string,
  userId: string,
  comment: string,
): Promise<TaskCommentRow> {
  const { data, error } = await supabase
    .from("task_comments")
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

export async function fetchTaskComments(
  taskId: string,
): Promise<TaskCommentWithUser[]> {
  const { data, error } = await supabase
    .from("task_comments")
    .select(
      `
        *,
        user:profiles(first_name, last_name)
      `,
    )
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return taskCommentWithUserSchema.array().parse(data ?? []);
}

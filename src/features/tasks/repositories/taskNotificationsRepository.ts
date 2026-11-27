import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/public-types";
import { logger } from "@/utils/logger";

type TaskNotificationRow = Tables<"task_notifications">;

const notificationSchema = z
  .object({
    id: z.string(),
    user_id: z.string(),
    task_id: z.string().nullable(),
    title: z.string(),
    message: z.string(),
    type: z.string(),
    metadata: z.unknown().nullable(), // Json type from database
    read_at: z.string().nullable(),
    created_at: z.string(),
  })
  .passthrough();

const taskSummarySchema = z
  .object({
    id: z.string(),
    title: z.string(),
    due_date: z.string().nullable(),
    due_at: z.string().nullable().optional(),
    priority: z.string().nullable(),
    assigned_to: z.string().nullable(),
    status: z.string(),
  })
  .passthrough();

const isMissingTableError = (error: unknown) => {
  const candidate = error as { code?: string; message?: string } | null;
  return (
    candidate?.code === "PGRST205" ||
    candidate?.message?.includes("Could not find the table")
  );
};

export type TaskNotification = z.infer<typeof notificationSchema>;
export type TaskSummary = z.infer<typeof taskSummarySchema>;

export async function fetchNotificationsForUser(
  userId: string,
): Promise<TaskNotification[]> {
  const { data, error } = await supabase
    .from("task_notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (isMissingTableError(error)) {
      return [];
    }

    throw error;
  }

  return notificationSchema.array().parse(data ?? []);
}

export type NewNotificationInput = {
  user_id: string;
  company_id?: string;
  task_id?: string | null;
  title: string;
  message: string;
  type: string;
  metadata?: TaskNotificationRow["metadata"];
  read_at?: string | null;
};

async function resolveTaskCompanyId(taskId: string): Promise<string | null> {
  const { data, error } = await supabase // pragma: allowlist secret
    .from("tasks")
    .select("company_id")
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw error;
  return data?.company_id ?? null;
}

async function resolveProfileCompanyId(userId: string): Promise<string | null> {
  const { data, error } = await supabase // pragma: allowlist secret
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.company_id ?? null;
}

export async function createTaskNotification(
  input: NewNotificationInput,
): Promise<TaskNotification> {
  let companyId = input.company_id?.trim() ?? "";
  if (!companyId && input.task_id) {
    companyId = (await resolveTaskCompanyId(input.task_id)) ?? "";
  }
  if (!companyId) {
    companyId = (await resolveProfileCompanyId(input.user_id)) ?? "";
  }
  if (!companyId) {
    throw new Error("company_id is required for task notifications");
  }

  const payload = { ...input, company_id: companyId };

  const { data, error } = await supabase
    .from("task_notifications")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return notificationSchema.parse(data);
}

export async function markNotificationAsRead(
  notificationId: string,
): Promise<void> {
  const { error } = await supabase
    .from("task_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (error) {
    throw error;
  }
}

export async function markAllNotificationsAsRead(
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("task_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    throw error;
  }
}

export async function deleteNotification(
  notificationId: string,
): Promise<void> {
  const { error } = await supabase
    .from("task_notifications")
    .delete()
    .eq("id", notificationId);

  if (error) {
    throw error;
  }
}

export async function findRecentNotification(
  userId: string,
  taskId: string,
  type: string,
  sinceIso: string,
): Promise<TaskNotification | null> {
  const { data, error } = await supabase
    .from("task_notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("task_id", taskId)
    .eq("type", type)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      return null;
    }

    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return data ? notificationSchema.parse(data) : null;
}

export async function fetchActiveDueTasksForUser(
  userId: string,
): Promise<TaskSummary[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, due_date, due_at, priority, assigned_to, status")
    .eq("assigned_to", userId)
    .in("status", ["todo", "in_progress", "review"])
    .or("due_date.not.is.null,due_at.not.is.null");

  if (error) {
    if (isMissingTableError(error)) {
      return [];
    }

    if (error.message?.includes("invalid input value for enum task_status")) {
      logger.warn(
        "Some tasks have invalid status values. Filtering them out.",
        { error, tags: ["warning"] },
      );
      return [];
    }
    throw error;
  }

  const validStatuses = [
    "todo",
    "in_progress",
    "review",
    "completed",
    "cancelled",
  ];
  const validData = (data ?? []).filter((task) =>
    validStatuses.includes(task.status),
  );

  return taskSummarySchema.array().parse(validData);
}

/** @deprecated Prefer fetchActiveDueTasksForUser plus client due timing filters. */
export async function fetchTasksDueSoon(
  userId: string,
  _upperBoundIso: string,
): Promise<TaskSummary[]> {
  return fetchActiveDueTasksForUser(userId);
}

/** @deprecated Prefer fetchActiveDueTasksForUser plus client due timing filters. */
export async function fetchOverdueTasks(userId: string): Promise<TaskSummary[]> {
  return fetchActiveDueTasksForUser(userId);
}

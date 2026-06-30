import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/public-types";

type TaskActivityRow = Tables<"task_activities">;

const actorSchema = z.object({
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
});

const taskActivitySchema = z
  .object({
    id: z.string(),
    task_id: z.string(),
    user_id: z.string(),
    action_type: z.string(),
    description: z.string(),
    metadata: z.unknown().nullable(), // Json type from database
    created_at: z.string(),
    company_id: z.string(),
  })
  .passthrough();

const taskActivityWithActorSchema = taskActivitySchema.extend({
  actor: actorSchema.nullable().optional(),
});

export type TaskActivityWithActor = z.infer<typeof taskActivityWithActorSchema>;

export async function fetchTaskActivitiesForCompany(
  companyId: string,
): Promise<TaskActivityWithActor[]> {
  const { data, error } = await supabase
    .from("task_activities")
    .select(
      `
        *,
        actor:profiles!task_activitiesuser_id_fkey(first_name, last_name)
      `,
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return taskActivityWithActorSchema.array().parse(data ?? []);
}

export async function fetchTaskTimeline(
  taskId: string,
): Promise<TaskActivityRow[]> {
  const { data, error } = await supabase
    .from("task_activities")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return taskActivitySchema.array().parse(data ?? []);
}

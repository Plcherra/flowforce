import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/integrations/supabase/public-types";

const goalStatusEnum = z.enum(["draft", "active", "completed", "cancelled"]);

const goalRowSchema = z
  .object({
    id: z.string(),
    title: z.string().nullable(),
    description: z.string().nullable(),
    status: goalStatusEnum,
    priority: z.string().nullable(),
    target_completion_date: z.string().nullable(),
    completed_at: z.string().nullable(),
    progress: z.number().nullable(),
    reward_type: z.string().nullable(),
    reward_details: z.unknown().nullable(),
    created_by: z.string().nullable(),
    company_id: z.string(),
    created_at: z.string(),
    updated_at: z.string().nullable(),
    ownerid: z.string().nullable().optional(),
  })
  .passthrough();

const goalTaskSchema = z.object({
  id: z.string(),
  goal_id: z.string().optional(),
  weight: z.number().nullable().optional(),
  task: z
    .object({
      id: z.string(),
      title: z.string().nullable(),
      status: z.string().nullable(),
      assigned_to: z.string().nullable(),
      completed_at: z.string().nullable(),
      priority: z.string().nullable(),
    })
    .nullable()
    .optional(),
});

const goalRewardSchema = z.object({
  id: z.string(),
  goal_id: z.string(),
  reward_type: z.string(),
  reward_details: z.unknown().nullable(),
  awarded_at: z.string().nullable(),
  user_id: z.string().nullable(),
  company_id: z.string(),
});

export type GoalRecord = z.infer<typeof goalRowSchema>;
export type GoalTaskRecord = z.infer<typeof goalTaskSchema>;
export type GoalRewardRecord = z.infer<typeof goalRewardSchema>;

export async function fetchGoalsByCompany(
  companyId: string,
): Promise<GoalRecord[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return goalRowSchema.array().parse(data ?? []);
}

export async function fetchGoalTasks(
  goalIds: string[],
): Promise<GoalTaskRecord[]> {
  if (goalIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("goal_tasks")
    .select(
      `
        id,
        goal_id,
        weight,
        task:tasks(
          id,
          title,
          status,
          assigned_to,
          completed_at,
          priority
        )
      `,
    )
    .in("goal_id", goalIds);

  if (error) {
    throw error;
  }

  return goalTaskSchema.array().parse(data ?? []);
}

export async function fetchGoalRewards(
  goalIds: string[],
  companyId: string,
): Promise<GoalRewardRecord[]> {
  if (goalIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("goal_rewards")
    .select(
      "id, goal_id, reward_type, reward_details, awarded_at, user_id, company_id",
    )
    .in("goal_id", goalIds)
    .eq("company_id", companyId);

  if (error) {
    throw error;
  }

  return goalRewardSchema.array().parse(data ?? []);
}

export async function insertGoalRow(
  payload: TablesInsert<"goals">,
): Promise<GoalRecord> {
  const { data, error } = await supabase
    .from("goals")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return goalRowSchema.parse(data);
}

export async function updateGoalRow(
  id: string,
  updates: TablesUpdate<"goals">,
  companyId: string,
): Promise<void> {
  const { error } = await supabase
    .from("goals")
    .update(updates)
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    throw error;
  }
}

export async function deleteGoalRow(
  id: string,
  companyId: string,
): Promise<void> {
  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    throw error;
  }
}

export async function updateGoalStatusRow(
  id: string,
  status: Tables<"goals">["status"],
  companyId: string,
): Promise<void> {
  const updates: TablesUpdate<"goals"> = {
    status,
    progress: status === "completed" ? 100 : undefined,
    completed_at: status === "completed" ? new Date().toISOString() : null,
  };

  await updateGoalRow(id, updates, companyId);
}

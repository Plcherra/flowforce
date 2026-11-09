import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { goalStatusSchema } from "@/services/performance/performanceTypes";
import { logger } from "@/utils/logger";

const profileRowSchema = z
  .object({
    id: z.string(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    role: z.string().nullable(),
    avatar_url: z.string().nullable(),
    employment_status: z.string().nullable(),
    company_id: z.string().nullable(),
  })
  .passthrough();

const staffPerformanceRowSchema = z
  .object({
    id: z.string(),
    user_id: z.string().nullable(),
    performance_score: z.number().nullable(),
    attendance_status: z.string().nullable(),
    date: z.string(),
  })
  .passthrough();

/** Columns present on production `performance_reviews` (no goal_id / review_date / score). */
const PRODUCTION_PERFORMANCE_REVIEW_COLUMNS = [
  "id",
  "company_id",
  "employee_id",
  "reviewerid",
  "created_at",
  "updated_at",
] as const;

const performanceReviewRowSchema = z
  .object({
    id: z.string(),
    company_id: z.string().nullable(),
    employee_id: z.string().nullable(),
    reviewerid: z.string().nullable(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
    goal_id: z.string().nullable().optional(),
    review_cycle: z.string().nullable().optional(),
    review_period_start: z.string().nullable().optional(),
    review_period_end: z.string().nullable().optional(),
    review_date: z.string().nullable().optional(),
    score: z.number().nullable().optional(),
    summary: z.string().nullable().optional(),
    ai_summary: z.string().nullable().optional(),
    action_items: z.unknown().nullable().optional(),
    ai_insightid: z.string().nullable().optional(),
  })
  .passthrough();

const goalRowSchema = z
  .object({
    id: z.string(),
    title: z.string().nullable(),
    status: goalStatusSchema,
    progress: z.number().nullable(),
    target_completion_date: z.string().nullable(),
    created_at: z.string(),
    company_id: z.string().nullable(),
  })
  .passthrough();

const goalParticipantRowSchema = z
  .object({
    id: z.string(),
    goal_id: z.string(),
    user_id: z.string().nullable(),
    role: z.string().nullable(),
    contribution_score: z.number().nullable(),
  })
  .passthrough();

const performanceGoalReviewRowSchema = z
  .object({
    reviewid: z.string(),
    company_id: z.string().nullable(),
    employee_id: z.string().nullable(),
    reviewerid: z.string().nullable(),
    goal_id: z.string().nullable(),
    goal_title: z.string().nullable(),
    goal_status: goalStatusSchema.nullable().optional(),
    goal_progress: z.number().nullable(),
    target_completion_date: z.string().nullable(),
    goal_completed_at: z.string().nullable(),
    goal_ownerid: z.string().nullable(),
    review_date: z.string().nullable(),
    review_cycle: z.string().nullable(),
    score: z.number().nullable(),
    summary: z.string().nullable(),
    ai_summary: z.string().nullable(),
    action_items: z.unknown().nullable(),
    review_period_start: z.string().nullable(),
    review_period_end: z.string().nullable(),
    ai_insightid: z.string().nullable(),
    insight_type: z.string().nullable(),
    insightdata: z.unknown().nullable(),
    insight_generated_at: z.string().nullable(),
    insight_expires_at: z.string().nullable(),
    goal_priority: z.string().nullable(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
  })
  .passthrough();

export type PerformanceProfileRow = z.infer<typeof profileRowSchema>;
export type StaffPerformanceRow = z.infer<typeof staffPerformanceRowSchema>;
export type PerformanceReviewRow = z.infer<typeof performanceReviewRowSchema>;
export type PerformanceGoalRow = z.infer<typeof goalRowSchema>;
export type GoalParticipantRow = z.infer<typeof goalParticipantRowSchema>;
export type PerformanceGoalReviewRow = z.infer<
  typeof performanceGoalReviewRowSchema
>;

export async function fetchActivePerformanceProfiles(
  client: SupabaseClient = supabase,
  companyId: string | null = null,
): Promise<PerformanceProfileRow[]> {
  let query = client
    .from("profiles")
    .select(
      "id, first_name, last_name, role, avatar_url, employment_status, company_id",
    )
    .eq("employment_status", "active");

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return profileRowSchema.array().parse(data ?? []);
}

export async function fetchStaffPerformanceRowsSince(
  client: SupabaseClient = supabase,
  sinceDate: string,
): Promise<StaffPerformanceRow[]> {
  const { data, error } = await client
    .from("staff_performance")
    .select("id, user_id, performance_score, attendance_status, date")
    .gte("date", sinceDate);
  if (error) throw error;
  return staffPerformanceRowSchema.array().parse(data ?? []);
}

export async function fetchPerformanceReviewsSince(
  client: SupabaseClient = supabase,
  sinceDate: string,
  companyId: string | null = null,
): Promise<PerformanceReviewRow[]> {
  let query = client
    .from("performance_reviews")
    .select(PRODUCTION_PERFORMANCE_REVIEW_COLUMNS.join(","))
    .gte("created_at", sinceDate);

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query;
  if (error) {
    logger.warn("[performance] performance_reviews query unavailable", {
      error,
      tags: ["warning"],
    });
    return [];
  }
  return performanceReviewRowSchema.array().parse(data ?? []);
}

export async function fetchPerformanceGoals(
  client: SupabaseClient = supabase,
  companyId: string | null = null,
): Promise<PerformanceGoalRow[]> {
  let query = client
    .from("goals")
    .select(
      "id, title, status, progress, target_completion_date, created_at, company_id",
    );

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return goalRowSchema.array().parse(data ?? []);
}

export async function fetchGoalParticipantsByGoalIds(
  client: SupabaseClient = supabase,
  goalIds: string[],
): Promise<GoalParticipantRow[]> {
  if (goalIds.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from("goal_participants")
    .select("id, goal_id, user_id, role, contribution_score")
    .in("goal_id", goalIds);

  if (error) throw error;
  return goalParticipantRowSchema.array().parse(data ?? []);
}

export async function fetchPerformanceGoalReviewRows(
  client: SupabaseClient = supabase,
  companyId: string | null = null,
  limit = 200,
): Promise<PerformanceGoalReviewRow[]> {
  let query = client
    .from("performance_goal_reviews")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query;
  if (error) {
    logger.warn("[performance] performance_goal_reviews query unavailable", {
      error,
      tags: ["warning"],
    });
    return [];
  }

  const rows = data ?? [];
  if (
    rows.length === 0 ||
    typeof rows[0] !== "object" ||
    rows[0] === null ||
    !("review_date" in (rows[0] as Record<string, unknown>))
  ) {
    return [];
  }

  try {
    return performanceGoalReviewRowSchema.array().parse(rows);
  } catch (parseError) {
    logger.warn("[performance] performance_goal_reviews row shape mismatch", {
      error: parseError,
      tags: ["warning"],
    });
    return [];
  }
}

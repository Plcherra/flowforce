import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesInsert } from "@/integrations/supabase/public-types";

const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonSchema),
    z.record(jsonSchema),
  ]),
);

const certificationCatalogEntrySchema = z
  .object({
    id: z.string(),
    code: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    issuer: z.string().nullable(),
    badge_code: z.string().nullable(),
    requirement_config: jsonSchema.default({}),
    xp_reward: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
    linked_course_id: z.string().nullable(),
    unlocks_role: z.string().nullable(),
  })
  .passthrough();

const certificationProgressRowSchema = z
  .object({
    id: z.string(),
    employee_id: z.string(),
    certification_code: z.string(),
    status: z.enum(["available", "in_progress", "earned", "expired"]),
    progress_percent: z.number(),
    tasks_completed: z.number().nonnegative(),
    xp_earned: z.number().nonnegative(),
    goals_completed: z.number().nonnegative(),
    courses_completed: z.number().nonnegative(),
    requirement_breakdown: jsonSchema.nullish(),
    achieved_at: z.string().nullable(),
    expires_at: z.string().nullable(),
    last_evaluated_at: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

const identifierSchema = z.object({
  id: z.string(),
});

const goalParticipantSchema = z.object({
  goal_id: z.string(),
});

const skillMatrixRowSchema = z
  .object({
    employee_id: z.string(),
    role: z.string().nullable(),
    level: z.number().nullable(),
    xp: z.number().nullable(),
  })
  .passthrough();

const courseProgressRowSchema = z
  .object({
    course_code: z.string(),
    status: z.enum(["not_started", "in_progress", "completed"]),
  })
  .passthrough();

const badgeRowSchema = z
  .object({
    badge_code: z.string(),
  })
  .passthrough();

const profileRowSchema = z
  .object({
    id: z.string(),
    role: z.string().nullable(),
    company_id: z.string().nullable(),
  })
  .passthrough();

export type CertificationCatalogRecord = z.infer<
  typeof certificationCatalogEntrySchema
>;
export type CertificationProgressRecord = z.infer<
  typeof certificationProgressRowSchema
>;
export type SkillMatrixRecord = z.infer<typeof skillMatrixRowSchema>;
export type CourseProgressRecord = z.infer<typeof courseProgressRowSchema>;
export type BadgeRecord = z.infer<typeof badgeRowSchema>;
export type ProfileSummary = z.infer<typeof profileRowSchema>;

export interface CertificationRepositoryContext {
  catalog: CertificationCatalogRecord[];
  progress: CertificationProgressRecord[];
  completedTasks: number;
  completedGoals: number;
  skillMatrix: SkillMatrixRecord[];
  courseProgress: CourseProgressRecord[];
  badges: BadgeRecord[];
  profile: ProfileSummary | null;
}

export async function fetchCertificationCatalog() {
  const { data, error } = await supabase
    .from("certification_catalog")
    .select("*")
    .order("title", { ascending: true });

  if (error) {
    throw error;
  }

  return certificationCatalogEntrySchema.array().parse(data ?? []);
}

export async function fetchCertificationProgress(employeeId: string) {
  const { data, error } = await supabase
    .from("certification_progress")
    .select("*")
    .eq("employee_id", employeeId);

  if (error) {
    throw error;
  }

  return certificationProgressRowSchema.array().parse(data ?? []);
}

export async function fetchCompletedTasks(
  employeeId: string,
  companyId: string | null,
) {
  let query = supabase
    .from("tasks")
    .select("id")
    .eq("assigned_to", employeeId)
    .eq("status", "completed");

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return identifierSchema.array().parse(data ?? []).length;
}

export async function fetchCompletedGoals(
  employeeId: string,
  companyId: string | null,
) {
  // First get goal participants for the employee
  const { data: participantsData, error: participantsError } = await supabase
    .from("goal_participants")
    .select("goal_id")
    .eq("user_id", employeeId);

  if (participantsError) {
    throw participantsError;
  }

  const participants = goalParticipantSchema
    .array()
    .parse(participantsData ?? []);
  const goalIds = participants.map((participant) => participant.goal_id);

  if (goalIds.length === 0) {
    return 0;
  }

  // Then filter goals by company_id and status
  let goalsQuery = supabase
    .from("goals")
    .select("id")
    .in("id", goalIds)
    .eq("status", "completed");

  // Add company_id filter for tenant isolation
  if (companyId) {
    goalsQuery = goalsQuery.eq("company_id", companyId);
  }

  const goalsResult = await goalsQuery;

  if (goalsResult.error) {
    throw goalsResult.error;
  }

  return identifierSchema.array().parse(goalsResult.data ?? []).length;
}

export async function fetchSkillMatrix(employeeId: string) {
  const { data, error } = await supabase
    .from("skill_matrix")
    .select("employee_id, role, level, xp")
    .eq("employee_id", employeeId);

  if (error) {
    throw error;
  }

  return skillMatrixRowSchema.array().parse(data ?? []);
}

export async function fetchLearningCourseProgress(employeeId: string) {
  const { data, error } = await supabase
    .from("learning_course_progress")
    .select("course_code, status")
    .eq("employee_id", employeeId);

  if (error) {
    throw error;
  }

  return courseProgressRowSchema.array().parse(data ?? []);
}

export async function fetchEmployeeBadges(employeeId: string) {
  const { data, error } = await supabase
    .from("employee_badge")
    .select("badge_code")
    .eq("employee_id", employeeId);

  if (error) {
    throw error;
  }

  return badgeRowSchema.array().parse(data ?? []);
}

export async function fetchProfileSummary(employeeId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, company_id")
    .eq("id", employeeId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? profileRowSchema.parse(data) : null;
}

export async function fetchCertificationContext(
  employeeId: string,
): Promise<CertificationRepositoryContext> {
  const profile = await fetchProfileSummary(employeeId);
  const companyId = profile?.company_id ?? null;

  const [
    catalog,
    progress,
    completedTasks,
    completedGoals,
    skillMatrix,
    courseProgress,
    badges,
  ] = await Promise.all([
    fetchCertificationCatalog(),
    fetchCertificationProgress(employeeId),
    fetchCompletedTasks(employeeId, companyId),
    fetchCompletedGoals(employeeId, companyId),
    fetchSkillMatrix(employeeId),
    fetchLearningCourseProgress(employeeId),
    fetchEmployeeBadges(employeeId),
  ]);

  return {
    profile,
    catalog,
    progress,
    completedTasks,
    completedGoals,
    skillMatrix,
    courseProgress,
    badges,
  };
}

export async function upsertCertificationProgressRows(
  rows: TablesInsert<"certification_progress">[],
) {
  if (rows.length === 0) return;

  const { error } = await supabase
    .from("certification_progress")
    .upsert(rows, { onConflict: "employee_id,certification_code" });

  if (error) {
    throw error;
  }
}

export async function upsertEmployeeBadgeRecord(
  payload: TablesInsert<"employee_badge">,
) {
  const { error } = await supabase.from("employee_badge").upsert(payload, {
    onConflict: "employee_id,badge_code",
  });

  if (error) {
    throw error;
  }
}

export async function upsertSkillMatrixRecord(
  payload: TablesInsert<"skill_matrix">,
) {
  const { error } = await supabase.from("skill_matrix").upsert(payload, {
    onConflict: "employee_id,role",
  });

  if (error) {
    throw error;
  }
}

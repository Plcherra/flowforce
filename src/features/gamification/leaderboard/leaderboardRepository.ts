import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { isMissingSchemaResourceError } from "@/shared/data-access/errors";
import { logger } from "@/utils/logger";
import type { LeaderboardPeriod } from "./types";

const stringOrNullSchema = z.union([z.string(), z.null()]);

const leaderboardDepartmentSchema = z
  .object({
    id: stringOrNullSchema.optional(),
    name: stringOrNullSchema.optional(),
  })
  .passthrough()
  .nullable()
  .optional();

const leaderboardPositionSchema = z
  .object({
    name: stringOrNullSchema.optional(),
    role: stringOrNullSchema.optional(),
  })
  .passthrough()
  .nullable()
  .optional();

const numberLikeSchema = z
  .union([z.number(), z.string()])
  .transform((value) => {
    if (typeof value === "number") return value;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  })
  .default(0);

const leaderboardAchievementSchema = z
  .object({
    code: z.string(),
    label: z.string().optional().default(""),
    value: numberLikeSchema.nullable().optional(),
    context: stringOrNullSchema.optional(),
  })
  .passthrough()
  .transform((payload) => ({
    code: payload.code,
    label: payload.label ?? "",
    value: typeof payload.value === "number" ? payload.value : 0,
    context: payload.context ?? undefined,
  }));

const insightTypeSchema = z.enum(["growth", "strength", "risk"]);

const leaderboardInsightSchema = z
  .object({
    type: z
      .union([insightTypeSchema, z.string().transform(() => "growth")])
      .default("growth"),
    message: z.string(),
    value: numberLikeSchema.nullable().optional(),
  })
  .passthrough()
  .transform((payload) => ({
    type: insightTypeSchema.parse(payload.type),
    message: payload.message,
    value: typeof payload.value === "number" ? payload.value : undefined,
  }));

const challengeFocusSchema = z.enum([
  "skills",
  "recognition",
  "training",
  "promotion",
  "goals",
]);

const leaderboardChallengeSchema = z
  .object({
    employeeId: z.string(),
    focus: challengeFocusSchema,
    title: z.string(),
    description: z.string(),
    reward: z.string(),
    confidence: z.number().min(0).max(1),
    period: z.enum(["weekly", "monthly", "all_time"]),
    periodStart: stringOrNullSchema.optional(),
    suggestedBadge: stringOrNullSchema.optional(),
  })
  .passthrough();

const leaderboardEmployeeSchema = z
  .object({
    id: z.string(),
    first_name: stringOrNullSchema,
    last_name: stringOrNullSchema,
    email: stringOrNullSchema,
    avatar_url: stringOrNullSchema,
    role: stringOrNullSchema,
    department: leaderboardDepartmentSchema,
    position: leaderboardPositionSchema,
    reliability: z.number().nullable().optional(),
  })
  .passthrough()
  .nullable()
  .optional();

export const LEADERBOARD_SELECT_LEGACY = `
    employee_id,
    period,
    period_start,
    total_xp,
    rank,
    challenges,
    updated_at,
    last_synced_at,
    employee:profiles(
      id,
      first_name,
      last_name,
      email,
      avatar_url,
      role,
      department:departments(
        id,
        name
      ),
      position:positions(
        name,
        role
      )
    )
  `;

export const LEADERBOARD_SELECT = `
    employee_id,
    departmentid,
    role,
    period,
    period_start,
    xp_total,
    total_xp,
    xp_tasks,
    xp_goals,
    xp_recognitions,
    xp_training,
    badge_tier,
    badge_codes,
    achievements,
    insights,
    challenges,
    updated_at,
    last_synced_at,
    employee:profiles(
      id,
      first_name,
      last_name,
      email,
      avatar_url,
      role,
      department:departments(
        id,
        name
      ),
      position:positions(
        name,
        role
      )
    )
  `;

const leaderboardRowSchema = z.object({
  employee_id: z.string(),
  departmentid: stringOrNullSchema,
  role: z.string().nullable(),
  period: z.enum(["weekly", "monthly", "all_time"]),
  period_start: stringOrNullSchema,
  xp_total: numberLikeSchema,
  xp_tasks: numberLikeSchema,
  xp_goals: numberLikeSchema,
  xp_recognitions: numberLikeSchema,
  xp_training: numberLikeSchema,
  badge_tier: z.enum(["Bronze", "Silver", "Gold", "Platinum"]).catch("Bronze"),
  badge_codes: z.preprocess(
    (value) => (Array.isArray(value) ? value : []),
    z.array(z.string()),
  ),
  achievements: z.preprocess(
    (value) => (Array.isArray(value) ? value : []),
    z.array(leaderboardAchievementSchema),
  ),
  insights: z.preprocess(
    (value) => (Array.isArray(value) ? value : []),
    z.array(leaderboardInsightSchema),
  ),
  challenges: z.preprocess(
    (value) => (Array.isArray(value) ? value : []),
    z.array(leaderboardChallengeSchema),
  ),
  updated_at: stringOrNullSchema,
  last_synced_at: stringOrNullSchema,
  department: leaderboardDepartmentSchema,
  employee: leaderboardEmployeeSchema,
});

export type LeaderboardRowRecord = z.infer<typeof leaderboardRowSchema>;

const leaderboardRowsSchema = z.array(leaderboardRowSchema);

const leaderboardProfileSchema = z
  .object({
    id: z.string(),
    first_name: stringOrNullSchema,
    last_name: stringOrNullSchema,
    email: z.string().nullable(),
    avatar_url: stringOrNullSchema,
    role: stringOrNullSchema,
    employment_status: stringOrNullSchema,
    departmentid: stringOrNullSchema,
    department: leaderboardDepartmentSchema,
    position: leaderboardPositionSchema,
  })
  .passthrough();

export type LeaderboardProfileRecord = z.infer<typeof leaderboardProfileSchema>;

const toLeaderboardPeriod = (value: unknown): LeaderboardPeriod => {
  if (value === "weekly" || value === "monthly" || value === "all_time") {
    return value;
  }
  return "monthly";
};

const normalizeLeaderboardRow = (raw: Record<string, unknown>) => {
  const employee = raw.employee as Record<string, unknown> | null | undefined;
  const department =
    (raw.department as Record<string, unknown> | null | undefined) ??
    (employee?.department as Record<string, unknown> | null | undefined) ??
    null;

  return {
    employee_id: raw.employee_id,
    departmentid:
      raw.departmentid ??
      department?.id ??
      employee?.departmentid ??
      null,
    role: raw.role ?? employee?.role ?? "employee",
    period: toLeaderboardPeriod(raw.period),
    period_start: raw.period_start ?? null,
    xp_total: raw.xp_total ?? raw.total_xp ?? 0,
    xp_tasks: raw.xp_tasks ?? 0,
    xp_goals: raw.xp_goals ?? 0,
    xp_recognitions: raw.xp_recognitions ?? 0,
    xp_training: raw.xp_training ?? 0,
    badge_tier: raw.badge_tier ?? "Bronze",
    badge_codes: raw.badge_codes ?? [],
    achievements: raw.achievements ?? [],
    insights: raw.insights ?? [],
    challenges: raw.challenges ?? [],
    updated_at: raw.updated_at ?? null,
    last_synced_at: raw.last_synced_at ?? null,
    department,
    employee,
  };
};

const parseLeaderboardRows = (rows: unknown[]): LeaderboardRowRecord[] => {
  const normalized = rows.map((row) =>
    normalizeLeaderboardRow(row as Record<string, unknown>),
  );
  const parsed = leaderboardRowsSchema.safeParse(normalized);
  if (parsed.success) {
    return parsed.data;
  }

  logger.warn("[leaderboard] Partial row normalization; returning valid rows", {
    issueCount: parsed.error.issues.length,
    tags: ["warning"],
  });

  return normalized.flatMap((row) => {
    const result = leaderboardRowSchema.safeParse(row);
    return result.success ? [result.data] : [];
  });
};

async function queryLeaderboardRows(params: {
  companyId: string;
  period: LeaderboardPeriod;
  select: string;
  orderColumn: "xp_total" | "total_xp";
}) {
  return supabase
    .from("gamification_leaderboard")
    .select(params.select)
    .eq("company_id", params.companyId)
    .eq("period", params.period)
    .order(params.orderColumn, { ascending: false });
}

export async function fetchLeaderboardRows(params: {
  companyId: string;
  period: LeaderboardPeriod;
}): Promise<LeaderboardRowRecord[]> {
  const { companyId, period } = params;

  let response = await queryLeaderboardRows({
    companyId,
    period,
    select: LEADERBOARD_SELECT,
    orderColumn: "xp_total",
  });

  if (response.error && isMissingSchemaResourceError(response.error)) {
    response = await queryLeaderboardRows({
      companyId,
      period,
      select: LEADERBOARD_SELECT_LEGACY,
      orderColumn: "total_xp",
    });
  }

  if (response.error) {
    throw response.error;
  }

  return parseLeaderboardRows(response.data ?? []);
}

export async function fetchLeaderboardProfiles(params: {
  companyId: string;
  ids: string[];
}): Promise<LeaderboardProfileRecord[]> {
  const { companyId, ids } = params;
  if (ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
        id,
        first_name,
        last_name,
        email,
        avatar_url,
        role,
        employment_status,
        departmentid,
        department:departments(
          id,
          name
        ),
        position:positions(
          id,
          name,
          role
        )
      `,
    )
    .eq("company_id", companyId)
    .in("id", ids);

  if (error) {
    throw error;
  }

  return leaderboardProfileSchema.array().parse(data ?? []);
}

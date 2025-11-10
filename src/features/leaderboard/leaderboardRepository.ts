import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import type { LeaderboardPeriod } from './types';

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
    if (typeof value === 'number') return value;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  })
  .default(0);

const leaderboardAchievementSchema = z
  .object({
    code: z.string(),
    label: z.string().optional().default(''),
    value: numberLikeSchema.nullable().optional(),
    context: stringOrNullSchema.optional(),
  })
  .passthrough()
  .transform((payload) => ({
    code: payload.code,
    label: payload.label ?? '',
    value: typeof payload.value === 'number' ? payload.value : 0,
    context: payload.context ?? undefined,
  }));

const insightTypeSchema = z.enum(['growth', 'strength', 'risk']);

const leaderboardInsightSchema = z
  .object({
    type: z.union([insightTypeSchema, z.string().transform(() => 'growth')]).default('growth'),
    message: z.string(),
    value: numberLikeSchema.nullable().optional(),
  })
  .passthrough()
  .transform((payload) => ({
    type: insightTypeSchema.parse(payload.type),
    message: payload.message,
    value: typeof payload.value === 'number' ? payload.value : undefined,
  }));

const challengeFocusSchema = z.enum(['skills', 'recognition', 'training', 'promotion', 'goals']);

const leaderboardChallengeSchema = z
  .object({
    employeeId: z.string(),
    focus: challengeFocusSchema,
    title: z.string(),
    description: z.string(),
    reward: z.string(),
    confidence: z.number().min(0).max(1),
    period: z.enum(['weekly', 'monthly', 'all_time']),
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

export const LEADERBOARD_SELECT = `
    employee_id,
    department_id,
    role,
    period,
    period_start,
    xp_total,
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
    department:departments!gamification_leaderboard_department_id_fkey(
      id,
      name
    ),
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
      ),
      reliability
    )
  `;

const leaderboardRowSchema = z.object({
  employee_id: z.string(),
  department_id: stringOrNullSchema,
  role: z.string().nullable(),
  period: z.enum(['weekly', 'monthly', 'all_time']),
  period_start: stringOrNullSchema,
  xp_total: z.number(),
  xp_tasks: z.number(),
  xp_goals: z.number(),
  xp_recognitions: z.number(),
  xp_training: z.number(),
  badge_tier: z.enum(['Bronze', 'Silver', 'Gold', 'Platinum']).catch('Bronze'),
  badge_codes: z.preprocess((value) => (Array.isArray(value) ? value : []), z.array(z.string())),
  achievements: z.preprocess(
    (value) => (Array.isArray(value) ? value : []),
    z.array(leaderboardAchievementSchema),
  ),
  insights: z.preprocess((value) => (Array.isArray(value) ? value : []), z.array(leaderboardInsightSchema)),
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
    department_id: stringOrNullSchema,
    department: leaderboardDepartmentSchema,
    position: leaderboardPositionSchema,
  })
  .passthrough();

export type LeaderboardProfileRecord = z.infer<typeof leaderboardProfileSchema>;

export async function fetchLeaderboardRows(params: {
  companyId: string;
  period: LeaderboardPeriod;
}): Promise<LeaderboardRowRecord[]> {
  const { companyId, period } = params;
  const { data, error } = await supabase
    .from('gamification_leaderboard')
    .select(LEADERBOARD_SELECT)
    .eq('company_id', companyId)
    .eq('period', period)
    .order('xp_total', { ascending: false });

  if (error) {
    throw error;
  }

  return leaderboardRowsSchema.parse(data ?? []);
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
    .from('profiles')
    .select(
      `
        id,
        first_name,
        last_name,
        email,
        avatar_url,
        role,
        employment_status,
        department_id,
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
    .eq('company_id', companyId)
    .in('id', ids);

  if (error) {
    throw error;
  }

  return leaderboardProfileSchema.array().parse(data ?? []);
}

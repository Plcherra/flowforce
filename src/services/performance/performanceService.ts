import dayjs from 'dayjs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/public-types';
import {
  goalStatusSchema,
  performanceReviewStatusSchema,
  type EmployeePerformance,
  type PerformanceDataset,
  type PerformanceGoal,
  type PerformanceGoalReview,
  type PerformanceReview,
  type PerformanceReviewStatus,
  type PerformanceRadarMetric,
  type GoalStatus,
} from './performanceTypes';

const REVIEW_STATUS_WEIGHTS: Record<PerformanceReviewStatus, number> = {
  on_track: 100,
  needs_coaching: 65,
  due_soon: 55,
  overdue: 40,
};

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function resolveActiveCompanyId(
  client: SupabaseClient,
): Promise<string | null> {
  try {
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError) {
      console.warn('[performance] Failed to resolve authenticated user', authError);
      return null;
    }

    const userId = authData?.user?.id;
    if (!userId) {
      return null;
    }

    const { data, error } = await client
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[performance] Failed to resolve company id', error);
      return null;
    }

    return data?.company_id ?? null;
  } catch (error) {
    console.warn('[performance] Unexpected error resolving company id', error);
    return null;
  }
}

export function determineReviewStatus(
  reviewDate: string | null,
  score: number | null,
  referenceDate: dayjs.Dayjs = dayjs(),
): PerformanceReviewStatus {
  if (!reviewDate) {
    return performanceReviewStatusSchema.parse('due_soon');
  }

  const diff = referenceDate.diff(dayjs(reviewDate), 'day');
  if (diff > 180) {
    return performanceReviewStatusSchema.parse('overdue');
  }
  if (diff > 90) {
    return performanceReviewStatusSchema.parse('due_soon');
  }

  if ((score ?? 3) <= 2) {
    return performanceReviewStatusSchema.parse('needs_coaching');
  }

  return performanceReviewStatusSchema.parse('on_track');
}

function buildReviewEntries(rows: Tables<'performance_reviews'>[]): PerformanceReview[] {
  return rows
    .sort((a, b) => dayjs(b.review_date).valueOf() - dayjs(a.review_date).valueOf())
    .map((row) => {
      const status = determineReviewStatus(row.review_date, row.score);
      return {
        id: row.id,
        goalId: row.goal_id,
        date: row.review_date,
        score: row.score,
        summary: row.summary,
        reviewerId: row.reviewer_id,
        status,
        aiSummary: row.ai_summary,
        aiInsightId: row.ai_insight_id,
        actionItems: (row.action_items ?? []) as PerformanceReview['actionItems'],
        reviewCycle: row.review_cycle,
      };
    });
}

function buildPerformanceGoals(
  goals: Tables<'goals'>[],
  participantRows: Tables<'goal_participants'>[],
): PerformanceGoal[] {
  const goalMap = new Map(goals.map((goal) => [goal.id, goal]));

  return participantRows
    .map((participant) => {
      const goal = goalMap.get(participant.goal_id);
      if (!goal) return null;

      const parsedStatus = goalStatusSchema.parse(goal.status);
      return {
        id: goal.id,
        title: goal.title,
        status: parsedStatus,
        progress: goal.progress,
        targetCompletionDate: goal.target_completion_date,
        createdAt: goal.created_at,
        participantRole: participant.role,
        contributionScore: participant.contribution_score,
      };
    })
    .filter((goal): goal is PerformanceGoal => Boolean(goal));
}

function calculateAttendanceReliability(rows: Tables<'staff_performance'>[]): number {
  if (!rows.length) return 75;
  const lateCount = rows.filter((row) => row.attendance_status === 'late').length;
  const absentCount = rows.filter((row) => row.attendance_status === 'absent').length;
  const deductions = lateCount * 5 + absentCount * 12;

  return clampPercentage(100 - deductions);
}

function calculatePerformanceScore(rows: Tables<'staff_performance'>[]): number {
  const scored = rows.filter((row) => typeof row.performance_score === 'number');
  if (!scored.length) return 70;

  const total = scored.reduce((sum, row) => sum + (row.performance_score ?? 0), 0);
  const averageScore = total / scored.length;
  return clampPercentage((averageScore / 5) * 100);
}

function calculateGoalProgress(goals: PerformanceGoal[]): number {
  if (!goals.length) return 0;
  const progress = goals.reduce((sum, goal) => sum + goal.progress, 0);
  return clampPercentage(progress / goals.length);
}

function calculateReviewHealth(reviews: PerformanceReview[]): number {
  if (!reviews.length) return clampPercentage(REVIEW_STATUS_WEIGHTS.due_soon);
  const total = reviews.reduce(
    (sum, review) => sum + REVIEW_STATUS_WEIGHTS[review.status],
    0,
  );
  return clampPercentage(total / reviews.length);
}

function buildEmployeePerformance(
  profile: Tables<'profiles'>,
  performanceRows: Tables<'staff_performance'>[],
  reviewRows: Tables<'performance_reviews'>[],
  goalRows: Tables<'goals'>[],
  participantRows: Tables<'goal_participants'>[],
): EmployeePerformance {
  const reviews = buildReviewEntries(reviewRows);
  const goals = buildPerformanceGoals(goalRows, participantRows);
  const latestReview = reviews[0];

  return {
    id: profile.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    role: profile.role,
    avatarUrl: profile.avatar_url,
    metrics: {
      performanceScore: calculatePerformanceScore(performanceRows),
      goalProgress: calculateGoalProgress(goals),
      attendanceReliability: calculateAttendanceReliability(performanceRows),
      reviewHealth: calculateReviewHealth(reviews),
    },
    goals,
    reviews,
    latestReviewStatus: latestReview
      ? latestReview.status
      : performanceReviewStatusSchema.parse('due_soon'),
    latestReviewDate: latestReview?.date ?? null,
  };
}

function buildRadarMetrics(employees: EmployeePerformance[]): PerformanceRadarMetric[] {
  const metricKeys: (keyof EmployeePerformance['metrics'])[] = [
    'performanceScore',
    'goalProgress',
    'attendanceReliability',
    'reviewHealth',
  ];

  const averages = metricKeys.map((metric) => {
    if (!employees.length) return 0;
    const total = employees.reduce((sum, employee) => sum + employee.metrics[metric], 0);
    return Math.round(total / employees.length);
  });

  const [performanceScore, goalProgress, attendance, reviewHealth] = averages;

  return [
    {
      metric: 'Performance Score',
      actual: performanceScore,
      target: 90,
      fullMark: 100,
    },
    {
      metric: 'Goal Progress',
      actual: goalProgress,
      target: 85,
      fullMark: 100,
    },
    {
      metric: 'Attendance',
      actual: attendance,
      target: 90,
      fullMark: 100,
    },
    {
      metric: 'Review Health',
      actual: reviewHealth,
      target: 95,
      fullMark: 100,
    },
  ];
}

function buildGoalSummary(employees: EmployeePerformance[]) {
  const goals = employees.flatMap((employee) => employee.goals);
  return {
    total: goals.length,
    active: goals.filter((goal) => goal.status === 'active').length,
    completed: goals.filter((goal) => goal.status === 'completed').length,
    averageProgress: goals.length
      ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length)
      : 0,
  };
}

function mapGoalReviewRow(row: Tables<'performance_goal_reviews'>): PerformanceGoalReview {
  return {
    reviewId: row.review_id,
    companyId: row.company_id,
    employeeId: row.employee_id,
    reviewerId: row.reviewer_id,
    goalId: row.goal_id,
    goalTitle: row.goal_title,
    goalStatus: row.goal_status,
    goalProgress: row.goal_progress,
    targetCompletionDate: row.target_completion_date,
    goalCompletedAt: row.goal_completed_at,
    goalOwnerId: row.goal_owner_id,
    reviewDate: row.review_date,
    reviewCycle: row.review_cycle,
    score: row.score,
    summary: row.summary,
    aiSummary: row.ai_summary,
    actionItems: (row.action_items ?? []) as PerformanceGoalReview['actionItems'],
    reviewPeriodStart: row.review_period_start,
    reviewPeriodEnd: row.review_period_end,
    aiInsightId: row.ai_insight_id,
    insightType: row.insight_type,
    insightData: row.insight_data,
    insightGeneratedAt: row.insight_generated_at,
    insightExpiresAt: row.insight_expires_at,
    goalPriority: row.goal_priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchPerformanceDataset(
  client: SupabaseClient = supabase,
): Promise<PerformanceDataset> {
  const companyId = await resolveActiveCompanyId(client);

  let profileQuery = client
    .from('profiles')
    .select('id, first_name, last_name, role, avatar_url, employment_status, company_id')
    .eq('employment_status', 'active');

  if (companyId) {
    profileQuery = profileQuery.eq('company_id', companyId);
  }

  let goalsQuery = client
    .from('goals')
    .select('id, title, status, progress, target_completion_date, created_at, company_id');

  if (companyId) {
    goalsQuery = goalsQuery.eq('company_id', companyId);
  }

  let reviewQuery = client
    .from('performance_reviews')
    .select(
      [
        'id',
        'company_id',
        'employee_id',
        'goal_id',
        'review_cycle',
        'review_period_start',
        'review_period_end',
        'review_date',
        'reviewer_id',
        'score',
        'summary',
        'ai_summary',
        'action_items',
        'ai_insight_id',
        'created_at',
        'updated_at',
      ].join(','),
    )
    .gte('review_date', dayjs().subtract(365, 'day').format('YYYY-MM-DD'));

  if (companyId) {
    reviewQuery = reviewQuery.eq('company_id', companyId);
  }

  let goalReviewQuery = client
    .from('performance_goal_reviews')
    .select('*')
    .order('review_date', { ascending: false })
    .limit(200);

  if (companyId) {
    goalReviewQuery = goalReviewQuery.eq('company_id', companyId);
  }

  const [
    profileResult,
    performanceResult,
    reviewResult,
    goalsResult,
    participantResult,
    goalReviewResult,
  ] = await Promise.all([
    profileQuery,
    client
      .from('staff_performance')
      .select('id, user_id, performance_score, attendance_status, date')
      .gte('date', dayjs().subtract(180, 'day').format('YYYY-MM-DD')),
    reviewQuery,
    goalsQuery,
    client.from('goal_participants').select('id, goal_id, user_id, role, contribution_score'),
    goalReviewQuery,
  ]);

  const errors = [
    profileResult.error,
    performanceResult.error,
    reviewResult.error,
    goalsResult.error,
    participantResult.error,
    goalReviewResult.error,
  ].filter(Boolean);

  if (errors.length) {
    const message = errors.map((error) => error!.message).join('; ');
    throw new Error(`Failed to load performance dataset: ${message}`);
  }

  const allProfiles = profileResult.data ?? [];
  const profiles = companyId
    ? allProfiles.filter((profile) => profile.company_id === companyId)
    : allProfiles;
  const employeeIds = new Set(profiles.map((profile) => profile.id));

  const performanceRows = (performanceResult.data ?? []).filter((row) => {
    return !companyId || (row.user_id !== null && employeeIds.has(row.user_id));
  });
  const performanceByUser = new Map<string, Tables<'staff_performance'>[]>();
  performanceRows.forEach((row) => {
    if (!row.user_id) return;
    const list = performanceByUser.get(row.user_id) ?? [];
    list.push(row);
    performanceByUser.set(row.user_id, list);
  });

  const reviewRows = (reviewResult.data ?? []).filter((row) => {
    return !companyId || row.company_id === companyId;
  });
  const reviewsByUser = new Map<string, Tables<'performance_reviews'>[]>();
  reviewRows.forEach((row) => {
    const list = reviewsByUser.get(row.employee_id) ?? [];
    list.push(row);
    reviewsByUser.set(row.employee_id, list);
  });

  const goals = (goalsResult.data ?? []).filter((goal) => {
    return !companyId || goal.company_id === companyId;
  });
  const goalIds = new Set(goals.map((goal) => goal.id));

  const participantRows = (participantResult.data ?? []).filter((row) => {
    const isCompanyGoal = goalIds.has(row.goal_id);
    const isCompanyParticipant = !companyId || employeeIds.has(row.user_id);
    return isCompanyGoal && isCompanyParticipant;
  });

  const participantsByUser = new Map<string, Tables<'goal_participants'>[]>();
  participantRows.forEach((row) => {
    const list = participantsByUser.get(row.user_id) ?? [];
    list.push(row);
    participantsByUser.set(row.user_id, list);
  });

  const employees = profiles.map((profile) =>
    buildEmployeePerformance(
      profile,
      performanceByUser.get(profile.id) ?? [],
      reviewsByUser.get(profile.id) ?? [],
      goals,
      participantsByUser.get(profile.id) ?? [],
    ),
  );

  const goalReviewRows = (goalReviewResult.data ?? []).filter((row) => {
    return (!companyId || row.company_id === companyId) && employeeIds.has(row.employee_id);
  });
  const goalReviews = goalReviewRows
    .map(mapGoalReviewRow)
    .sort((a, b) => dayjs(b.reviewDate).valueOf() - dayjs(a.reviewDate).valueOf());

  return {
    employees,
    radar: buildRadarMetrics(employees),
    goalSummary: buildGoalSummary(employees),
    goalReviews,
  };
}

export function assertGoalIsLinkable(status: GoalStatus) {
  const parsed = goalStatusSchema.parse(status);
  if (parsed === 'completed' || parsed === 'cancelled') {
    throw new Error('Tasks can only be linked to draft or active goals.');
  }
}

export function assertReviewStatus(status: PerformanceReviewStatus) {
  performanceReviewStatusSchema.parse(status);
}

export async function createPerformanceRecord(
  record: TablesInsert<'staff_performance'>,
  client: SupabaseClient = supabase,
) {
  const { data, error } = await client
    .from('staff_performance')
    .insert(record)
    .select()
    .single();
  if (error) throw new Error(`Failed to create performance record: ${error.message}`);
  return data;
}

export async function updatePerformanceRecord(
  id: Tables<'staff_performance'>['id'],
  updates: TablesUpdate<'staff_performance'>,
  client: SupabaseClient = supabase,
) {
  const { data, error } = await client
    .from('staff_performance')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update performance record: ${error.message}`);
  return data;
}

export async function deletePerformanceRecord(
  id: Tables<'staff_performance'>['id'],
  client: SupabaseClient = supabase,
) {
  const { error } = await client.from('staff_performance').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete performance record: ${error.message}`);
}

export async function createPerformanceReview(
  review: TablesInsert<'performance_reviews'>,
  client: SupabaseClient = supabase,
) {
  const payload: TablesInsert<'performance_reviews'> = {
    review_cycle: 'Quarterly',
    action_items: [],
    ...review,
  };
  const { data, error } = await client
    .from('performance_reviews')
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`Failed to create performance review: ${error.message}`);
  return data;
}

export async function updatePerformanceReview(
  id: Tables<'performance_reviews'>['id'],
  updates: TablesUpdate<'performance_reviews'>,
  client: SupabaseClient = supabase,
) {
  const { data, error } = await client
    .from('performance_reviews')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update performance review: ${error.message}`);
  return data;
}

export async function deletePerformanceReview(
  id: Tables<'performance_reviews'>['id'],
  client: SupabaseClient = supabase,
) {
  const { error } = await client.from('performance_reviews').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete performance review: ${error.message}`);
}

export async function createPerformanceGoal(
  goal: TablesInsert<'goals'>,
  client: SupabaseClient = supabase,
) {
  const payload: TablesInsert<'goals'> = {
    status: 'draft',
    priority: 'medium',
    progress: 0,
    ...goal,
  };
  const { data, error } = await client.from('goals').insert(payload).select().single();
  if (error) throw new Error(`Failed to create performance goal: ${error.message}`);
  return data;
}

export async function updatePerformanceGoal(
  id: Tables<'goals'>['id'],
  updates: TablesUpdate<'goals'>,
  client: SupabaseClient = supabase,
) {
  const { data, error } = await client
    .from('goals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update performance goal: ${error.message}`);
  return data;
}

export async function deletePerformanceGoal(
  id: Tables<'goals'>['id'],
  client: SupabaseClient = supabase,
) {
  const { error } = await client.from('goals').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete performance goal: ${error.message}`);
}

export async function createGoalParticipant(
  participant: TablesInsert<'goal_participants'>,
  client: SupabaseClient = supabase,
) {
  const payload: TablesInsert<'goal_participants'> = {
    role: 'owner',
    ...participant,
  };
  const { data, error } = await client
    .from('goal_participants')
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`Failed to add goal participant: ${error.message}`);
  return data;
}

export async function deleteGoalParticipant(
  id: Tables<'goal_participants'>['id'],
  client: SupabaseClient = supabase,
) {
  const { error } = await client.from('goal_participants').delete().eq('id', id);
  if (error) throw new Error(`Failed to remove goal participant: ${error.message}`);
}

export interface PerformanceCrudSimulationOptions {
  employeeId: string;
  reviewerId: string;
  companyId: string;
  client?: SupabaseClient;
  referenceDate?: dayjs.Dayjs;
}

export interface PerformanceCrudSimulationSnapshot {
  baseline: PerformanceDataset;
  postCreate: PerformanceDataset;
  postUpdate: PerformanceDataset;
  postCleanup: PerformanceDataset;
}

export interface PerformanceCrudSimulationResult {
  review: {
    created: Tables<'performance_reviews'>;
    updated: Tables<'performance_reviews'>;
  };
  goal: {
    created: Tables<'goals'>;
    updated: Tables<'goals'>;
  };
  participant: {
    created: Tables<'goal_participants'>;
  };
  snapshots: PerformanceCrudSimulationSnapshot;
}

export async function simulatePerformanceCrud(
  options: PerformanceCrudSimulationOptions,
): Promise<PerformanceCrudSimulationResult> {
  const {
    employeeId,
    reviewerId,
    companyId,
    client = supabase,
    referenceDate = dayjs(),
  } = options;

  const snapshots: Partial<PerformanceCrudSimulationSnapshot> = {};

  const createdResources: {
    review?: Tables<'performance_reviews'>;
    goal?: Tables<'goals'>;
    participant?: Tables<'goal_participants'>;
  } = {};

  snapshots.baseline = await fetchPerformanceDataset(client);

  try {
    const reviewPayload: TablesInsert<'performance_reviews'> = {
      company_id: companyId,
      employee_id: employeeId,
      reviewer_id: reviewerId,
      review_cycle: 'Quarterly',
      review_period_start: referenceDate.subtract(90, 'day').format('YYYY-MM-DD'),
      review_period_end: referenceDate.format('YYYY-MM-DD'),
      review_date: referenceDate.format('YYYY-MM-DD'),
      score: 3,
      summary: 'Simulation: Initial performance check-in.',
      action_items: [],
    };
    const createdReview = await createPerformanceReview(reviewPayload, client);
    createdResources.review = createdReview;

    const goalPayload: TablesInsert<'goals'> = {
      company_id: companyId,
      created_by: reviewerId,
      title: `Simulation goal ${referenceDate.format('YYYYMMDDHHmmss')}`,
      status: 'active',
      priority: 'medium',
      progress: 20,
      target_completion_date: referenceDate.add(45, 'day').format('YYYY-MM-DD'),
    };
    const createdGoal = await createPerformanceGoal(goalPayload, client);
    createdResources.goal = createdGoal;

    const participantPayload: TablesInsert<'goal_participants'> = {
      user_id: employeeId,
      goal_id: createdGoal.id,
      role: 'owner',
      contribution_score: 75,
    };
    const createdParticipant = await createGoalParticipant(participantPayload, client);
    createdResources.participant = createdParticipant;

    snapshots.postCreate = await fetchPerformanceDataset(client);

    const reviewUpdates: TablesUpdate<'performance_reviews'> = {
      score: 5,
      summary: 'Simulation: Elevated to top performer.',
      review_date: referenceDate.add(7, 'day').format('YYYY-MM-DD'),
    };
    const updatedReview = await updatePerformanceReview(createdReview.id, reviewUpdates, client);

    const goalUpdates: TablesUpdate<'goals'> = {
      progress: 85,
      status: 'active',
      target_completion_date: referenceDate.add(30, 'day').format('YYYY-MM-DD'),
    };
    const updatedGoal = await updatePerformanceGoal(createdGoal.id, goalUpdates, client);

    snapshots.postUpdate = await fetchPerformanceDataset(client);

    await deletePerformanceReview(createdReview.id, client);
    createdResources.review = undefined;

    if (createdParticipant) {
      await deleteGoalParticipant(createdParticipant.id, client);
      createdResources.participant = undefined;
    }

    await deletePerformanceGoal(createdGoal.id, client);
    createdResources.goal = undefined;

    snapshots.postCleanup = await fetchPerformanceDataset(client);

    return {
      review: {
        created: createdReview,
        updated: updatedReview,
      },
      goal: {
        created: createdGoal,
        updated: updatedGoal,
      },
      participant: {
        created: createdParticipant,
      },
      snapshots: snapshots as PerformanceCrudSimulationSnapshot,
    };
  } catch (error) {
    if (createdResources.review) {
      try {
        await deletePerformanceReview(createdResources.review.id, client);
      } catch {
        /* ignore cleanup failures */
      }
    }

    if (createdResources.participant) {
      try {
        await deleteGoalParticipant(createdResources.participant.id, client);
      } catch {
        /* ignore cleanup failures */
      }
    }

    if (createdResources.goal) {
      try {
        await deletePerformanceGoal(createdResources.goal.id, client);
      } catch {
        /* ignore cleanup failures */
      }
    }

    throw error;
  }
}

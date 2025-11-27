// @ts-nocheck
import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import type { Tables, TablesInsert } from '@/integrations/supabase/public-types';
import {
  fetchCertificationContext,
  upsertCertificationProgressRows,
  upsertEmployeeBadgeRecord,
  upsertSkillMatrixRecord,
  type CertificationRepositoryContext,
  type SkillMatrixRecord,
} from '@/repositories/certificationsRepository';

type CertificationCatalogRow = Tables<'certification_catalog'>;
type CertificationStatus = Tables<'certification_progress'>['status'];

interface RequirementConfig {
  tasks?: {
    completed?: number;
  };
  goals?: {
    completed?: number;
  };
  xp?: {
    amount?: number;
  };
  courses?: {
    codes?: string[];
    completed?: number;
  };
  reward?: {
    xp?: number;
    autoAwardBadge?: boolean;
  };
}

interface RequirementDetail {
  key: 'tasks' | 'goals' | 'xp' | 'courses';
  labelKey: string;
  current: number;
  target: number;
  ratio: number;
  meta?: {
    requiredCodes?: string[];
  };
}

export interface CertificationViewModel extends CertificationCatalogRow {
  status: CertificationStatus;
  progressPercent: number;
  requirementDetails: RequirementDetail[];
  achievedAt?: string | null;
  expiresAt?: string | null;
  badgeAwarded: boolean;
  pendingBadge: boolean;
  parsedConfig: RequirementConfig;
  lastEvaluatedAt?: string;
}

export interface CertificationMetrics {
  completedTasks: number;
  completedGoals: number;
  totalXp: number;
  completedCourses: number;
  completedCourseCodes: string[];
}

interface CertificationEvaluationResult {
  certifications: CertificationViewModel[];
  metrics: CertificationMetrics | null;
}

const XP_BASE = 200;
const XP_GROWTH = 150;

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

const getXpForLevel = (level: number) => XP_BASE + XP_GROWTH * Math.max(level - 1, 0);

const levelFromXp = (xp: number) => {
  let level = 1;
  let remaining = xp;

  while (remaining >= getXpForLevel(level)) {
    remaining -= getXpForLevel(level);
    level += 1;
  }

  return Math.max(level, 1);
};

const requirementLabelKeys: Record<RequirementDetail['key'], string> = {
  tasks: 'certifications.requirementLabels.tasks',
  goals: 'certifications.requirementLabels.goals',
  xp: 'certifications.requirementLabels.xp',
  courses: 'certifications.requirementLabels.courses',
};

export function useCertifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => ['certifications', user?.id] as const, [user?.id]);

  const {
    data,
    isLoading,
    isFetching,
    error: queryError,
  } = useQuery({
    queryKey,
    enabled: Boolean(user?.id),
    queryFn: () => {
      if (!user?.id) {
        return Promise.resolve<CertificationEvaluationResult>({ certifications: [], metrics: null });
      }
      return evaluateCertifications(user.id);
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

  const refresh = useCallback(() => {
    if (!user?.id) return;
    void queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey, user?.id]);

  return {
    certifications: user ? data?.certifications ?? [] : [],
    metrics: user ? data?.metrics ?? null : null,
    loading: Boolean(user) ? isLoading || isFetching : false,
    error: user && queryError instanceof Error ? queryError.message : null,
    refresh,
  };
}

async function evaluateCertifications(employeeId: string): Promise<CertificationEvaluationResult> {
  try {
    const context = await fetchCertificationContext(employeeId);
    return await buildCertificationEvaluation(employeeId, context);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Failed to load certifications', error);
    }
    throw new Error('certifications.errors.load');
  }
}

async function buildCertificationEvaluation(
  employeeId: string,
  context: CertificationRepositoryContext,
): Promise<CertificationEvaluationResult> {
  const totalXp = context.skillMatrix.reduce((sum, row) => sum + (row.xp ?? 0), 0);
  const completedCourseCodes = context.courseProgress
    .filter((row) => row.status === 'completed')
    .map((row) => row.course_code);

  const metricsSnapshot: CertificationMetrics = {
    completedTasks: context.completedTasks,
    completedGoals: context.completedGoals,
    totalXp,
    completedCourses: completedCourseCodes.length,
    completedCourseCodes,
  };

  const progressMap = new Map(context.progress.map((row) => [row.certification_code, row]));
  const earnedBadges = new Set(context.badges.map((row) => row.badge_code));
  const profileRole = context.profile?.role ?? null;

  const updates: TablesInsert<'certification_progress'>[] = [];
  const viewModels: CertificationViewModel[] = [];
  const viewModelMap = new Map<string, CertificationViewModel>();
  const newlyEarnedRewards: Array<{
    catalog: CertificationCatalogRow;
    config: RequirementConfig;
    badgeAlreadyAwarded: boolean;
  }> = [];

  const nowIso = new Date().toISOString();

  context.catalog.forEach((catalog) => {
    const config = (catalog.requirement_config ?? {}) as RequirementConfig;
    const requirementDetails: RequirementDetail[] = [];

    if (config.tasks?.completed && config.tasks.completed > 0) {
      requirementDetails.push({
        key: 'tasks',
        labelKey: requirementLabelKeys.tasks,
        current: context.completedTasks,
        target: config.tasks.completed,
        ratio: context.completedTasks / config.tasks.completed,
      });
    }

    if (config.goals?.completed && config.goals.completed > 0) {
      requirementDetails.push({
        key: 'goals',
        labelKey: requirementLabelKeys.goals,
        current: context.completedGoals,
        target: config.goals.completed,
        ratio: context.completedGoals / config.goals.completed,
      });
    }

    if (config.xp?.amount && config.xp.amount > 0) {
      requirementDetails.push({
        key: 'xp',
        labelKey: requirementLabelKeys.xp,
        current: totalXp,
        target: config.xp.amount,
        ratio: totalXp / config.xp.amount,
      });
    }

    if (config.courses?.codes?.length) {
      const requiredCodes = config.courses.codes;
      const completedCount = requiredCodes.filter((code) => completedCourseCodes.includes(code)).length;

      requirementDetails.push({
        key: 'courses',
        labelKey: requirementLabelKeys.courses,
        current: completedCount,
        target: requiredCodes.length,
        ratio: completedCount / requiredCodes.length,
        meta: {
          requiredCodes,
        },
      });
    } else if (config.courses?.completed && config.courses.completed > 0) {
      requirementDetails.push({
        key: 'courses',
        labelKey: requirementLabelKeys.courses,
        current: metricsSnapshot.completedCourses,
        target: config.courses.completed,
        ratio: metricsSnapshot.completedCourses / config.courses.completed,
      });
    }

    const ratios = requirementDetails.map((detail) => clamp(detail.ratio));
    const aggregateRatio =
      ratios.length > 0 ? ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length : 0;

    const progressPercent = Math.round(clamp(aggregateRatio) * 100);

    const allComplete = requirementDetails.length > 0 && requirementDetails.every((detail) => detail.ratio >= 1);
    const someProgress = requirementDetails.some((detail) => detail.ratio > 0);

    const existingProgress = progressMap.get(catalog.code);
    const badgeCode = catalog.badge_code ?? null;
    const badgeAwarded = badgeCode ? earnedBadges.has(badgeCode) : false;
    const expiresAt = existingProgress?.expires_at ?? null;
    const hasExpired = Boolean(
      (existingProgress?.status === 'expired' && !allComplete) ||
        (expiresAt ? new Date(expiresAt).getTime() < Date.now() : false),
    );

    let status: CertificationStatus = hasExpired ? 'expired' : existingProgress?.status ?? 'available';

    if (!hasExpired && allComplete) {
      status = 'earned';
    } else if (!hasExpired && someProgress) {
      status = 'in_progress';
    } else if (hasExpired) {
      status = 'expired';
    } else if (!['earned', 'in_progress', 'available', 'expired'].includes(status)) {
      status = 'available';
    }

    const pendingBadge = Boolean(badgeCode && status === 'earned' && !badgeAwarded);

    const breakdown = requirementDetails.map((detail) => ({
      key: detail.key,
      current: detail.current,
      target: detail.target,
      ratio: detail.ratio,
      meta: detail.meta ?? null,
    }));

    const upsertPayload: TablesInsert<'certification_progress'> = {
      employee_id: employeeId,
      certification_code: catalog.code,
      status,
      progress_percent: progressPercent,
      tasks_completed: context.completedTasks,
      xp_earned: totalXp,
      goals_completed: context.completedGoals,
      courses_completed: metricsSnapshot.completedCourses,
      requirement_breakdown: breakdown,
      last_evaluated_at: nowIso,
      updated_at: nowIso,
    };

    if (existingProgress?.achieved_at) {
      upsertPayload.achieved_at = existingProgress.achieved_at;
    }

    if (status === 'earned' && !existingProgress?.achieved_at) {
      upsertPayload.achieved_at = nowIso;
    }

    const hasChanged =
      !existingProgress ||
      existingProgress.status !== upsertPayload.status ||
      Math.round(existingProgress.progress_percent) !== upsertPayload.progress_percent ||
      existingProgress.tasks_completed !== upsertPayload.tasks_completed ||
      existingProgress.goals_completed !== upsertPayload.goals_completed ||
      existingProgress.courses_completed !== upsertPayload.courses_completed ||
      existingProgress.xp_earned !== upsertPayload.xp_earned;

    if (hasChanged) {
      updates.push(upsertPayload);
    }

    if (status === 'earned' && existingProgress?.status !== 'earned') {
      newlyEarnedRewards.push({
        catalog,
        config,
        badgeAlreadyAwarded: badgeAwarded,
      });
    }

    const viewModel: CertificationViewModel = {
      ...catalog,
      status,
      progressPercent,
      requirementDetails,
      achievedAt: upsertPayload.achieved_at ?? existingProgress?.achieved_at ?? null,
      expiresAt,
      badgeAwarded,
      pendingBadge,
      parsedConfig: config,
      lastEvaluatedAt: upsertPayload.last_evaluated_at,
    };

    viewModels.push(viewModel);
    viewModelMap.set(catalog.code, viewModel);
  });

  await upsertCertificationProgressRows(updates);

  if (newlyEarnedRewards.length > 0 && profileRole) {
    for (const reward of newlyEarnedRewards) {
      const rewardXp = reward.config.reward?.xp ?? 0;
      const shouldAutoAward = reward.config.reward?.autoAwardBadge ?? false;

      if (rewardXp > 0) {
        await applyXpReward(employeeId, profileRole, rewardXp, context.skillMatrix);
      }

      const badgeCode = reward.catalog.badge_code;
      if (shouldAutoAward && badgeCode && !reward.badgeAlreadyAwarded) {
        await upsertEmployeeBadgeRecord({
          employee_id: employeeId,
          badge_code: badgeCode,
          reason: `Auto-awarded after completing ${reward.catalog.title}`,
        });
        const updatedViewModel = viewModelMap.get(reward.catalog.code);
        if (updatedViewModel) {
          updatedViewModel.badgeAwarded = true;
          updatedViewModel.pendingBadge = false;
        }
      }
    }
  }

  const sorted = sortCertifications(viewModels);

  return {
    certifications: sorted,
    metrics: metricsSnapshot,
  };
}

function sortCertifications(certifications: CertificationViewModel[]) {
  const order: Record<CertificationStatus, number> = {
    earned: 0,
    in_progress: 1,
    available: 2,
    expired: 3,
  };

  return [...certifications].sort((a, b) => {
    const statusDiff = order[a.status] - order[b.status];
    if (statusDiff !== 0) return statusDiff;
    if (a.progressPercent !== b.progressPercent) {
      return b.progressPercent - a.progressPercent;
    }
    return a.title.localeCompare(b.title);
  });
}

async function applyXpReward(employeeId: string, role: string | null, xpReward: number, skillMatrix: SkillMatrixRecord[]) {
  if (!role || xpReward <= 0) return;

  const existing = skillMatrix.find((row) => row.role === role);
  const currentXp = existing?.xp ?? 0;
  const newXp = currentXp + xpReward;
  const computedLevel = levelFromXp(newXp);

  await upsertSkillMatrixRecord({
    employee_id: employeeId,
    role,
    xp: newXp,
    level: computedLevel,
  });
}

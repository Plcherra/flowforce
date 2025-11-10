import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables, TablesInsert } from '@/integrations/supabase/public-types';

type CertificationCatalogRow = Tables<'certification_catalog'>;
type CertificationProgressRow = Tables<'certification_progress'>;
type LearningCourseProgressRow = Tables<'learning_course_progress'>;
type SkillMatrixRow = Tables<'skill_matrix'>;
type BadgeRow = Tables<'employee_badge'>;
type GoalParticipantRow = Tables<'goal_participants'>;

type CertificationStatus = CertificationProgressRow['status'];

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
  const [certifications, setCertifications] = useState<CertificationViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<CertificationMetrics | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setCertifications([]);
      setMetrics(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        catalogResult,
        progressResult,
        tasksResult,
        goalParticipantsResult,
        skillsResult,
        courseProgressResult,
        badgeResult,
        profileResult,
      ] = await Promise.all([
        supabase
          .from('certification_catalog')
          .select('*')
          .order('title', { ascending: true }),
        supabase
          .from('certification_progress')
          .select('*')
          .eq('employee_id', user.id),
        supabase
          .from('tasks')
          .select('id')
          .eq('assigned_to', user.id)
          .eq('status', 'completed'),
        supabase
          .from('goal_participants')
          .select('goal_id')
          .eq('user_id', user.id),
        supabase
          .from('skill_matrix')
          .select('employee_id, role, level, xp')
          .eq('employee_id', user.id),
        supabase
          .from('learning_course_progress')
          .select('course_code, status')
          .eq('employee_id', user.id),
        supabase
          .from('employee_badge')
          .select('badge_code')
          .eq('employee_id', user.id),
        supabase
          .from('profiles')
          .select('id, role')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

      if (catalogResult.error) throw catalogResult.error;
      if (progressResult.error) throw progressResult.error;
      if (tasksResult.error) throw tasksResult.error;
      if (goalParticipantsResult.error) throw goalParticipantsResult.error;
      if (skillsResult.error) throw skillsResult.error;
      if (courseProgressResult.error) throw courseProgressResult.error;
      if (badgeResult.error) throw badgeResult.error;
      if (profileResult.error) throw profileResult.error;

      const goalIds = (goalParticipantsResult.data as GoalParticipantRow[] | null)?.map((row) => row.goal_id) ?? [];
      let completedGoals = 0;

      if (goalIds.length > 0) {
        const goalsResult = await supabase
          .from('goals')
          .select('id')
          .in('id', goalIds)
          .eq('status', 'completed');

        if (goalsResult.error) {
          throw goalsResult.error;
        }

        completedGoals = goalsResult.data?.length ?? 0;
      }

      const completedTasks = tasksResult.data?.length ?? 0;
      const skillRows = (skillsResult.data ?? []) as SkillMatrixRow[];
      const totalXp = skillRows.reduce((sum, row) => sum + (row.xp ?? 0), 0);

      const courseProgressRows = (courseProgressResult.data ?? []) as LearningCourseProgressRow[];
      const completedCourseCodes = courseProgressRows
        .filter((row) => row.status === 'completed')
        .map((row) => row.course_code);

      const metricsSnapshot: CertificationMetrics = {
        completedTasks,
        completedGoals,
        totalXp,
        completedCourses: completedCourseCodes.length,
        completedCourseCodes,
      };

      setMetrics(metricsSnapshot);

      const progressRows = (progressResult.data ?? []) as CertificationProgressRow[];
      const progressMap = new Map<string, CertificationProgressRow>();
      progressRows.forEach((row) => progressMap.set(row.certification_code, row));

      const catalogRows = (catalogResult.data ?? []) as CertificationCatalogRow[];
      const badgeRows = (badgeResult.data ?? []) as BadgeRow[];
      const earnedBadges = new Set(badgeRows.map((row) => row.badge_code));
      const profileRole = profileResult.data?.role ?? null;

      const updates: TablesInsert<'certification_progress'>[] = [];
      const viewModels: CertificationViewModel[] = [];
      const viewModelMap = new Map<string, CertificationViewModel>();
      const newlyEarnedRewards: Array<{
        catalog: CertificationCatalogRow;
        config: RequirementConfig;
        badgeAlreadyAwarded: boolean;
      }> = [];

      const nowIso = new Date().toISOString();

      catalogRows.forEach((catalog) => {
        const config = (catalog.requirement_config ?? {}) as RequirementConfig;
        const requirementDetails: RequirementDetail[] = [];

        if (config.tasks?.completed && config.tasks.completed > 0) {
          requirementDetails.push({
            key: 'tasks',
            labelKey: requirementLabelKeys.tasks,
            current: metricsSnapshot.completedTasks,
            target: config.tasks.completed,
            ratio: metricsSnapshot.completedTasks / config.tasks.completed,
          });
        }

        if (config.goals?.completed && config.goals.completed > 0) {
          requirementDetails.push({
            key: 'goals',
            labelKey: requirementLabelKeys.goals,
            current: metricsSnapshot.completedGoals,
            target: config.goals.completed,
            ratio: metricsSnapshot.completedGoals / config.goals.completed,
          });
        }

        if (config.xp?.amount && config.xp.amount > 0) {
          requirementDetails.push({
            key: 'xp',
            labelKey: requirementLabelKeys.xp,
            current: metricsSnapshot.totalXp,
            target: config.xp.amount,
            ratio: metricsSnapshot.totalXp / config.xp.amount,
          });
        }

        if (config.courses?.codes?.length) {
          const requiredCodes = config.courses.codes;
          const completedCount = requiredCodes.filter((code) =>
            metricsSnapshot.completedCourseCodes.includes(code),
          ).length;

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
          ratios.length > 0
            ? ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length
            : 0;

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
        } else if (status !== 'earned' && status !== 'in_progress' && status !== 'available' && status !== 'expired') {
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
          employee_id: user.id,
          certification_code: catalog.code,
          status,
          progress_percent: progressPercent,
          tasks_completed: metricsSnapshot.completedTasks,
          xp_earned: metricsSnapshot.totalXp,
          goals_completed: metricsSnapshot.completedGoals,
          courses_completed: metricsSnapshot.completedCourseCodes.length,
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

      if (updates.length > 0) {
        const upsertResult = await supabase
          .from('certification_progress')
          .upsert(updates, { onConflict: 'employee_id,certification_code' });

        if (upsertResult.error) {
          throw upsertResult.error;
        }
      }

      if (newlyEarnedRewards.length > 0 && profileRole) {
        for (const reward of newlyEarnedRewards) {
          const rewardXp = reward.config.reward?.xp ?? 0;
          const shouldAutoAward = reward.config.reward?.autoAwardBadge ?? false;

          if (rewardXp > 0) {
            try {
              await applyXpReward(user.id, profileRole, rewardXp);
            } catch (xpError) {
              console.error('Failed to apply XP reward for certification', reward.catalog.code, xpError);
            }
          }

          const badgeCode = reward.catalog.badge_code;
          if (shouldAutoAward && badgeCode && !reward.badgeAlreadyAwarded) {
            try {
              await supabase.from('employee_badge').upsert(
                {
                  employee_id: user.id,
                  badge_code: badgeCode,
                  reason: `Auto-awarded after completing ${reward.catalog.title}`,
                },
                {
                  onConflict: 'employee_id,badge_code',
                },
              );
              earnedBadges.add(badgeCode);
              const updatedViewModel = viewModelMap.get(reward.catalog.code);
              if (updatedViewModel) {
                updatedViewModel.badgeAwarded = true;
                updatedViewModel.pendingBadge = false;
              }
            } catch (badgeError) {
              console.error('Failed to auto-award badge for certification', reward.catalog.code, badgeError);
            }
          }
        }
      }

      setCertifications(viewModels);
    } catch (throwable) {
      console.error('Failed to load certifications', throwable);
      setError('certifications.errors.load');
      setCertifications([]);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refresh();
    } else {
      setCertifications([]);
      setMetrics(null);
      setLoading(false);
    }
  }, [user, refresh]);

  const sortedCertifications = useMemo(() => {
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
  }, [certifications]);

  return {
    certifications: sortedCertifications,
    loading,
    error,
    refresh,
    metrics,
  };
}

async function applyXpReward(employeeId: string, role: string | null, xpReward: number) {
  if (!role || xpReward <= 0) return;

  const existingResult = await supabase
    .from('skill_matrix')
    .select('id, xp, level')
    .eq('employee_id', employeeId)
    .eq('role', role)
    .maybeSingle();

  if (existingResult.error) {
    throw existingResult.error;
  }

  const existing = existingResult.data as SkillMatrixRow | null;
  const currentXp = existing?.xp ?? 0;
  const newXp = currentXp + xpReward;
  const computedLevel = levelFromXp(newXp);

  const upsertPayload: TablesInsert<'skill_matrix'> = {
    employee_id: employeeId,
    role,
    xp: newXp,
    level: computedLevel,
  };

  const upsertResult = await supabase
    .from('skill_matrix')
    .upsert(upsertPayload, { onConflict: 'employee_id,role' });

  if (upsertResult.error) {
    throw upsertResult.error;
  }
}

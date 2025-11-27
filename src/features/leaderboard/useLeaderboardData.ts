// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useProfile } from '@/hooks/useProfile';
import { useEmployees, type Employee } from '@/features/employees/hooks/useEmployees';
import { useLeaderboardInsightsStore } from '@/stores/useLeaderboardInsights';
import { ensureLeaderboardSynced } from './syncLeaderboard';
import { fetchLeaderboardProfiles, fetchLeaderboardRows, type LeaderboardRowRecord } from './leaderboardRepository';
import type {
  LeaderboardAnalytics,
  LeaderboardBadgeTier,
  LeaderboardChallenge,
  LeaderboardEntry,
  LeaderboardPeriod,
} from './types';

const MANAGER_ROLES = new Set(['manager', 'admin', 'company_admin', 'owner']);

const defaultAnalytics: LeaderboardAnalytics = {
  participantCount: 0,
  averageXp: 0,
  updatedAt: null,
  xpBySource: { tasks: 0, goals: 0, recognitions: 0, training: 0 },
  badgeTierDistribution: {
    Bronze: 0,
    Silver: 0,
    Gold: 0,
    Platinum: 0,
  },
};

function normaliseTier(tier: string | null | undefined): LeaderboardBadgeTier {
  if (tier === 'Platinum' || tier === 'Gold' || tier === 'Silver') return tier;
  return 'Bronze';
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function mapToLeaderboardEntry(
  row: LeaderboardRowRecord,
  rank: number,
  employee: Employee | undefined,
): LeaderboardEntry | null {
  const fallbackProfile = row.employee ?? null;
  if (!employee && !fallbackProfile) return null;

  const achievements = Array.isArray(row.achievements) ? row.achievements : [];
  const achievementsMap = new Map<string, any>(
    achievements
      .filter((item: any) => item && typeof item === 'object' && typeof item.code === 'string')
      .map((item: any) => [item.code, item]),
  );
  const insights = Array.isArray(row.insights) ? row.insights : [];
  const challenges = (Array.isArray(row.challenges) ? row.challenges : []).filter(
    (challenge: any) =>
      challenge &&
      typeof challenge === 'object' &&
      typeof challenge.employeeId === 'string' &&
      typeof challenge.focus === 'string',
  );
  const fallbackDepartment = fallbackProfile?.department ?? row.department ?? null;
  const departmentId =
    row.department_id ??
    employee?.department_id ??
    employee?.department?.id ??
    fallbackDepartment?.id ??
    null;
  const departmentName =
    employee?.department?.name ?? fallbackDepartment?.name ?? null;

  const positionName = employee?.position?.name ?? fallbackProfile?.position?.name ?? null;
  const avatarUrl = employee?.avatar_url ?? fallbackProfile?.avatar_url ?? null;
  const role = row.role ?? employee?.role ?? fallbackProfile?.role ?? 'employee';
  const firstName = employee?.first_name ?? fallbackProfile?.first_name ?? '';
  const lastName = employee?.last_name ?? fallbackProfile?.last_name ?? '';
  const email = employee?.email ?? fallbackProfile?.email ?? row.employee_id;
  const fullName = `${firstName} ${lastName}`.trim() || email;

  return {
    employeeId: row.employee_id,
    fullName,
    email,
    avatarUrl,
    role,
    period: row.period,
    periodStart: row.period_start,
    department: { id: departmentId, name: departmentName },
    positionName: positionName ?? null,
    xp: {
      tasks: row.xp_tasks ?? 0,
      goals: row.xp_goals ?? 0,
      recognitions: row.xp_recognitions ?? 0,
      training: row.xp_training ?? 0,
      total: row.xp_total ?? 0,
    },
    badgeTier: normaliseTier(row.badge_tier),
    badges: toStringArray(row.badge_codes),
    achievements,
    insights,
    challenges,
    taskCount: achievementsMap.get('task_streak')?.value ?? 0,
    goalCount: achievementsMap.get('goal_closer')?.value ?? 0,
    recognitionCount: achievementsMap.get('recognition_star')?.value ?? 0,
    trainingCount: achievementsMap.get('skills_in_motion')?.value ?? 0,
    reliability: employee?.reliability ?? fallbackProfile?.reliability,
    updatedAt: row.updated_at ?? row.last_synced_at ?? dayjs().toISOString(),
    rank: rank + 1,
  };
}

function computeAnalytics(entries: LeaderboardEntry[]): LeaderboardAnalytics {
  if (entries.length === 0) {
    return defaultAnalytics;
  }

  const participantCount = entries.length;
  let totalXp = 0;
  const xpBySource = {
    tasks: 0,
    goals: 0,
    recognitions: 0,
    training: 0,
  };
  const badgeTierDistribution: LeaderboardAnalytics['badgeTierDistribution'] = {
    Bronze: 0,
    Silver: 0,
    Gold: 0,
    Platinum: 0,
  };
  const departmentTotals = new Map<string | null, { id: string | null; name: string | null; totalXp: number; participantCount: number }>();

  entries.forEach((entry) => {
    totalXp += entry.xp.total;
    xpBySource.tasks += entry.xp.tasks;
    xpBySource.goals += entry.xp.goals;
    xpBySource.recognitions += entry.xp.recognitions;
    xpBySource.training += entry.xp.training;
    badgeTierDistribution[entry.badgeTier] += 1;

    const departmentKey = entry.department?.id ?? null;
    if (!departmentTotals.has(departmentKey)) {
      departmentTotals.set(departmentKey, {
        id: departmentKey,
        name: entry.department?.name ?? null,
        totalXp: 0,
        participantCount: 0,
      });
    }
    const aggregate = departmentTotals.get(departmentKey)!;
    aggregate.totalXp += entry.xp.total;
    aggregate.participantCount += 1;
  });

  const topDepartment = Array.from(departmentTotals.values()).sort((a, b) => b.totalXp - a.totalXp)[0];

  return {
    participantCount,
    averageXp: participantCount > 0 ? Math.round(totalXp / participantCount) : 0,
    updatedAt: entries[0]?.updatedAt ?? null,
    xpBySource,
    badgeTierDistribution,
    topDepartment,
  };
}

export interface UseLeaderboardDataResult {
  loading: boolean;
  syncing: boolean;
  error: string | null;
  entries: LeaderboardEntry[];
  analytics: LeaderboardAnalytics;
  departments: { id: string | null; name: string | null; count: number }[];
  roles: { role: string; count: number }[];
  challenges: LeaderboardChallenge[];
  lastUpdated: string | null;
  refresh: (options?: { forceSync?: boolean }) => Promise<void>;
}

const leaderboardQueryKey = (companyId: string | null, period: LeaderboardPeriod) =>
  ['leaderboard', companyId ?? 'unknown', period] as const;

export function useLeaderboardData(period: LeaderboardPeriod): UseLeaderboardDataResult {
  const { profile, loading: profileLoading } = useProfile();
  const canMaintain = profile?.role ? MANAGER_ROLES.has(profile.role) : false;
  const { employees } = useEmployees({ enabled: canMaintain });
  const [manualSyncing, setManualSyncing] = useState(false);
  const setLeaderboardInsights = useLeaderboardInsightsStore((state) => state.setInsights);
  const clearLeaderboardInsights = useLeaderboardInsightsStore((state) => state.clear);
  const queryClient = useQueryClient();

  const companyId = profile?.companyId ?? null;
  const employeesRef = useRef<Employee[]>([]);

  useEffect(() => {
    employeesRef.current = employees;
  }, [employees]);

  const leaderboardQuery = useQuery({
    queryKey: leaderboardQueryKey(companyId, period),
    enabled: Boolean(companyId),
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!companyId) {
        return { entries: [] as LeaderboardEntry[], lastUpdated: null as string | null };
      }

      const rows = await fetchLeaderboardRows({ companyId, period });
      const employeeSnapshot = employeesRef.current;
      const employeeMap = new Map(employeeSnapshot.map((employee) => [employee.id, employee]));
      const fallbackEmployeeMap = new Map<string, Employee>();
      const missingEmployeeIds = Array.from(
        new Set(rows.map((row) => row.employee_id).filter((id) => id && !employeeMap.has(id))),
      );

      if (missingEmployeeIds.length > 0) {
        const fallbackProfiles = await fetchLeaderboardProfiles({ companyId, ids: missingEmployeeIds });
        fallbackProfiles.forEach((profile) => {
          const fallbackEmployee: Employee = {
            id: profile.id,
            first_name: profile.first_name ?? '',
            last_name: profile.last_name ?? '',
            email: profile.email ?? profile.id,
            avatar_url: profile.avatar_url ?? undefined,
            role: profile.role ?? 'employee',
            employment_status: profile.employment_status ?? 'active',
            department_id: profile.department_id ?? null,
            department: profile.department ?? null,
            position: profile.position ?? undefined,
            skillLevel: undefined,
            skillXp: undefined,
            badges: [],
            reliability: undefined,
            positiveReportCount: undefined,
            lateCount: undefined,
            noShowCount: undefined,
          };

          fallbackEmployeeMap.set(profile.id, fallbackEmployee);
        });
      }

      const enriched: LeaderboardEntry[] = [];

      rows.forEach((row, index) => {
        const employee = employeeMap.get(row.employee_id) ?? fallbackEmployeeMap.get(row.employee_id);
        const entry = mapToLeaderboardEntry(row, index, employee);
        if (entry) {
          enriched.push(entry);
        }
      });

      return {
        entries: enriched,
        lastUpdated: rows[0]?.last_synced_at ?? rows[0]?.updated_at ?? null,
      };
    },
  });

  const rawEntries = companyId ? leaderboardQuery.data?.entries ?? [] : [];
  const entries = rawEntries;
  const analytics = useMemo(() => computeAnalytics(entries), [entries]);
  const challenges = useMemo(() => entries.flatMap((entry) => entry.challenges), [entries]);
  const lastUpdated = companyId ? leaderboardQuery.data?.lastUpdated ?? null : null;
  const error = leaderboardQuery.error ? 'Unable to load leaderboard data at the moment.' : null;

  useEffect(() => {
    if (!companyId) {
      clearLeaderboardInsights();
      return;
    }

    if (entries.length > 0) {
      const insightPayload = entries.slice(0, 5).map((entry) => ({
        employeeId: entry.employeeId,
        name: entry.fullName,
        role: entry.role,
        badgeTier: entry.badgeTier,
        xp: entry.xp.total,
        period: entry.period,
        periodStart: entry.periodStart,
        achievements: entry.achievements.map((achievement) => achievement.label),
        recognitionCount: entry.recognitionCount,
      }));
      setLeaderboardInsights(insightPayload, lastUpdated ?? dayjs().toISOString());
    } else {
      clearLeaderboardInsights();
    }
  }, [entries, lastUpdated, setLeaderboardInsights, clearLeaderboardInsights, companyId]);

  const departments = useMemo(() => {
    const map = new Map<string | null, { id: string | null; name: string | null; count: number }>();

    if (employees.length > 0) {
      employees.forEach((employee) => {
        const key = (employee as any).department_id ?? employee.department?.id ?? null;
        const name = employee.department?.name ?? null;
        if (!map.has(key)) {
          map.set(key, { id: key, name, count: 0 });
        }
        map.get(key)!.count += 1;
      });
    } else {
      entries.forEach((entry) => {
        const key = entry.department?.id ?? null;
        const name = entry.department?.name ?? null;
        if (!map.has(key)) {
          map.set(key, { id: key, name, count: 0 });
        }
        map.get(key)!.count += 1;
      });
    }

    return Array.from(map.values()).sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  }, [employees, entries]);

  const roles = useMemo(() => {
    const map = new Map<string, number>();
    if (employees.length > 0) {
      employees.forEach((employee) => {
        map.set(employee.role, (map.get(employee.role) ?? 0) + 1);
      });
    } else {
      entries.forEach((entry) => {
        map.set(entry.role, (map.get(entry.role) ?? 0) + 1);
      });
    }
    return Array.from(map.entries())
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);
  }, [employees, entries]);

  const refresh = useCallback(
    async (options?: { forceSync?: boolean }) => {
      if (!companyId) {
        clearLeaderboardInsights();
        return;
      }

      const shouldSync = Boolean(options?.forceSync && canMaintain);
      if (shouldSync) {
        const roster = employeesRef.current;
        if (roster.length > 0) {
          try {
            setManualSyncing(true);
            await ensureLeaderboardSynced(companyId, roster, period);
          } catch (err) {
            console.error('[leaderboard] Manual sync failed', err);
          } finally {
            setManualSyncing(false);
          }
        }
      }

      await queryClient.invalidateQueries({ queryKey: leaderboardQueryKey(companyId, period) });
    },
    [companyId, canMaintain, period, queryClient, clearLeaderboardInsights],
  );

  const loading = profileLoading || leaderboardQuery.isPending;
  const syncing = manualSyncing || leaderboardQuery.isFetching;

  return {
    loading,
    syncing,
    error,
    entries,
    analytics,
    departments,
    roles,
    challenges,
    lastUpdated,
    refresh,
  };
}

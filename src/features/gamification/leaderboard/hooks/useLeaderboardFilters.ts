import { useCallback, useMemo, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type {
  LeaderboardAnalytics,
  LeaderboardEntry,
  LeaderboardPeriod,
} from "../types";

dayjs.extend(relativeTime);

export const leaderboardPeriodOptions: {
  label: string;
  value: LeaderboardPeriod;
}[] = [
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "All-Time", value: "all_time" },
];

export const leaderboardPeriodDescriptions: Record<LeaderboardPeriod, string> =
  {
    weekly: "Performance from the current week",
    monthly: "Momentum across the current month",
    all_time: "Lifetime performance and achievements",
  };

export function formatDepartmentName(name: string | null | undefined) {
  if (!name || name.trim().length === 0) return "Unnamed department";
  return name;
}

type DepartmentOption = {
  id: string | null;
  name: string | null;
  count: number;
};
type RoleOption = { role: string; count: number };

interface UseLeaderboardFiltersArgs {
  period: LeaderboardPeriod;
  onPeriodChange: (value: LeaderboardPeriod) => void;
  refresh: (options?: { forceSync?: boolean }) => Promise<void>;
  entries: LeaderboardEntry[];
  analytics: LeaderboardAnalytics;
  departments: DepartmentOption[];
  roles: RoleOption[];
  lastUpdated: string | null;
}

export function useLeaderboardFilters({
  period,
  onPeriodChange,
  refresh,
  entries,
  analytics,
  departments,
  roles,
  lastUpdated,
}: UseLeaderboardFiltersArgs) {
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const handleManualRefresh = useCallback(() => {
    void refresh({ forceSync: true });
  }, [refresh]);

  const handlePeriodChange = useCallback(
    (value: string) => {
      if (value) onPeriodChange(value as LeaderboardPeriod);
    },
    [onPeriodChange],
  );

  const handleDepartmentChange = useCallback((value: string) => {
    setDepartmentFilter(value);
  }, []);

  const handleRoleChange = useCallback((value: string) => {
    setRoleFilter(value);
  }, []);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const departmentMatches =
        departmentFilter === "all" ||
        (departmentFilter === "none" && !entry.department?.id) ||
        entry.department?.id === departmentFilter;
      const roleMatches = roleFilter === "all" || entry.role === roleFilter;
      return departmentMatches && roleMatches;
    });
  }, [entries, departmentFilter, roleFilter]);

  const xpSourceData = useMemo(
    () => [
      { name: "Tasks", value: analytics.xpBySource.tasks },
      { name: "Goals", value: analytics.xpBySource.goals },
      { name: "Recognitions", value: analytics.xpBySource.recognitions },
      { name: "Training", value: analytics.xpBySource.training },
    ],
    [analytics.xpBySource],
  );

  const badgeDistribution = useMemo(() => {
    const total = analytics.participantCount || 1;
    return Object.entries(analytics.badgeTierDistribution).map(
      ([tier, count]) => ({
        tier,
        count,
        percent: Math.round((count / total) * 100),
      }),
    );
  }, [analytics.badgeTierDistribution, analytics.participantCount]);

  const lastUpdatedLabel = useMemo(
    () => (lastUpdated ? dayjs(lastUpdated).fromNow() : "not synced"),
    [lastUpdated],
  );

  const periodLabel = useMemo(
    () =>
      leaderboardPeriodOptions.find((option) => option.value === period)
        ?.label ?? "Custom period",
    [period],
  );

  const departmentLabel = useMemo(() => {
    if (departmentFilter === "all") return "all departments";
    if (departmentFilter === "none") return "no department";
    return (
      formatDepartmentName(
        departments.find((dept) => dept.id === departmentFilter)?.name,
      ) ?? "selected department"
    );
  }, [departmentFilter, departments]);

  const roleLabel = useMemo(() => {
    if (roleFilter === "all") return "all roles";
    return roleFilter;
  }, [roleFilter]);

  const filterStatusMessage = useMemo(
    () =>
      `${periodLabel} leaderboard filtered to ${departmentLabel} and ${roleLabel}, showing ${filteredEntries.length} of ${analytics.participantCount} participants.`,
    [
      periodLabel,
      departmentLabel,
      roleLabel,
      filteredEntries.length,
      analytics.participantCount,
    ],
  );

  return {
    departmentFilter,
    roleFilter,
    filteredEntries,
    xpSourceData,
    badgeDistribution,
    lastUpdatedLabel,
    filterStatusMessage,
    handleManualRefresh,
    handlePeriodChange,
    handleDepartmentChange,
    handleRoleChange,
  };
}

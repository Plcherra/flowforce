import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import type {
  LeaderboardEntry,
  LeaderboardPeriod,
} from "@/features/gamification/leaderboard/types";
import { mapToLeaderboardEntry } from "@/features/gamification/leaderboard/useLeaderboardData";
import type { LeaderboardRowRecord } from "@/features/gamification/leaderboard/leaderboardRepository";

export interface UseLeaderboardFilters {
  companyId?: string | null;
  departmentId?: string | null;
  month?: string | Date;
  week?: string | Date;
  limit?: number;
  period?: LeaderboardPeriod;
}

export interface UseLeaderboardOptions {
  filters?: UseLeaderboardFilters;
  enabled?: boolean;
}

export interface UseLeaderboardResult {
  entries: LeaderboardEntry[];
  lastUpdated: string | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

const LEADERBOARD_SCOPE = ["gamification", "leaderboard"] as const;

const LEADERBOARD_SELECT = `
  id,
  employee_id,
  departmentid,
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
  department:departments (
    id,
    name
  ),
  employee:profiles (
    id,
    first_name,
    last_name,
    email,
    avatar_url,
    role,
    department:departments (
      id,
      name
    ),
    position:positions (
      name,
      role
    )
  )
`;

const normalizeDateFilter = (
  value: string | Date | undefined,
  unit: "month" | "week",
) => {
  if (!value) return null;
  const parsed = typeof value === "string" ? dayjs(value) : dayjs(value);
  if (!parsed.isValid()) return null;
  return unit === "month"
    ? parsed.startOf("month").format("YYYY-MM-DD")
    : parsed.startOf("week").format("YYYY-MM-DD");
};

export function useLeaderboard(
  options: UseLeaderboardOptions = {},
): UseLeaderboardResult {
  const { filters, enabled = true } = options;
  const { profile } = useProfile();

  const fallbackCompanyId = profile?.companyId ?? profile?.company_id ?? null;
  const companyId = filters?.companyId ?? fallbackCompanyId;
  const departmentId = filters?.departmentId ?? null;
  const limit = filters?.limit ?? 25;

  const requestedPeriod = filters?.period ?? "monthly";
  const effectivePeriod = filters?.week ? "weekly" : requestedPeriod;
  const monthStart =
    effectivePeriod === "monthly"
      ? normalizeDateFilter(filters?.month, "month")
      : null;
  const weekStart =
    effectivePeriod === "weekly"
      ? normalizeDateFilter(filters?.week, "week")
      : null;

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        companyId,
        departmentId,
        period: effectivePeriod,
        monthStart,
        weekStart,
        limit,
      }),
    [companyId, departmentId, effectivePeriod, monthStart, weekStart, limit],
  );

  const leaderboardQuery = useQuery({
    queryKey: [...LEADERBOARD_SCOPE, filterKey],
    enabled: Boolean(enabled && companyId),
    queryFn: async () => {
      if (!companyId) {
        return { entries: [] as LeaderboardEntry[], lastUpdated: null };
      }

      let query = supabase
        .from("gamification_leaderboard")
        .select(LEADERBOARD_SELECT)
        .eq("company_id", companyId)
        .eq("period", effectivePeriod)
        .order("xp_total", { ascending: false });

      if (departmentId) {
        query = query.eq("departmentid", departmentId);
      }
      if (monthStart) {
        query = query.eq("period_start", monthStart);
      }
      if (weekStart) {
        query = query.eq("period_start", weekStart);
      }
      if (limit > 0) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message ?? "Failed to load leaderboard");
      }

      const rows = (data ?? []) as unknown as LeaderboardRowRecord[];
      const mappedEntries = rows
        .map((row, index) => mapToLeaderboardEntry(row, index, undefined))
        .filter((entry): entry is LeaderboardEntry => Boolean(entry));

      const lastUpdated =
        rows[0]?.updated_at ?? rows[0]?.last_synced_at ?? null;

      return {
        entries: mappedEntries,
        lastUpdated,
      };
    },
    staleTime: 30_000,
  });

  const queryError = leaderboardQuery.error;
  const normalizedError =
    queryError instanceof Error
      ? queryError
      : queryError
        ? new Error("Unable to load leaderboard data")
        : null;

  return {
    entries: leaderboardQuery.data?.entries ?? [],
    lastUpdated: leaderboardQuery.data?.lastUpdated ?? null,
    loading: leaderboardQuery.isLoading,
    error: normalizedError,
    refetch: leaderboardQuery.refetch,
  };
}

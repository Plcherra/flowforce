import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

type BadgeCatalogRow = {
  code: string;
  title: string;
  description: string | null;
  icon: string | null;
  min_level: number | null;
  role: string | null;
};

type SkillRow = {
  level: number | null;
  xp: number | null;
};

export type BadgeRecord = {
  code: string;
  title: string;
  description: string | null;
  icon: string | null;
  minLevel: number | null;
  role: string | null;
};

export type EarnedBadge = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  icon: string | null;
  awardedAt: string;
  reason: string | null;
};

export type RecognitionMilestone = {
  code: string;
  title: string;
  description: string | null;
  requiredLevel: number;
  xpTarget: number;
  xpRemaining: number;
};

export type RecognitionSnapshot = {
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpNeededForNextLevel: number;
  progress: number;
};

export interface UseRecognitionFilters {
  role?: string | null;
  search?: string | null;
}

export interface UseRecognitionOptions {
  filters?: UseRecognitionFilters;
  enabled?: boolean;
}

export interface UseRecognitionResult {
  badges: BadgeRecord[];
  earnedBadges: EarnedBadge[];
  milestones: RecognitionMilestone[];
  snapshot: RecognitionSnapshot;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

const RECOGNITION_SCOPE = ["gamification", "recognition"] as const;
const XP_BASE = 200;
const XP_GROWTH = 150;

const defaultSnapshot: RecognitionSnapshot = {
  level: 1,
  xp: 0,
  xpIntoLevel: 0,
  xpNeededForNextLevel: XP_BASE,
  progress: 0,
};

const xpForLevel = (level: number) =>
  XP_BASE + XP_GROWTH * Math.max(level - 1, 0);

const cumulativeXpForLevel = (level: number) => {
  if (level <= 1) return 0;
  let total = 0;
  for (let index = 1; index < level; index += 1) {
    total += xpForLevel(index);
  }
  return total;
};

const buildSnapshot = (
  skill: SkillRow | null | undefined,
): RecognitionSnapshot => {
  if (!skill) {
    return defaultSnapshot;
  }

  const level = Math.max(skill.level ?? 1, 1);
  const totalXp = Math.max(skill.xp ?? 0, 0);
  const xpThreshold = cumulativeXpForLevel(level);
  const xpIntoLevel = Math.max(totalXp - xpThreshold, 0);
  const xpNeededForNextLevel = xpForLevel(level);
  const progress =
    xpNeededForNextLevel > 0
      ? Math.min(xpIntoLevel / xpNeededForNextLevel, 1)
      : 0;

  return {
    level,
    xp: totalXp,
    xpIntoLevel,
    xpNeededForNextLevel,
    progress,
  };
};

const mapBadgeRow = (row: BadgeCatalogRow): BadgeRecord => ({
  code: row.code,
  title: row.title ?? row.code,
  description: row.description ?? null,
  icon: row.icon ?? null,
  minLevel: row.min_level,
  role: row.role ?? null,
});

const mapEarnedBadge = (row: Record<string, unknown>): EarnedBadge => {
  const badge = row.badge as Record<string, unknown> | null | undefined;
  return {
    id: row.id as string,
    code: (row.badge_code as string) ?? "",
    title:
      (badge?.title as string | undefined) ?? (row.badge_code as string) ?? "",
    description: (badge?.description as string | null | undefined) ?? null,
    icon: (badge?.icon as string | null | undefined) ?? null,
    awardedAt: row.awarded_at as string,
    reason: (row.reason as string | null | undefined) ?? null,
  };
};

const filterBadges = (
  badges: BadgeCatalogRow[],
  role: string | null,
  search: string | undefined,
) => {
  const searchValue = search?.toLowerCase() ?? "";
  return badges
    .filter((badge) => {
      const matchesRole =
        !badge.role || !role || badge.role.toLowerCase() === role.toLowerCase();
      const matchesSearch =
        !searchValue ||
        badge.title?.toLowerCase().includes(searchValue) ||
        badge.code.toLowerCase().includes(searchValue);
      return matchesRole && matchesSearch;
    })
    .map(mapBadgeRow);
};

const buildMilestones = (
  badges: BadgeCatalogRow[],
  earnedBadges: EarnedBadge[],
  totalXp: number,
  role: string | null,
): RecognitionMilestone[] => {
  const earnedCodes = new Set(earnedBadges.map((badge) => badge.code));
  const filteredBadges = badges.filter(
    (badge) =>
      badge.min_level &&
      badge.min_level > 0 &&
      !earnedCodes.has(badge.code) &&
      (!badge.role || !role || badge.role.toLowerCase() === role.toLowerCase()),
  );

  const sorted = filteredBadges
    .sort((a, b) => (a.min_level ?? 0) - (b.min_level ?? 0))
    .slice(0, 3);

  return sorted.map((badge) => {
    const requiredLevel = badge.min_level ?? 1;
    const xpTarget = cumulativeXpForLevel(requiredLevel);
    const xpRemaining = Math.max(xpTarget - totalXp, 0);
    return {
      code: badge.code,
      title: badge.title ?? badge.code,
      description: badge.description ?? null,
      requiredLevel,
      xpTarget,
      xpRemaining,
    };
  });
};

export function useRecognition(
  options: UseRecognitionOptions = {},
): UseRecognitionResult {
  const { filters, enabled = true } = options;
  const { profile } = useProfile();

  const profileId = profile?.userId ?? profile?.id ?? null;
  const defaultRole = profile?.role ?? null;

  const normalizedRole = filters?.role ?? defaultRole ?? "employee";
  const normalizedSearch = filters?.search?.trim() ?? undefined;

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        role: normalizedRole,
        search: normalizedSearch ?? null,
      }),
    [normalizedRole, normalizedSearch],
  );

  const recognitionQuery = useQuery({
    queryKey: [...RECOGNITION_SCOPE, profileId ?? "anonymous", filterKey],
    enabled: Boolean(enabled && profileId),
    queryFn: async () => {
      if (!profileId) {
        return {
          badges: [] as BadgeRecord[],
          earned: [] as EarnedBadge[],
          milestones: [] as RecognitionMilestone[],
          snapshot: defaultSnapshot,
        };
      }

      const [badgeResponse, earnedResponse, skillResponse] = await Promise.all([
        supabase
          .from("badge_catalog")
          .select("code, title, description, icon, min_level, role")
          .order("title", { ascending: true }),
        supabase
          .from("employee_badge")
          .select(
            "id, badge_code, awarded_at, reason, badge:badge_catalog(code, title, description, icon, min_level, role)",
          )
          .eq("employee_id", profileId)
          .order("awarded_at", { ascending: false }),
        supabase
          .from("skill_matrix")
          .select("level, xp")
          .eq("employee_id", profileId)
          .eq("role", normalizedRole)
          .maybeSingle(),
      ]);

      if (badgeResponse.error) {
        throw new Error(
          badgeResponse.error.message ?? "Failed to load badge catalog",
        );
      }
      if (earnedResponse.error) {
        throw new Error(
          earnedResponse.error.message ?? "Failed to load earned badges",
        );
      }
      if (skillResponse.error && skillResponse.error.code !== "PGRST116") {
        throw new Error(
          skillResponse.error.message ?? "Failed to load XP snapshot",
        );
      }

      const badgeRows = (badgeResponse.data as BadgeCatalogRow[]) ?? [];
      const earnedRows = earnedResponse.data ?? [];
      const skillRow = (skillResponse.data as SkillRow | null) ?? null;

      const badges = filterBadges(badgeRows, normalizedRole, normalizedSearch);
      const earnedBadges = earnedRows.map(mapEarnedBadge);
      const snapshot = buildSnapshot(skillRow);
      const milestones = buildMilestones(
        badgeRows,
        earnedBadges,
        snapshot.xp,
        normalizedRole,
      );

      return {
        badges,
        earned: earnedBadges,
        milestones,
        snapshot,
      };
    },
    staleTime: 60_000,
  });

  const queryError = recognitionQuery.error;
  const normalizedError =
    queryError instanceof Error
      ? queryError
      : queryError
        ? new Error("Unable to load recognition data")
        : null;

  return {
    badges: recognitionQuery.data?.badges ?? [],
    earnedBadges: recognitionQuery.data?.earned ?? [],
    milestones: recognitionQuery.data?.milestones ?? [],
    snapshot: recognitionQuery.data?.snapshot ?? defaultSnapshot,
    loading: recognitionQuery.isLoading,
    error: normalizedError,
    refetch: recognitionQuery.refetch,
  };
}

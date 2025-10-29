import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BadgeCatalogRow {
  code: string;
  title: string;
  description: string | null;
  icon: string | null;
  min_level: number | null;
}

interface EngagementBadge {
  code: string;
  title: string;
  description: string | null;
  icon: string | null;
  awardedAt: string;
  minLevel: number | null;
}

interface EngagementSnapshot {
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpNeededForNextLevel: number;
  progress: number;
  nextLevel: number;
}

interface UseEmployeeEngagementResult {
  loading: boolean;
  error: string | null;
  snapshot: EngagementSnapshot;
  badges: EngagementBadge[];
  milestoneTip: string;
  refresh: () => Promise<void>;
}

interface UseEmployeeEngagementOptions {
  enabled?: boolean;
}

const XP_BASE = 200;
const XP_GROWTH = 150;

const defaultSnapshot: EngagementSnapshot = {
  level: 1,
  xp: 0,
  xpIntoLevel: 0,
  xpNeededForNextLevel: XP_BASE,
  progress: 0,
  nextLevel: 2,
};

function getXpForLevel(level: number) {
  return XP_BASE + XP_GROWTH * Math.max(level - 1, 0);
}

function getCumulativeXp(level: number) {
  if (level <= 1) return 0;
  let total = 0;
  for (let index = 1; index < level; index += 1) {
    total += getXpForLevel(index);
  }
  return total;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function pluralise(label: string, count: number) {
  return count === 1 ? label : `${label}s`;
}

function getRoleTask(role: string) {
  const normalized = role.toLowerCase();
  switch (normalized) {
    case 'owner':
    case 'company_admin':
      return 'strategic review';
    case 'admin':
      return 'process approval';
    case 'manager':
      return 'coaching session';
    case 'supervisor':
      return 'shift audit';
    default:
      return 'closing shift';
  }
}

function buildMilestoneTip(role: string, snapshot: EngagementSnapshot) {
  const xpRemaining = Math.max(snapshot.xpNeededForNextLevel - snapshot.xpIntoLevel, 0);
  if (xpRemaining === 0) {
    return `Copilot tip: Queue a check-in to confirm readiness for L${snapshot.nextLevel}.`;
  }

  const effortUnit = getRoleTask(role);
  const estimatedPerEffort = 120; // heuristic XP per effort
  const effortCount = Math.max(1, Math.ceil(xpRemaining / estimatedPerEffort));
  return `Copilot tip: Complete ${effortCount} ${pluralise(effortUnit, effortCount)} to unlock L${snapshot.nextLevel}.`;
}

export function useEmployeeEngagement(
  employeeId: string | null | undefined,
  role: string | null | undefined,
  options: UseEmployeeEngagementOptions = {},
): UseEmployeeEngagementResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<EngagementSnapshot>(defaultSnapshot);
  const [badges, setBadges] = useState<EngagementBadge[]>([]);

  const normalizedRole = useMemo(() => role?.toLowerCase() ?? 'staff', [role]);
  const { enabled = true } = options;

  const refresh = useCallback(async () => {
    if (!employeeId || !enabled) {
      setSnapshot(defaultSnapshot);
      setBadges([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [skillResponse, badgeResponse] = await Promise.all([
        supabase
          .from('skill_matrix')
          .select('level, xp, role')
          .eq('employee_id', employeeId)
          .eq('role', normalizedRole)
          .maybeSingle(),
        supabase
          .from('employee_badge')
          .select('badge_code, awarded_at, badge:badge_catalog ( title, description, icon, min_level )')
          .eq('employee_id', employeeId)
          .order('awarded_at', { ascending: false }),
      ]);

      if (skillResponse.error) {
        throw skillResponse.error;
      }
      if (badgeResponse.error) {
        throw badgeResponse.error;
      }

      const skill = skillResponse.data;
      const level = Math.max(skill?.level ?? 1, 1);
      const rawXp = Math.max(skill?.xp ?? 0, 0);
      const cumulativeForCurrent = getCumulativeXp(level);
      const xpIntoLevel = Math.max(rawXp - cumulativeForCurrent, 0);
      const xpNeededForNextLevel = getXpForLevel(level);
      const progress = clamp(xpNeededForNextLevel > 0 ? xpIntoLevel / xpNeededForNextLevel : 0);

      setSnapshot({
        level,
        xp: rawXp,
        xpIntoLevel,
        xpNeededForNextLevel,
        progress,
        nextLevel: level + 1,
      });

      const badgeRows = badgeResponse.data ?? [];
      const mappedBadges: EngagementBadge[] = badgeRows.map((row) => ({
        code: row.badge_code,
        title: (row.badge as BadgeCatalogRow | null)?.title ?? row.badge_code,
        description: (row.badge as BadgeCatalogRow | null)?.description ?? null,
        icon: (row.badge as BadgeCatalogRow | null)?.icon ?? null,
        minLevel: (row.badge as BadgeCatalogRow | null)?.min_level ?? null,
        awardedAt: row.awarded_at,
      }));
      setBadges(mappedBadges);
    } catch (err) {
      console.error('Failed to fetch engagement data', err);
      setError('Unable to load engagement data right now.');
      setSnapshot(defaultSnapshot);
      setBadges([]);
    } finally {
      setLoading(false);
    }
  }, [employeeId, enabled, normalizedRole]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!employeeId || !enabled) {
      return;
    }

    const channel = supabase
      .channel(`employee-engagement-${employeeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'skill_matrix',
          filter: `employee_id=eq.${employeeId}`,
        },
        () => {
          refresh();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_badge',
          filter: `employee_id=eq.${employeeId}`,
        },
        () => {
          refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId, enabled, refresh]);

  const milestoneTip = useMemo(() => {
    if (!enabled) {
      return 'Copilot tip: Engagement metrics will activate once the feature is enabled.';
    }
    return buildMilestoneTip(normalizedRole, snapshot);
  }, [enabled, normalizedRole, snapshot]);

  return {
    loading,
    error,
    snapshot,
    badges,
    milestoneTip,
    refresh,
  };
}

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/public-types";
import { useProfile } from "@/hooks/useProfile";
import type {
  RecognitionDetails,
  RecognitionSourceType,
} from "@/types/recognition";

type RecognitionRow = Pick<
  Tables<"recognitions">,
  "id" | "company_id" | "user_id" | "goal_id" | "reward_type" | "awarded_at"
> & {
  milestoneid?: string | null;
  task_id?: string | null;
  training_assignmentid?: string | null;
  reward_details: unknown;
};

type LeaderboardRow = {
  xp_total: number | null;
  xp_tasks: number | null;
  xp_goals: number | null;
  xp_recognitions: number | null;
  xp_training: number | null;
  period_start: string | null;
  updated_at: string | null;
};

export type XPBreakdown = {
  tasks: number;
  goals: number;
  recognitions: number;
  training: number;
};

export type XPEvent = {
  id: string;
  xp: number;
  type: RecognitionSourceType | "unknown";
  occurredAt: string;
  description: string;
  context: {
    goalId?: string | null;
    milestoneId?: string | null;
    taskId?: string | null;
    trainingAssignmentId?: string | null;
  };
  metadata?: Record<string, unknown> | null;
};

export interface UseXPResult {
  totalXp: number;
  breakdown: XPBreakdown;
  events: XPEvent[];
  lastUpdated: string | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export interface UseXPFilters {
  limit?: number;
  since?: string | Date | null;
  sourceTypes?: RecognitionSourceType[];
  companyId?: string | null;
}

export interface UseXPOptions {
  filters?: UseXPFilters;
  enabled?: boolean;
}

const XP_SCOPE = ["gamification", "xp"] as const;
const DEFAULT_EVENT_LIMIT = 15;
const DEFAULT_RECOGNITION_XP = 110;

const parseDetails = (raw: unknown): RecognitionDetails | null => {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as RecognitionDetails;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") {
    return raw as RecognitionDetails;
  }
  return null;
};

const normalizeSince = (value: string | Date | null | undefined) => {
  if (!value) return undefined;
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
};

const normalizeSources = (sources: RecognitionSourceType[] | undefined) =>
  sources && sources.length > 0 ? sources : undefined;

const mapRecognitionToEvent = (row: RecognitionRow): XPEvent => {
  const details = parseDetails(row.reward_details);
  const xpAwarded =
    typeof details?.xp_awarded === "number"
      ? details.xp_awarded
      : DEFAULT_RECOGNITION_XP;
  const type = details?.source ?? "unknown";
  const description =
    details?.message ??
    (() => {
      switch (type) {
        case "goal_completion":
          return "Goal completion XP";
        case "goal_milestone":
          return "Milestone XP";
        case "task_completion":
          return "Task completion XP";
        case "training_completion":
          return "Training XP";
        case "onboarding_completion":
          return "Onboarding XP";
        case "manual":
        default:
          return "Manual recognition XP";
      }
    })();

  return {
    id: row.id,
    xp: Math.max(xpAwarded ?? DEFAULT_RECOGNITION_XP, 0),
    type,
    occurredAt: row.awarded_at,
    description,
    context: {
      goalId: row.goal_id ?? details?.goal_id ?? null,
      milestoneId: row.milestoneid ?? details?.milestoneid ?? null,
      taskId: row.task_id ?? details?.task_id ?? null,
      trainingAssignmentId:
        row.training_assignmentid ?? details?.training_assignmentid ?? null,
    },
    metadata: details?.metadata ?? null,
  };
};

const fetchXpAggregate = async (employeeId: string, companyId: string) => {
  const { data, error } = await supabase
    .from("gamification_leaderboard")
    .select(
      "xp_total, xp_tasks, xp_goals, xp_recognitions, xp_training, period_start, updated_at",
    )
    .eq("employee_id", employeeId)
    .eq("company_id", companyId)
    .eq("period", "all_time")
    .order("period_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message ?? "Failed to load XP summary");
  }

  const row = (data as LeaderboardRow | null) ?? null;
  return {
    totalXp: Math.max(row?.xp_total ?? 0, 0),
    breakdown: {
      tasks: Math.max(row?.xp_tasks ?? 0, 0),
      goals: Math.max(row?.xp_goals ?? 0, 0),
      recognitions: Math.max(row?.xp_recognitions ?? 0, 0),
      training: Math.max(row?.xp_training ?? 0, 0),
    },
    lastUpdated: row?.updated_at ?? row?.period_start ?? null,
  };
};

const fetchXpEvents = async (
  employeeId: string,
  companyId: string,
  filters: {
    limit: number;
    since?: string;
    sourceTypes?: RecognitionSourceType[];
  },
) => {
  let query = supabase
    .from("recognitions")
    .select(
      "id, company_id, user_id, goal_id, milestoneid, task_id, training_assignmentid, reward_details, reward_type, awarded_at",
    )
    .eq("user_id", employeeId)
    .eq("company_id", companyId)
    .order("awarded_at", { ascending: false });

  if (filters.since) {
    query = query.gte("awarded_at", filters.since);
  }
  if (filters.limit > 0) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message ?? "Failed to load XP events");
  }

  const mapped = (data ?? []).map((row) =>
    mapRecognitionToEvent(row as RecognitionRow),
  );

  if (filters.sourceTypes && filters.sourceTypes.length > 0) {
    return mapped.filter((event) =>
      filters.sourceTypes!.includes(event.type as RecognitionSourceType),
    );
  }

  return mapped;
};

export function useXP(options: UseXPOptions = {}): UseXPResult {
  const { filters, enabled = true } = options;
  const { profile } = useProfile();

  const fallbackCompanyId = profile?.companyId ?? profile?.company_id ?? null;
  const userId = profile?.userId ?? profile?.id ?? null;

  const normalizedFilters = useMemo(() => {
    return {
      limit: filters?.limit ?? DEFAULT_EVENT_LIMIT,
      since: normalizeSince(filters?.since),
      sourceTypes: normalizeSources(filters?.sourceTypes),
      companyId: filters?.companyId ?? fallbackCompanyId,
    };
  }, [
    filters?.limit,
    filters?.since,
    filters?.sourceTypes,
    filters?.companyId,
    fallbackCompanyId,
  ]);

  const filterKey = useMemo(
    () => JSON.stringify(normalizedFilters),
    [normalizedFilters],
  );

  const xpQuery = useQuery({
    queryKey: [...XP_SCOPE, userId ?? "anonymous", filterKey],
    enabled: Boolean(enabled && userId && normalizedFilters.companyId),
    queryFn: async () => {
      const companyId = normalizedFilters.companyId;
      if (!companyId || !userId) {
        return {
          totalXp: 0,
          breakdown: { tasks: 0, goals: 0, recognitions: 0, training: 0 },
          events: [] as XPEvent[],
          lastUpdated: null,
        };
      }

      const [aggregate, events] = await Promise.all([
        fetchXpAggregate(userId, companyId),
        fetchXpEvents(userId, companyId, {
          limit: normalizedFilters.limit,
          since: normalizedFilters.since,
          sourceTypes: normalizedFilters.sourceTypes,
        }),
      ]);

      return {
        totalXp: aggregate.totalXp,
        breakdown: aggregate.breakdown,
        events,
        lastUpdated: aggregate.lastUpdated,
      };
    },
    staleTime: 30_000,
  });

  const queryError = xpQuery.error;
  const normalizedError =
    queryError instanceof Error
      ? queryError
      : queryError
        ? new Error("Unable to load XP summary")
        : null;

  const result = xpQuery.data;

  return {
    totalXp: result?.totalXp ?? 0,
    breakdown: result?.breakdown ?? {
      tasks: 0,
      goals: 0,
      recognitions: 0,
      training: 0,
    },
    events: result?.events ?? [],
    lastUpdated: result?.lastUpdated ?? null,
    loading: xpQuery.isLoading,
    error: normalizedError,
    refetch: xpQuery.refetch,
  };
}

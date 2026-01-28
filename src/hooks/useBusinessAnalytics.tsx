import { useQuery } from "@tanstack/react-query";
import {
  fetchBusinessAnalyticsSnapshot,
  type BusinessAnalyticsSnapshotResult,
} from "@/services/analytics/businessAnalyticsService";

export interface UseBusinessAnalyticsOptions {
  companyId?: string | null;
  horizonDays?: number;
  enabled?: boolean;
}

export function useBusinessAnalytics(
  options: UseBusinessAnalyticsOptions = {},
) {
  const { companyId = null, horizonDays = 28, enabled = true } = options;

  return useQuery<BusinessAnalyticsSnapshotResult>({
    queryKey: ["business-analytics", companyId ?? "demo", horizonDays],
    queryFn: () =>
      fetchBusinessAnalyticsSnapshot({
        companyId,
        horizonDays,
      }),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

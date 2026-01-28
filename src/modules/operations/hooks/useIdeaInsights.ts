import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getIdeaInsights,
  type IdeaKpiInsightRecord,
} from "../data/ideaRepository";
import { MOCK_IDEA_KPI_SUMMARY } from "@/mock/kpi_insights";
import { appEnv } from "@/lib/env";
import { logger } from "@/utils/logger";

export interface DateRange {
  start: Date;
  end: Date;
}

export interface IdeaKpiInsight {
  id: string;
  label: string;
  value: number;
  delta?: number | null;
  trend?: "up" | "down" | "flat";
  unit?: string | null;
}

interface IdeaInsightsState {
  data: IdeaKpiInsight[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useIdeaInsights(
  companyId: string | undefined,
  range: DateRange,
): IdeaInsightsState {
  const normalizedRange = useMemo(
    () => ({
      start: range.start.toISOString(),
      end: range.end.toISOString(),
    }),
    [range.start, range.end],
  );
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => [
      "idea-insights",
      companyId,
      normalizedRange.start,
      normalizedRange.end,
    ],
    [companyId, normalizedRange.end, normalizedRange.start],
  );

  const query = useQuery<IdeaKpiInsight[]>({
    queryKey,
    enabled: Boolean(companyId),
    staleTime: 60_000,
    retry: 1,
    queryFn: async () => {
      if (!companyId) return [];
      try {
        const records = await getIdeaInsights(companyId, {
          start: new Date(normalizedRange.start),
          end: new Date(normalizedRange.end),
        });
        return mapRecordsToInsights(records);
      } catch (error) {
        const message = (error as Error)?.message ?? "";
        if (message.includes("function public.get_kpi_summary")) {
          if (appEnv.DEV) {
            logger.warn(
              "[useIdeaInsights] RPC get_kpi_summary unavailable, returning mock IDEA KPI summary",
              { context: { errorMessage: message }, tags: ["warning"] },
            );
          }
          return mapRecordsToInsights(MOCK_IDEA_KPI_SUMMARY);
        }
        throw error;
      }
    },
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    data: query.data ?? [],
    loading: query.isPending,
    error: (query.error as Error) ?? null,
    refresh,
  };
}

const mapRecordsToInsights = (
  records: IdeaKpiInsightRecord[],
): IdeaKpiInsight[] => {
  return records.map((item, index) => ({
    id: item.id ?? `kpi-${index}`,
    label: item.label ?? item.metric ?? "Metric",
    value: Number(item.value ?? 0),
    delta:
      typeof item.delta === "number"
        ? item.delta
        : item.delta
          ? Number(item.delta)
          : null,
    trend:
      item.trend === "up" || item.trend === "down" || item.trend === "flat"
        ? item.trend
        : undefined,
    unit: item.unit ?? null,
  }));
};

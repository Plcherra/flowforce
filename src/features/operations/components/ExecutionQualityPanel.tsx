import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, GraduationCap, Loader2, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  sortExecutionQualityCoaching,
  sortExecutionQualityTrends,
  summarizeExecutionQuality,
  type ExecutionQualityCoachingRow,
  type ExecutionQualityDailyRow,
  type ExecutionQualitySummaryRow,
} from "@/services/operations/executionQualityAnalytics";
import { logger } from "@/utils/logger";

export function ExecutionQualityPanel() {
  const { profile } = useProfile();
  const [summary, setSummary] = useState<ExecutionQualitySummaryRow | null>(null);
  const [trends, setTrends] = useState<ExecutionQualityDailyRow[]>([]);
  const [coaching, setCoaching] = useState<ExecutionQualityCoachingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const quality = useMemo(() => summarizeExecutionQuality(summary), [summary]);
  const sortedTrends = useMemo(() => sortExecutionQualityTrends(trends), [trends]);
  const sortedCoaching = useMemo(
    () => sortExecutionQualityCoaching(coaching),
    [coaching],
  );

  const loadQuality = useCallback(async () => {
    if (!companyId) {
      setSummary(null);
      setTrends([]);
      setCoaching([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const [summaryResult, trendResult, coachingResult] = await Promise.all([
      supabase
        .from("operations_execution_quality_summary_v")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle(),
      supabase
        .from("operations_execution_quality_daily_v")
        .select("*")
        .eq("company_id", companyId)
        .order("metric_date", { ascending: false })
        .limit(6),
      supabase
        .from("operations_execution_quality_coaching_v")
        .select("*")
        .eq("company_id", companyId)
        .order("execution_quality_score", { ascending: true })
        .limit(5),
    ]);

    if (summaryResult.error && summaryResult.error.code !== "PGRST205") {
      logger.error("[ExecutionQualityPanel] summary load failed", {
        error: summaryResult.error,
        tags: ["error"],
      });
    }

    if (trendResult.error && trendResult.error.code !== "PGRST205") {
      logger.error("[ExecutionQualityPanel] trend load failed", {
        error: trendResult.error,
        tags: ["error"],
      });
    }

    if (coachingResult.error && coachingResult.error.code !== "PGRST205") {
      logger.error("[ExecutionQualityPanel] coaching load failed", {
        error: coachingResult.error,
        tags: ["error"],
      });
    }

    setSummary((summaryResult.data ?? null) as ExecutionQualitySummaryRow | null);
    setTrends((trendResult.data ?? []) as ExecutionQualityDailyRow[]);
    setCoaching((coachingResult.data ?? []) as ExecutionQualityCoachingRow[]);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void loadQuality();
  }, [loadQuality]);

  return (
    <div className="rounded-3xl border bg-background/95 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
            Quality
          </p>
          <h3 className="text-lg font-semibold">Execution Quality</h3>
        </div>
        <Badge
          variant={
            (quality.execution_quality_score ?? 0) < 70
              ? "destructive"
              : "outline"
          }
        >
          <TrendingUp className="mr-1 h-3.5 w-3.5" />
          {quality.execution_quality_score ?? 0}
        </Badge>
      </div>

      <div className="mt-4">
        <Progress value={quality.execution_quality_score ?? 0} className="h-2" />
        <p className="mt-2 text-xs text-muted-foreground">
          {quality.completed_runs}/{quality.total_runs} runs completed,{" "}
          {quality.exception_runs} with exceptions
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-2xl border p-2">
          <p className="font-semibold">{quality.completion_rate ?? 0}%</p>
          <p className="text-muted-foreground">complete</p>
        </div>
        <div className="rounded-2xl border p-2">
          <p className="font-semibold">{quality.overdue_runs}</p>
          <p className="text-muted-foreground">overdue</p>
        </div>
        <div className="rounded-2xl border p-2">
          <p className="font-semibold">{quality.repeat_failure_runs}</p>
          <p className="text-muted-foreground">repeat</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {loading && (
          <div className="flex items-center gap-2 rounded-2xl border p-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading quality analytics
          </div>
        )}

        {!loading && sortedTrends.length === 0 && (
          <p className="rounded-2xl border p-3 text-sm text-muted-foreground">
            No workflow history is ready for quality analytics.
          </p>
        )}

        {!loading &&
          sortedTrends.slice(0, 3).map((trend) => (
            <div
              key={[
                trend.metric_date,
                trend.location_id ?? "all",
                trend.assigned_role,
                trend.workflow_kind ?? "workflow",
                trend.templatecategory ?? "general",
              ].join("-")}
              className="rounded-2xl border p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {trend.templatecategory ?? trend.workflow_kind ?? "Workflow"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {trend.assigned_role} · {trend.metric_date}
                  </p>
                </div>
                <Badge variant="outline">
                  {trend.execution_quality_score ?? 0}
                </Badge>
              </div>
              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5" />
                {trend.completed_runs}/{trend.total_runs} complete ·{" "}
                {trend.exception_runs} exception runs
              </p>
            </div>
          ))}

        {!loading && sortedCoaching.slice(0, 2).map((row) => (
          <div key={row.user_id} className="rounded-2xl border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">
                  {row.employee_name ?? row.email ?? "Team member"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.role_name} · {row.coaching_signal}
                </p>
              </div>
              <Badge
                variant={
                  row.coaching_priority === "high" ? "destructive" : "outline"
                }
              >
                {row.coaching_priority}
              </Badge>
            </div>
            <p className="mt-2 flex items-start gap-1 text-xs text-muted-foreground">
              <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {row.coaching_recommendation}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

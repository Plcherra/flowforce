import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  buildGenerationWindow,
  recurringOperationsSchedulePresets,
  summarizeWorkload,
  type GenerateRecurringRunsResult,
  type OperationsDailyWorkloadRow,
} from "@/services/operations/recurringOperationsCalendar";
import { logger } from "@/utils/logger";

const generationWindow = buildGenerationWindow(6);

export function RecurringOperationsCalendarPanel() {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [loadingWorkload, setLoadingWorkload] = useState(false);
  const [lastRun, setLastRun] = useState<GenerateRecurringRunsResult | null>(
    null,
  );
  const [workloadRows, setWorkloadRows] = useState<OperationsDailyWorkloadRow[]>(
    [],
  );

  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const workloadSummary = useMemo(
    () => summarizeWorkload(workloadRows),
    [workloadRows],
  );

  const loadWorkload = useCallback(async () => {
    if (!companyId) {
      setWorkloadRows([]);
      return;
    }

    setLoadingWorkload(true);

    try {
      const { data, error } = await supabase
        .from("operations_daily_workload_v")
        .select("*")
        .eq("company_id", companyId)
        .gte("workload_date", generationWindow.startDate)
        .lte("workload_date", generationWindow.endDate)
        .order("workload_date", { ascending: true });

      if (error) {
        throw error;
      }

      setWorkloadRows((data ?? []) as OperationsDailyWorkloadRow[]);
    } catch (error) {
      logger.error("[RecurringOperationsCalendarPanel] workload load failed", {
        error,
        tags: ["error"],
      });
      toast({
        variant: "destructive",
        title: "Unable to load workload",
        description:
          error instanceof Error ? error.message : "Unexpected workload error.",
      });
    } finally {
      setLoadingWorkload(false);
    }
  }, [companyId, toast]);

  useEffect(() => {
    void loadWorkload();
  }, [loadWorkload]);

  const handleGenerate = async () => {
    if (!companyId) {
      toast({
        variant: "destructive",
        title: "Company context missing",
        description: "Connect your profile to a company before scheduling.",
      });
      return;
    }

    setGenerating(true);

    try {
      const { data, error } = await supabase.rpc(
        "generate_recurring_workflow_runs",
        {
          p_company_id: companyId,
          p_start_date: generationWindow.startDate,
          p_end_date: generationWindow.endDate,
        },
      );

      if (error) {
        throw error;
      }

      const result = (data ?? {}) as GenerateRecurringRunsResult;
      setLastRun(result);
      await loadWorkload();

      toast({
        title: "Operations calendar generated",
        description: `${result.runs_created ?? 0} new runs created for the next seven days.`,
      });
    } catch (error) {
      logger.error("[RecurringOperationsCalendarPanel] generation failed", {
        error,
        tags: ["error"],
      });
      toast({
        variant: "destructive",
        title: "Unable to generate calendar",
        description:
          error instanceof Error ? error.message : "Unexpected calendar error.",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-3xl border bg-background/95 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
            Ops Calendar
          </p>
          <h3 className="text-lg font-semibold">Recurring Workload</h3>
        </div>
        <Badge variant="outline" className="w-fit gap-1">
          <CalendarClock className="h-3.5 w-3.5" />
          7 days
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-2xl bg-muted/50 p-3">
          <p className="text-lg font-semibold">{workloadSummary.totalRuns}</p>
          <p className="text-muted-foreground">Runs</p>
        </div>
        <div className="rounded-2xl bg-muted/50 p-3">
          <p className="text-lg font-semibold">{workloadSummary.overdueRuns}</p>
          <p className="text-muted-foreground">Overdue</p>
        </div>
        <div className="rounded-2xl bg-muted/50 p-3">
          <p className="text-lg font-semibold">
            {workloadSummary.pendingReviews}
          </p>
          <p className="text-muted-foreground">Review</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {recurringOperationsSchedulePresets.map((preset) => (
          <div key={preset.id} className="rounded-2xl border bg-muted/30 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{preset.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {preset.description}
                </p>
              </div>
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Due {preset.dueTime} · {preset.managerWorkloadSignal}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {loadingWorkload ? (
          <div className="flex items-center gap-2 rounded-2xl border p-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading workload
          </div>
        ) : workloadRows.length ? (
          workloadRows.slice(0, 4).map((row) => (
            <div
              key={row.workload_date}
              className="flex items-center justify-between rounded-2xl border p-3 text-sm"
            >
              <span className="font-medium">{row.workload_date}</span>
              <span className="text-muted-foreground">
                {row.total_runs} runs · {row.pending_review_runs} reviews
              </span>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border p-3 text-sm text-muted-foreground">
            No generated workflow runs in the next seven days.
          </div>
        )}
      </div>

      {lastRun ? (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Generated {lastRun.runs_created ?? 0} runs and{" "}
          {lastRun.step_runs_created ?? 0} step runs.
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={handleGenerate} disabled={generating || !companyId}>
          {generating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Generate
        </Button>
        <Button variant="outline" onClick={loadWorkload} disabled={!companyId}>
          Refresh
        </Button>
      </div>
    </div>
  );
}

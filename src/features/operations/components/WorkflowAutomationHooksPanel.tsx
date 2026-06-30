import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, Bot, Loader2, RefreshCw, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  sortWorkflowAutomationHooks,
  summarizeWorkflowAutomationHooks,
  workflowAutomationHookLabels,
  type WorkflowAutomationHookRow,
  type WorkflowAutomationRpcResult,
} from "@/services/operations/workflowAutomationHooks";
import { logger } from "@/utils/logger";

export function WorkflowAutomationHooksPanel() {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [hooks, setHooks] = useState<WorkflowAutomationHookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const sortedHooks = useMemo(() => sortWorkflowAutomationHooks(hooks), [hooks]);
  const summary = useMemo(
    () => summarizeWorkflowAutomationHooks(sortedHooks),
    [sortedHooks],
  );

  const loadHooks = useCallback(async () => {
    if (!companyId) {
      setHooks([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("operations_workflow_automation_hooks_v")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) {
      if (error.code !== "PGRST205") {
        logger.error("[WorkflowAutomationHooksPanel] load failed", {
          error,
          tags: ["error"],
        });
      }
      setHooks([]);
    } else {
      setHooks((data ?? []) as WorkflowAutomationHookRow[]);
    }

    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void loadHooks();
  }, [loadHooks]);

  const runOverdueCheck = async () => {
    if (!companyId) return;

    setRunning(true);

    try {
      const { data, error } = await supabase.rpc(
        "run_overdue_critical_workflow_notifications",
        { p_company_id: companyId },
      );

      if (error) throw error;

      const result = (data ?? {}) as WorkflowAutomationRpcResult;
      toast({
        title: "Automation hooks checked",
        description: `${result.created_count ?? 0} notification hooks created, ${result.skipped_count ?? 0} already handled.`,
      });
      await loadHooks();
    } catch (error) {
      logger.error("[WorkflowAutomationHooksPanel] overdue check failed", {
        error,
        tags: ["error"],
      });
      toast({
        variant: "destructive",
        title: "Automation hook failed",
        description:
          error instanceof Error ? error.message : "Unexpected automation error.",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-3xl border bg-background/95 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
            Hooks
          </p>
          <h3 className="text-lg font-semibold">Workflow Automation</h3>
        </div>
        <Badge variant={summary.failed > 0 ? "destructive" : "outline"}>
          <Bot className="mr-1 h-3.5 w-3.5" />
          {summary.total}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-2xl border p-2">
          <p className="font-semibold">{summary.tasks}</p>
          <p className="text-muted-foreground">tasks</p>
        </div>
        <div className="rounded-2xl border p-2">
          <p className="font-semibold">{summary.inventoryReviews}</p>
          <p className="text-muted-foreground">reviews</p>
        </div>
        <div className="rounded-2xl border p-2">
          <p className="font-semibold">{summary.notifications}</p>
          <p className="text-muted-foreground">alerts</p>
        </div>
      </div>

      <Button
        size="sm"
        variant="outline"
        className="mt-4 w-full"
        disabled={!companyId || running}
        onClick={() => void runOverdueCheck()}
      >
        {running ? (
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
        )}
        Check overdue critical runs
      </Button>

      <div className="mt-4 space-y-2">
        {loading && (
          <div className="flex items-center gap-2 rounded-2xl border p-3 text-sm text-muted-foreground">
            <BellRing className="h-4 w-4" />
            Loading automation hooks
          </div>
        )}

        {!loading && sortedHooks.length === 0 && (
          <p className="rounded-2xl border p-3 text-sm text-muted-foreground">
            No workflow hooks have fired yet.
          </p>
        )}

        {!loading &&
          sortedHooks.slice(0, 5).map((hook) => (
            <div key={hook.automation_runid} className="rounded-2xl border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {workflowAutomationHookLabels[hook.hook_type]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {hook.workflow_name ?? hook.exception_title ?? "Workflow run"}
                  </p>
                </div>
                <Badge variant={hook.status === "failed" ? "destructive" : "outline"}>
                  {hook.status}
                </Badge>
              </div>
              {(hook.task_title || hook.issue_title || hook.notification_title) && (
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Wrench className="h-3.5 w-3.5" />
                  {hook.task_title ?? hook.issue_title ?? hook.notification_title}
                </p>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

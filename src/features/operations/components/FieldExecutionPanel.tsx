import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Play,
  Save,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  buildStepEvidencePayload,
  sortExecutionRuns,
  stepNeedsEvidence,
  summarizeExecutionRun,
  type FieldExecutionRpcResult,
  type FieldExecutionRunRow,
  type FieldExecutionStepRow,
} from "@/services/operations/fieldExecution";
import { logger } from "@/utils/logger";

export function FieldExecutionPanel() {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [runs, setRuns] = useState<FieldExecutionRunRow[]>([]);
  const [steps, setSteps] = useState<FieldExecutionStepRow[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [stepDrafts, setStepDrafts] = useState<Record<string, string>>({});
  const [failureDrafts, setFailureDrafts] = useState<Record<string, string>>({});

  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const sortedRuns = useMemo(() => sortExecutionRuns(runs), [runs]);
  const selectedRun =
    sortedRuns.find((run) => run.workflow_instanceid === selectedRunId) ??
    sortedRuns[0] ??
    null;
  const summary = selectedRun ? summarizeExecutionRun(selectedRun) : null;

  const loadSteps = useCallback(
    async (workflowInstanceId: string) => {
      const { data, error } = await supabase
        .from("operations_workflow_run_steps_v")
        .select("*")
        .eq("workflow_instanceid", workflowInstanceId)
        .order("step_number", { ascending: true });

      if (error) {
        throw error;
      }

      setSteps((data ?? []) as FieldExecutionStepRow[]);
    },
    [],
  );

  const loadRuns = useCallback(async () => {
    if (!companyId) {
      setRuns([]);
      setSteps([]);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("operations_field_execution_queue_v")
        .select("*")
        .eq("company_id", companyId)
        .order("due_at", { ascending: true });

      if (error) {
        throw error;
      }

      const loadedRuns = (data ?? []) as FieldExecutionRunRow[];
      setRuns(loadedRuns);
      const nextRunId =
        selectedRunId ??
        loadedRuns[0]?.workflow_instanceid ??
        null;
      setSelectedRunId(nextRunId);

      if (nextRunId) {
        await loadSteps(nextRunId);
      } else {
        setSteps([]);
      }
    } catch (error) {
      logger.error("[FieldExecutionPanel] load failed", {
        error,
        tags: ["error"],
      });
      toast({
        variant: "destructive",
        title: "Unable to load field execution",
        description:
          error instanceof Error ? error.message : "Unexpected execution error.",
      });
    } finally {
      setLoading(false);
    }
  }, [companyId, loadSteps, selectedRunId, toast]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  const runAction = async (
    actionKey: string,
    action: () => Promise<FieldExecutionRpcResult>,
    successTitle: string,
  ) => {
    setActing(actionKey);

    try {
      await action();
      await loadRuns();
      toast({ title: successTitle });
    } catch (error) {
      logger.error("[FieldExecutionPanel] action failed", {
        error,
        tags: ["error"],
      });
      toast({
        variant: "destructive",
        title: "Execution action failed",
        description:
          error instanceof Error ? error.message : "Unexpected execution error.",
      });
    } finally {
      setActing(null);
    }
  };

  const startRun = (workflowInstanceId: string) =>
    runAction(
      `start:${workflowInstanceId}`,
      async () => {
        const { data, error } = await supabase.rpc("start_workflow_run", {
          p_company_id: companyId,
          p_workflow_instanceid: workflowInstanceId,
        });
        if (error) throw error;
        return (data ?? {}) as FieldExecutionRpcResult;
      },
      "Workflow run resumed",
    );

  const saveStepDraft = (step: FieldExecutionStepRow) =>
    runAction(
      `draft:${step.step_instanceid}`,
      async () => {
        const draftValue = stepDrafts[step.step_instanceid] ?? "";
        const { data, error } = await supabase.rpc("save_workflow_step_draft", {
          p_company_id: companyId,
          p_step_instanceid: step.step_instanceid,
          p_evidence_payload: buildStepEvidencePayload(draftValue, "completed"),
          p_notes: draftValue || null,
        });
        if (error) throw error;
        return (data ?? {}) as FieldExecutionRpcResult;
      },
      "Step draft saved",
    );

  const completeStep = (step: FieldExecutionStepRow) =>
    runAction(
      `complete:${step.step_instanceid}`,
      async () => {
        const draftValue = stepDrafts[step.step_instanceid] ?? "";
        const payload = step.evidence_required
          ? buildStepEvidencePayload(draftValue, "completed")
          : {};
        const { data, error } = await supabase.rpc("complete_workflow_step", {
          p_company_id: companyId,
          p_step_instanceid: step.step_instanceid,
          p_step_status: "completed",
          p_evidence_payload: payload,
          p_notes: draftValue || null,
          p_failed_reason: null,
        });
        if (error) throw error;
        return (data ?? {}) as FieldExecutionRpcResult;
      },
      "Step completed",
    );

  const failStep = (step: FieldExecutionStepRow) =>
    runAction(
      `fail:${step.step_instanceid}`,
      async () => {
        const reason = failureDrafts[step.step_instanceid] ?? "";
        const { data, error } = await supabase.rpc("complete_workflow_step", {
          p_company_id: companyId,
          p_step_instanceid: step.step_instanceid,
          p_step_status: "failed",
          p_evidence_payload: buildStepEvidencePayload(reason, "failed"),
          p_notes: stepDrafts[step.step_instanceid] || null,
          p_failed_reason: reason,
        });
        if (error) throw error;
        return (data ?? {}) as FieldExecutionRpcResult;
      },
      "Step failed and escalated",
    );

  const completeRun = (workflowInstanceId: string) =>
    runAction(
      `run-complete:${workflowInstanceId}`,
      async () => {
        const { data, error } = await supabase.rpc("complete_workflow_run", {
          p_company_id: companyId,
          p_workflow_instanceid: workflowInstanceId,
        });
        if (error) throw error;
        return (data ?? {}) as FieldExecutionRpcResult;
      },
      "Workflow run completed",
    );

  return (
    <div className="rounded-3xl border bg-background/95 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
            Field Execution
          </p>
          <h3 className="text-lg font-semibold">Mobile Run Console</h3>
        </div>
        <Badge variant="outline" className="w-fit gap-1">
          <ClipboardCheck className="h-3.5 w-3.5" />
          {sortedRuns.length} runs
        </Badge>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {sortedRuns.map((run) => (
          <Button
            key={run.workflow_instanceid}
            variant={
              selectedRun?.workflow_instanceid === run.workflow_instanceid
                ? "default"
                : "outline"
            }
            size="sm"
            className="shrink-0"
            onClick={() => {
              setSelectedRunId(run.workflow_instanceid);
              void loadSteps(run.workflow_instanceid);
            }}
          >
            {run.templatecategory ?? "Run"}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border p-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading execution queue
        </div>
      ) : selectedRun && summary ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border bg-muted/30 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  {selectedRun.workflow_name ?? "Workflow run"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Due {selectedRun.due_at?.slice(0, 16) ?? "not scheduled"} ·{" "}
                  {summary.remaining} remaining
                </p>
              </div>
              <Badge variant="secondary">{selectedRun.run_status}</Badge>
            </div>
            <Progress value={summary.percent} className="mt-3 h-2" />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => startRun(selectedRun.workflow_instanceid)}
                disabled={acting !== null || !companyId}
              >
                <Play className="mr-2 h-3.5 w-3.5" />
                Start
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => completeRun(selectedRun.workflow_instanceid)}
                disabled={acting !== null || !companyId}
              >
                <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                Complete run
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {steps.map((step) => (
              <div
                key={step.step_instanceid}
                className="rounded-2xl border bg-background p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {step.step_number}. {step.step_name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {step.step_type ?? "task"}
                      {step.evidence_required ? " · evidence required" : ""}
                    </p>
                  </div>
                  <Badge variant="outline">{step.step_status}</Badge>
                </div>

                <Textarea
                  className="mt-3 min-h-[76px]"
                  placeholder={
                    stepNeedsEvidence(step)
                      ? "Add required evidence or reading"
                      : "Add note"
                  }
                  value={stepDrafts[step.step_instanceid] ?? ""}
                  onChange={(event) =>
                    setStepDrafts((current) => ({
                      ...current,
                      [step.step_instanceid]: event.target.value,
                    }))
                  }
                />

                <Textarea
                  className="mt-2 min-h-[64px]"
                  placeholder="Failure reason for escalation"
                  value={failureDrafts[step.step_instanceid] ?? ""}
                  onChange={(event) =>
                    setFailureDrafts((current) => ({
                      ...current,
                      [step.step_instanceid]: event.target.value,
                    }))
                  }
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => saveStepDraft(step)}
                    disabled={acting !== null || !companyId}
                  >
                    <Save className="mr-2 h-3.5 w-3.5" />
                    Draft
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => completeStep(step)}
                    disabled={acting !== null || !companyId}
                  >
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                    Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => failStep(step)}
                    disabled={acting !== null || !companyId}
                  >
                    <AlertTriangle className="mr-2 h-3.5 w-3.5" />
                    Fail
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border p-3 text-sm text-muted-foreground">
          No assigned workflow runs are ready for field execution.
        </div>
      )}
    </div>
  );
}

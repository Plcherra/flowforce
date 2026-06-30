import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  Loader2,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  incidentIssueSlaLabels,
  incidentIssueStatusLabels,
  isIncidentIssueClosed,
  sortIncidentIssues,
  summarizeIncidentIssues,
  type IncidentIssueQueueRow,
  type IncidentIssueStatus,
} from "@/services/operations/incidentIssueTracking";
import { logger } from "@/utils/logger";

const severityClasses: Record<IncidentIssueQueueRow["severity"], string> = {
  info: "border-border text-muted-foreground",
  warning: "border-amber-200 text-amber-700",
  critical: "border-red-200 text-red-700",
};

const slaClasses: Record<IncidentIssueQueueRow["sla_status"], string> = {
  unscheduled: "border-border text-muted-foreground",
  on_track: "border-emerald-200 text-emerald-700",
  due_soon: "border-amber-200 text-amber-700",
  overdue: "border-red-200 text-red-700",
  resolved: "border-emerald-200 text-emerald-700",
};

interface AutomationSuggestionResponse {
  suggestionId: string;
  status: string;
  script: unknown;
}

type IssueRpcResult = {
  issueid?: string;
  task_id?: string | null;
  status?: string;
};

export function IssuesStream() {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [issues, setIssues] = useState<IncidentIssueQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [drawerIssue, setDrawerIssue] = useState<IncidentIssueQueueRow | null>(
    null,
  );
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [drawerResult, setDrawerResult] =
    useState<AutomationSuggestionResponse | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>(
    {},
  );

  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const sortedIssues = useMemo(() => sortIncidentIssues(issues), [issues]);
  const summary = useMemo(
    () => summarizeIncidentIssues(sortedIssues),
    [sortedIssues],
  );

  const loadIssues = useCallback(async () => {
    if (!companyId) {
      setIssues([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("operations_incident_issue_queue_v")
      .select("*")
      .eq("company_id", companyId)
      .order("priority_rank", { ascending: true })
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(24);

    if (error) {
      logger.error("[IssuesStream] failed to load issues", {
        error,
        tags: ["error"],
      });
      setIssues([]);
    } else {
      setIssues((data ?? []) as IncidentIssueQueueRow[]);
    }

    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void loadIssues();
  }, [loadIssues]);

  const updateIssueStatus = async (
    issue: IncidentIssueQueueRow,
    status: IncidentIssueStatus,
  ) => {
    if (!companyId) return;

    setActing(`${issue.issueid}:${status}`);

    try {
      const { data, error } = await supabase.rpc(
        "update_operational_issue_status",
        {
          p_company_id: companyId,
          p_issueid: issue.issueid,
          p_status: status,
          p_ownerid: null,
          p_due_at: null,
          p_resolution_notes:
            status === "resolved"
              ? resolutionNotes[issue.issueid] || "Resolved from Operations Hub."
              : null,
        },
      );

      if (error) throw error;

      const result = (data ?? {}) as IssueRpcResult;
      toast({
        title: "Issue updated",
        description: result.status
          ? `Status moved to ${result.status}.`
          : "Lifecycle state saved.",
      });
      await loadIssues();
    } catch (error) {
      logger.error("[IssuesStream] status update failed", {
        error,
        tags: ["error"],
      });
      toast({
        variant: "destructive",
        title: "Issue update failed",
        description:
          error instanceof Error ? error.message : "Unexpected issue error.",
      });
    } finally {
      setActing(null);
    }
  };

  const openAutomationDrawer = async (issue: IncidentIssueQueueRow) => {
    if (!companyId) return;

    setDrawerIssue(issue);
    setDrawerLoading(true);
    setDrawerError(null);
    setDrawerResult(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error("Sign in again to generate automation.");
      }

      const response = await fetch(
        `/api/ops/issues/${issue.issueid}/suggest-automation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ orgId: companyId }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to generate automation (${response.status})`);
      }

      const payload = (await response.json()) as AutomationSuggestionResponse;
      setDrawerResult(payload);
    } catch (error) {
      logger.error("[IssuesStream] automation generation failed", {
        error,
        tags: ["error"],
      });
      setDrawerError(
        error instanceof Error
          ? error.message
          : "Unable to generate suggestion",
      );
    } finally {
      setDrawerLoading(false);
    }
  };

  const issueList = useMemo(() => {
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={`ops-issue-skeleton-${index}`}
              className="h-24 w-full rounded-3xl"
            />
          ))}
        </div>
      );
    }

    if (sortedIssues.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          No live issues. Enjoy the calm.
        </p>
      );
    }

    return (
      <ScrollArea className="h-[520px] pr-2">
        <div className="space-y-3">
          {sortedIssues.map((issue) => {
            const closed = isIncidentIssueClosed(issue.status);
            const issueActing = acting?.startsWith(issue.issueid);

            return (
              <motion.div
                key={issue.issueid}
                layout
                className={`rounded-3xl border bg-background/95 p-4 shadow-sm ${severityClasses[issue.severity]}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {issue.title ?? "Operational issue"}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                      {issue.issue_type ?? "general"}
                      {issue.owner_name ? ` | ${issue.owner_name}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {incidentIssueStatusLabels[issue.status] ?? issue.status}
                  </Badge>
                </div>

                {issue.description && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {issue.description}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={slaClasses[issue.sla_status]}
                  >
                    <Clock className="mr-1 h-3 w-3" />
                    {incidentIssueSlaLabels[issue.sla_status]}
                  </Badge>
                  {issue.task_id && (
                    <Badge variant="secondary">
                      Task {issue.task_status ?? "open"}
                    </Badge>
                  )}
                  {issue.workflow_name && (
                    <Badge variant="secondary">{issue.workflow_name}</Badge>
                  )}
                  {issue.inventory_item_id && (
                    <Badge variant="secondary">{issue.inventory_item_id}</Badge>
                  )}
                </div>

                {!closed && (
                  <Textarea
                    className="mt-3 min-h-[64px]"
                    placeholder="Resolution notes"
                    value={resolutionNotes[issue.issueid] ?? ""}
                    onChange={(event) =>
                      setResolutionNotes((current) => ({
                        ...current,
                        [issue.issueid]: event.target.value,
                      }))
                    }
                  />
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={issueActing || closed}
                    onClick={() => void updateIssueStatus(issue, "acknowledged")}
                  >
                    {issueActing ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <AlertCircle className="mr-2 h-3.5 w-3.5" />
                    )}
                    Ack
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={issueActing || closed}
                    onClick={() => void updateIssueStatus(issue, "in_progress")}
                  >
                    <PlayCircle className="mr-2 h-3.5 w-3.5" />
                    Start
                  </Button>
                  <Button
                    size="sm"
                    disabled={issueActing || closed}
                    onClick={() => void updateIssueStatus(issue, "resolved")}
                  >
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void openAutomationDrawer(issue)}
                  >
                    <Bot className="mr-2 h-3.5 w-3.5" />
                    AI
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable hook deps
  }, [acting, loading, resolutionNotes, sortedIssues]);

  return (
    <div className="rounded-3xl border bg-background/95 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
            Issues
          </p>
          <h3 className="text-lg font-semibold">Operational Issues</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{summary.open} open</Badge>
          <Badge variant="outline">{summary.overdue} overdue</Badge>
          <Badge variant="outline">{summary.critical} critical</Badge>
        </div>
      </div>
      <div className="mt-4">{issueList}</div>

      <Drawer
        open={Boolean(drawerIssue)}
        onOpenChange={(open) => {
          if (!open) {
            setDrawerIssue(null);
            setDrawerResult(null);
            setDrawerError(null);
          }
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Automation suggestion</DrawerTitle>
            <DrawerDescription>
              FlowForce will design a sequence tailored to &quot;
              {drawerIssue?.title ?? "this issue"}&quot;.
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3 px-4 pb-4 text-sm">
            {drawerLoading && <p>Generating automation script...</p>}
            {drawerError && <p className="text-red-600">{drawerError}</p>}
            {drawerResult && (
              <pre className="max-h-64 overflow-auto rounded-xl bg-muted/60 p-3 text-xs">
                {JSON.stringify(drawerResult.script, null, 2)}
              </pre>
            )}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="ghost">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

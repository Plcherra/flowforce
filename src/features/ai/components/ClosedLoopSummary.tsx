import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ClosedLoopState } from "@/services/intelligence/closedLoopEngine";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Layers,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

interface ClosedLoopSummaryProps {
  loading: boolean;
  error?: Error | null;
  state?: ClosedLoopState;
  onRefresh?: () => void;
}

export function ClosedLoopSummary({
  loading,
  error,
  state,
  onRefresh,
}: ClosedLoopSummaryProps) {
  const severity = (state?.detection.severityBreakdown as
    | { high: number; medium: number; low: number }
    | undefined) ?? {
    high: 0,
    medium: 0,
    low: 0,
  };
  const riskScore = state?.interpretation.riskScore ?? 0;
  const ackRate = state?.learning.acknowledgmentRate;
  const guardrailStatus = state?.execution.guardrail.status ?? "allowed";
  const guardrailMessage =
    state?.execution.guardrail.message ??
    (guardrailStatus === "allowed"
      ? "All guardrails satisfied."
      : guardrailStatus === "warning"
        ? "Warnings detected – review before executing."
        : "Blocked until guardrail criteria are met.");

  const aiSummary =
    state?.interpretation.summary ?? "AI insights not yet generated.";
  const trimmedSummary =
    aiSummary.length > 180 ? `${aiSummary.slice(0, 177)}…` : aiSummary;
  const themes = state?.interpretation.themes ?? [];

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            Closed AI Loop
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Continuous flow from detect → interpret → approve → execute → learn.
          </p>
        </div>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-lg border bg-muted/40 p-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-3 h-3 w-32" />
                <Skeleton className="mt-6 h-8 w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error.message ?? "Unable to load closed loop status."}</span>
          </div>
        ) : state ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <section className="rounded-lg border bg-muted/30 p-4">
              <header className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Detect
              </header>
              <p className="mt-3 text-sm text-muted-foreground">
                {state.detection.summary}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">High {severity.high ?? 0}</Badge>
                <Badge
                  variant="outline"
                  className="border-amber-500/40 text-amber-600"
                >
                  Medium {severity.medium ?? 0}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 text-emerald-600"
                >
                  Low {severity.low ?? 0}
                </Badge>
              </div>
            </section>

            <section className="rounded-lg border bg-muted/30 p-4">
              <header className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Brain className="h-4 w-4 text-primary" />
                Interpret
              </header>
              <p className="mt-3 text-xs uppercase text-muted-foreground">
                Risk score
              </p>
              <Progress value={Math.min(100, riskScore)} className="mt-1" />
              <p className="mt-2 text-sm font-semibold text-foreground">
                {riskScore}/100
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {trimmedSummary}
              </p>
              {themes.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Themes:{" "}
                  <span className="font-medium text-foreground">
                    {themes.slice(0, 3).join(", ")}
                  </span>
                </p>
              )}
            </section>

            <section className="rounded-lg border bg-muted/30 p-4">
              <header className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Layers className="h-4 w-4 text-blue-500" />
                Approve
              </header>
              <div className="mt-3 space-y-2 text-sm">
                <p className="flex items-center justify-between">
                  Pending approvals
                  <span className="font-semibold text-foreground">
                    {state.approvals.pending.length}
                  </span>
                </p>
                <p className="flex items-center justify-between text-muted-foreground">
                  Ready to automate
                  <span className="font-medium text-foreground/80">
                    {state.approvals.readyToAutomate.length}
                  </span>
                </p>
                <p className="flex items-center justify-between text-muted-foreground">
                  Manual queue
                  <span className="font-medium text-foreground/80">
                    {state.approvals.awaitingHuman.length}
                  </span>
                </p>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {state.approvals.summary}
              </p>
            </section>

            <section className="rounded-lg border bg-muted/30 p-4">
              <header className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CheckCircle2
                  className={cn(
                    "h-4 w-4",
                    guardrailStatus === "allowed" && "text-emerald-500",
                    guardrailStatus === "warning" && "text-amber-500",
                    guardrailStatus === "blocked" && "text-destructive",
                  )}
                />
                Execute
              </header>
              <Badge
                variant="outline"
                className={cn(
                  "mt-3 w-fit uppercase tracking-wide",
                  guardrailStatus === "allowed" &&
                    "border-emerald-500/50 text-emerald-600",
                  guardrailStatus === "warning" &&
                    "border-amber-500/50 text-amber-600",
                  guardrailStatus === "blocked" &&
                    "border-destructive/60 text-destructive",
                )}
              >
                {guardrailStatus}
              </Badge>
              <p className="mt-3 text-sm text-muted-foreground">
                {guardrailMessage}
              </p>
              <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                <li>
                  Autopilot backlog:{" "}
                  <span className="font-medium text-foreground">
                    {state.execution.evidence.metrics.autopilotTasksPending}
                  </span>
                </li>
                <li>
                  Unresolved critical signals:{" "}
                  <span className="font-medium text-foreground">
                    {state.execution.evidence.metrics.unresolvedCriticalEvents}
                  </span>
                </li>
              </ul>
            </section>

            <section className="rounded-lg border bg-muted/30 p-4">
              <header className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                Learn
              </header>
              <p className="mt-3 text-sm text-muted-foreground">
                {state.learning.summary}
              </p>
              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                <p>
                  Acknowledgement rate:{" "}
                  <span className="font-medium text-foreground">
                    {ackRate != null ? `${Math.round(ackRate * 100)}%` : "N/A"}
                  </span>
                </p>
                <p>
                  Tasks completed:{" "}
                  <span className="font-medium text-foreground">
                    {state.learning.completedTasks}
                  </span>
                </p>
                <p>
                  Critical signals resolved:{" "}
                  <span className="font-medium text-foreground">
                    {state.learning.resolvedEvents}
                  </span>
                </p>
              </div>
            </section>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Closed loop insights will appear once operational data is available.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

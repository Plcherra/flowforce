import { useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useScheduling } from "@/contexts/SchedulingContext";
import { useCopilotScheduler } from "@/hooks/scheduling/useCopilotScheduler";
import type { ScheduleSummary } from "@/hooks/scheduling/copilotSchedulerTypes";
import { format } from "date-fns";
import {
  AlertTriangle,
  RefreshCw,
  Send,
  Sparkles,
  UploadCloud,
} from "lucide-react";

interface CopilotSchedulerSidebarProps {
  locationFilter?: string;
}

export function CopilotSchedulerSidebar({
  locationFilter,
}: CopilotSchedulerSidebarProps) {
  const { shifts, weekRange, refetchAll } = useScheduling();

  const existingShifts = useMemo(
    () =>
      (shifts ?? []).flatMap((shift) =>
        (shift.assignments ?? [])
          .filter((assignment) => Boolean(assignment.user_id))
          .map((assignment) => ({
            employee_id: assignment.user_id,
            start_time: shift.start_time,
            end_time: shift.end_time,
            location: shift.location,
          })),
      ),
    [shifts],
  );

  const scheduler = useCopilotScheduler({
    weekStart: weekRange.start,
    weekEnd: weekRange.end,
    location: locationFilter,
    existingShifts,
    onPublished: refetchAll,
  });

  const coverageCount = scheduler.coverageGaps.length;
  const swapCount = scheduler.swapSuggestions.length;
  const draftCount = scheduler.draftShifts.length;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col gap-2 border-b border-border/60">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">
              Copilot Scheduler
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Draft coverage, resolve gaps, and publish shifts with Copilot
              oversight.
            </p>
          </div>
          {scheduler.lastGeneratedAt ? (
            <Badge
              variant="outline"
              className="text-[10px] uppercase tracking-wide"
            >
              {format(new Date(scheduler.lastGeneratedAt), "MMM d, HH:mm")}
            </Badge>
          ) : null}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <MetricPill label="Draft shifts" value={draftCount} />
          <MetricPill
            label="Coverage gaps"
            value={coverageCount}
            tone={coverageCount > 0 ? "warning" : "success"}
          />
          <MetricPill
            label="Swap suggestions"
            value={swapCount}
            tone={swapCount > 0 ? "info" : "muted"}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-0">
        {scheduler.error ? (
          <Alert variant="destructive" className="m-4">
            <AlertTitle>Failed to build draft schedule</AlertTitle>
            <AlertDescription>{scheduler.error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="px-4 pt-4">
          {scheduler.loading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          ) : (
            <SummaryList summary={scheduler.summary} />
          )}
        </div>

        <Separator />

        <ScrollArea className="px-4 pb-4">
          <SectionHeader
            icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
            title="Coverage alerts"
          />
          {scheduler.coverageGaps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All coverage targets satisfied.
            </p>
          ) : (
            <ul className="space-y-3">
              {scheduler.coverageGaps.map((gap) => (
                <li
                  key={`${gap.templateId}:${gap.scheduleDate}`}
                  className="rounded-lg border border-border/60 p-3"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {gap.role}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {gap.location} · {gap.scheduleDate} · missing{" "}
                    {gap.missingCount} of {gap.requiredCount}
                  </p>
                  <p className="mt-2 text-sm text-amber-600">{gap.reason}</p>
                </li>
              ))}
            </ul>
          )}

          <Separator className="my-4" />

          <SectionHeader
            icon={<Sparkles className="h-4 w-4 text-sky-500" />}
            title="Swap suggestions"
          />
          {scheduler.swapSuggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No swap recommendations required.
            </p>
          ) : (
            <ul className="space-y-3">
              {scheduler.swapSuggestions.map((swap) => (
                <li
                  key={swap.id}
                  className="rounded-lg border border-border/60 p-3"
                >
                  <p className="text-sm text-foreground">
                    {swap.role} · {swap.scheduleDate}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Move {swap.toEmployeeId.slice(0, 6)} from{" "}
                    {swap.fromLocation} → {swap.toLocation}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {swap.reason}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </CardContent>

      <CardFooter className="flex flex-col gap-2 border-t border-border/60 p-4">
        <div className="flex w-full flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={scheduler.regenerate}
            disabled={scheduler.loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerate
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={scheduler.enqueueCoverageGaps}
            disabled={
              scheduler.loading || scheduler.coverageGapActions.length === 0
            }
          >
            <Send className="mr-2 h-4 w-4" />
            Queue gaps
          </Button>
        </div>
        <div className="flex w-full flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={scheduler.enqueueSwapSuggestions}
            disabled={scheduler.loading || scheduler.swapActions.length === 0}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Queue swaps
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={scheduler.publishDraftSchedule}
            disabled={scheduler.loading || scheduler.draftShifts.length === 0}
          >
            <UploadCloud className="mr-2 h-4 w-4" />
            Publish draft
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function MetricPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning" | "success" | "info" | "muted";
}) {
  const toneClass =
    tone === "warning"
      ? "text-amber-500"
      : tone === "success"
        ? "text-emerald-500"
        : tone === "info"
          ? "text-sky-500"
          : tone === "muted"
            ? "text-muted-foreground"
            : "text-foreground";

  return (
    <div className="rounded-lg border border-border/70 px-2 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      {icon}
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
    </div>
  );
}

function SummaryList({ summary }: { summary: ScheduleSummary }) {
  const employeeEntries = Object.entries(summary.hoursByEmployee)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Total hours</span>
        <span className="font-medium">{summary.totalHours.toFixed(1)} hrs</span>
      </div>
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Top contributors
        </p>
        {employeeEntries.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No assigned employees yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {employeeEntries.map(([employeeId, hours]) => (
              <li
                key={employeeId}
                className="flex items-center justify-between text-xs text-muted-foreground"
              >
                <span>Employee {employeeId.slice(0, 6)}</span>
                <span className="text-foreground">{hours.toFixed(1)} hrs</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default CopilotSchedulerSidebar;

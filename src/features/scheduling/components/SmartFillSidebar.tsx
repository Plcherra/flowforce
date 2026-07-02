import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useScheduling } from "@/contexts/SchedulingContext";
import { useCopilotScheduler } from "@/features/scheduling/hooks/useCopilotScheduler";
import type { ScheduleSummary } from "@/features/scheduling/hooks/copilotSchedulerTypes";
import { buildScheduleReadinessSummary } from "@/features/scheduling/utils/scheduleReadiness";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  UploadCloud,
} from "lucide-react";

interface SmartFillSidebarProps {
  locationFilter?: string;
  expandTrigger?: number;
}

export function SmartFillSidebar({
  locationFilter,
  expandTrigger = 0,
}: SmartFillSidebarProps) {
  const isMobile = useIsMobile();
  const { shifts, timeOff, unavailability, staffAvailability, weekRange, refetchAll } =
    useScheduling();
  const [expanded, setExpanded] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const readiness = useMemo(
    () =>
      buildScheduleReadinessSummary({
        shifts: shifts ?? [],
        timeOff: timeOff ?? [],
        unavailability: unavailability ?? [],
        staffAvailability: staffAvailability ?? [],
      }),
    [shifts, timeOff, unavailability, staffAvailability],
  );

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
    staffAvailability: staffAvailability ?? [],
    timeOff: timeOff ?? [],
    unavailability: unavailability ?? [],
    autoGenerate: false,
    onPublished: refetchAll,
  });

  const coverageCount = scheduler.coverageGaps.length;
  const draftCount = scheduler.draftShifts.length;
  const needsAttention =
    readiness.unassignedCount +
    readiness.understaffedCount +
    coverageCount;
  const showProminent = needsAttention > 0 || hasGenerated;
  const isExpanded = expanded || (hasGenerated && coverageCount > 0);

  const handleSuggestFills = useCallback(async () => {
    setExpanded(true);
    setHasGenerated(true);
    if (isMobile) {
      setMobileSheetOpen(true);
    } else {
      sidebarRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    await scheduler.regenerate();
  }, [isMobile, scheduler]);

  useEffect(() => {
    if (expandTrigger > 0) {
      void handleSuggestFills();
    }
  }, [expandTrigger, handleSuggestFills]);

  const sidebarBody = (
    <>
      <CardHeader className="flex flex-col gap-2 border-b border-border/60 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Smart Fill
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Draft shifts from coverage templates, staff availability, and
              current week load.
            </p>
          </div>
          {hasGenerated && scheduler.lastGeneratedAt ? (
            <Badge
              variant="outline"
              className="shrink-0 text-[10px] uppercase tracking-wide"
            >
              {format(new Date(scheduler.lastGeneratedAt), "MMM d, HH:mm")}
            </Badge>
          ) : null}
        </div>

        {!isExpanded ? (
          <CompactStatus
            needsAttention={needsAttention}
            unassignedCount={readiness.unassignedCount}
            understaffedCount={readiness.understaffedCount}
            loading={scheduler.loading}
            onSuggestFills={handleSuggestFills}
          />
        ) : (
          <div className="grid grid-cols-2 gap-2 text-center">
            <MetricPill label="Suggested shifts" value={draftCount} />
            <MetricPill
              label="Coverage gaps"
              value={coverageCount}
              tone={coverageCount > 0 ? "warning" : "success"}
            />
          </div>
        )}
      </CardHeader>

      {isExpanded ? (
        <>
          <CardContent className="space-y-4 p-0">
            {scheduler.error ? (
              <Alert variant="destructive" className="m-4">
                <AlertTitle>Could not build suggestions</AlertTitle>
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

            <ScrollArea className="max-h-72 px-4 pb-4">
              <SectionHeader
                icon={<Sparkles className="h-4 w-4 text-primary" />}
                title="Suggested draft shifts"
              />
              {scheduler.draftShifts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {hasGenerated
                    ? "No additional shifts needed for this week."
                    : "Run Smart Fill to draft shifts from templates."}
                </p>
              ) : (
                <ul className="space-y-2">
                  {scheduler.draftShifts.slice(0, 12).map((shift) => (
                    <li
                      key={shift.dedupeKey}
                      className="rounded-lg border border-border/60 p-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{shift.role}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {shift.hours.toFixed(1)}h
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {shift.scheduleDate} · {shift.location}
                      </p>
                      <p className="mt-1 text-xs">
                        {shift.employeeName ?? "Open shift"} · from template
                      </p>
                    </li>
                  ))}
                  {scheduler.draftShifts.length > 12 ? (
                    <p className="text-xs text-muted-foreground">
                      +{scheduler.draftShifts.length - 12} more suggested
                      shifts
                    </p>
                  ) : null}
                </ul>
              )}

              {coverageCount > 0 ? (
                <>
                  <Separator className="my-4" />
                  <SectionHeader
                    icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
                    title="Remaining gaps"
                  />
                  <ul className="space-y-2">
                    {scheduler.coverageGaps.map((gap) => (
                      <li
                        key={`${gap.templateId}:${gap.scheduleDate}`}
                        className="rounded-lg border border-amber-200/70 bg-amber-50/40 p-3 dark:border-amber-900 dark:bg-amber-950/20"
                      >
                        <p className="text-sm font-medium">{gap.role}</p>
                        <p className="text-xs text-muted-foreground">
                          {gap.location} · {gap.scheduleDate} · missing{" "}
                          {gap.missingCount}
                        </p>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </ScrollArea>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 border-t border-border/60 p-4">
            <div className="flex w-full flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={handleSuggestFills}
                disabled={scheduler.loading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh suggestions
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={scheduler.publishDraftSchedule}
                disabled={scheduler.loading || scheduler.draftShifts.length === 0}
              >
                <UploadCloud className="mr-2 h-4 w-4" />
                Add drafts to board
              </Button>
            </div>
            <p className="w-full text-center text-[11px] leading-snug text-muted-foreground">
              Adds draft shifts to the week board. Publish the full week from
              the board Actions menu when ready.
            </p>
            {!isMobile && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setExpanded(false)}
              >
                <ChevronUp className="mr-2 h-4 w-4" />
                Collapse
              </Button>
            )}
          </CardFooter>
        </>
      ) : (
        <CardFooter className="border-t border-border/60 p-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => setExpanded(true)}
          >
            <ChevronDown className="mr-2 h-4 w-4" />
            Show details
          </Button>
        </CardFooter>
      )}
    </>
  );

  if (isMobile) {
    return (
      <>
        <div className="fixed bottom-4 right-4 z-40 lg:hidden">
          <Button
            size="sm"
            className="shadow-lg"
            onClick={() => {
              setMobileSheetOpen(true);
              if (!hasGenerated) {
                void handleSuggestFills();
              }
            }}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Smart Fill
            {needsAttention > 0 ? (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {needsAttention}
              </Badge>
            ) : null}
          </Button>
        </div>

        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto p-0">
            <SheetHeader className="border-b px-4 py-3 text-left">
              <SheetTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Smart Fill
              </SheetTitle>
            </SheetHeader>
            <Card className="border-0 shadow-none">{sidebarBody}</Card>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Card
      ref={sidebarRef}
      className={cn(
        "sticky top-20 self-start max-h-[calc(100dvh-12rem)] overflow-hidden transition-colors",
        showProminent && needsAttention > 0
          ? "border-amber-300 shadow-sm dark:border-amber-800"
          : undefined,
      )}
    >
      {sidebarBody}
    </Card>
  );
}

function CompactStatus({
  needsAttention,
  unassignedCount,
  understaffedCount,
  loading,
  onSuggestFills,
}: {
  needsAttention: number;
  unassignedCount: number;
  understaffedCount: number;
  loading: boolean;
  onSuggestFills: () => void;
}) {
  const statusMessage =
    needsAttention > 0
      ? `${needsAttention} shift${needsAttention === 1 ? "" : "s"} need coverage`
      : "Week looks covered — run Smart Fill to optimize";

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border/70 p-2.5">
      <p
        className={cn(
          "text-sm",
          needsAttention > 0
            ? "font-medium text-amber-700 dark:text-amber-300"
            : "text-muted-foreground",
        )}
      >
        {statusMessage}
      </p>
      {(unassignedCount > 0 || understaffedCount > 0) && (
        <p className="text-xs text-muted-foreground">
          {unassignedCount > 0 ? `${unassignedCount} unassigned` : null}
          {unassignedCount > 0 && understaffedCount > 0 ? " · " : null}
          {understaffedCount > 0 ? `${understaffedCount} understaffed` : null}
        </p>
      )}
      <Button
        size="sm"
        className="w-full"
        onClick={onSuggestFills}
        disabled={loading}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {loading ? "Building suggestions…" : "Suggest fills"}
      </Button>
    </div>
  );
}

function MetricPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "text-amber-500"
      : tone === "success"
        ? "text-emerald-500"
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
        <span className="text-muted-foreground">Suggested hours</span>
        <span className="font-medium">{summary.totalHours.toFixed(1)} hrs</span>
      </div>
      {employeeEntries.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Staff load (incl. current week)
          </p>
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
        </div>
      ) : null}
    </div>
  );
}

export default SmartFillSidebar;

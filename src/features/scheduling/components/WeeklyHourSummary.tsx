/**
 * Weekly hour summary card component
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  HoursSummary,
  CoveragePercentages,
} from "../utils/hoursCalculation";
import type { DailyHourEntry } from "../utils/dailyHours";

interface WeeklyHourSummaryProps {
  hoursSummary: HoursSummary;
  coveragePercentages: CoveragePercentages;
  dailyHourEntries: DailyHourEntry[];
  appliedFilterLabel: string;
  loading: boolean;
}

export function WeeklyHourSummary({
  hoursSummary,
  coveragePercentages,
  dailyHourEntries,
  appliedFilterLabel,
  loading,
}: WeeklyHourSummaryProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Hour Summary</CardTitle>
          <CardDescription>{appliedFilterLabel}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Hour Summary</CardTitle>
        <CardDescription>{appliedFilterLabel}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Scheduled Hours</p>
            <p className="text-2xl font-semibold">
              {hoursSummary.totalHours > 0
                ? hoursSummary.totalHours.toFixed(1)
                : "0.0"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Labor Hours (with headcount)
            </p>
            <p className="text-2xl font-semibold">
              {hoursSummary.totalLaborHours > 0
                ? hoursSummary.totalLaborHours.toFixed(1)
                : "0.0"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Average Shift Length
            </p>
            <p className="text-2xl font-semibold">
              {hoursSummary.averageShiftHours > 0
                ? hoursSummary.averageShiftHours.toFixed(1)
                : "0.0"}{" "}
              hrs
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Shifts Counted</p>
            <p className="text-2xl font-semibold">{hoursSummary.shiftCount}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Shift Coverage
              </p>
              <p className="text-xs text-muted-foreground">
                Filled vs in-progress vs open
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Filled&nbsp;({hoursSummary.filledCount})
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Partial&nbsp;({hoursSummary.partialCount})
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Open&nbsp;({hoursSummary.unfilledCount})
              </span>
            </div>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted">
            <div className="flex h-full w-full">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${coveragePercentages.filledPct}%` }}
              />
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${coveragePercentages.partialPct}%` }}
              />
              <div
                className="h-full bg-rose-500 transition-all"
                style={{ width: `${coveragePercentages.openPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            Daily Scheduled Hours
          </p>
          {dailyHourEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No shifts scheduled for this period.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {dailyHourEntries.map(({ day, hours, label }) => (
                <div
                  key={day}
                  className="rounded-lg border border-border/60 p-3"
                >
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-lg font-semibold">
                    {hours.toFixed(1)} hrs
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { Badge } from "@/components/ui/badge";

export interface InsightsHeaderProps {
  loading: boolean;
  employeesTracked: number;
  lastRefreshLabel?: string | null;
}

export function InsightsHeader({
  loading,
  employeesTracked,
  lastRefreshLabel,
}: InsightsHeaderProps) {
  const statusLabel = loading ? "Updating insights…" : "Insights up to date";
  return (
    <header className="flex flex-col gap-4 rounded-2xl border bg-card/80 p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          HR Intelligence
        </p>
        <h1 className="mt-1 text-3xl font-bold">AI Insights</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Forecast engagement shifts, goal risk, and XP milestones across your
          workforce.
        </p>
      </div>
      <div className="flex flex-col items-start gap-2 lg:items-end">
        <Badge variant="outline">{statusLabel}</Badge>
        <p className="text-sm text-muted-foreground">
          Tracking {employeesTracked}{" "}
          {employeesTracked === 1 ? "employee" : "employees"}
        </p>
        {lastRefreshLabel && (
          <p className="text-xs text-muted-foreground">
            Synced {lastRefreshLabel}
          </p>
        )}
      </div>
    </header>
  );
}

export default InsightsHeader;
